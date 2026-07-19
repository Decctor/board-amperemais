import {
	ingestStatementLines,
	inferPaymentMethodFromDescription,
	runStatementMatching,
	type TCanonicalStatementLine,
} from "@/lib/financial-reconciliation";
import { db } from "@/services/drizzle";
import { financialOpenFinanceConnections, financialStatementImports } from "@/services/drizzle/schema";
import { and, eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { getOpenFinanceProvider } from "./providers";

// Sobreposição da janela de busca: reprocessar alguns dias já vistos é seguro (idempotência
// por idExterno) e cobre transações que o banco liquida com atraso.
const SYNC_OVERLAP_DAYS = 3;
const FIRST_SYNC_LOOKBACK_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Sincroniza uma conexão OpenFinance: busca transações no agregador, cria uma importação
 * origem OPEN_FINANCE e reaproveita o pipeline de arquivo (ingest idempotente + matching).
 */
export async function syncOpenFinanceConnection({ organizacaoId, conexaoId }: { organizacaoId: string; conexaoId: string }) {
	const connection = await db.query.financialOpenFinanceConnections.findFirst({
		where: and(eq(financialOpenFinanceConnections.id, conexaoId), eq(financialOpenFinanceConnections.organizacaoId, organizacaoId)),
	});
	if (!connection) throw new createHttpError.NotFound("Conexão OpenFinance não encontrada.");
	if (!connection.ativo || connection.status === "DESATIVADO") throw new createHttpError.BadRequest("Conexão OpenFinance desativada.");

	const provider = getOpenFinanceProvider(connection.provedor);
	if (!provider) throw new createHttpError.BadRequest(`Provedor OpenFinance não suportado: ${connection.provedor}.`);

	const since = connection.ultimaSincronizacao
		? new Date(connection.ultimaSincronizacao.getTime() - SYNC_OVERLAP_DAYS * DAY_MS)
		: new Date(Date.now() - FIRST_SYNC_LOOKBACK_DAYS * DAY_MS);

	try {
		const { transacoes, saldoAtual } = await provider.fetchTransactions({ connection, since });

		const linhas: TCanonicalStatementLine[] = transacoes
			.filter((transacao) => transacao.valor !== 0 && transacao.descricao.trim().length > 0)
			.map((transacao) => ({
				dataTransacao: transacao.data,
				descricao: transacao.descricao.trim(),
				tipo: transacao.valor > 0 ? "ENTRADA" : "SAIDA",
				valor: Math.abs(transacao.valor),
				metodo: inferPaymentMethodFromDescription(transacao.descricao),
				idExterno: transacao.idExterno,
				metadados: transacao.metadados ?? null,
			}));

		let importadas = 0;
		let duplicadas = 0;
		let sugeridas = 0;

		// Sync sem transação nova não cria importação vazia — só atualiza o cursor.
		if (linhas.length > 0) {
			const [importRow] = await db
				.insert(financialStatementImports)
				.values({
					organizacaoId,
					contaFinanceiraId: connection.contaFinanceiraId,
					origem: "OPEN_FINANCE",
					conexaoId: connection.id,
					status: "PROCESSANDO",
					saldoFinal: saldoAtual,
				})
				.returning({ id: financialStatementImports.id });

			const ingest = await ingestStatementLines({
				organizacaoId,
				contaFinanceiraId: connection.contaFinanceiraId,
				importacaoId: importRow.id,
				linhas,
			});
			importadas = ingest.inseridas.length;
			duplicadas = ingest.duplicadas;

			const matching = await runStatementMatching({
				organizacaoId,
				contaFinanceiraId: connection.contaFinanceiraId,
				linhaIds: ingest.inseridas.map((linha) => linha.id),
			});
			sugeridas = matching.sugeridas;

			const periodo = linhas.map((linha) => linha.dataTransacao.getTime());
			await db
				.update(financialStatementImports)
				.set({ status: "PROCESSADO", periodoInicio: new Date(Math.min(...periodo)), periodoFim: new Date(Math.max(...periodo)) })
				.where(eq(financialStatementImports.id, importRow.id));
		}

		await db
			.update(financialOpenFinanceConnections)
			.set({ status: "CONECTADO", erro: null, ultimaSincronizacao: new Date() })
			.where(eq(financialOpenFinanceConnections.id, connection.id));

		return { conexaoId: connection.id, importadas, duplicadas, sugeridas };
	} catch (error) {
		await db
			.update(financialOpenFinanceConnections)
			.set({ status: "ERRO", erro: error instanceof Error ? error.message : "Erro desconhecido na sincronização." })
			.where(eq(financialOpenFinanceConnections.id, connection.id));
		throw error;
	}
}
