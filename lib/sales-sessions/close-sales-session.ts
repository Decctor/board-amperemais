import { db } from "@/services/drizzle";
import { fiscalOutboundDocuments, sales, salesSessionReconciliations, salesSessions } from "@/services/drizzle/schema";
import type { TCloseSalesSessionInput } from "@/schemas/sales-sessions";
import type { TPaymentMethodEnum } from "@/schemas/enums";
import { and, eq, ne } from "drizzle-orm";
import createHttpError from "http-errors";
import { computeSessionExpectedByMethod } from "./compute-session-expected-by-method";

/**
 * Fecha uma sessão de venda: congela o snapshot do esperado por método, grava a conferência física
 * informada (por método), calcula a diferença e move o status para FECHADA.
 *
 * O esperado é lido EXCLUSIVAMENTE de `financialTransactions.sessaoVendaId` (ver
 * computeSessionExpectedByMethod). A conferência física só faz sentido para métodos de gaveta
 * (DINHEIRO); para os demais, `valorInformado`/`diferenca` ficam nulos.
 */
export async function closeSalesSession({
	orgId,
	input,
	fechadaPorUsuarioId,
	bloquearComPendenciaFiscal,
}: {
	orgId: string;
	input: TCloseSalesSessionInput;
	fechadaPorUsuarioId: string | null;
	bloquearComPendenciaFiscal: boolean;
}) {
	const session = await db.query.salesSessions.findFirst({
		where: and(eq(salesSessions.id, input.sessaoVendaId), eq(salesSessions.organizacaoId, orgId)),
	});
	if (!session) throw new createHttpError.NotFound("Sessao de venda nao encontrada.");
	if (session.status !== "ABERTA") throw new createHttpError.BadRequest("Somente sessoes abertas podem ser fechadas.");

	// Pendências fiscais do turno: documentos das vendas da sessão que não estão AUTORIZADO.
	const pendingFiscalDocuments = await db
		.select({ id: fiscalOutboundDocuments.id, referencia: fiscalOutboundDocuments.referencia, statusInterno: fiscalOutboundDocuments.statusInterno })
		.from(fiscalOutboundDocuments)
		.innerJoin(sales, eq(fiscalOutboundDocuments.vendaId, sales.id))
		.where(and(eq(sales.sessaoVendaId, input.sessaoVendaId), eq(fiscalOutboundDocuments.organizacaoId, orgId), ne(fiscalOutboundDocuments.statusInterno, "AUTORIZADO")));

	if (bloquearComPendenciaFiscal && pendingFiscalDocuments.length > 0) {
		throw new createHttpError.BadRequest(
			`Existem ${pendingFiscalDocuments.length} documento(s) fiscal(is) pendente(s) nesta sessao. Resolva-os antes de fechar o caixa.`,
		);
	}

	const expectedByMethod = await computeSessionExpectedByMethod({ orgId, sessaoVendaId: input.sessaoVendaId, saldoInicial: session.saldoInicial });

	// Conferência informada indexada por método.
	const informadoByMethod = new Map<TPaymentMethodEnum, number>();
	for (const conferencia of input.conferencias) informadoByMethod.set(conferencia.metodo, conferencia.valorInformado);

	// União dos métodos esperados e informados.
	const allMethods = new Set<TPaymentMethodEnum>([...expectedByMethod.map((e) => e.metodo), ...informadoByMethod.keys()]);
	const expectedMap = new Map(expectedByMethod.map((e) => [e.metodo, e.valorEsperado]));

	const reconciliationRows = Array.from(allMethods).map((metodo) => {
		const valorEsperado = expectedMap.get(metodo) ?? 0;
		const informado = informadoByMethod.get(metodo);
		const valorInformado = informado ?? null;
		const diferenca = valorInformado === null ? null : valorInformado - valorEsperado;
		return { metodo, valorEsperado, valorInformado, diferenca };
	});

	const totalEsperado = reconciliationRows.reduce((acc, row) => acc + row.valorEsperado, 0);
	const totalInformado = reconciliationRows.reduce((acc, row) => acc + (row.valorInformado ?? 0), 0);
	const diferencaTotal = reconciliationRows.reduce((acc, row) => acc + (row.diferenca ?? 0), 0);
	const dataFechamento = new Date();

	await db.transaction(async (tx) => {
		if (reconciliationRows.length > 0) {
			await tx.insert(salesSessionReconciliations).values(
				reconciliationRows.map((row) => ({
					organizacaoId: orgId,
					sessaoVendaId: input.sessaoVendaId,
					metodo: row.metodo,
					valorEsperado: row.valorEsperado,
					valorInformado: row.valorInformado,
					diferenca: row.diferenca,
				})),
			);
		}

		await tx
			.update(salesSessions)
			.set({
				status: "FECHADA",
				fechadaPorUsuarioId,
				dataFechamento,
				totalEsperado,
				totalInformado,
				diferencaTotal,
				observacoesFechamento: input.observacoesFechamento ?? null,
			})
			.where(and(eq(salesSessions.id, input.sessaoVendaId), eq(salesSessions.organizacaoId, orgId)));
	});

	return {
		sessaoVendaId: input.sessaoVendaId,
		status: "FECHADA" as const,
		dataFechamento,
		totalEsperado,
		totalInformado,
		diferencaTotal,
		conferencias: reconciliationRows,
		pendenciasFiscais: pendingFiscalDocuments,
	};
}
