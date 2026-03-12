import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { META_CATEGORY_MAP, META_STATUS_MAP, convertMetaComponentsToLocal, getWhatsappTemplates } from "@/lib/whatsapp/template-management";
import { db } from "@/services/drizzle";
import { messageTemplateGroups, messageTemplateVersionPhones, messageTemplateVersions } from "@/services/drizzle/schema";
import { and, eq } from "drizzle-orm";
import createHttpError from "http-errors";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import z from "zod";

const SyncMessageTemplatesInputSchema = z.object({
	telefoneId: z.string().optional(),
});
export type TSyncMessageTemplatesInput = z.infer<typeof SyncMessageTemplatesInputSchema>;

async function syncMessageTemplates({ input, userId, userOrgId }: { input: TSyncMessageTemplatesInput; userId: string; userOrgId: string }) {
	const orgConnection = await db.query.whatsappConnections.findFirst({
		where: (fields, { eq }) => eq(fields.organizacaoId, userOrgId),
		with: { telefones: true },
	});
	if (!orgConnection) throw new createHttpError.NotFound("Conexão WhatsApp não encontrada.");
	if (orgConnection.tipoConexao !== "META_CLOUD_API" || !orgConnection.token) {
		throw new createHttpError.BadRequest("Sync de templates requer conexão do tipo META_CLOUD_API com token configurado.");
	}

	const phonesToSync = input.telefoneId ? orgConnection.telefones.filter((t) => t.id === input.telefoneId) : orgConnection.telefones;

	if (phonesToSync.length === 0) throw new createHttpError.NotFound("Nenhum telefone encontrado para sincronizar.");

	const summary = { phonesProcessed: 0, phonesFailed: 0, totalCreated: 0, totalUpdated: 0, totalErrors: 0 };
	const phoneResults: Array<{
		telefoneId: string;
		telefoneNumero: string | null;
		success: boolean;
		created: number;
		updated: number;
		errors: number;
	}> = [];

	for (const telefone of phonesToSync) {
		if (!telefone.whatsappBusinessAccountId) {
			phoneResults.push({ telefoneId: telefone.id, telefoneNumero: telefone.numero, success: false, created: 0, updated: 0, errors: 1 });
			summary.phonesFailed++;
			continue;
		}

		let created = 0;
		let updated = 0;
		let errors = 0;

		try {
			const { templates } = await getWhatsappTemplates({
				whatsappToken: orgConnection.token,
				whatsappBusinessAccountId: telefone.whatsappBusinessAccountId,
			});

			for (const metaTemplate of templates) {
				try {
					const localComponents = convertMetaComponentsToLocal(metaTemplate.components);
					const localStatus = META_STATUS_MAP[metaTemplate.status] ?? "PENDENTE";
					const localCategory = META_CATEGORY_MAP[metaTemplate.category] ?? "UTILIDADE";

					// Match by whatsappTemplateId on versionPhones
					const existingVersionPhone = await db.query.messageTemplateVersionPhones.findFirst({
						where: and(
							eq(messageTemplateVersionPhones.whatsappTemplateId, metaTemplate.id),
							eq(messageTemplateVersionPhones.telefoneId, telefone.id),
						),
						with: { versao: true },
					});

					if (existingVersionPhone) {
						// Update status/quality on the existing versionPhone
						await db
							.update(messageTemplateVersionPhones)
							.set({ status: localStatus, dataAtualizacao: new Date() })
							.where(eq(messageTemplateVersionPhones.id, existingVersionPhone.id));

						// Also update the version's componentes in case content changed
						await db
							.update(messageTemplateVersions)
							.set({ categoria: localCategory, componentes: localComponents })
							.where(eq(messageTemplateVersions.id, existingVersionPhone.versaoId));

						updated++;
					} else {
						// Check if a group with this nome already exists for this org
						let groupId: string;
						const existingGroup = await db.query.messageTemplateGroups.findFirst({
							where: and(eq(messageTemplateGroups.nome, metaTemplate.name), eq(messageTemplateGroups.organizacaoId, userOrgId)),
						});

						if (existingGroup) {
							groupId = existingGroup.id;
						} else {
							const [insertedGroup] = await db
								.insert(messageTemplateGroups)
								.values({ nome: metaTemplate.name, organizacaoId: userOrgId, autorId: userId })
								.returning({ id: messageTemplateGroups.id });
							groupId = insertedGroup.id;
						}

						// Check if a version with this metaNome already exists (for another phone)
						const existingVersion = await db.query.messageTemplateVersions.findFirst({
							where: and(eq(messageTemplateVersions.grupoId, groupId), eq(messageTemplateVersions.metaNome, metaTemplate.name)),
						});

						let versaoId: string;
						if (existingVersion) {
							versaoId = existingVersion.id;
							await db
								.update(messageTemplateVersions)
								.set({ categoria: localCategory, componentes: localComponents })
								.where(eq(messageTemplateVersions.id, versaoId));
						} else {
							const [insertedVersion] = await db
								.insert(messageTemplateVersions)
								.values({
									grupoId: groupId,
									versao: 1,
									metaNome: metaTemplate.name,
									categoria: localCategory,
									componentes: localComponents,
									autorId: userId,
								})
								.returning({ id: messageTemplateVersions.id });
							versaoId = insertedVersion.id;
						}

						await db.insert(messageTemplateVersionPhones).values({
							versaoId,
							telefoneId: telefone.id,
							whatsappTemplateId: metaTemplate.id,
							status: localStatus,
							qualidade: "PENDENTE",
						});

						created++;
					}
				} catch (err) {
					console.error(`[ERROR] [MESSAGE_TEMPLATE_SYNC] Error processing template ${metaTemplate.name}:`, err);
					errors++;
				}
			}

			summary.phonesProcessed++;
			summary.totalCreated += created;
			summary.totalUpdated += updated;
			summary.totalErrors += errors;
			phoneResults.push({ telefoneId: telefone.id, telefoneNumero: telefone.numero, success: true, created, updated, errors });
		} catch (err) {
			console.error(`[ERROR] [MESSAGE_TEMPLATE_SYNC] Failed for phone ${telefone.numero}:`, err);
			summary.phonesFailed++;
			phoneResults.push({ telefoneId: telefone.id, telefoneNumero: telefone.numero, success: false, created, updated, errors: errors + 1 });
		}
	}

	return {
		data: { summary, phoneResults },
		message: "Sincronização de templates concluída.",
	};
}
export type TSyncMessageTemplatesOutput = Awaited<ReturnType<typeof syncMessageTemplates>>;

async function syncMessageTemplatesRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");

	const userOrgId = session.membership?.organizacao.id;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	const payload = await request.json();
	const input = SyncMessageTemplatesInputSchema.parse(payload);
	const result = await syncMessageTemplates({ input, userId: session.user.id, userOrgId });
	return NextResponse.json(result);
}

export const POST = appApiHandler({ POST: syncMessageTemplatesRoute });
