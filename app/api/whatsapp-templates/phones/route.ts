import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { fetchAndUploadToMeta, isMediaHeaderType } from "@/lib/whatsapp/media-upload";
import {
	createWhatsappTemplate as createWhatsappTemplateInMeta,
	deleteWhatsappTemplateInMeta,
	syncWhatsappTemplatePhoneFromMeta,
} from "@/lib/whatsapp/template-management";
import { type TWhatsappTemplate, WhatsappTemplatePhoneSchema } from "@/schemas/whatsapp-templates";
import { db } from "@/services/drizzle";
import { whatsappTemplatePhones, whatsappTemplates } from "@/services/drizzle/schema/whatsapp-templates";
import { and, count, eq, ne } from "drizzle-orm";
import createHttpError from "http-errors";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import z from "zod";

const GetWhatsappTemplatePhoneInputSchema = z.object({
	id: z.string({ invalid_type_error: "Tipo inválido para ID do telefone do template." }),
});
export type TGetWhatsappTemplatePhoneInput = z.infer<typeof GetWhatsappTemplatePhoneInputSchema>;

async function getWhatsappTemplatePhone({ input, session }: { input: TGetWhatsappTemplatePhoneInput; session: TAuthUserSession }) {
	const orgId = session.membership?.organizacao.id;
	if (!orgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	const whatsappTemplatePhone = await db.query.whatsappTemplatePhones.findFirst({
		where: (fields, { eq }) => eq(fields.id, input.id),
		with: {
			telefone: {
				columns: {
					id: true,
					numero: true,
					nome: true,
				},
			},
			template: true,
		},
	});
	if (!whatsappTemplatePhone) throw new createHttpError.NotFound("Telefone do template não encontrado.");

	if (whatsappTemplatePhone.template.organizacaoId !== orgId)
		throw new createHttpError.Forbidden("Você não tem permissão para acessar este telefone do template.");
	return { data: { byId: whatsappTemplatePhone } };
}

export type TGetWhatsappTemplatePhoneOutput = Awaited<ReturnType<typeof getWhatsappTemplatePhone>>;
export type TGetWhatsappTemplatePhoneOutputById = Exclude<TGetWhatsappTemplatePhoneOutput["data"], null>["byId"];

async function getWhatsappTemplatePhoneRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para acessar esse recurso.");

	const searchParams = await request.nextUrl.searchParams;
	const input = GetWhatsappTemplatePhoneInputSchema.parse({
		id: searchParams.get("id") ?? undefined,
	});
	const result = await getWhatsappTemplatePhone({ input, session });
	return NextResponse.json(result, { status: 200 });
}

const SyncWhatsappTemplatePhoneInputSchema = z.object({
	id: z.string({ invalid_type_error: "Tipo inválido para ID do telefone do template." }),
});
export type TSyncWhatsappTemplatePhoneInput = z.infer<typeof SyncWhatsappTemplatePhoneInputSchema>;

/** Sincroniza um vínculo com a Meta (Graph API) — Cloud API, como em POST /api/whatsapp-templates/sync. */
async function putWhatsappTemplatePhone({ input, session }: { input: TSyncWhatsappTemplatePhoneInput; session: TAuthUserSession }) {
	const orgId = session.membership?.organizacao.id;
	if (!orgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	const row = await db.query.whatsappTemplatePhones.findFirst({
		where: (fields, { eq: eqF }) => eqF(fields.id, input.id),
		with: {
			template: true,
			telefone: {
				with: {
					conexao: {
						columns: { id: true, token: true, tipoConexao: true },
					},
				},
			},
		},
	});
	if (!row) throw new createHttpError.NotFound("Telefone do template não encontrado.");
	if (row.template.organizacaoId !== orgId) throw new createHttpError.Forbidden("Você não tem permissão para este recurso.");

	const { conexao } = row.telefone;
	if (conexao.tipoConexao !== "META_CLOUD_API") {
		return {
			data: { skipped: true as const, reason: "Não-Cloud" },
			message: "A sincronização com a Meta está disponível apenas para conexões WhatsApp Cloud API.",
		};
	}
	if (!conexao.token) throw new createHttpError.BadRequest("Token da conexão WhatsApp não encontrado.");
	if (!row.telefone.whatsappBusinessAccountId) throw new createHttpError.BadRequest("WhatsApp Business Account ID não encontrado no telefone.");

	const { templateName } = await syncWhatsappTemplatePhoneFromMeta({
		db,
		whatsappToken: conexao.token,
		existingTemplatePhone: {
			id: row.id,
			templateId: row.templateId,
			whatsappTemplateId: row.whatsappTemplateId,
			template: row.template,
		},
	});

	return {
		data: { synced: true as const, templateName },
		message: "Template sincronizado com a Meta.",
	};
}

export type TSyncWhatsappTemplatePhoneOutput = Awaited<ReturnType<typeof putWhatsappTemplatePhone>>;

async function putWhatsappTemplatePhoneRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para acessar esse recurso.");
	const payload = await request.json();
	const input = SyncWhatsappTemplatePhoneInputSchema.parse(payload);
	const result = await putWhatsappTemplatePhone({ input, session });
	return NextResponse.json(result, { status: 200 });
}

const DeleteWhatsappTemplatePhoneInputSchema = z.object({
	id: z.string({ invalid_type_error: "Tipo inválido para ID do telefone do template." }),
});
export type TDeleteWhatsappTemplatePhoneInput = z.infer<typeof DeleteWhatsappTemplatePhoneInputSchema>;

/** Remove o vínculo template/telefone; na Cloud API, apaga o template na Meta se este for o último uso local do mesmo ID. */
async function deleteWhatsappTemplatePhone({ input, session }: { input: TDeleteWhatsappTemplatePhoneInput; session: TAuthUserSession }) {
	const orgId = session.membership?.organizacao.id;
	if (!orgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	const row = await db.query.whatsappTemplatePhones.findFirst({
		where: (fields, { eq: eqF }) => eqF(fields.id, input.id),
		with: {
			template: true,
			telefone: {
				with: {
					conexao: {
						columns: { id: true, token: true, tipoConexao: true },
					},
				},
			},
		},
	});
	if (!row) throw new createHttpError.NotFound("Telefone do template não encontrado.");
	if (row.template.organizacaoId !== orgId) throw new createHttpError.Forbidden("Você não tem permissão para este recurso.");

	const { conexao } = row.telefone;
	const isMetaCloud = conexao.tipoConexao === "META_CLOUD_API" && Boolean(conexao.token && row.telefone.whatsappBusinessAccountId);
	let deleteMetaResult: { success: boolean; message: string } | null = null;

	if (isMetaCloud && row.whatsappTemplateId) {
		const [otherWithSameMeta] = await db
			.select({ n: count() })
			.from(whatsappTemplatePhones)
			.where(and(eq(whatsappTemplatePhones.whatsappTemplateId, row.whatsappTemplateId), ne(whatsappTemplatePhones.id, row.id)));
		if (otherWithSameMeta && otherWithSameMeta.n === 0) {
			deleteMetaResult = await deleteWhatsappTemplateInMeta({
				whatsappToken: conexao.token!,
				whatsappBusinessAccountId: row.telefone.whatsappBusinessAccountId!,
				templateName: row.template.nome,
			});
		}
	}

	const [siblings] = await db.select({ n: count() }).from(whatsappTemplatePhones).where(eq(whatsappTemplatePhones.templateId, row.templateId));

	if (!siblings || siblings.n < 1) {
		throw new createHttpError.InternalServerError("Estado inconsistente ao excluir o vínculo do template.");
	}
	const isLastChildForParent = siblings.n === 1;

	await db.delete(whatsappTemplatePhones).where(eq(whatsappTemplatePhones.id, row.id));
	if (isLastChildForParent) {
		await db.delete(whatsappTemplates).where(eq(whatsappTemplates.id, row.templateId));
	}

	return {
		data: { deleted: true as const, removedFromMeta: deleteMetaResult !== null, deleteMeta: deleteMetaResult },
		message: deleteMetaResult != null ? "Vínculo removido e template excluído na Meta." : "Vínculo do template com o telefone removido.",
	};
}

export type TDeleteWhatsappTemplatePhoneOutput = Awaited<ReturnType<typeof deleteWhatsappTemplatePhone>>;

async function deleteWhatsappTemplatePhoneRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para acessar esse recurso.");
	const searchParams = await request.nextUrl.searchParams;
	const input = DeleteWhatsappTemplatePhoneInputSchema.parse({
		id: searchParams.get("id") ?? undefined,
	});
	const result = await deleteWhatsappTemplatePhone({ input, session });
	return NextResponse.json(result, { status: 200 });
}

export const CreateWhatsappTemplatePhoneInputSchema = z.object({
	whatsappTemplatePhone: WhatsappTemplatePhoneSchema.omit({
		status: true,
		qualidade: true,
		rejeicao: true,
		dataInsercao: true,
		dataAtualizacao: true,
	}),
});

export type TCreateWhatsappTemplatePhoneInput = z.infer<typeof CreateWhatsappTemplatePhoneInputSchema>;

async function createWhatsappTemplatePhone({ input, session }: { input: TCreateWhatsappTemplatePhoneInput; session: TAuthUserSession }) {
	const orgId = session.membership?.organizacao.id;
	if (!orgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	const orgWhatsappConnections = await db.query.whatsappConnections.findMany({
		where: (fields, { eq }) => eq(fields.organizacaoId, orgId),
		columns: {
			id: true,
		},
	});
	const orgConnectionIds = orgWhatsappConnections.map((connection) => connection.id);
	const orgWhatsappConnectionPhone = await db.query.whatsappConnectionPhones.findFirst({
		where: (fields, { and, eq, inArray }) => and(eq(fields.id, input.whatsappTemplatePhone.telefoneId), inArray(fields.conexaoId, orgConnectionIds)),
		with: {
			conexao: {
				columns: {
					id: true,
					token: true,
					tipoConexao: true,
				},
			},
		},
	});
	if (!orgWhatsappConnectionPhone) throw new createHttpError.NotFound("Telefone não encontrado na conexão WhatsApp.");

	const whatsappTemplate = await db.query.whatsappTemplates.findFirst({
		where: (fields, { and, eq }) => and(eq(fields.id, input.whatsappTemplatePhone.templateId), eq(fields.organizacaoId, orgId)),
	});

	if (!whatsappTemplate) throw new createHttpError.NotFound("Oops, template requisitado para vincular ao telefone não encontrado.");

	let metaWhatsappTemplateId: string | null = null;
	if (
		orgWhatsappConnectionPhone.conexao.tipoConexao === "META_CLOUD_API" &&
		orgWhatsappConnectionPhone.conexao.token &&
		orgWhatsappConnectionPhone.whatsappBusinessAccountId
	) {
		let templateToCreate: Omit<TWhatsappTemplate, "autorId" | "dataInsercao"> = whatsappTemplate;

		if (whatsappTemplate.componentes.cabecalho) {
			const header = whatsappTemplate.componentes.cabecalho;

			if (isMediaHeaderType(header.tipo) && header.conteudo) {
				try {
					const metaAppId = process.env.NEXT_PUBLIC_META_APP_ID;
					if (!metaAppId) {
						throw new createHttpError.InternalServerError("Meta app ID não configurado.");
					}

					// Upload media to Meta and get header_handle
					const { headerHandle } = await fetchAndUploadToMeta({
						fileUrl: header.conteudo,
						appId: metaAppId,
						accessToken: orgWhatsappConnectionPhone.conexao.token,
					});
					// Create a copy of the template with the header_handle in exemplo field
					templateToCreate = {
						...whatsappTemplate,
						componentes: {
							...whatsappTemplate.componentes,
							cabecalho: {
								...header,
								exemplo: headerHandle,
							},
						},
					};

					console.log(`[INFO] [WHATSAPP_TEMPLATE_CREATE] Media uploaded successfully. Header handle: ${headerHandle}`);
				} catch (uploadError) {
					console.error("[ERROR] [WHATSAPP_TEMPLATE_CREATE] Failed to upload media to Meta:", uploadError);
					throw new createHttpError.BadRequest(
						`Erro ao fazer upload da mídia para o WhatsApp: ${uploadError instanceof Error ? uploadError.message : "Erro desconhecido"}`,
					);
				}
			}
		}

		const metaResponse = await createWhatsappTemplateInMeta({
			whatsappToken: orgWhatsappConnectionPhone.conexao.token,
			whatsappBusinessAccountId: orgWhatsappConnectionPhone.whatsappBusinessAccountId,
			template: templateToCreate,
		});
		metaWhatsappTemplateId = metaResponse.whatsappTemplateId;
	}

	const [insertedWhatsappTemplatePhone] = await db
		.insert(whatsappTemplatePhones)
		.values({
			templateId: whatsappTemplate.id,
			telefoneId: orgWhatsappConnectionPhone.id,
			whatsappTemplateId: metaWhatsappTemplateId,
			status: metaWhatsappTemplateId ? "PENDENTE" : "APROVADO",
			qualidade: metaWhatsappTemplateId ? "PENDENTE" : "ALTA",
		})
		.returning({ id: whatsappTemplatePhones.id });
	if (!insertedWhatsappTemplatePhone) throw new createHttpError.InternalServerError("Erro ao vincular template ao telefone.");

	return {
		data: {
			insertedId: insertedWhatsappTemplatePhone.id,
		},
		message: "Template vinculado ao telefone com sucesso.",
	};
}
export type TCreateWhatsappTemplatePhoneOutput = Awaited<ReturnType<typeof createWhatsappTemplatePhone>>;

async function createWhatsappTemplatePhoneRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para acessar esse recurso.");

	const payload = await request.json();
	const input = CreateWhatsappTemplatePhoneInputSchema.parse(payload);
	const result = await createWhatsappTemplatePhone({ input, session });
	return NextResponse.json(result, { status: 201 });
}

export const GET = appApiHandler({
	GET: getWhatsappTemplatePhoneRoute,
});
export const POST = appApiHandler({
	POST: createWhatsappTemplatePhoneRoute,
});
export const PUT = appApiHandler({
	PUT: putWhatsappTemplatePhoneRoute,
});
export const DELETE = appApiHandler({
	DELETE: deleteWhatsappTemplatePhoneRoute,
});
