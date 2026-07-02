import type { TPaymentMethodEnum } from "@/schemas/enums";
import type { TFiscalSalePayment } from "@/lib/fiscal/types";

const PAYMENT_METHOD_TO_NFE_CODE: Record<TPaymentMethodEnum, string> = {
	DINHEIRO: "01",
	CARTAO_CREDITO: "03",
	CARTAO_DEBITO: "04",
	FIADO_NOTA: "05",
	VALE: "12",
	BOLETO: "15",
	PIX: "17",
	TRANSFERENCIA: "18",
	CASHBACK: "19",
	A_DEFINIR: "99",
	OUTRO: "99",
};

function round2(value: number): number {
	return Math.round((value + Number.EPSILON) * 100) / 100;
}

// Monta o bloco "pag" completo. Quando a soma dos pagamentos excede o total do documento
// (ex.: dinheiro com troco), destaca o vTroco — a regra YA01 exige soma(vPag) - vTroco = vNF.
export function mapSalePaymentsToNfe({
	payments,
	saleTotal,
	isReturn = false,
}: {
	payments: TFiscalSalePayment[];
	saleTotal: number;
	isReturn?: boolean;
}) {
	if (isReturn) return { detPag: [{ tPag: "90", vPag: 0 }] };
	if (payments.length === 0) return { detPag: [{ tPag: "99", vPag: saleTotal }] };

	const detPag = payments.map((payment) => ({
		tPag: PAYMENT_METHOD_TO_NFE_CODE[payment.metodo],
		vPag: payment.valor,
	}));
	const totalPago = round2(detPag.reduce((total, payment) => total + payment.vPag, 0));
	const vTroco = round2(totalPago - saleTotal);

	return { detPag, ...(vTroco > 0 ? { vTroco } : {}) };
}
