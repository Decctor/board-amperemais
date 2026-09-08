import type { TPaymentMethodEnum } from "@/schemas/enums";
import type { TCloseSalesSessionInput } from "@/schemas/sales-sessions";
import { db } from "@/services/drizzle";
import { fiscalOutboundDocuments, sales, salesSessionReconciliations, salesSessions } from "@/services/drizzle/schema";
import { and, eq, ne } from "drizzle-orm";
import createHttpError from "http-errors";
import { computeSessionExpectedByMethod } from "./compute-session-expected-by-method";

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
	return db.transaction(async (tx) => {
		// This row lock is shared with sale confirmation: either the sale enters first and is
		// included in the snapshot, or closing wins and the sale must choose another session.
		const [session] = await tx
			.select()
			.from(salesSessions)
			.where(and(eq(salesSessions.id, input.sessaoVendaId), eq(salesSessions.organizacaoId, orgId)))
			.for("update");
		if (!session) throw new createHttpError.NotFound("Sessao de venda nao encontrada.");
		if (session.status !== "ABERTA") throw new createHttpError.Conflict("Esta sessao ja foi fechada ou alterada.");

		const pendingFiscalDocuments = await tx
			.select({ id: fiscalOutboundDocuments.id, referencia: fiscalOutboundDocuments.referencia, statusInterno: fiscalOutboundDocuments.statusInterno })
			.from(fiscalOutboundDocuments)
			.innerJoin(sales, eq(fiscalOutboundDocuments.vendaId, sales.id))
			.where(
				and(
					eq(sales.sessaoVendaId, input.sessaoVendaId),
					eq(fiscalOutboundDocuments.organizacaoId, orgId),
					ne(fiscalOutboundDocuments.statusInterno, "AUTORIZADO"),
				),
			);
		if (bloquearComPendenciaFiscal && pendingFiscalDocuments.length > 0) {
			throw new createHttpError.BadRequest(
				`Existem ${pendingFiscalDocuments.length} documento(s) fiscal(is) pendente(s) nesta sessao. Resolva-os antes de fechar o caixa.`,
			);
		}

		const expectedByMethod = await computeSessionExpectedByMethod({
			orgId,
			sessaoVendaId: input.sessaoVendaId,
			saldoInicial: session.saldoInicial,
			trx: tx,
		});
		const informadoByMethod = new Map<TPaymentMethodEnum, number>();
		for (const conferencia of input.conferencias) informadoByMethod.set(conferencia.metodo, conferencia.valorInformado);
		const allMethods = new Set<TPaymentMethodEnum>([...expectedByMethod.map((entry) => entry.metodo), ...informadoByMethod.keys()]);
		const expectedMap = new Map(expectedByMethod.map((entry) => [entry.metodo, entry.valorEsperado]));
		const reconciliationRows = Array.from(allMethods).map((metodo) => {
			const valorEsperado = expectedMap.get(metodo) ?? 0;
			const valorInformado = informadoByMethod.get(metodo) ?? null;
			const diferenca = valorInformado === null ? null : (Math.round(valorInformado * 100) - Math.round(valorEsperado * 100)) / 100;
			return { metodo, valorEsperado, valorInformado, diferenca };
		});
		const totalEsperado = reconciliationRows.reduce((sum, row) => sum + row.valorEsperado, 0);
		const totalInformado = reconciliationRows.reduce((sum, row) => sum + (row.valorInformado ?? 0), 0);
		const diferencaTotal = reconciliationRows.reduce((sum, row) => sum + (row.diferenca ?? 0), 0);
		const dataFechamento = new Date();

		if (reconciliationRows.length > 0) {
			await tx
				.insert(salesSessionReconciliations)
				.values(reconciliationRows.map((row) => ({ organizacaoId: orgId, sessaoVendaId: input.sessaoVendaId, ...row })));
		}
		const closedRows = await tx
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
			.where(and(eq(salesSessions.id, input.sessaoVendaId), eq(salesSessions.organizacaoId, orgId), eq(salesSessions.status, "ABERTA")))
			.returning({ id: salesSessions.id });
		if (closedRows.length === 0) throw new createHttpError.Conflict("Esta sessao foi alterada por outra operacao.");

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
	});
}
