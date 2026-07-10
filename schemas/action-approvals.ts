import { z } from "zod";
import { DiscountLimitTypeEnum } from "./enums";

/**
 * Payloads das solicitações de aprovação de ação, discriminados por `tipo`.
 * Cada novo cenário aprovável (cancelamento de venda, compra acima de limite…) entra aqui
 * como um novo membro da union — sem migração de banco (a coluna `tipo` é varchar).
 */
export const VendaDescontoApprovalPayloadSchema = z.object({
	tipo: z.literal("VENDA_DESCONTO"),
	// Vendedor da venda (identidade avaliada contra o teto). Null = venda sem vendedor vinculado,
	// caso em que a identidade avaliada foi a membership do solicitante.
	vendedorId: z.string({ invalid_type_error: "Tipo não válido para o ID do vendedor." }).nullable(),
	// Σ bruto dos itens no momento da solicitação — a base do percentual e a âncora da validação no consumo.
	valorBase: z.number({ required_error: "Valor base da venda não informado.", invalid_type_error: "Tipo não válido para o valor base da venda." }),
	// Desconto agregado solicitado, em valor absoluto (desconto geral + itens + cupom MANUAL).
	descontoSolicitado: z.number({
		required_error: "Valor do desconto solicitado não informado.",
		invalid_type_error: "Tipo não válido para o valor do desconto solicitado.",
	}),
	// Derivado (descontoSolicitado / valorBase), carimbado para exibição.
	descontoPercentual: z.number({
		required_error: "Percentual do desconto solicitado não informado.",
		invalid_type_error: "Tipo não válido para o percentual do desconto solicitado.",
	}),
	// Snapshot do teto vigente do solicitante no momento do pedido (auditoria).
	limiteSolicitante: z
		.object({
			tipo: DiscountLimitTypeEnum.nullable(),
			valor: z.number({ invalid_type_error: "Tipo não válido para o valor do limite do solicitante." }).nullable(),
		})
		.nullable(),
});
export type TVendaDescontoApprovalPayload = z.infer<typeof VendaDescontoApprovalPayloadSchema>;

export const ActionApprovalPayloadSchema = z.discriminatedUnion("tipo", [
	VendaDescontoApprovalPayloadSchema,
	// futuros: VendaCancelamentoPayloadSchema, CompraAcimaLimitePayloadSchema, ...
]);
export type TActionApprovalPayload = z.infer<typeof ActionApprovalPayloadSchema>;

/**
 * Resumo denormalizado preenchido na criação — a fila de aprovações renderiza qualquer tipo
 * sem `switch` por payload.
 */
export const ActionApprovalSummarySchema = z.object({
	titulo: z.string({ required_error: "Título do resumo não informado.", invalid_type_error: "Tipo não válido para o título do resumo." }),
	descricao: z.string({ required_error: "Descrição do resumo não informada.", invalid_type_error: "Tipo não válido para a descrição do resumo." }),
	valorPrincipal: z.number({ invalid_type_error: "Tipo não válido para o valor principal do resumo." }).nullable(),
});
export type TActionApprovalSummary = z.infer<typeof ActionApprovalSummarySchema>;

/** Referência do consumo da aprovação (one-shot) — ex.: a venda que a utilizou. */
export const ActionApprovalConsumptionSchema = z.object({
	vendaId: z.string({ invalid_type_error: "Tipo não válido para o ID da venda." }).optional().nullable(),
});
export type TActionApprovalConsumption = z.infer<typeof ActionApprovalConsumptionSchema>;
