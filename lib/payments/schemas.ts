import { PaymentMethodEnum, type TDeliveryModeEnum } from "@/schemas/enums";
import dayjs from "dayjs";
import z from "zod";

export const PaymentEffectivenessTypeEnum = z.enum(["IMEDIATA", "PENDENTE"]);
export type TPaymentEffectivenessTypeEnum = z.infer<typeof PaymentEffectivenessTypeEnum>;

export const CheckoutPaymentSplitSchema = z.object({
	id: z.string({
		required_error: "ID do pagamento não informado.",
		invalid_type_error: "Tipo não válido para ID do pagamento.",
	}),
	metodo: PaymentMethodEnum,
	valor: z.number({
		required_error: "Valor do pagamento não informado.",
		invalid_type_error: "Tipo não válido para valor do pagamento.",
	}),
	parcela: z.number({ invalid_type_error: "Tipo não válido para parcela." }).optional().nullable(),
	totalParcelas: z.number({ invalid_type_error: "Tipo não válido para total de parcelas." }).optional().nullable(),
	efetivacaoTipo: PaymentEffectivenessTypeEnum.default("IMEDIATA"),
	dataPrevisao: z.string({ invalid_type_error: "Tipo não válido para data de previsão." }).optional().nullable(),
	primeiraDataPrevisaoParcela: z.string({ invalid_type_error: "Tipo não válido para a primeira data de previsão." }).optional().nullable(),
	observacoes: z.string({ invalid_type_error: "Tipo não válido para observações." }).optional().nullable(),
});

export type TCheckoutPaymentSplit = z.infer<typeof CheckoutPaymentSplitSchema>;

export function getTodayDateInputValue() {
	return dayjs().format("YYYY-MM-DD");
}

export function getDefaultCheckoutPaymentSplit(overrides?: Partial<Omit<TCheckoutPaymentSplit, "id">>): TCheckoutPaymentSplit {
	return {
		id: crypto.randomUUID(),
		metodo: overrides?.metodo ?? "DINHEIRO",
		valor: overrides?.valor ?? 0,
		parcela: overrides?.parcela ?? null,
		totalParcelas: overrides?.totalParcelas ?? null,
		efetivacaoTipo: overrides?.efetivacaoTipo ?? "IMEDIATA",
		dataPrevisao: overrides?.dataPrevisao ?? getTodayDateInputValue(),
		primeiraDataPrevisaoParcela: overrides?.primeiraDataPrevisaoParcela ?? null,
		observacoes: overrides?.observacoes ?? null,
	};
}

type PaymentValidationContext = {
	hasLinkedClient: boolean;
	entregaModalidade?: TDeliveryModeEnum | null;
};

export function isInstallmentPayment(payment: Pick<TCheckoutPaymentSplit, "metodo" | "totalParcelas">) {
	return payment.metodo === "CARTAO_CREDITO" && (payment.totalParcelas ?? 1) > 1;
}

export function isCheckoutPaymentSplitValid(payment: TCheckoutPaymentSplit, context: PaymentValidationContext) {
	if (!Number.isFinite(payment.valor) || payment.valor <= 0) return false;
	if (payment.metodo === "A_DEFINIR" && payment.efetivacaoTipo !== "PENDENTE") return false;
	if (payment.metodo === "FIADO_NOTA" && !context.hasLinkedClient) return false;
	if ((payment.efetivacaoTipo === "PENDENTE" || payment.metodo === "FIADO_NOTA") && !payment.dataPrevisao) return false;
	if (isInstallmentPayment(payment)) {
		if ((payment.totalParcelas ?? 0) <= 1) return false;
		if (!payment.primeiraDataPrevisaoParcela) return false;
	}
	if (context.entregaModalidade === "ENTREGA" && payment.metodo === "A_DEFINIR" && payment.efetivacaoTipo !== "PENDENTE") {
		return false;
	}
	return true;
}

export function getPaymentSummaryLabel(payment: TCheckoutPaymentSplit) {
	if (isInstallmentPayment(payment)) {
		return `${payment.totalParcelas} parcelas, primeira em ${payment.primeiraDataPrevisaoParcela ?? "N/A"}`;
	}
	if (payment.efetivacaoTipo === "IMEDIATA") return "Efetivado agora";
	return `Previsto para ${payment.dataPrevisao ?? "N/A"}`;
}

export function getPaymentPreset(payment: TCheckoutPaymentSplit): "IMEDIATO" | "ENTREGA" | "PARCELADO" | "FIADO" | "PENDENTE" {
	if (payment.metodo === "FIADO_NOTA") return "FIADO";
	if (payment.metodo === "A_DEFINIR" && payment.efetivacaoTipo === "PENDENTE") return "ENTREGA";
	if (isInstallmentPayment(payment)) return "PARCELADO";
	if (payment.efetivacaoTipo === "PENDENTE") return "PENDENTE";
	return "IMEDIATO";
}
