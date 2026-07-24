import { z } from "zod";

// ============================================================================
// Solicitacoes publicas de pedido via QR (docs/tabs/implementation-plan.md, fase 3).
// O cliente publico NUNCA envia precos: o payload guarda apenas referencias de
// produto + quantidade; a precificacao autoritativa acontece na aprovacao.
// ============================================================================

export const TabOrderRequestItemSchema = z.object({
	produtoId: z.string({ required_error: "ID do produto nao informado.", invalid_type_error: "Tipo nao valido para ID do produto." }),
	produtoVarianteId: z.string({ invalid_type_error: "Tipo nao valido para ID da variante." }).optional().nullable(),
	// Snapshot para exibicao na aprovacao (o preco NAO vem daqui).
	nome: z.string({ required_error: "Nome do item nao informado.", invalid_type_error: "Tipo nao valido para nome do item." }),
	quantidade: z
		.number({ required_error: "Quantidade nao informada.", invalid_type_error: "Tipo nao valido para quantidade." })
		.positive({ message: "Quantidade deve ser positiva." })
		.max(99, { message: "Quantidade maxima por item excedida." }),
});
export type TTabOrderRequestItem = z.infer<typeof TabOrderRequestItemSchema>;

export const TabOrderRequestPayloadSchema = z.object({
	itens: z.array(TabOrderRequestItemSchema).min(1, { message: "Pelo menos um item e obrigatorio." }).max(50, { message: "Limite de itens excedido." }),
	observacoes: z.string({ invalid_type_error: "Tipo nao valido para observacoes." }).max(500).optional().nullable(),
	contexto: z.enum(["PONTO", "TAB"], {
		required_error: "Contexto da solicitacao nao informado.",
		invalid_type_error: "Tipo nao valido para contexto da solicitacao.",
	}),
});
export type TTabOrderRequestPayload = z.infer<typeof TabOrderRequestPayloadSchema>;
