import type { TCanonicalSale, TCanonicalSalePayment } from "@/lib/data-connectors/types";
import { ensureFirstPartyFinancialAccount, type TFirstPartyAccountKey } from "@/lib/finances/first-party-accounts";
import { getOrganizationPaymentMethodsConfig } from "@/lib/payments/defaults";
import type { TOrganizationConfiguration } from "@/schemas/organizations";
import type { DBTransaction } from "@/services/drizzle";
import { accountingEntries, financialTransactions } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { and, eq } from "drizzle-orm";

/**
 * Financeiro de vendas de canais gerenciados (fase 4 do plano iFood/fulfillment).
 *
 * Modelo de conta de repasse (clearing): a venda entra pelo valor BRUTO; pagamentos online do
 * canal viram ENTRADA pendente na conta first-party do canal (ex.: "iFood"), aguardando o
 * repasse; pagamentos na entrega viram ENTRADA pendente na conta padrão do método e são
 * efetivados na entrega. Taxas e a transferência do líquido do repasse são lançadas MANUALMENTE
 * pelo módulo financeiro nesta fase (a conciliação automática via módulo Financial é a fase 4b).
 */

const SETTLEMENT_FORECAST_DAYS = 7;

/** Status de provedor das transações de canal gerenciado (texto livre na coluna provedor_status). */
const PROVIDER_STATUS = {
	/** Pago online: aguardando o repasse do canal (efetivação manual/conciliação). */
	AWAITING_SETTLEMENT: "AGUARDANDO_REPASSE",
	/** Pago na entrega: pendente até a venda ser entregue. */
	PENDING: "PENDENTE",
	APPROVED: "APROVADO",
	CANCELED: "CANCELADO",
} as const;

function buildTransactionTitle(payment: TCanonicalSalePayment, saleLabel: string) {
	const suffix = payment.descricao?.trim() ? ` (${payment.descricao.trim()})` : "";
	return `Pagamento via ${payment.metodo}${suffix} - ${saleLabel}`;
}

/**
 * Cria o lançamento contábil + transações financeiras de uma venda gerenciada que tornou-se
 * válida neste sync. Idempotente por venda: pula se já existir lançamento contábil.
 * Deve rodar num savepoint — falha aqui não pode abortar a importação da organização.
 */
export async function processManagedSaleFinancials(
	tx: DBTransaction,
	{
		organizationId,
		saleId,
		sale,
		channelAccountKey,
		organizationConfiguration,
	}: {
		organizationId: string;
		saleId: string;
		sale: TCanonicalSale;
		channelAccountKey: TFirstPartyAccountKey;
		organizationConfiguration: TOrganizationConfiguration | null;
	},
): Promise<{ processed: boolean; reason?: string }> {
	const existingEntry = await tx.query.accountingEntries.findFirst({
		where: and(eq(accountingEntries.organizacaoId, organizationId), eq(accountingEntries.vendaId, saleId)),
		columns: { id: true },
	});
	if (existingEntry) return { processed: false, reason: "ja-processada" };

	const saleDefaults = organizationConfiguration?.defaults?.contabilidade?.lancamentosPadrao?.vendas;
	const debitAccountId = saleDefaults?.debitoContaId;
	const creditAccountId = saleDefaults?.creditoContaId;
	if (!debitAccountId || !creditAccountId) {
		console.warn(
			`[MANAGED_SALE_FINANCIALS] Organização ${organizationId} sem contas contábeis padrão de vendas — venda ${saleId} importada sem financeiro.`,
		);
		return { processed: false, reason: "sem-contas-padrao" };
	}

	// Fallback: canal sem detalhamento de pagamento → trata o total como pago online (padrão do
	// iFood). Vendas sem valor não geram financeiro.
	const payments: TCanonicalSalePayment[] =
		sale.payments && sale.payments.length > 0
			? sale.payments
			: sale.totalValue > 0
				? [{ metodo: "OUTRO", valor: sale.totalValue, pagoOnline: true, descricao: "Canal (sem detalhamento)" }]
				: [];
	if (payments.length === 0) return { processed: false, reason: "sem-pagamentos" };

	const paymentsTotal = payments.reduce((sum, payment) => sum + payment.valor, 0);
	if (Math.abs(paymentsTotal - sale.totalValue) > 0.01) {
		console.warn(
			`[MANAGED_SALE_FINANCIALS] Divergência entre pagamentos (${paymentsTotal.toFixed(2)}) e total da venda (${sale.totalValue.toFixed(2)}) — venda ${saleId}. Registrando pelos pagamentos.`,
		);
	}

	const channelAccount = await ensureFirstPartyFinancialAccount(tx, { organizationId, key: channelAccountKey });
	const methodDefaults = getOrganizationPaymentMethodsConfig(organizationConfiguration);
	const saleLabel = `VENDA ${sale.model} #${sale.displayId ?? sale.sourceSaleId}`;

	const [entry] = await tx
		.insert(accountingEntries)
		.values({
			organizacaoId: organizationId,
			vendaId: saleId,
			origemTipo: "VENDA",
			titulo: saleLabel,
			idContaDebito: debitAccountId,
			idContaCredito: creditAccountId,
			valor: paymentsTotal,
			dataCompetencia: sale.occurredAt,
			autorId: null,
		})
		.returning({ id: accountingEntries.id });

	for (const payment of payments) {
		const isOnline = payment.pagoOnline;
		await tx.insert(financialTransactions).values({
			organizacaoId: organizationId,
			lancamentoContabilId: entry.id,
			// Online: conta de repasse do canal (dinheiro está com o canal até o repasse).
			// Na entrega: conta financeira padrão do método (cai no caixa quando entregue).
			contaFinanceiraId: isOnline ? channelAccount.id : (methodDefaults[payment.metodo]?.contaFinanceiraPadraoId ?? null),
			titulo: buildTransactionTitle(payment, saleLabel),
			tipo: "ENTRADA",
			valor: payment.valor,
			metodo: payment.metodo,
			dataPrevisao: isOnline ? dayjs(sale.occurredAt).add(SETTLEMENT_FORECAST_DAYS, "days").toDate() : sale.occurredAt,
			dataEfetivacao: null,
			provedorReferencia: sale.sourceSaleId,
			provedorStatus: isOnline ? PROVIDER_STATUS.AWAITING_SETTLEMENT : PROVIDER_STATUS.PENDING,
			autorId: null,
		});
	}

	return { processed: true };
}

async function loadManagedSaleTransactions(tx: DBTransaction, { organizationId, saleId }: { organizationId: string; saleId: string }) {
	const entries = await tx.query.accountingEntries.findMany({
		where: and(eq(accountingEntries.organizacaoId, organizationId), eq(accountingEntries.vendaId, saleId)),
		columns: { id: true },
		with: {
			transacoesFinanceiras: {
				columns: { id: true, tipo: true, dataEfetivacao: true, provedorStatus: true },
			},
		},
	});
	return entries.flatMap((entry) => entry.transacoesFinanceiras);
}

/**
 * Efetiva os pagamentos "na entrega" (PENDENTE) quando a venda gerenciada é entregue.
 * Idempotente: transações já efetivadas/canceladas não são tocadas; os recebíveis online
 * (AGUARDANDO_REPASSE) continuam pendentes até a conciliação do repasse.
 */
export async function settleManagedSaleOfflinePayments(tx: DBTransaction, { organizationId, saleId }: { organizationId: string; saleId: string }) {
	const transactions = await loadManagedSaleTransactions(tx, { organizationId, saleId });
	const pendingOffline = transactions.filter(
		(transaction) => transaction.tipo === "ENTRADA" && !transaction.dataEfetivacao && transaction.provedorStatus === PROVIDER_STATUS.PENDING,
	);

	for (const transaction of pendingOffline) {
		await tx
			.update(financialTransactions)
			.set({ dataEfetivacao: new Date(), provedorStatus: PROVIDER_STATUS.APPROVED })
			.where(eq(financialTransactions.id, transaction.id));
	}
}

/**
 * Cancela as transações pendentes de uma venda gerenciada que virou cancelada. Transações já
 * efetivadas (cancelamento pós-entrega) são apenas logadas — o ajuste é manual no módulo
 * financeiro.
 */
export async function cancelManagedSaleFinancials(tx: DBTransaction, { organizationId, saleId }: { organizationId: string; saleId: string }) {
	const transactions = await loadManagedSaleTransactions(tx, { organizationId, saleId });

	for (const transaction of transactions) {
		if (transaction.provedorStatus === PROVIDER_STATUS.CANCELED) continue;
		if (transaction.dataEfetivacao) {
			console.warn(
				`[MANAGED_SALE_FINANCIALS] Venda ${saleId} cancelada com transação já efetivada (${transaction.id}) — estorne manualmente no módulo financeiro.`,
			);
			continue;
		}
		await tx.update(financialTransactions).set({ provedorStatus: PROVIDER_STATUS.CANCELED }).where(eq(financialTransactions.id, transaction.id));
	}
}
