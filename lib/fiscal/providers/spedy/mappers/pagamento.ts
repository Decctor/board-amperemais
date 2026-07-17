import type { TPaymentMethodEnum } from "@/schemas/enums";
import type { TFiscalSalePayment } from "@/lib/fiscal/types";

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
	return payments.map((payment) => ({
		method: PAYMENT_METHOD_TO_SPEDY[payment.metodo],
		amount: round2(payment.valor),
	}));
}
