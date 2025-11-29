import { z } from "zod";

export const ProductSchema = z.object({
	descricao: z.string({
		required_error: "Nome do produto não informado.",
		invalid_type_error: "Tipo não válido para nome do produto.",
	}),
	imagemCapaUrl: z
		.string({
			required_error: "URL da imagem capa do produto não informada.",
			invalid_type_error: "Tipo não válido para URL da imagem capa do produto.",
		})
		.optional()
		.nullable(),
	codigo: z.string({
		required_error: "Codigo do produto não informado.",
		invalid_type_error: "Tipo não válido para codigo do produto.",
	}),
	unidade: z.string({
		required_error: "Unidade do produto não informado.",
		invalid_type_error: "Tipo não válido para unidade do produto.",
	}),
	ncm: z.string({
		required_error: "NCM do produto não informado.",
		invalid_type_error: "Tipo não válido para NCM do produto.",
	}),
	tipo: z.string({
		required_error: "Tipo do produto não informado.",
		invalid_type_error: "Tipo não válido para tipo do produto.",
	}),
	grupo: z.string({
		required_error: "Grupo do produto não informado.",
		invalid_type_error: "Tipo não válido para grupo do produto.",
	}),
});
export type TProduct = z.infer<typeof ProductSchema>;

// Product Stats Query Params for Frontend
export type TProductStatsQueryParams = {
	periodAfter: string | null;
	periodBefore: string | null;
	sellerId: string | null;
	partnerId: string | null;
	saleNatures: string[];
};
