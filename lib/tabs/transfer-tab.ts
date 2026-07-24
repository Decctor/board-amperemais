import { db } from "@/services/drizzle";
import { tabs } from "@/services/drizzle/schema";
import { and, eq, ne } from "drizzle-orm";
import createHttpError from "http-errors";
import { acquireTabOpeningLock, resolveServiceSettings } from "./utils";

export type TTransferTabInput = {
	tabId: string;
	servicePointDestinoId: string;
	motivo?: string | null;
};

/**
 * Transfere uma conta aberta para outro ponto de atendimento, preservando pedidos,
 * venda rascunho, itens e cliente. Operacao explicita e auditada em metadados.
 */
export async function transferTab({ orgId, userId, input }: { orgId: string; userId: string; input: TTransferTabInput }) {
	const settings = await resolveServiceSettings({ orgId });

	const destination = await db.query.servicePoints.findFirst({
		where: (fields, { and, eq }) => and(eq(fields.id, input.servicePointDestinoId), eq(fields.organizacaoId, orgId)),
		columns: { id: true, ativo: true, rotulo: true },
	});
	if (!destination) throw new createHttpError.NotFound("Ponto de atendimento de destino nao encontrado.");
	if (!destination.ativo) throw new createHttpError.BadRequest("Ponto de atendimento de destino inativo.");

	return db.transaction(async (tx) => {
		// Mesma guarda da abertura: serializa contra abertura/transferencia concorrente no destino.
		await acquireTabOpeningLock(tx, { orgId, servicePointId: destination.id });

		const [tab] = await tx
			.select()
			.from(tabs)
			.where(and(eq(tabs.id, input.tabId), eq(tabs.organizacaoId, orgId)))
			.for("update");

		if (!tab) throw new createHttpError.NotFound("Conta nao encontrada.");
		if (tab.status !== "ABERTA") throw new createHttpError.BadRequest("Somente contas abertas podem ser transferidas.");
		if (tab.servicePointId === destination.id) throw new createHttpError.BadRequest("A conta ja esta neste ponto de atendimento.");

		if (settings.contas.maxAbertasPorPonto !== null) {
			const openTabsAtDestination = await tx
				.select({ id: tabs.id })
				.from(tabs)
				.where(and(eq(tabs.organizacaoId, orgId), eq(tabs.servicePointId, destination.id), eq(tabs.status, "ABERTA"), ne(tabs.id, tab.id)));
			if (openTabsAtDestination.length >= settings.contas.maxAbertasPorPonto) {
				throw new createHttpError.BadRequest("O ponto de destino ja atingiu o limite de contas abertas.");
			}
		}

		const previousMetadata = (tab.metadados as Record<string, unknown> | null) ?? {};
		const previousTransfers = Array.isArray(previousMetadata.transferencias) ? previousMetadata.transferencias : [];

		await tx
			.update(tabs)
			.set({
				servicePointId: destination.id,
				metadados: {
					...previousMetadata,
					transferencias: [
						...previousTransfers,
						{
							dePontoId: tab.servicePointId,
							paraPontoId: destination.id,
							usuarioId: userId,
							motivo: input.motivo ?? null,
							data: new Date().toISOString(),
						},
					],
				},
			})
			.where(eq(tabs.id, tab.id));

		return { tabId: tab.id, servicePointId: destination.id };
	});
}
export type TTransferTabResult = Awaited<ReturnType<typeof transferTab>>;
