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

/**
 * Rotulos curtos, para chips onde varios metodos se somam na mesma linha ("CRÉDITO + PIX").
 * A forma em frase de `PAYMENT_METHOD_LABELS` estoura a largura nesse contexto.
 */
export const PAYMENT_METHOD_CHIP_LABELS: Record<TPaymentMethodEnum, string> = {
	DINHEIRO: "DINHEIRO",
	PIX: "PIX",
	CARTAO_CREDITO: "CRÉDITO",
	CARTAO_DEBITO: "DÉBITO",
	BOLETO: "BOLETO",
	TRANSFERENCIA: "TRANSFERÊNCIA",
	CASHBACK: "CASHBACK",
	VALE: "VALE",
	A_DEFINIR: "A DEFINIR",
	FIADO_NOTA: "FIADO",
	OUTRO: "OUTRO",
};

export function formatPaymentMethod(metodo: string): string {
	return PAYMENT_METHOD_LABELS[metodo as TPaymentMethodEnum] ?? metodo;
}
