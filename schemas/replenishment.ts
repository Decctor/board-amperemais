import { z } from "zod";
import { StockPositionImportOriginEnum, StockPositionSourceEnum } from "./enums";

// Política de compra da organização. Os limites (min/max) não são preciosismo: um nível de serviço
// de 0.999 ou uma janela de 5 dias produzem sugestões que ninguém consegue defender na reunião.
export const ReplenishmentSettingsSchema = z.object({
	janelaAnaliseDias: z
		.number({ required_error: "Janela de análise não informada.", invalid_type_error: "Tipo inválido para a janela de análise." })
		.int({ message: "A janela de análise deve ser um número inteiro de dias." })
		.min(30, { message: "A janela de análise mínima é de 30 dias." })
		.max(365, { message: "A janela de análise máxima é de 365 dias." }),
	leadTimeDiasPadrao: z
		.number({ required_error: "Prazo de entrega padrão não informado.", invalid_type_error: "Tipo inválido para o prazo de entrega padrão." })
		.int({ message: "O prazo de entrega deve ser um número inteiro de dias." })
		.min(0, { message: "O prazo de entrega não pode ser negativo." })
		.max(365, { message: "O prazo de entrega máximo é de 365 dias." }),
	cicloRevisaoDias: z
		.number({ required_error: "Ciclo de revisão não informado.", invalid_type_error: "Tipo inválido para o ciclo de revisão." })
		.int({ message: "O ciclo de revisão deve ser um número inteiro de dias." })
		.min(1, { message: "O ciclo de revisão mínimo é de 1 dia." })
		.max(180, { message: "O ciclo de revisão máximo é de 180 dias." }),
	diasCoberturaAlvo: z
		.number({ required_error: "Cobertura alvo não informada.", invalid_type_error: "Tipo inválido para a cobertura alvo." })
		.int({ message: "A cobertura alvo deve ser um número inteiro de dias." })
		.min(1, { message: "A cobertura alvo mínima é de 1 dia." })
		.max(365, { message: "A cobertura alvo máxima é de 365 dias." }),
	nivelServico: z
		.number({ required_error: "Nível de serviço não informado.", invalid_type_error: "Tipo inválido para o nível de serviço." })
		.min(0.5, { message: "O nível de serviço mínimo é de 50%." })
		.max(0.999, { message: "O nível de serviço máximo é de 99,9%." }),
	diasExcessoLimite: z
		.number({ required_error: "Limite de excesso não informado.", invalid_type_error: "Tipo inválido para o limite de excesso." })
		.int({ message: "O limite de excesso deve ser um número inteiro de dias." })
		.min(1, { message: "O limite de excesso mínimo é de 1 dia." })
		.max(720, { message: "O limite de excesso máximo é de 720 dias." }),
	ajustarDemandaPorRuptura: z.boolean({
		required_error: "Ajuste por ruptura não informado.",
		invalid_type_error: "Tipo inválido para o ajuste por ruptura.",
	}),
	origemEstoquePadrao: StockPositionSourceEnum,
});
export type TReplenishmentSettings = z.infer<typeof ReplenishmentSettingsSchema>;

// Override por produto. Tudo opcional: a linha só existe para o item que foge da política da loja.
export const ProductReplenishmentSettingsSchema = z.object({
	produtoId: z.string({ required_error: "Produto não informado.", invalid_type_error: "Tipo inválido para o produto." }),
	sobressalente: z.boolean({ invalid_type_error: "Tipo inválido para item sobressalente." }).default(false),
	naoPromover: z.boolean({ invalid_type_error: "Tipo inválido para não promover." }).default(false),
	descontinuado: z.boolean({ invalid_type_error: "Tipo inválido para descontinuado." }).default(false),
	fornecedorPreferencialId: z.string({ invalid_type_error: "Tipo inválido para o fornecedor preferencial." }).optional().nullable(),
	leadTimeDias: z
		.number({ invalid_type_error: "Tipo inválido para o prazo de entrega." })
		.int({ message: "O prazo de entrega deve ser um número inteiro de dias." })
		.min(0, { message: "O prazo de entrega não pode ser negativo." })
		.max(365, { message: "O prazo de entrega máximo é de 365 dias." })
		.optional()
		.nullable(),
	multiploCompra: z
		.number({ invalid_type_error: "Tipo inválido para o múltiplo de compra." })
		.gt(0, { message: "O múltiplo de compra deve ser maior que zero." })
		.optional()
		.nullable(),
	quantidadeMinimaCompra: z
		.number({ invalid_type_error: "Tipo inválido para a quantidade mínima de compra." })
		.min(0, { message: "A quantidade mínima de compra não pode ser negativa." })
		.optional()
		.nullable(),
	estoqueMinimo: z
		.number({ invalid_type_error: "Tipo inválido para o estoque mínimo." })
		.min(0, { message: "O estoque mínimo não pode ser negativo." })
		.optional()
		.nullable(),
	estoqueMaximo: z
		.number({ invalid_type_error: "Tipo inválido para o estoque máximo." })
		.min(0, { message: "O estoque máximo não pode ser negativo." })
		.optional()
		.nullable(),
	anotacoes: z.string({ invalid_type_error: "Tipo inválido para as anotações." }).optional().nullable(),
});
export type TProductReplenishmentSettings = z.infer<typeof ProductReplenishmentSettingsSchema>;

// Uma linha lida do arquivo de posição de estoque, já normalizada pelo parser.
export const StockPositionImportItemSchema = z.object({
	codigo: z
		.string({ required_error: "Código do item não informado.", invalid_type_error: "Tipo inválido para o código do item." })
		.min(1, { message: "Código do item não informado." }),
	descricao: z.string({ invalid_type_error: "Tipo inválido para a descrição do item." }).optional().nullable(),
	quantidade: z.number({
		required_error: "Quantidade do item não informada.",
		invalid_type_error: "Tipo inválido para a quantidade do item.",
	}),
	custoUnitario: z.number({ invalid_type_error: "Tipo inválido para o custo unitário." }).optional().nullable(),
	precoVenda: z.number({ invalid_type_error: "Tipo inválido para o preço de venda." }).optional().nullable(),
	quantidadeEmTransito: z.number({ invalid_type_error: "Tipo inválido para a quantidade em trânsito." }).optional().nullable(),
	fornecedorNome: z.string({ invalid_type_error: "Tipo inválido para o fornecedor." }).optional().nullable(),
});
export type TStockPositionImportItem = z.infer<typeof StockPositionImportItemSchema>;

export const StockPositionImportSchema = z.object({
	origem: StockPositionImportOriginEnum,
	arquivoNome: z.string({ invalid_type_error: "Tipo inválido para o nome do arquivo." }).optional().nullable(),
	dataPosicao: z
		.string({ invalid_type_error: "Tipo inválido para a data da posição." })
		.datetime({ message: "Tipo inválido para a data da posição." })
		.optional()
		.nullable()
		.transform((value) => (value ? new Date(value) : new Date())),
	mapeamentoColunas: z.record(z.string(), z.string()).optional().nullable(),
	itens: z
		.array(StockPositionImportItemSchema, {
			required_error: "Itens da posição não informados.",
			invalid_type_error: "Tipo inválido para os itens da posição.",
		})
		.min(1, { message: "A posição de estoque precisa de ao menos um item." }),
});
export type TStockPositionImport = z.infer<typeof StockPositionImportSchema>;
