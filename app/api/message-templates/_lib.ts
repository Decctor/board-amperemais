import {
	buildWhatsappTemplateApprovalPayload,
	buildWhatsappTemplateSyncPatch,
	createMetaWhatsappTemplate,
	deleteMetaWhatsappTemplate,
	editMetaWhatsappTemplate,
	getMetaWhatsappTemplate,
	listMetaWhatsappTemplates,
	normalizeMessageTemplateContentParameters,
	validateMessageTemplateForWhatsapp,
	type TMetaTemplate,
	type TMessageTemplateApprovalStatus,
	type TMessageTemplateEntityLike,
	type TMessageTemplateMetadataPatch,
	type TMessageTemplateQuality,
} from "@/lib/message-templates";
import { fetchAndUploadToMeta } from "@/lib/whatsapp/media-upload";
import type { TMessageTemplateContent, TMessageTemplateMetadata } from "@/schemas/message-templates";
import { db } from "@/services/drizzle";
import { whatsappConnections } from "@/services/drizzle/schema";
import { eq } from "drizzle-orm";
import createHttpError from "http-errors";

export type TMessageTemplateWhatsappPhone = {
	id: string;
	numero: string;
	nome: string;
	whatsappBusinessAccountId: string | null;
	whatsappTelefoneId: string | null;
	conexao: {
		id: string;
		token: string | null;
		tipoConexao: string;
	};
};

export function createEmptyMessageTemplateMetadata(): TMessageTemplateMetadata {
	return { porNumeroTelefone: {} };
}

export function computeWorstMessageTemplateStatus(statuses: TMessageTemplateApprovalStatus[]): TMessageTemplateApprovalStatus {
	const priority: TMessageTemplateApprovalStatus[] = ["REJEITADO", "DESABILITADO", "PAUSADO", "PENDENTE", "RASCUNHO", "APROVADO"];
	return priority.find((status) => statuses.includes(status)) ?? "RASCUNHO";
}

export function computeWorstMessageTemplateQuality(qualities: TMessageTemplateQuality[]): TMessageTemplateQuality {
	const priority: TMessageTemplateQuality[] = ["BAIXA", "MEDIA", "PENDENTE", "ALTA"];
	return priority.find((quality) => qualities.includes(quality)) ?? "PENDENTE";
}

export function filterMessageTemplateMetadataByPhoneIds({
	metadata,
	phoneIds,
}: {
	metadata: TMessageTemplateMetadata;
	phoneIds: ReadonlySet<string>;
}): TMessageTemplateMetadata {
	return {
		...metadata,
		porNumeroTelefone: Object.fromEntries(Object.entries(metadata.porNumeroTelefone).filter(([phoneId]) => phoneIds.has(phoneId))),
	};
}

export function withComputedMessageTemplateStatus<T extends { metadados: TMessageTemplateMetadata }>(
	template: T,
	connectedPhoneIds?: ReadonlySet<string>,
) {
	const metadados = connectedPhoneIds
		? filterMessageTemplateMetadataByPhoneIds({ metadata: template.metadados, phoneIds: connectedPhoneIds })
		: template.metadados;
	const phoneMetadata = Object.values(metadados.porNumeroTelefone);
	return {
		...template,
		metadados,
		statusGeral: phoneMetadata.length > 0 ? computeWorstMessageTemplateStatus(phoneMetadata.map((metadata) => metadata.status)) : "RASCUNHO",
		qualidadeGeral: phoneMetadata.length > 0 ? computeWorstMessageTemplateQuality(phoneMetadata.map((metadata) => metadata.qualidade)) : "PENDENTE",
		telefonesTotal: phoneMetadata.length,
		telefonesAprovados: phoneMetadata.filter((metadata) => metadata.status === "APROVADO").length,
	};
}

export async function getOrganizationWhatsappPhoneIds(organizationId: string): Promise<Set<string>> {
	const connections = await db.query.whatsappConnections.findMany({
		where: eq(whatsappConnections.organizacaoId, organizationId),
		columns: { id: true },
		with: {
			telefones: {
				columns: { id: true },
			},
		},
	});
	return new Set(connections.flatMap((connection) => connection.telefones.map((phone) => phone.id)));
}

export async function getOrganizationWhatsappPhones(organizationId: string): Promise<TMessageTemplateWhatsappPhone[]> {
	const connections = await db.query.whatsappConnections.findMany({
		where: eq(whatsappConnections.organizacaoId, organizationId),
		columns: {
			id: true,
			token: true,
			tipoConexao: true,
		},
		with: {
			telefones: true,
		},
	});

	return connections.flatMap((connection) =>
		connection.telefones.map((phone) => ({
			...phone,
			conexao: connection,
		})),
	);
}

/**
 * Sobe a mídia do cabeçalho para a Meta e devolve o conteúdo com o handle injetado.
 *
 * O handle é efêmero e vinculado ao token/app da conexão que fez o upload: ele não é
 * reaproveitável entre telefones (WABAs distintos) nem entre submissões. Por isso o
 * upload é sempre refeito e o resultado nunca é persistido — vive apenas no escopo da
 * submissão de um telefone.
 */
async function resolveMediaHeaderHandle(content: TMessageTemplateContent, accessToken: string): Promise<TMessageTemplateContent> {
	const header = content.cabecalho;
	if (!header || header.tipo === "NENHUM" || header.tipo === "TEXTO" || header.tipo === "LOCALIZAÇÃO") return content;
	if (header.tipo === "IMAGEM_DINAMICA") {
		throw new createHttpError.BadRequest("Cabeçalho dinâmico ainda precisa de renderer backend antes da submissão para a Meta.");
	}
	if (!header.conteudoMidiaUrl) return content;

	const metaAppId = process.env.NEXT_PUBLIC_META_APP_ID;
	if (!metaAppId) throw new createHttpError.InternalServerError("Meta app ID não configurado.");

	const { headerHandle } = await fetchAndUploadToMeta({
		fileUrl: header.conteudoMidiaUrl,
		appId: metaAppId,
		accessToken,
	});

	return {
		...content,
		cabecalho: {
			...header,
			conteudoMidiaHandle: headerHandle,
		},
	};
}

export async function submitMessageTemplateToWhatsappPhone({
	template,
	phone,
	organizationId,
	origin,
	mode,
}: {
	template: TMessageTemplateEntityLike;
	phone: TMessageTemplateWhatsappPhone;
	organizationId: string;
	origin?: string;
	mode: "create" | "upsert";
}): Promise<{ phoneId: string; success: boolean; idExterno: string | null; message?: string }> {
	if (phone.conexao.tipoConexao !== "META_CLOUD_API") {
		return { phoneId: phone.id, success: true, idExterno: null, message: "Telefone não usa Meta Cloud API." };
	}
	if (!phone.conexao.token || !phone.whatsappBusinessAccountId) {
		return { phoneId: phone.id, success: false, idExterno: null, message: "Credenciais da Meta não encontradas para o telefone." };
	}

	const content = await resolveMediaHeaderHandle(template.conteudo, phone.conexao.token);
	const payload = buildWhatsappTemplateApprovalPayload({
		template: { ...template, conteudo: content },
		organizationId,
		origin,
	});
	const currentMetadata = template.metadados.porNumeroTelefone[phone.id];

	if (mode === "upsert" && currentMetadata?.idExterno) {
		await editMetaWhatsappTemplate({
			accessToken: phone.conexao.token,
			templateId: currentMetadata.idExterno,
			payload: {
				category: payload.category,
				components: payload.components,
			},
		});
		return { phoneId: phone.id, success: true, idExterno: currentMetadata.idExterno, message: "Template atualizado na Meta." };
	}

	const response = await createMetaWhatsappTemplate({
		accessToken: phone.conexao.token,
		whatsappBusinessAccountId: phone.whatsappBusinessAccountId,
		payload,
	});
	return { phoneId: phone.id, success: true, idExterno: response.id, message: "Template criado na Meta." };
}

export function buildWhatsappSubmissionPhoneMetadata(idExterno: string | null): TMessageTemplateMetadata["porNumeroTelefone"][string] {
	return {
		idExterno: idExterno ?? "",
		status: idExterno ? "PENDENTE" : "APROVADO",
		qualidade: idExterno ? "PENDENTE" : "ALTA",
	};
}

export function applyWhatsappSubmissionResultToMetadata({
	metadata,
	phoneId,
	idExterno,
}: {
	metadata: TMessageTemplateMetadata;
	phoneId: string;
	idExterno: string | null;
}): TMessageTemplateMetadata {
	return {
		...metadata,
		porNumeroTelefone: {
			...metadata.porNumeroTelefone,
			[phoneId]: buildWhatsappSubmissionPhoneMetadata(idExterno),
		},
	};
}

export async function deleteMessageTemplateFromMetaPhones({
	template,
	phones,
}: {
	template: TMessageTemplateEntityLike;
	phones: TMessageTemplateWhatsappPhone[];
}) {
	const results: Array<{ phoneId: string; success: boolean; message?: string }> = [];
	for (const phone of phones) {
		const metadata = template.metadados.porNumeroTelefone[phone.id];
		if (!metadata?.idExterno || phone.conexao.tipoConexao !== "META_CLOUD_API") continue;
		if (!phone.conexao.token || !phone.whatsappBusinessAccountId) continue;
		try {
			await deleteMetaWhatsappTemplate({
				accessToken: phone.conexao.token,
				whatsappBusinessAccountId: phone.whatsappBusinessAccountId,
				templateName: template.nome,
			});
			results.push({ phoneId: phone.id, success: true });
		} catch (error) {
			results.push({ phoneId: phone.id, success: false, message: error instanceof Error ? error.message : "Erro desconhecido" });
		}
	}
	return results;
}

export async function syncMessageTemplateFromMetaForPhone({
	template,
	phone,
}: {
	template: TMessageTemplateEntityLike;
	phone: TMessageTemplateWhatsappPhone;
}) {
	const metadata = template.metadados.porNumeroTelefone[phone.id];
	if (!metadata?.idExterno) throw new createHttpError.BadRequest("Este telefone ainda não possui template na Meta.");
	if (!phone.conexao.token) throw new createHttpError.BadRequest("Token da conexão WhatsApp não encontrado.");

	const metaTemplate = await getMetaWhatsappTemplate({
		accessToken: phone.conexao.token,
		templateId: metadata.idExterno,
	});
	return buildWhatsappTemplateSyncPatch({
		template,
		connectionId: phone.id,
		metaTemplate,
	});
}

export async function listMetaTemplatesForPhone(phone: TMessageTemplateWhatsappPhone): Promise<TMetaTemplate[]> {
	if (!phone.conexao.token || !phone.whatsappBusinessAccountId) return [];
	return listMetaWhatsappTemplates({
		accessToken: phone.conexao.token,
		whatsappBusinessAccountId: phone.whatsappBusinessAccountId,
	});
}

export function normalizeContentForStorage(content: TMessageTemplateContent) {
	return normalizeMessageTemplateContentParameters(content);
}

export function assertWhatsappValidation(content: TMessageTemplateContent) {
	const validation = validateMessageTemplateForWhatsapp(content);
	if (!validation.valid) {
		throw new createHttpError.BadRequest(
			validation.issues
				.filter((issue) => issue.severity === "error")
				.map((issue) => issue.message)
				.join(", "),
		);
	}
}

export function mergeMetadataPatch(current: TMessageTemplateMetadata, patch: TMessageTemplateMetadataPatch) {
	return {
		...current,
		porNumeroTelefone: {
			...current.porNumeroTelefone,
			...patch.porNumeroTelefone,
		},
	};
}
