import { getOrganizationPaymentMethodsConfig } from "@/lib/payments";
import {
	type TProcessSaleConfirmationInput,
	processSaleConfirmationInTransaction,
	processSaleConfirmationPostCommit,
} from "@/lib/sales/sale-processing";
import type { TPaymentMethodEnum } from "@/schemas/enums";
import { db } from "@/services/drizzle";
import type { TOrganizationEntity } from "@/services/drizzle/schema";
import { sales, tabOrders, tabs } from "@/services/drizzle/schema";
import { and, eq, inArray } from "drizzle-orm";
import createHttpError from "http-errors";

type TCloseTabPaymentInput = {
	metodo: TPaymentMethodEnum;
	valor: number;
	totalParcelas?: number | null;
	efetivacaoTipo: "IMEDIATA" | "PENDENTE";
	dataPrevisao?: string | null;
	observacoes?: string | null;
};

export type TCloseTabInput = {
	tabId: string;
	pagamentos: TCloseTabPaymentInput[];
	sessaoVendaId?: string | null;
	contaDebitoId?: string | null;
	contaCreditoId?: string | null;
};

// Pedidos que ainda dependem da cozinha/expedicao bloqueiam o fechamento; o operador
// resolve cada um (entregar ou cancelar) antes. PARCIALMENTE_ENTREGUE nao bloqueia:
// o delta remanescente e baixado na confirmacao.
const CLOSE_BLOCKING_ORDER_STATUSES = ["NAO_INICIADO", "EM_PREPARO", "PRONTO", "EM_ENTREGA"] as const;

/**
 * Fecha a conta = checkout da venda rascunho, uma unica vez, com pagamentos reais:
 * 1. lock da tab (FOR UPDATE) — serializa contra fechamento/cancelamento/pedido concorrentes;
 * 2. bloqueia se houver pedidos em andamento na cozinha;
 * 3. confirma a venda rascunho via processSaleConfirmationInTransaction nascendo ENTREGUE —
 *    contabil, financeiro efetivado no turno de caixa, cashback e (pos-commit) fiscal disparam
 *    exatamente uma vez; a baixa embutida usa o delta por item (pedidos ja entregues = no-op);
 * 4. tab -> FECHADA com valorTotal congelado (update condicional como segunda guarda).
 */
export async function closeTab({
	organization,
	userId,
	input,
}: {
	organization: TOrganizationEntity;
	userId: string;
	input: TCloseTabInput;
}) {
	if (input.pagamentos.length === 0) throw new createHttpError.BadRequest("Informe os pagamentos do fechamento.");

	const organizationSaleDefaults = organization.configuracao.defaults.contabilidade.lancamentosPadrao.vendas;
	const accountingEntryDebitAccountId = input.contaDebitoId ?? organizationSaleDefaults.debitoContaId;
	const accountingEntryCreditAccountId = input.contaCreditoId ?? organizationSaleDefaults.creditoContaId;
	if (!accountingEntryDebitAccountId || !accountingEntryCreditAccountId) {
		throw new createHttpError.InternalServerError("A organizacao nao possui contas padrao de vendas configuradas.");
	}

	const organizationPaymentMethodDefaults = getOrganizationPaymentMethodsConfig(organization.configuracao);
	const salePayments = input.pagamentos.map((pagamento) => {
		const methodDefaults = organizationPaymentMethodDefaults[pagamento.metodo];
		if (!methodDefaults?.suportado) {
			throw new createHttpError.BadRequest(`O metodo de pagamento ${pagamento.metodo} nao esta habilitado para esta organizacao.`);
		}
		return {
			metodo: pagamento.metodo,
			valor: pagamento.valor,
			totalParcelas: pagamento.totalParcelas ?? undefined,
			efetivacaoTipo: pagamento.efetivacaoTipo,
			dataPrevisao: pagamento.dataPrevisao ?? undefined,
			observacoes: pagamento.observacoes ?? undefined,
			contaFinanceiraPadraoId: methodDefaults.contaFinanceiraPadraoId ?? null,
		};
	});

	let confirmationInput: TProcessSaleConfirmationInput | null = null;

	const result = await db.transaction(async (tx) => {
		const [tab] = await tx
			.select()
			.from(tabs)
			.where(and(eq(tabs.id, input.tabId), eq(tabs.organizacaoId, organization.id)))
			.for("update");

		if (!tab) throw new createHttpError.NotFound("Conta nao encontrada.");
		if (tab.status !== "ABERTA") throw new createHttpError.BadRequest("Conta nao esta aberta.");

		const activeOrders = await tx
			.select({ id: tabOrders.id, numero: tabOrders.numero })
			.from(tabOrders)
			.where(and(eq(tabOrders.tabId, tab.id), inArray(tabOrders.status, [...CLOSE_BLOCKING_ORDER_STATUSES])));
		if (activeOrders.length > 0) {
			throw new createHttpError.BadRequest("Existem pedidos em andamento. Entregue ou cancele cada pedido antes de fechar a conta.");
		}

		const [draftSale] = await tx
			.select({ id: sales.id })
			.from(sales)
			.where(and(eq(sales.tabId, tab.id), eq(sales.statusVenda, "ORCAMENTO")))
			.for("update");
		if (!draftSale) {
			throw new createHttpError.BadRequest("Conta sem consumo lancado. Cancele a conta em vez de fechar.");
		}

		confirmationInput = {
			organization,
			saleId: draftSale.id,
			salePayments,
			saleAuthorId: userId,
			saleClientId: tab.clienteId,
			accountingEntryDebitAccountId,
			accountingEntryCreditAccountId,
			// A conta e fechada com tudo entregue; a baixa embutida da confirmacao usa o delta
			// por item, entao pedidos ja entregues durante o atendimento nao baixam de novo.
			initialAttendanceStatus: "ENTREGUE",
			sessaoVendaId: input.sessaoVendaId ?? null,
		};

		const confirmation = await processSaleConfirmationInTransaction({ tx, input: confirmationInput });

		const [confirmedSale] = await tx.select({ valorTotal: sales.valorTotal }).from(sales).where(eq(sales.id, draftSale.id));

		// Segunda guarda (o lock ja serializa): so fecha se ainda estiver ABERTA.
		const closedRows = await tx
			.update(tabs)
			.set({
				status: "FECHADA",
				valorTotal: confirmedSale?.valorTotal ?? tab.valorTotal,
				fechadaPorUsuarioId: userId,
				dataFechamento: new Date(),
			})
			.where(and(eq(tabs.id, tab.id), eq(tabs.status, "ABERTA")))
			.returning({ id: tabs.id });
		if (closedRows.length === 0) {
			throw new createHttpError.Conflict("A conta foi alterada por outra operacao. Atualize e tente novamente.");
		}

		return { tabId: tab.id, saleId: draftSale.id, confirmation, valorTotal: confirmedSale?.valorTotal ?? 0 };
	});

	// Efeitos externos fora da transacao (emissao fiscal automatica conforme configuracao).
	const fiscal = confirmationInput ? await processSaleConfirmationPostCommit(confirmationInput) : null;

	return { ...result, fiscal };
}
export type TCloseTabResult = Awaited<ReturnType<typeof closeTab>>;
