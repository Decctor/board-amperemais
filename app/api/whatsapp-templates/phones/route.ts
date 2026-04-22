import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { fetchAndUploadToMeta, isMediaHeaderType } from "@/lib/whatsapp/media-upload";
import { createWhatsappTemplate as createWhatsappTemplateInMeta } from "@/lib/whatsapp/template-management";
import { type TWhatsappTemplate, WhatsappTemplatePhoneSchema } from "@/schemas/whatsapp-templates";
import { db } from "@/services/drizzle";
import { whatsappTemplatePhones } from "@/services/drizzle/schema/whatsapp-templates";
import createHttpError from "http-errors";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import z from "zod";
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

export const POST = appApiHandler({
	POST: createWhatsappTemplatePhoneRoute,
});
