import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { syncWhatsappTemplates as syncWhatsappTemplatesHelper } from "@/lib/whatsapp/template-management";
import { db } from "@/services/drizzle";
import createHttpError from "http-errors";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import z from "zod";

const SyncWhatsappTemplatesInputSchema = z.object({
	telefoneId: z.string({ invalid_type_error: "Tipo inválido para ID do telefone." }).optional().nullable(),
});

export type TSyncWhatsappTemplatesInput = z.infer<typeof SyncWhatsappTemplatesInputSchema>;

async function syncWhatsappTemplates({ input, session }: { input: TSyncWhatsappTemplatesInput; session: TAuthUserSession }) {
	const userOrgId = session.membership?.organizacao.id;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	// Get the organization's WhatsApp connection
	const orgWhatsappConnection = await db.query.whatsappConnections.findFirst({
		where: (fields, { eq }) => eq(fields.organizacaoId, userOrgId),
		with: {
			telefones: true,
		},
	});

	if (!orgWhatsappConnection) throw new createHttpError.NotFound("Conexão WhatsApp não encontrada.");
	if (orgWhatsappConnection.telefones.length === 0) throw new createHttpError.NotFound("Nenhum telefone cadastrado na conexão WhatsApp.");

	const whatsappToken = orgWhatsappConnection.token;

	// Determine which phones to sync
	let phonesToSync = orgWhatsappConnection.telefones;
	if (input.telefoneId) {
		const specificPhone = orgWhatsappConnection.telefones.find((phone) => phone.id === input.telefoneId);
		if (!specificPhone) throw new createHttpError.NotFound("Telefone não encontrado.");
		phonesToSync = [specificPhone];
	}

	console.log(
		`[INFO] [WHATSAPP_TEMPLATES_SYNC_ENDPOINT] Syncing templates for ${phonesToSync.length} phone(s): ${phonesToSync.map((phone) => phone.numero).join(", ")}`,
	);

	// Sync templates for each phone
	const syncResults = await Promise.all(
		phonesToSync.map(async (phone) => {
			try {
				const result = await syncWhatsappTemplatesHelper({
					whatsappToken,
					whatsappBusinessAccountId: phone.whatsappBusinessAccountId,
					phoneId: phone.id,
					organizationId: userOrgId,
					userId: session.user.id,
					db,
				});
				console.log(
					`[INFO] [WHATSAPP_TEMPLATES_SYNC_ENDPOINT] Synced templates for phone ${phone.numero}: ${result.created} created, ${result.updated} updated`,
				);
				return {
					telefoneId: phone.id,
					telefoneNumero: phone.numero,
					success: true,
					...result,
				};
			} catch (error) {
				console.error(`[ERROR] [WHATSAPP_TEMPLATES_SYNC_ENDPOINT] Error syncing phone ${phone.numero}:`, error);
				return {
					telefoneId: phone.id,
					telefoneNumero: phone.numero,
					success: false,
					error: error instanceof Error ? error.message : "Erro desconhecido",
					created: 0,
					updated: 0,
					errors: 0,
					details: [],
				};
			}
		}),
	);

	// Aggregate results
	const totalCreated = syncResults.reduce((sum, r) => sum + r.created, 0);
	const totalUpdated = syncResults.reduce((sum, r) => sum + r.updated, 0);
	const totalErrors = syncResults.reduce((sum, r) => sum + r.errors, 0);
	const failedPhones = syncResults.filter((r) => !r.success).length;

	return {
		data: {
			summary: {
				phonesProcessed: phonesToSync.length,
				phonesFailed: failedPhones,
				totalCreated,
				totalUpdated,
				totalErrors,
			},
			phoneResults: syncResults,
		},
		message:
			failedPhones > 0
				? `Sincronização concluída com ${failedPhones} telefone(s) com erro. ${totalCreated} templates criados, ${totalUpdated} atualizados.`
				: `Sincronização concluída com sucesso! ${totalCreated} templates criados, ${totalUpdated} atualizados.`,
	};
}

export type TSyncWhatsappTemplatesOutput = Awaited<ReturnType<typeof syncWhatsappTemplates>>;

async function syncWhatsappTemplatesRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");

	const payload = await request.json();
	const input = SyncWhatsappTemplatesInputSchema.parse(payload);
	const result = await syncWhatsappTemplates({ input, session });
	return NextResponse.json(result, { status: 200 });
}

export const POST = appApiHandler({
	POST: syncWhatsappTemplatesRoute,
});
