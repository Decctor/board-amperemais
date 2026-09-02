import type { TPaymentMethodEnum } from "@/schemas/enums";

export const PAYMENT_METHOD_LABELS: Record<TPaymentMethodEnum, string> = {
	DINHEIRO: "Dinheiro",
	PIX: "Pix",
	CARTAO_CREDITO: "Cartão de crédito",
	CARTAO_DEBITO: "Cartão de débito",
	BOLETO: "Boleto",
	TRANSFERENCIA: "Transferência",
	CASHBACK: "Cashback",
	VALE: "Vale",
	A_DEFINIR: "A definir",
	FIADO_NOTA: "Fiado / nota",
	OUTRO: "Outro",
};

export function formatPaymentMethod(metodo: string): string {
	return PAYMENT_METHOD_LABELS[metodo as TPaymentMethodEnum] ?? metodo;
}
