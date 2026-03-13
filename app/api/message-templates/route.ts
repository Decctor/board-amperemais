import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { fetchAndUploadToMeta, isMediaHeaderType } from "@/lib/whatsapp/media-upload";
import { createWhatsappTemplate as createWhatsappTemplateInMeta } from "@/lib/whatsapp/template-management";
import { CreateMessageTemplateInputSchema, AddMessageTemplateVersionInputSchema } from "@/schemas/message-templates";
import type { TWhatsappTemplateCategoryEnum } from "@/schemas/enums";
import type { TWhatsappTemplateComponents } from "@/schemas/whatsapp-templates";
import { db } from "@/services/drizzle";
import { messageTemplateGroups, messageTemplateVersionPhones, messageTemplateVersions } from "@/services/drizzle/schema";
import { and, desc, eq, max } from "drizzle-orm";
import createHttpError from "http-errors";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

// ─── Status / quality priority helpers ───────────────────────────────────────

type TStatus = "RASCUNHO" | "PENDENTE" | "APROVADO" | "REJEITADO" | "PAUSADO" | "DESABILITADO";
type TQuality = "PENDENTE" | "ALTA" | "MEDIA" | "BAIXA";

const STATUS_PRIORITY: Record<TStatus, number> = {
	REJEITADO: 6,
	DESABILITADO: 5,
	PAUSADO: 4,
	PENDENTE: 3,
	RASCUNHO: 2,
	APROVADO: 1,
};
const QUALITY_PRIORITY: Record<TQuality, number> = { BAIXA: 4, MEDIA: 3, PENDENTE: 2, ALTA: 1 };

function worstStatus(statuses: TStatus[]): TStatus {
	if (statuses.length === 0) return "RASCUNHO";
	return statuses.reduce((worst, s) => (STATUS_PRIORITY[s] > STATUS_PRIORITY[worst] ? s : worst));
}
function worstQuality(qualities: TQuality[]): TQuality {
	if (qualities.length === 0) return "PENDENTE";
	return qualities.reduce((worst, q) => (QUALITY_PRIORITY[q] > QUALITY_PRIORITY[worst] ? q : worst));
}

// ─── Shared: push a version to Meta for all phones ───────────────────────────

async function pushVersionToPhones({
	metaNome,
	categoria,
	componentes,
	versaoId,
	whatsappToken,
	tipoConexao,
	telefones,
}: {
	metaNome: string;
	categoria: TWhatsappTemplateCategoryEnum;
	componentes: TWhatsappTemplateComponents;
	versaoId: string;
	whatsappToken: string | null | undefined;
	tipoConexao: string;
	telefones: Array<{ id: string; numero: string | null; whatsappBusinessAccountId: string | null }>;
}) {
	const phoneResults: Array<{ telefoneId: string; whatsappTemplateId: string | null; error?: string }> = [];

	for (const telefone of telefones) {
		try {
			let metaWhatsappTemplateId: string | null = null;

			if (tipoConexao === "META_CLOUD_API" && whatsappToken && telefone.whatsappBusinessAccountId) {
				let componentesToCreate = componentes;

				// Upload media header if needed
				if (componentes.cabecalho && isMediaHeaderType(componentes.cabecalho.tipo) && componentes.cabecalho.conteudo) {
					const metaAppId = process.env.NEXT_PUBLIC_META_APP_ID;
					if (!metaAppId) throw new createHttpError.InternalServerError("Meta app ID não configurado.");

					const { headerHandle } = await fetchAndUploadToMeta({
						fileUrl: componentes.cabecalho.conteudo,
						appId: metaAppId,
						accessToken: whatsappToken,
					});
					componentesToCreate = {
						...componentes,
						cabecalho: { ...componentes.cabecalho, exemplo: headerHandle },
					};
				}

				const metaResponse = await createWhatsappTemplateInMeta({
					whatsappToken,
					whatsappBusinessAccountId: telefone.whatsappBusinessAccountId,
					template: {
						nome: metaNome,
						categoria,
						componentes: componentesToCreate,
					},
				});
				metaWhatsappTemplateId = metaResponse.whatsappTemplateId;
			}

			await db.insert(messageTemplateVersionPhones).values({
				versaoId,
				telefoneId: telefone.id,
				whatsappTemplateId: metaWhatsappTemplateId,
				status: metaWhatsappTemplateId ? "PENDENTE" : "APROVADO",
				qualidade: metaWhatsappTemplateId ? "PENDENTE" : "ALTA",
			});

			phoneResults.push({ telefoneId: telefone.id, whatsappTemplateId: metaWhatsappTemplateId });
		} catch (error) {
			console.error(`[ERROR] [MESSAGE_TEMPLATE_CREATE] Failed for phone ${telefone.numero}:`, error);
			// Insert a draft record so the phone exists in DB even if Meta failed
			await db.insert(messageTemplateVersionPhones).values({
				versaoId,
				telefoneId: telefone.id,
				whatsappTemplateId: null,
				status: "RASCUNHO",
				qualidade: "PENDENTE",
			});
			phoneResults.push({
				telefoneId: telefone.id,
				whatsappTemplateId: null,
				error: error instanceof Error ? error.message : "Erro desconhecido",
			});
		}
	}

	return phoneResults;
}

// ─── POST: Create group + N versions + push to Meta ──────────────────────────

export type TCreateMessageTemplateInput = z.infer<typeof CreateMessageTemplateInputSchema>;

async function createMessageTemplate({ input, session }: { input: TCreateMessageTemplateInput; session: TAuthUserSession }) {
	const userOrgId = session.membership?.organizacao.id;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	const orgWhatsappConnection = await db.query.whatsappConnections.findFirst({
		where: (fields, { eq }) => eq(fields.organizacaoId, userOrgId),
		with: { telefones: true },
	});
	if (!orgWhatsappConnection) throw new createHttpError.NotFound("Conexão WhatsApp não encontrada.");
	if (orgWhatsappConnection.telefones.length === 0) throw new createHttpError.NotFound("Nenhum telefone cadastrado na conexão WhatsApp.");

	// 1. Create group
	const [insertedGroup] = await db
		.insert(messageTemplateGroups)
		.values({
			nome: input.grupo.nome,
			organizacaoId: userOrgId,
			autorId: session.user.id,
		})
		.returning({ id: messageTemplateGroups.id });

	// 2. Create each version and push to all phones
	const versionResults: Array<{
		versao: number;
		metaNome: string;
		versaoId: string;
		phoneResults: Array<{ telefoneId: string; whatsappTemplateId: string | null; error?: string }>;
	}> = [];

	for (let i = 0; i < input.versoes.length; i++) {
		const versaoInput = input.versoes[i];
		const versaoNum = i + 1;
		const metaNome = `${input.grupo.nome}_v${versaoNum}`;

		const [insertedVersion] = await db
			.insert(messageTemplateVersions)
			.values({
				grupoId: insertedGroup.id,
				versao: versaoNum,
				metaNome,
				categoria: versaoInput.categoria,
				componentes: versaoInput.componentes,
				autorId: session.user.id,
			})
			.returning({ id: messageTemplateVersions.id });

		const phoneResults = await pushVersionToPhones({
			metaNome,
			categoria: versaoInput.categoria,
			componentes: versaoInput.componentes,
			versaoId: insertedVersion.id,
			whatsappToken: orgWhatsappConnection.token,
			tipoConexao: orgWhatsappConnection.tipoConexao,
			telefones: orgWhatsappConnection.telefones,
		});

		versionResults.push({ versao: versaoNum, metaNome, versaoId: insertedVersion.id, phoneResults });
	}

	const totalFailed = versionResults.flatMap((v) => v.phoneResults).filter((r) => r.error).length;
	return {
		data: { insertedId: insertedGroup.id, versionResults },
		message: totalFailed > 0 ? `Grupo criado com ${totalFailed} falha(s) em telefones.` : "Grupo de templates criado com sucesso.",
	};
}
export type TCreateMessageTemplateOutput = Awaited<ReturnType<typeof createMessageTemplate>>;

async function createMessageTemplateRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	const payload = await request.json();
	const input = CreateMessageTemplateInputSchema.parse(payload);
	const result = await createMessageTemplate({ input, session });
	return NextResponse.json(result, { status: 201 });
}

// ─── PUT: Add a new version to an existing group ─────────────────────────────

export type TAddMessageTemplateVersionInput = z.infer<typeof AddMessageTemplateVersionInputSchema>;

async function addMessageTemplateVersion({ input, session }: { input: TAddMessageTemplateVersionInput; session: TAuthUserSession }) {
	const userOrgId = session.membership?.organizacao.id;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	const group = await db.query.messageTemplateGroups.findFirst({
		where: and(eq(messageTemplateGroups.id, input.grupoId), eq(messageTemplateGroups.organizacaoId, userOrgId)),
	});
	if (!group) throw new createHttpError.NotFound("Grupo de templates não encontrado.");

	const orgWhatsappConnection = await db.query.whatsappConnections.findFirst({
		where: (fields, { eq }) => eq(fields.organizacaoId, userOrgId),
		with: { telefones: true },
	});
	if (!orgWhatsappConnection) throw new createHttpError.NotFound("Conexão WhatsApp não encontrada.");

	// Find next versao number
	const [{ maxVersao }] = await db
		.select({ maxVersao: max(messageTemplateVersions.versao) })
		.from(messageTemplateVersions)
		.where(eq(messageTemplateVersions.grupoId, input.grupoId));

	const nextVersao = (maxVersao ?? 0) + 1;
	const metaNome = `${group.nome}_v${nextVersao}`;

	const [insertedVersion] = await db
		.insert(messageTemplateVersions)
		.values({
			grupoId: input.grupoId,
			versao: nextVersao,
			metaNome,
			categoria: input.versao.categoria,
			componentes: input.versao.componentes,
			autorId: session.user.id,
		})
		.returning({ id: messageTemplateVersions.id });

	const phoneResults = await pushVersionToPhones({
		metaNome,
		categoria: input.versao.categoria,
		componentes: input.versao.componentes,
		versaoId: insertedVersion.id,
		whatsappToken: orgWhatsappConnection.token,
		tipoConexao: orgWhatsappConnection.tipoConexao,
		telefones: orgWhatsappConnection.telefones,
	});

	const failed = phoneResults.filter((r) => r.error).length;
	return {
		data: { versaoId: insertedVersion.id, versao: nextVersao, metaNome, phoneResults },
		message: failed > 0 ? `Versão adicionada com ${failed} falha(s) em telefones.` : "Versão adicionada com sucesso.",
	};
}
export type TAddMessageTemplateVersionOutput = Awaited<ReturnType<typeof addMessageTemplateVersion>>;

async function addMessageTemplateVersionRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	const payload = await request.json();
	const input = AddMessageTemplateVersionInputSchema.parse(payload);
	const result = await addMessageTemplateVersion({ input, session });
	return NextResponse.json(result, { status: 201 });
}

// ─── GET: List groups or get by id ───────────────────────────────────────────

const GetMessageTemplatesInputSchema = z.object({
	id: z.string().optional(),
	search: z.string().optional(),
	page: z.coerce.number().int().min(1).default(1),
});
export type TGetMessageTemplatesInput = z.infer<typeof GetMessageTemplatesInputSchema>;

async function getMessageTemplates({ input, session }: { input: TGetMessageTemplatesInput; session: TAuthUserSession }) {
	const userOrgId = session.membership?.organizacao.id;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	// ─── By ID: full detail with all versions + per-phone statuses ──────────
	if (input.id) {
		const group = await db.query.messageTemplateGroups.findFirst({
			where: and(eq(messageTemplateGroups.id, input.id), eq(messageTemplateGroups.organizacaoId, userOrgId)),
			with: {
				versoes: {
					orderBy: [desc(messageTemplateVersions.versao)],
					with: {
						telefones: {
							with: {
								telefone: true,
							},
						},
					},
				},
			},
		});
		if (!group) throw new createHttpError.NotFound("Grupo de templates não encontrado.");

		const versoesWithStatus = group.versoes.map((v) => {
			const statuses = v.telefones.map((tp) => tp.status as TStatus);
			const qualities = v.telefones.map((tp) => tp.qualidade as TQuality);
			return {
				id: v.id,
				grupoId: v.grupoId,
				versao: v.versao,
				metaNome: v.metaNome,
				categoria: v.categoria,
				componentes: v.componentes,
				dataInsercao: v.dataInsercao,
				statusGeral: worstStatus(statuses),
				qualidadeGeral: worstQuality(qualities),
				telefones: v.telefones.map((tp) => ({
					id: tp.id,
					versaoId: tp.versaoId,
					telefoneId: tp.telefoneId,
					telefoneNumero: tp.telefone?.numero ?? undefined,
					telefoneName: tp.telefone?.nome ?? undefined,
					whatsappTemplateId: tp.whatsappTemplateId,
					status: tp.status,
					qualidade: tp.qualidade,
					rejeicao: tp.rejeicao,
				})),
			};
		});

		const allStatuses = versoesWithStatus.flatMap((v) => v.telefones.map((tp) => tp.status as TStatus));
		const allQualities = versoesWithStatus.flatMap((v) => v.telefones.map((tp) => tp.qualidade as TQuality));
		const approvedVariantCount = versoesWithStatus.filter((v) => v.telefones.some((tp) => tp.status === "APROVADO")).length;

		return {
			data: {
				byId: {
					id: group.id,
					organizacaoId: group.organizacaoId,
					nome: group.nome,
					dataInsercao: group.dataInsercao,
					versoes: versoesWithStatus,
					statusGeral: worstStatus(allStatuses),
					qualidadeGeral: worstQuality(allQualities),
					variantCount: group.versoes.length,
					approvedVariantCount,
				},
				default: null,
			},
			message: "Grupo de templates encontrado.",
		};
	}

	// ─── List: groups with aggregate status ─────────────────────────────────
	const PAGE_SIZE = 20;
	const offset = (input.page - 1) * PAGE_SIZE;

	const groups = await db.query.messageTemplateGroups.findMany({
		where: eq(messageTemplateGroups.organizacaoId, userOrgId),
		orderBy: [desc(messageTemplateGroups.dataInsercao)],
		limit: PAGE_SIZE,
		offset,
		with: {
			versoes: {
				with: {
					telefones: true,
				},
			},
		},
	});

	const list = groups.map((group) => {
		const allStatuses = group.versoes.flatMap((v) => v.telefones.map((tp) => tp.status as TStatus));
		const allQualities = group.versoes.flatMap((v) => v.telefones.map((tp) => tp.qualidade as TQuality));
		const approvedVariantCount = group.versoes.filter((v) => v.telefones.some((tp) => tp.status === "APROVADO")).length;

		return {
			id: group.id,
			organizacaoId: group.organizacaoId,
			nome: group.nome,
			dataInsercao: group.dataInsercao,
			variantCount: group.versoes.length,
			approvedVariantCount,
			statusGeral: worstStatus(allStatuses),
			qualidadeGeral: worstQuality(allQualities),
		};
	});

	return {
		data: {
			byId: null,
			default: list,
		},
		message: "Grupos de templates encontrados.",
	};
}
export type TGetMessageTemplatesOutput = Awaited<ReturnType<typeof getMessageTemplates>>;

async function getMessageTemplatesRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	const { searchParams } = new URL(request.url);
	const input = GetMessageTemplatesInputSchema.parse({
		id: searchParams.get("id") ?? undefined,
		search: searchParams.get("search") ?? undefined,
		page: searchParams.get("page") ?? 1,
	});
	const result = await getMessageTemplates({ input, session });
	return NextResponse.json(result);
}

// ─── Exports ─────────────────────────────────────────────────────────────────

export const GET = appApiHandler({ GET: getMessageTemplatesRoute });
export const POST = appApiHandler({ POST: createMessageTemplateRoute });
export const PUT = appApiHandler({ PUT: addMessageTemplateVersionRoute });
