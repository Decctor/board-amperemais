import { type TExternalActorContext, authenticateExternalRequest, requireExternalScope } from "@/lib/access/authentication";
import { appApiHandler } from "@/lib/app-api";
import { db } from "@/services/drizzle";
import { agentPrinters } from "@/services/drizzle/schema";
import { and, eq, notInArray } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const SyncAgentPrintersInputSchema = z.object({
	impressoras: z.array(
		z.object({
			nomeSistema: z
				.string({
					required_error: "Nome de sistema da impressora não informado.",
					invalid_type_error: "Tipo não válido para o nome de sistema da impressora.",
				})
				.min(1, "Nome de sistema da impressora não pode ser vazio."),
			metadados: z
				.object({
					nomeExibicao: z.string({ invalid_type_error: "Tipo não válido para o nome de exibição." }).optional().nullable(),
					descricao: z.string({ invalid_type_error: "Tipo não válido para a descrição." }).optional().nullable(),
					padraoDoSistema: z.boolean({ invalid_type_error: "Tipo não válido para o padrão do sistema." }).optional().nullable(),
				})
				.optional()
				.nullable(),
		}),
		{ required_error: "Lista de impressoras não informada.", invalid_type_error: "Tipo não válido para a lista de impressoras." },
	),
});
export type TSyncAgentPrintersInput = z.infer<typeof SyncAgentPrintersInputSchema>;

type TSyncAgentPrintersParams = {
	input: TSyncAgentPrintersInput;
	actor: TExternalActorContext;
};
// Sync das impressoras descobertas no SO: upsert por (principal, nome_sistema); as que sumiram
// ficam disponivel=false (só as DRIVER_SO — térmicas de rede ZPL não aparecem na varredura do SO
// e serão cadastradas pelo dashboard). Impressora nova nasce sem finalidades: só roteia depois
// que o dashboard atribuir — configuração explícita, nunca adivinhada.
async function syncAgentPrinters({ input, actor }: TSyncAgentPrintersParams) {
	const now = new Date();
	const incomingNames = input.impressoras.map((printer) => printer.nomeSistema);

	await db.transaction(async (tx) => {
		for (const printer of input.impressoras) {
			await tx
				.insert(agentPrinters)
				.values({
					organizacaoId: actor.organizationId,
					principalId: actor.principalId,
					nomeSistema: printer.nomeSistema,
					driver: "DRIVER_SO",
					metadados: printer.metadados ?? null,
					ultimaSincronizacao: now,
				})
				.onConflictDoUpdate({
					target: [agentPrinters.principalId, agentPrinters.nomeSistema],
					set: {
						disponivel: true,
						metadados: printer.metadados ?? null,
						ultimaSincronizacao: now,
						dataAtualizacao: now,
					},
				});
		}

		const missingCondition = and(
			eq(agentPrinters.principalId, actor.principalId),
			eq(agentPrinters.driver, "DRIVER_SO"),
			eq(agentPrinters.disponivel, true),
			incomingNames.length > 0 ? notInArray(agentPrinters.nomeSistema, incomingNames) : undefined,
		);
		await tx.update(agentPrinters).set({ disponivel: false, dataAtualizacao: now }).where(missingCondition);
	});

	const printers = await db.query.agentPrinters.findMany({
		where: eq(agentPrinters.principalId, actor.principalId),
		columns: {
			id: true,
			nomeSistema: true,
			apelido: true,
			driver: true,
			finalidades: true,
			ativa: true,
			disponivel: true,
			ultimaSincronizacao: true,
		},
		orderBy: (fields, { asc }) => asc(fields.dataInsercao),
	});

	return { data: { impressoras: printers }, message: "Impressoras sincronizadas com sucesso." };
}
export type TSyncAgentPrintersOutput = Awaited<ReturnType<typeof syncAgentPrinters>>;

async function syncAgentPrintersRoute(request: NextRequest) {
	const actor = await authenticateExternalRequest(request);
	requireExternalScope(actor, "desktop-agent:printers:sync");
	const input = SyncAgentPrintersInputSchema.parse(await request.json());
	const result = await syncAgentPrinters({ input, actor });
	return NextResponse.json(result, { status: 200 });
}

export const POST = appApiHandler({ POST: syncAgentPrintersRoute });
