import type { TPaymentMethodEnum } from "@/schemas/enums";
import type { TFiscalSalePayment } from "@/lib/fiscal/types";

// Metodos que a SEFAZ trata como cartao (tPag 03/04) e que, por isso, exigem o grupo YA04 (card).
const SPEDY_CARD_METHODS = new Set(["creditCard", "debitCard"]);

const PAYMENT_METHOD_TO_SPEDY: Record<TPaymentMethodEnum, string> = {
	DINHEIRO: "money",
	CARTAO_CREDITO: "creditCard",
	CARTAO_DEBITO: "debitCard",
	FIADO_NOTA: "storeCredit",
	VALE: "giftVoucher",
	BOLETO: "billetBanking",
	PIX: "pix",
	TRANSFERENCIA: "bankTransfer",
	CASHBACK: "fidelityProgram",
	A_DEFINIR: "other",
	OUTRO: "other",
};

function round2(value: number): number {
	return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function mapSalePaymentsToSpedy({
	payments,
	saleTotal,
	isReturn = false,
}: {
	payments: TFiscalSalePayment[];
	saleTotal: number;
	isReturn?: boolean;
}) {
	if (isReturn) return [{ method: "noPayment", amount: 0 }];
	if (payments.length === 0) return [{ method: "other", amount: saleTotal }];
	return payments.map((payment) => {
		const method = PAYMENT_METHOD_TO_SPEDY[payment.metodo];
		return {
			method,
			amount: round2(payment.valor),
			// Rejeicao 391: com tPag 03/04 a SEFAZ exige o grupo do cartao. Como a maquininha nao e
			// integrada ao PDV, nao temos credenciadora, bandeira nem cAut — que a NT so torna
			// obrigatorios no pagamento integrado. Informar tpIntegra=2 (isIntegratedPayment: false)
			// e o suficiente e descreve a operacao com precisao.
			...(SPEDY_CARD_METHODS.has(method) ? { card: { isIntegratedPayment: false } } : {}),
		};
	});
}
