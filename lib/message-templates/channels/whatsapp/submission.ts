import type { TOrganizationWhatsappPhone } from "@/lib/whatsapp/organization-phones";
import { fetchAndUploadToMeta } from "@/lib/whatsapp/media-upload";
import type { TMessageTemplateContent, TMessageTemplateMetadata } from "@/schemas/message-templates";
import createHttpError from "http-errors";
import type { TMessageTemplateEntityLike } from "../../types";
import { validateMessageTemplateForWhatsapp } from "../../validation";
import { buildWhatsappTemplateApprovalPayload } from "./approval-payload";
import { createMetaWhatsappTemplate, deleteMetaWhatsappTemplate, editMetaWhatsappTemplate } from "./meta-client";

export function assertMessageTemplateValidForWhatsapp(content: TMessageTemplateContent) {
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
	phone: TOrganizationWhatsappPhone;
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
	phones: TOrganizationWhatsappPhone[];
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
