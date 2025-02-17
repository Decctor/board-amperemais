import { z } from "zod";
import type { TSale } from "./sales";

export const ClientSchema = z.object({
	nome: z.string({
		required_error: "Nome do cliente não informado.",
		invalid_type_error: "Tipo não válido para o nome do cliente.",
	}),
	telefone: z
		.string({ invalid_type_error: "Tipo não válido para telefone." })
		.optional()
		.nullable(),
	email: z
		.string({ invalid_type_error: "Tipo não válido para email." })
		.optional()
		.nullable(),
	canalAquisicao: z
		.string({ invalid_type_error: "Tipo não válido para canal de aquisição." })
		.optional()
		.nullable(),
	dataInsercao: z
		.string({ invalid_type_error: "Tipo não válido para data de inserção." })
		.optional()
		.nullable(),
	dataPrimeiraCompra: z.string({
		invalid_type_error: "Tipo não válido para data da primeira compra.",
	}),
	idPrimeiraCompra: z.string({
		invalid_type_error: "Tipo não válido para data da primeira compra.",
	}),
	dataUltimaCompra: z.string({
		invalid_type_error: "Tipo não válido para data da última compra.",
	}),
	idUltimaCompra: z.string({
		invalid_type_error: "Tipo não válido para data da última compra.",
	}),
	analiseRFM: z.object({
		notas: z.object({
			recencia: z.number(),
			frequencia: z.number(),
		}),
		titulo: z.string(),
		ultimaAtualizacao: z.string(),
	}),
	analisePeriodo: z.object({
		recencia: z.number(),
		frequencia: z.number(),
		valor: z.number(),
	}),
	autor: z
		.object({
			id: z.string({
				required_error: "ID do autor não informado.",
				invalid_type_error: "Tipo não válido para o ID do autor.",
			}),
			nome: z.string({
				required_error: "Nome do autor não informado.",
				invalid_type_error: "Tipo não válido para o nome do autor.",
			}),
			avatar_url: z
				.string({
					required_error: "Avatar do autor não informado.",
					invalid_type_error: "Tipo não válido para o Avatar do autor.",
				})
				.optional()
				.nullable(),
		})
		.optional()
		.nullable(),
});

export const ClientSimplifiedProjection = {
	nome: 1,
	telefone: 1,
	email: 1,
	canalAquisicao: 1,
	dataPrimeiraCompra: 1,
	dataUltimaCompra: 1,
	analiseRFM: 1,
	analisePeriodo: 1,
};
export type TClient = z.infer<typeof ClientSchema>;
export type TClientDTO = TClient & { _id: string };
export type TClientSimplified = Pick<
	TClient,
	| "nome"
	| "telefone"
	| "email"
	| "canalAquisicao"
	| "dataPrimeiraCompra"
	| "dataUltimaCompra"
	| "analiseRFM"
	| "analisePeriodo"
>;
export type TClientSimplifiedDTO = TClientSimplified & { _id: string };

export type TClientSimplifiedWithSales = TClientSimplified & {
	vendas: Pick<TSale, "valor" | "dataVenda">[];
};
export type TClientSimplifiedWithSalesDTO = TClientSimplifiedWithSales & {
	_id: string;
};
export const ClientSearchQueryParams = z.object({
	page: z
		.number({
			required_error: "Parâmetro de páginação não informado.",
			invalid_type_error: "Tipo não válido para o parâmetro de páginização.",
		})
		.min(1, "Parâmetro de páginação inválido."),
	name: z.string({
		required_error: "Filtro por nome não informado.",
		invalid_type_error: "Tipo não válido para filtro por nome.",
	}),
	phone: z.string({
		invalid_type_error: "Tipo não válido para filtro por telefone.",
	}),
	acquisitionChannels: z.array(
		z.string({
			invalid_type_error: "Tipo não válido para filtro por canal de aquisição.",
		}),
	),
	rfmTitles: z.array(
		z.string({
			invalid_type_error: "Tipo não válido para filtro por título RFM.",
		}),
	),
	period: z.object({
		after: z
			.string({
				invalid_type_error: "Tipo não válido para parâmetro de período.",
			})
			.optional()
			.nullable(),
		before: z
			.string({
				invalid_type_error: "Tipo não válido para parâmetro de período.",
			})
			.optional()
			.nullable(),
	}),
});

export type TClientSearchQueryParams = z.infer<typeof ClientSearchQueryParams>;
