import { z } from "zod";
import { SaleNatureEnum } from "./enums";

const SaleItemSchema = z.object({
	codigo: z.string({}),
	descricao: z.string({}),
	unidade: z.string({}),
	qtde: z.number(),
	valorunit: z.number(),
	vprod: z.number(),
	vdesc: z.number(),
	vcusto: z.number(),
	baseicms: z.number(),
	percent: z.number(),
	icms: z.number(),
	cst_icms: z.string({}),
	csosn: z.string({}),
	cst_pis: z.string({}),
	cfop: z.string({}),
	tipo: z.string({}),
	vfrete: z.number(),
	vseg: z.number(),
	voutro: z.number(),
	vipi: z.number(),
	vicmsst: z.number(),
	vicms_desonera: z.number(),
	ncm: z.string({}),
	cest: z.string({}),
	grupo: z.string({}),
});
export const SaleSchema = z.object({
	id: z.string({}),
	chave: z.string({}),
	cliente: z.string({}).optional().nullable(),
	data: z.string({}),
	dataVenda: z.string({}),
	modelo: z.enum(["DV", "55", "65", "3A", "02"]),
	movimento: z.enum(["RECEITAS"]),
	natureza: SaleNatureEnum,
	parceiro: z.string({}),
	serie: z.string(),
	situacao: z.enum(["00", "04", "02", "05"]),
	tipo: z.enum(["Devolucao de compra", "Outras Saidas Nao Especificadas", "Remessa para conserto", "Condicional", "Venda de produtos"]),
	valor: z.number({}),
	vendedor: z.string({}),
	idCliente: z.string({}),
	itens: z.array(SaleItemSchema),
	custoTotal: z.number(),
});

export const SalesSimplifiedSearchQueryParams = z.object({
	search: z.string({ required_error: "Parâmetro de busca não informado.", invalid_type_error: "Parâmetro de busca não informado." }),
	page: z
		.number({ required_error: "Parâmetro de página não informado.", invalid_type_error: "Parâmetro de página não informado." })
		.min(1, { message: "Página não informada." }),
});
export type TSalesSimplifiedSearchQueryParams = z.infer<typeof SalesSimplifiedSearchQueryParams>;

export type TSale = z.infer<typeof SaleSchema>;

/**
 * Estado do envio de conversão (Purchase) ao Conversions API da Meta, gravado na própria venda
 * (`sales.capiMetadados`) — sem tabela dedicada, pois é 1 venda = 1 evento Purchase.
 * Nunca guarda PII crua: só o resumo do envio (o hash só vai no payload enviado à Meta).
 */
export const SaleCapiMetadataSchema = z.object({
	status: z.enum(["PENDENTE", "ENVIADO", "FALHA"], {
		required_error: "Status do CAPI não informado.",
		invalid_type_error: "Tipo não válido para o status do CAPI.",
	}),
	eventId: z.string({ required_error: "eventId do CAPI não informado.", invalid_type_error: "Tipo não válido para o eventId do CAPI." }),
	eventName: z.string({ required_error: "eventName do CAPI não informado.", invalid_type_error: "Tipo não válido para o eventName do CAPI." }),
	integrationId: z.string({ invalid_type_error: "Tipo não válido para o ID da integração." }).optional(),
	actionSource: z.string({ invalid_type_error: "Tipo não válido para o action_source." }).optional(),
	eventsReceived: z.number({ invalid_type_error: "Tipo não válido para eventos recebidos." }).optional(),
	tentativas: z.number({ invalid_type_error: "Tipo não válido para tentativas." }).default(0),
	ultimoErro: z.string({ invalid_type_error: "Tipo não válido para o último erro." }).optional().nullable(),
	dataEnvio: z.string({ invalid_type_error: "Tipo não válido para a data de envio." }).datetime().optional(),
});
export type TSaleCapiMetadata = z.infer<typeof SaleCapiMetadataSchema>;

/**
 * Metadados de venda de canal de integração (ex.: iFood) — detalhamento que não cabe nas colunas
 * da venda mas é necessário para o fiscal (frete próprio, descontos por patrocinador) e para a
 * conciliação do repasse (taxas do canal). Escrito uma vez pela ingestão; null em vendas internas.
 */
export const SaleIntegrationMetadataSchema = z.object({
	versao: z.literal(1),
	canal: z.string({ required_error: "Canal dos metadados de integração não informado." }),
	entrega: z.object({
		/** LOJA = entrega própria (frete é receita da loja, entra na NF); CANAL = entregador do canal. */
		realizadaPor: z.enum(["LOJA", "CANAL"], { invalid_type_error: "Tipo não válido para o responsável pela entrega." }).nullable(),
		valorFrete: z.number({ invalid_type_error: "Tipo não válido para o valor do frete." }),
	}),
	descontos: z.object({
		/** Desconto bancado pela loja (sponsorship MERCHANT) — reduz a NF (rateado nos itens). */
		loja: z.number({ invalid_type_error: "Tipo não válido para o desconto da loja." }),
		/** Descontos bancados por terceiros (IFOOD/EXTERNAL/CHAIN) — NF cheia; entram como pagamento. */
		patrocinados: z.array(
			z.object({
				patrocinador: z.string({ required_error: "Patrocinador do desconto não informado." }),
				valor: z.number({ invalid_type_error: "Tipo não válido para o valor patrocinado." }),
			}),
		),
	}),
	/** Taxas do canal (ex.: additionalFees do iFood) — receita do canal, fora da NF; material da conciliação. */
	taxasCanal: z.array(
		z.object({
			tipo: z.string({ required_error: "Tipo da taxa do canal não informado." }),
			valor: z.number({ invalid_type_error: "Tipo não válido para o valor da taxa do canal." }),
		}),
	),
});
export type TSaleIntegrationMetadata = z.infer<typeof SaleIntegrationMetadataSchema>;
