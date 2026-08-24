import z from "zod";

export const ERP_FLEX_API_V1_BASE_URL = "https://api.erpflex.com.br/api";
export const ERP_FLEX_API_V2_BASE_URL = "https://api.erpflex.com.br/api_v2";

/** Página fixa da consulta de faturamentos V2 (`/faturamento/P{n}`). */
export const ERP_FLEX_BILLING_PAGE_SIZE = 10;

export const ErpFlexConfigSchema = z.object({
	tipo: z.literal("ERP-FLEX"),
	username: z.string(),
	password: z.string(),
	database: z.string(),
});
export type TErpFlexConfig = z.infer<typeof ErpFlexConfigSchema>;

const ErpFlexNullableStringSchema = z
	.union([z.string(), z.number(), z.boolean()])
	.optional()
	.nullable()
	.transform((value) => {
		if (value === null || value === undefined) return null;
		const stringValue = String(value).trim();
		return stringValue.length > 0 ? stringValue : null;
	});

/** Aceita número JSON, "1234.56" e o formato brasileiro "1.234,56". */
const ErpFlexMoneySchema = z
	.union([z.string(), z.number()])
	.optional()
	.nullable()
	.transform((value) => {
		if (value === null || value === undefined || value === "") return 0;
		if (typeof value === "number") return Number.isFinite(value) ? value : 0;
		const normalized = value.includes(",") ? value.replace(/\./g, "").replace(",", ".") : value;
		const numberValue = Number(normalized);
		return Number.isFinite(numberValue) ? numberValue : 0;
	});

const ErpFlexIdSchema = z.union([z.string(), z.number()]).optional().nullable();

export const ErpFlexBillingItemSchema = z
	.object({
		item_id: ErpFlexIdSchema,
		produto_id: ErpFlexIdSchema,
		vendedor_id: ErpFlexIdSchema,
		desc_produto: ErpFlexNullableStringSchema,
		variante_chave: ErpFlexNullableStringSchema,
		EAN: ErpFlexNullableStringSchema,
		cfop: ErpFlexNullableStringSchema,
		quantidade: ErpFlexMoneySchema,
		preco_unitario: ErpFlexMoneySchema,
		valor_item: ErpFlexMoneySchema,
		valor_desconto: ErpFlexMoneySchema,
	})
	.passthrough();
export type TErpFlexBillingItem = z.infer<typeof ErpFlexBillingItemSchema>;

export const ErpFlexBillingSchema = z
	.object({
		faturamento_id: ErpFlexIdSchema,
		data_emissao: ErpFlexNullableStringSchema,
		documento: ErpFlexNullableStringSchema,
		nr_nfe: ErpFlexNullableStringSchema,
		cliente_id: ErpFlexIdSchema,
		nome_cliente: ErpFlexNullableStringSchema,
		cliente_relacionado_id: ErpFlexIdSchema,
		orcamento_id: ErpFlexIdSchema,
		vendedor_id: ErpFlexIdSchema,
		modelo_nf: ErpFlexNullableStringSchema,
		serie_nf: ErpFlexNullableStringSchema,
		valor_nf: ErpFlexMoneySchema,
		inf_adicional: ErpFlexNullableStringSchema,
		itens: z.array(ErpFlexBillingItemSchema).optional().default([]),
	})
	.passthrough();
export type TErpFlexBilling = z.infer<typeof ErpFlexBillingSchema>;

/** Cadastro de cliente da API V1 (`/cliente/{id}`) — campos documentados + tolerância a extras. */
export const ErpFlexClientSchema = z
	.object({
		id: ErpFlexIdSchema,
		nome: ErpFlexNullableStringSchema,
		razao_social: ErpFlexNullableStringSchema,
		fantasia: ErpFlexNullableStringSchema,
		cpf_cnpj: ErpFlexNullableStringSchema,
		email: ErpFlexNullableStringSchema,
		telefone: ErpFlexNullableStringSchema,
		celular: ErpFlexNullableStringSchema,
		fone: ErpFlexNullableStringSchema,
		endereco: ErpFlexNullableStringSchema,
		numero: ErpFlexNullableStringSchema,
		complemento: ErpFlexNullableStringSchema,
		bairro: ErpFlexNullableStringSchema,
		cidade: ErpFlexNullableStringSchema,
		estado: ErpFlexNullableStringSchema,
		uf: ErpFlexNullableStringSchema,
		cep: ErpFlexNullableStringSchema,
	})
	.passthrough();
export type TErpFlexClient = z.infer<typeof ErpFlexClientSchema>;

/** Cadastro de produto da API V1 (`/produto/{id}`). */
export const ErpFlexProductSchema = z
	.object({
		id: ErpFlexIdSchema,
		codigo: ErpFlexNullableStringSchema,
		nome: ErpFlexNullableStringSchema,
		descricao: ErpFlexNullableStringSchema,
		unidade: ErpFlexNullableStringSchema,
		grupo: ErpFlexNullableStringSchema,
		ncm: ErpFlexNullableStringSchema,
		tipo: ErpFlexNullableStringSchema,
	})
	.passthrough();
export type TErpFlexProduct = z.infer<typeof ErpFlexProductSchema>;

/**
 * Faturamento V2 responde `{ status, message, faturamentos: [...] }`; consultas unitárias podem
 * devolver o objeto direto. O unwrap tolerante fica no client (`unwrapErpFlexList`).
 */
export const ErpFlexBillingListResponseSchema = z
	.object({
		status: z.union([z.boolean(), z.string(), z.number()]).optional().nullable(),
		message: ErpFlexNullableStringSchema,
		faturamentos: z.array(z.unknown()).optional().nullable(),
	})
	.passthrough();
