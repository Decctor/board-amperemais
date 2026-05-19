import z from "zod";

export const BLING_API_BASE_URL = "https://api.bling.com.br/Api/v3";
export const BLING_AUTHORIZATION_URL = "https://bling.com.br/Api/v3/oauth/authorize";
export const BLING_TOKEN_URL = "https://bling.com.br/Api/v3/oauth/token";

export const BlingConfigSchema = z.object({
	tipo: z.literal("BLING"),
	accessToken: z.string(),
	refreshToken: z.string(),
	tokenType: z.string().default("Bearer"),
	scope: z.array(z.string()).default([]),
	expiresAt: z.string().datetime(),
	connectedAt: z.string().datetime(),
});
export type TBlingConfig = z.infer<typeof BlingConfigSchema>;

const BlingNullableStringSchema = z
	.union([z.string(), z.number(), z.boolean()])
	.optional()
	.nullable()
	.transform((value) => {
		if (value === null || value === undefined) return null;
		return String(value);
	});

const BlingMoneySchema = z
	.union([z.string(), z.number()])
	.optional()
	.nullable()
	.transform((value) => {
		if (value === null || value === undefined || value === "") return 0;
		const numberValue = Number(value);
		return Number.isFinite(numberValue) ? numberValue : 0;
	});

const BlingNumberIdSchema = z.union([z.string(), z.number()]).optional().nullable();

export const BlingTokenResponseSchema = z
	.object({
		access_token: z.string().optional(),
		refresh_token: z.string().optional(),
		token_type: z.string().optional(),
		expires_in: z.number().optional(),
		scope: z.union([z.string(), z.array(z.string())]).optional(),
	})
	.passthrough()
	.transform((value, ctx) => {
		if (!value.access_token || !value.refresh_token) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Resposta de autenticação do Bling sem tokens.",
			});
			return z.NEVER;
		}

		return {
			accessToken: value.access_token,
			refreshToken: value.refresh_token,
			tokenType: value.token_type ?? "Bearer",
			expiresIn: value.expires_in ?? 60 * 60 * 6,
			scope: Array.isArray(value.scope)
				? value.scope
				: value.scope
					? value.scope
							.split(/[,\s]+/)
							.map((scope) => scope.trim())
							.filter(Boolean)
					: [],
		};
	});
export type TBlingTokenResponse = z.infer<typeof BlingTokenResponseSchema>;

export const BlingContactSchema = z
	.object({
		id: BlingNumberIdSchema,
		nome: BlingNullableStringSchema,
		fantasia: BlingNullableStringSchema,
		numeroDocumento: BlingNullableStringSchema,
		telefone: BlingNullableStringSchema,
		celular: BlingNullableStringSchema,
		email: BlingNullableStringSchema,
		endereco: z
			.object({
				geral: z
					.object({
						cep: BlingNullableStringSchema,
						uf: BlingNullableStringSchema,
						municipio: BlingNullableStringSchema,
						bairro: BlingNullableStringSchema,
						endereco: BlingNullableStringSchema,
						numero: BlingNullableStringSchema,
						complemento: BlingNullableStringSchema,
					})
					.passthrough()
					.optional()
					.nullable(),
			})
			.passthrough()
			.optional()
			.nullable(),
	})
	.passthrough();
export type TBlingContact = z.infer<typeof BlingContactSchema>;

export const BlingProductSchema = z
	.object({
		id: BlingNumberIdSchema,
		nome: BlingNullableStringSchema,
		codigo: BlingNullableStringSchema,
		unidade: BlingNullableStringSchema,
		tipo: BlingNullableStringSchema,
		descricaoCurta: BlingNullableStringSchema,
		categoria: z
			.object({
				id: BlingNumberIdSchema,
				descricao: BlingNullableStringSchema,
			})
			.passthrough()
			.optional()
			.nullable(),
		tributacao: z
			.object({
				ncm: BlingNullableStringSchema,
			})
			.passthrough()
			.optional()
			.nullable(),
	})
	.passthrough();
export type TBlingProduct = z.infer<typeof BlingProductSchema>;

export const BlingSaleItemSchema = z
	.object({
		id: BlingNumberIdSchema,
		codigo: BlingNullableStringSchema,
		unidade: BlingNullableStringSchema,
		quantidade: BlingMoneySchema,
		desconto: BlingMoneySchema,
		valor: BlingMoneySchema,
		descricao: BlingNullableStringSchema,
		descricaoDetalhada: BlingNullableStringSchema,
		produto: z
			.object({
				id: BlingNumberIdSchema,
			})
			.passthrough()
			.optional()
			.nullable(),
	})
	.passthrough();
export type TBlingSaleItem = z.infer<typeof BlingSaleItemSchema>;

export const BlingSaleSchema = z
	.object({
		id: BlingNumberIdSchema,
		numero: BlingNullableStringSchema,
		numeroLoja: BlingNullableStringSchema,
		data: BlingNullableStringSchema,
		dataSaida: BlingNullableStringSchema,
		dataPrevista: BlingNullableStringSchema,
		totalProdutos: BlingMoneySchema,
		total: BlingMoneySchema,
		outrasDespesas: BlingMoneySchema,
		observacoes: BlingNullableStringSchema,
		desconto: z
			.object({
				valor: BlingMoneySchema,
				unidade: BlingNullableStringSchema,
			})
			.passthrough()
			.optional()
			.nullable(),
		contato: BlingContactSchema.optional().nullable(),
		situacao: z
			.object({
				id: BlingNumberIdSchema,
				valor: BlingNumberIdSchema,
				nome: BlingNullableStringSchema,
			})
			.passthrough()
			.optional()
			.nullable(),
		loja: z
			.object({
				id: BlingNumberIdSchema,
			})
			.passthrough()
			.optional()
			.nullable(),
		transporte: z
			.object({
				frete: BlingMoneySchema,
			})
			.passthrough()
			.optional()
			.nullable(),
		vendedor: z
			.object({
				id: BlingNumberIdSchema,
				nome: BlingNullableStringSchema,
			})
			.passthrough()
			.optional()
			.nullable(),
		itens: z.array(BlingSaleItemSchema).optional().default([]),
	})
	.passthrough();
export type TBlingSale = z.infer<typeof BlingSaleSchema>;

export const BlingChannelSchema = z
	.object({
		id: BlingNumberIdSchema,
		descricao: BlingNullableStringSchema,
		tipo: BlingNullableStringSchema,
	})
	.passthrough();
export type TBlingChannel = z.infer<typeof BlingChannelSchema>;

export const BlingListOutputSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
	z.object({ data: z.array(itemSchema).optional().default([]) }).passthrough();

export const BlingSingleOutputSchema = <T extends z.ZodTypeAny>(itemSchema: T) => z.object({ data: itemSchema }).passthrough();
