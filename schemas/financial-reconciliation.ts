import { z } from "zod";
import {
	FinancialReconciliationActionEnum,
	FinancialReconciliationMatchStatusEnum,
	FinancialReconciliationMatchTypeEnum,
	FinancialStatementImportStatusEnum,
	FinancialStatementOriginEnum,
	FinancialStatementTransactionStatusEnum,
	FinancialTransactionTypeEnum,
	PaymentMethodEnum,
} from "./enums";

// ============================================================================
// STATEMENT IMPORTS (Importacoes de Extrato)
// ============================================================================

export const FinancialStatementImportSchema = z.object({
	organizacaoId: z.string({
		required_error: "ID da organizacao nao informado.",
		invalid_type_error: "Tipo nao valido para o ID da organizacao.",
	}),
	contaFinanceiraId: z.string({
		required_error: "ID da conta financeira nao informado.",
		invalid_type_error: "Tipo nao valido para o ID da conta financeira.",
	}),
	origem: FinancialStatementOriginEnum.default("ARQUIVO"),
	conexaoId: z.string({ invalid_type_error: "Tipo nao valido para o ID da conexao." }).optional().nullable(),
	status: FinancialStatementImportStatusEnum.default("PROCESSANDO"),
	erro: z.string({ invalid_type_error: "Tipo nao valido para o erro da importacao." }).optional().nullable(),
	arquivoNome: z.string({ invalid_type_error: "Tipo nao valido para o nome do arquivo." }).optional().nullable(),
	arquivoStoragePath: z.string({ invalid_type_error: "Tipo nao valido para o caminho do arquivo." }).optional().nullable(),
	arquivoMimeType: z.string({ invalid_type_error: "Tipo nao valido para o mime type do arquivo." }).optional().nullable(),
	arquivoTamanhoBytes: z.number({ invalid_type_error: "Tipo nao valido para o tamanho do arquivo." }).optional().nullable(),
	periodoInicio: z
		.string({ invalid_type_error: "Tipo nao valido para o inicio do periodo." })
		.datetime({ message: "Tipo nao valido para o inicio do periodo." })
		.optional()
		.nullable()
		.transform((val) => (val ? new Date(val) : null)),
	periodoFim: z
		.string({ invalid_type_error: "Tipo nao valido para o fim do periodo." })
		.datetime({ message: "Tipo nao valido para o fim do periodo." })
		.optional()
		.nullable()
		.transform((val) => (val ? new Date(val) : null)),
	saldoInicial: z.number({ invalid_type_error: "Tipo nao valido para o saldo inicial do extrato." }).optional().nullable(),
	saldoFinal: z.number({ invalid_type_error: "Tipo nao valido para o saldo final do extrato." }).optional().nullable(),
	autorId: z.string({ invalid_type_error: "Tipo nao valido para o ID do autor." }).optional().nullable(),
	dataInsercao: z
		.string({ invalid_type_error: "Tipo nao valido para a data de insercao." })
		.datetime({ message: "Tipo nao valido para a data de insercao." })
		.default(new Date().toISOString())
		.transform((val) => new Date(val)),
});
export type TFinancialStatementImport = z.infer<typeof FinancialStatementImportSchema>;

// ============================================================================
// STATEMENT TRANSACTIONS (Linhas do Extrato)
// ============================================================================

export const FinancialStatementTransactionSchema = z.object({
	organizacaoId: z.string({
		required_error: "ID da organizacao nao informado.",
		invalid_type_error: "Tipo nao valido para o ID da organizacao.",
	}),
	importacaoId: z.string({
		required_error: "ID da importacao nao informado.",
		invalid_type_error: "Tipo nao valido para o ID da importacao.",
	}),
	contaFinanceiraId: z.string({
		required_error: "ID da conta financeira nao informado.",
		invalid_type_error: "Tipo nao valido para o ID da conta financeira.",
	}),
	dataTransacao: z
		.string({
			required_error: "Data da transacao nao informada.",
			invalid_type_error: "Tipo nao valido para a data da transacao.",
		})
		.datetime({ message: "Tipo nao valido para a data da transacao." })
		.transform((val) => new Date(val)),
	descricao: z.string({
		required_error: "Descricao da linha do extrato nao informada.",
		invalid_type_error: "Tipo nao valido para a descricao da linha do extrato.",
	}),
	tipo: FinancialTransactionTypeEnum,
	valor: z
		.number({
			required_error: "Valor da linha do extrato nao informado.",
			invalid_type_error: "Tipo nao valido para o valor da linha do extrato.",
		})
		.positive({ message: "O valor da linha do extrato deve ser positivo." }),
	metodo: PaymentMethodEnum.optional().nullable(),
	idExterno: z.string({ invalid_type_error: "Tipo nao valido para o identificador externo." }).optional().nullable(),
	hash: z.string({
		required_error: "Hash da linha do extrato nao informado.",
		invalid_type_error: "Tipo nao valido para o hash da linha do extrato.",
	}),
	status: FinancialStatementTransactionStatusEnum.default("PENDENTE"),
	dataInsercao: z
		.string({ invalid_type_error: "Tipo nao valido para a data de insercao." })
		.datetime({ message: "Tipo nao valido para a data de insercao." })
		.default(new Date().toISOString())
		.transform((val) => new Date(val)),
});
export type TFinancialStatementTransaction = z.infer<typeof FinancialStatementTransactionSchema>;

// ============================================================================
// RECONCILIATION MATCHES (Vinculos linha ↔ transacao)
// ============================================================================

export const FinancialReconciliationMatchSchema = z.object({
	organizacaoId: z.string({
		required_error: "ID da organizacao nao informado.",
		invalid_type_error: "Tipo nao valido para o ID da organizacao.",
	}),
	extratoTransacaoId: z.string({
		required_error: "ID da linha do extrato nao informado.",
		invalid_type_error: "Tipo nao valido para o ID da linha do extrato.",
	}),
	transacaoFinanceiraId: z.string({
		required_error: "ID da transacao financeira nao informado.",
		invalid_type_error: "Tipo nao valido para o ID da transacao financeira.",
	}),
	tipo: FinancialReconciliationMatchTypeEnum,
	confianca: z
		.number({ invalid_type_error: "Tipo nao valido para a confianca do match." })
		.min(0, { message: "Confianca minima e 0." })
		.max(1, { message: "Confianca maxima e 1." })
		.optional()
		.nullable(),
	status: FinancialReconciliationMatchStatusEnum.default("SUGERIDO"),
	acao: FinancialReconciliationActionEnum.optional().nullable(),
	autorId: z.string({ invalid_type_error: "Tipo nao valido para o ID do autor." }).optional().nullable(),
	dataInsercao: z
		.string({ invalid_type_error: "Tipo nao valido para a data de insercao." })
		.datetime({ message: "Tipo nao valido para a data de insercao." })
		.default(new Date().toISOString())
		.transform((val) => new Date(val)),
});
export type TFinancialReconciliationMatch = z.infer<typeof FinancialReconciliationMatchSchema>;

// ============================================================================
// RECONCILIATION RULES (Regras aprendidas)
// ============================================================================

export const FinancialReconciliationRuleSchema = z.object({
	organizacaoId: z.string({
		required_error: "ID da organizacao nao informado.",
		invalid_type_error: "Tipo nao valido para o ID da organizacao.",
	}),
	padraoDescricao: z.string({
		required_error: "Padrao de descricao da regra nao informado.",
		invalid_type_error: "Tipo nao valido para o padrao de descricao da regra.",
	}),
	tipo: FinancialTransactionTypeEnum,
	contaContabilDebitoId: z.string({
		required_error: "Conta contabil de debito da regra nao informada.",
		invalid_type_error: "Tipo nao valido para a conta contabil de debito da regra.",
	}),
	contaContabilCreditoId: z.string({
		required_error: "Conta contabil de credito da regra nao informada.",
		invalid_type_error: "Tipo nao valido para a conta contabil de credito da regra.",
	}),
	metodo: PaymentMethodEnum.optional().nullable(),
	usos: z.number({ invalid_type_error: "Tipo nao valido para a contagem de usos da regra." }).default(1),
	dataInsercao: z
		.string({ invalid_type_error: "Tipo nao valido para a data de insercao." })
		.datetime({ message: "Tipo nao valido para a data de insercao." })
		.default(new Date().toISOString())
		.transform((val) => new Date(val)),
});
export type TFinancialReconciliationRule = z.infer<typeof FinancialReconciliationRuleSchema>;
