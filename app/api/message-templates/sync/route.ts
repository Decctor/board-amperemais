import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { db } from "@/services/drizzle";
import { messageTemplates } from "@/services/drizzle/schema";
import { and, eq } from "drizzle-orm";
import createHttpError from "http-errors";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import z from "zod";
import { buildRemoteTemplateIndexes, buildWhatsappTemplateSyncPatch, resolveRemoteTemplate } from "@/lib/message-templates";
import { getOrganizationWhatsappPhones, listMetaTemplatesForPhone } from "../_lib";

const SyncMessageTemplatesInputSchema = z.object({
	telefoneId: z.string({ invalid_type_error: "Tipo inválido para ID do telefone." }).optional().nullable(),
	messageTemplateId: z.string({ invalid_type_error: "Tipo inválido para ID do template." }).optional().nullable(),
});
export type TSyncMessageTemplatesInput = z.infer<typeof SyncMessageTemplatesInputSchema>;

async function syncMessageTemplates({ input, session }: { input: TSyncMessageTemplatesInput; session: TAuthUserSession }) {
	const organizationId = session.membership?.organizacao.id;
	if (!organizationId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	const phones = await getOrganizationWhatsappPhones(organizationId);
	const phonesToSync = input.telefoneId ? phones.filter((phone) => phone.id === input.telefoneId) : phones;
	if (input.telefoneId && phonesToSync.length === 0) throw new createHttpError.NotFound("Telefone não encontrado.");

	const templates = input.messageTemplateId
		? await db.query.messageTemplates.findMany({
				where: and(eq(messageTemplates.id, input.messageTemplateId), eq(messageTemplates.organizacaoId, organizationId)),
			})
		: await db.query.messageTemplates.findMany({
				where: eq(messageTemplates.organizacaoId, organizationId),
			});

	if (input.messageTemplateId && templates.length === 0) throw new createHttpError.NotFound("Template não encontrado.");

	const details: Array<{ telefoneId: string; templateName: string; action: "updated" | "skipped" | "error"; error?: string }> = [];
	let updated = 0;
	let skipped = 0;
	let errors = 0;

	for (const phone of phonesToSync) {
		const remoteTemplates = await listMetaTemplatesForPhone(phone);
		const remoteIndexes = buildRemoteTemplateIndexes(remoteTemplates);

		for (const template of templates) {
			const metadataForPhone = template.metadados.porNumeroTelefone[phone.id];
			const remote = resolveRemoteTemplate({ indexes: remoteIndexes, template, metadataForPhone });

			if (!remote) {
				skipped += 1;
				details.push({ telefoneId: phone.id, templateName: template.nome, action: "skipped" });
				continue;
			}

			try {
				const patch = buildWhatsappTemplateSyncPatch({
					template,
					connectionId: phone.id,
					metaTemplate: remote,
					preserveLocalContent: true,
				});

				await db
					.update(messageTemplates)
					.set({
						nome: patch.nome,
						categoria: patch.categoria,
						linguagem: patch.linguagem,
						conteudo: patch.conteudo,
						metadados: patch.metadados,
						dataAtualizacao: new Date(),
					})
					.where(eq(messageTemplates.id, template.id));
				updated += 1;
				details.push({ telefoneId: phone.id, templateName: template.nome, action: "updated" });
			} catch (error) {
				errors += 1;
				details.push({ telefoneId: phone.id, templateName: template.nome, action: "error", error: error instanceof Error ? error.message : "Erro desconhecido" });
			}
		}
	}

	return {
		data: {
			summary: { phonesProcessed: phonesToSync.length, updated, skipped, errors },
			details,
		},
		message: `Sincronização concluída. ${updated} atualizado(s), ${skipped} ignorado(s), ${errors} erro(s).`,
	};
}
export type TSyncMessageTemplatesOutput = Awaited<ReturnType<typeof syncMessageTemplates>>;

async function syncMessageTemplatesRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	const input = SyncMessageTemplatesInputSchema.parse(await request.json());
	const result = await syncMessageTemplates({ input, session });
	return NextResponse.json(result, { status: 200 });
}

export const POST = appApiHandler({ POST: syncMessageTemplatesRoute });
