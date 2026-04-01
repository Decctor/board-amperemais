import type { TPaymentMethodEnum } from "@/schemas/enums";

export type TPaymentSplit = {
	metodo: TPaymentMethodEnum;
	valor: number;
	totalParcelas?: number;
	efetivacaoTipo: "IMEDIATA" | "PENDENTE";
	dataPrevisao?: string | Date | null;
	observacoes?: string | null;
	contaFinanceiraPadraoId?: string | null;
};

export type TProcessPaymentsInput = {
	vendaId: string;
	lancamentoContabilId: string;
	organizacaoId: string;
	pagamentos: TPaymentSplit[];
	autorId: string;
};

export type TPaymentIntentResult = {
	transacaoId: string;
	provedorReferencia: string | null;
	provedorStatus: string;
	efetivado: boolean;
};

export type TRefundResult = {
	provedorReferencia: string | null;
	provedorStatus: string;
};

export interface IPaymentProvider {
	processPayments(input: TProcessPaymentsInput): Promise<TPaymentIntentResult[]>;
	refundPayment(transacaoId: string, valor?: number): Promise<TRefundResult>;
	getPaymentStatus(provedorReferencia: string): Promise<string>;
}
