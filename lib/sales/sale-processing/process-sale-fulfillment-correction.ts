import { getOrganizationPaymentMethodsConfig } from "@/lib/payments/defaults";
import {
	buildPaymentTransactionTitle,
	classifySalePaymentTransactions,
	extractPaymentObservacoesFromTitle,
	type SalePaymentTransactionInput,
} from "@/lib/sales/utils";
import type { TDeliveryModeEnum, TPaymentMethodEnum } from "@/schemas/enums";
import { db } from "@/services/drizzle";
import { financialTransactions, sales } from "@/services/drizzle/schema";
import type { TOrganizationEntity } from "@/services/drizzle/schema";
import { and, eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { mapSaleRowToFulfillmentCard } from "./map-sale-to-fulfillment-card";

export type PatchSaleFulfillmentEntregaInput = {
	modalidade: TDeliveryModeEnum;
	comandaNumero?: string | null;
};

export type PatchSaleFulfillmentPagamentoInput = {
	transacaoId: string;
	metodo: TPaymentMethodEnum;
};

export type ProcessSaleFulfillmentCorrectionInput =
	| {
			organization: TOrganizationEntity;
			saleId: string;
			entrega: PatchSaleFulfillmentEntregaInput;
	  }
	| {
			organization: TOrganizationEntity;
			saleId: string;
			pagamento: PatchSaleFulfillmentPagamentoInput;
	  };

async function loadCorrectableSale(organizationId: string, saleId: string) {
	const sale = await db.query.sales.findFirst({
		where: (fields, { and, eq }) => and(eq(fields.id, saleId), eq(fields.organizacaoId, organizationId)),
		columns: {
			id: true,
			idExterno: true,
			valorTotal: true,
			statusVenda: true,
			statusAtendimento: true,
			entregaModalidade: true,
			comandaNumero: true,
			clienteId: true,
			observacoes: true,
			dataVenda: true,
			processamentoOrigem: true,
			entregaLocalizacaoId: true,
		},
		with: {
			cliente: { columns: { id: true, nome: true, telefone: true } },
			documentosFiscais: { columns: { statusInterno: true, dataInsercao: true } },
			lancamentosContabeis: {
				columns: { id: true },
				with: {
					transacoesFinanceiras: {
						columns: {
							id: true,
							lancamentoContabilId: true,
							titulo: true,
							valor: true,
							tipo: true,
							metodo: true,
							contaFinanceiraId: true,
							parcela: true,
							totalParcelas: true,
							dataEfetivacao: true,
							dataPrevisao: true,
							provedorStatus: true,
						},
					},
				},
			},
		},
	});

	if (!sale) throw new createHttpError.NotFound("Venda não encontrada.");
	if (sale.statusVenda !== "CONFIRMADA") {
		throw new createHttpError.BadRequest("Use o checkout para editar rascunhos.");
	}
	if (sale.processamentoOrigem !== "INTERNO") {
		throw new createHttpError.BadRequest("Somente vendas internas podem ser corrigidas neste quadro.");
	}

	return sale;
}

async function patchEntrega({
	organization,
	saleId,
	entrega,
}: {
	organization: TOrganizationEntity;
	saleId: string;
	entrega: PatchSaleFulfillmentEntregaInput;
}) {
	const sale = await loadCorrectableSale(organization.id, saleId);

	if (entrega.modalidade === "ENTREGA" && !sale.clienteId) {
		throw new createHttpError.BadRequest("Entrega exige cliente vinculado.");
	}

	const comandaNumero = entrega.modalidade === "COMANDA" ? entrega.comandaNumero?.trim() || null : null;
	if (entrega.modalidade === "COMANDA" && !comandaNumero) {
		throw new createHttpError.BadRequest("Informe o número da comanda.");
	}

	const modalidadeChanged = sale.entregaModalidade !== entrega.modalidade;

	await db
		.update(sales)
		.set({
			entregaModalidade: entrega.modalidade,
			comandaNumero,
			entregaLocalizacaoId: entrega.modalidade === "ENTREGA" ? sale.entregaLocalizacaoId : null,
		})
		.where(eq(sales.id, saleId));

	const updated = await loadCorrectableSale(organization.id, saleId);
	return {
		card: mapSaleRowToFulfillmentCard(updated),
		message: modalidadeChanged ? "Modalidade de entrega atualizada." : "Comanda atualizada.",
	};
}

async function patchPagamento({
	organization,
	saleId,
	pagamento,
}: {
	organization: TOrganizationEntity;
	saleId: string;
	pagamento: PatchSaleFulfillmentPagamentoInput;
}) {
	const sale = await loadCorrectableSale(organization.id, saleId);
	const rawTransactions: SalePaymentTransactionInput[] = sale.lancamentosContabeis.flatMap((entry) =>
		entry.transacoesFinanceiras.map((transaction) => ({
			...transaction,
			lancamentoContabilId: entry.id,
		})),
	);

	const classification = classifySalePaymentTransactions(rawTransactions);
	const target = classification.todas.find((payment) => payment.id === pagamento.transacaoId);
	if (!target) {
		throw new createHttpError.NotFound("Transação não encontrada nesta venda.");
	}
	if (!target.editavel) {
		throw new createHttpError.BadRequest(target.motivoNaoEditavel ?? "Esta transação não pode ser alterada.");
	}

	const paymentMethodsConfig = getOrganizationPaymentMethodsConfig(organization.configuracao);
	const methodConfig = paymentMethodsConfig[pagamento.metodo];
	if (!methodConfig?.suportado) {
		throw new createHttpError.BadRequest(`O método de pagamento ${pagamento.metodo} não está habilitado para esta organização.`);
	}

	const sourceTransaction = sale.lancamentosContabeis
		.flatMap((entry) => entry.transacoesFinanceiras)
		.find((transaction) => transaction.id === pagamento.transacaoId);
	if (!sourceTransaction) {
		throw new createHttpError.NotFound("Transação não encontrada nesta venda.");
	}

	const observacoes = extractPaymentObservacoesFromTitle(sourceTransaction.titulo);

	await db
		.update(financialTransactions)
		.set({
			metodo: pagamento.metodo,
			contaFinanceiraId: methodConfig.contaFinanceiraPadraoId ?? sourceTransaction.contaFinanceiraId,
			titulo: buildPaymentTransactionTitle(pagamento.metodo, observacoes),
		})
		.where(and(eq(financialTransactions.id, pagamento.transacaoId), eq(financialTransactions.organizacaoId, organization.id)));

	const updated = await loadCorrectableSale(organization.id, saleId);
	return {
		card: mapSaleRowToFulfillmentCard(updated),
		message: "Pagamento atualizado.",
	};
}

export async function processSaleFulfillmentCorrection(input: ProcessSaleFulfillmentCorrectionInput) {
	if ("entrega" in input) {
		return patchEntrega({
			organization: input.organization,
			saleId: input.saleId,
			entrega: input.entrega,
		});
	}

	return patchPagamento({
		organization: input.organization,
		saleId: input.saleId,
		pagamento: input.pagamento,
	});
}

export type TProcessSaleFulfillmentCorrectionOutput = Awaited<ReturnType<typeof processSaleFulfillmentCorrection>>;
