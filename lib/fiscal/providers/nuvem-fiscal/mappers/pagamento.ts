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

export function mapSalePaymentsToNfe({
	payments,
	saleTotal,
	isReturn = false,
}: {
	payments: TFiscalSalePayment[];
	saleTotal: number;
	isReturn?: boolean;
}) {
	if (isReturn) return [{ tPag: "90", vPag: 0 }];
	if (payments.length === 0) return [{ tPag: "99", vPag: saleTotal }];

	return payments.map((payment) => ({
		tPag: PAYMENT_METHOD_TO_NFE_CODE[payment.metodo],
		vPag: payment.valor,
	}));
}
