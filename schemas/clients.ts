import { z } from "zod";
import type { TSale } from "./sales";
import { SaleNatureEnum } from "./enums";

export const ClientSchema = z.object({
	nome: z.string({
		required_error: "Nome do cliente não informado.",
		invalid_type_error: "Tipo não válido para o nome do cliente.",
	}),
	cpfCnpj: z.string({ invalid_type_error: "Tipo não válido para CPF/CNPJ." }).optional().nullable(),
	// Communication
	telefone: z.string({ invalid_type_error: "Tipo não válido para telefone." }).optional().nullable(),
	telefoneBase: z.string({ invalid_type_error: "Tipo não válido para telefone base." }),
	email: z.string({ invalid_type_error: "Tipo não válido para email." }),
	// Location
	localizacaoCep: z.string({ invalid_type_error: "Tipo não válido para CEP." }).optional().nullable(),
	localizacaoEstado: z.string({ invalid_type_error: "Tipo não válido para estado." }).optional().nullable(),
	localizacaoCidade: z.string({ invalid_type_error: "Tipo não válido para cidade." }).optional().nullable(),
	localizacaoBairro: z.string({ invalid_type_error: "Tipo não válido para bairro." }).optional().nullable(),
	localizacaoLogradouro: z.string({ invalid_type_error: "Tipo não válido para logradouro." }).optional().nullable(),
	localizacaoNumero: z.string({ invalid_type_error: "Tipo não válido para número." }).optional().nullable(),
	localizacaoComplemento: z.string({ invalid_type_error: "Tipo não válido para complemento." }).optional().nullable(),
	// Others
	canalAquisicao: z.string({ invalid_type_error: "Tipo não válido para canal de aquisição." }).optional().nullable(),
	primeiraCompraData: z
		.date({
			invalid_type_error: "Tipo não válido para data da primeira compra.",
		})
		.optional()
		.nullable(),
	primeiraCompraId: z.string({
		invalid_type_error: "Tipo não válido para ID da primeira compra.",
	}),
	ultimaCompraData: z
		.date({
			invalid_type_error: "Tipo não válido para data da ultima compra.",
		})
		.optional()
		.nullable(),
	ultimaCompraId: z.string({
		invalid_type_error: "Tipo não válido para ID da ultima compra.",
	}),
	analiseRFMTitulo: z
		.string({
			invalid_type_error: "Tipo não válido para título RFM.",
		})
		.optional()
		.nullable(),
	analiseRFMNotasRecencia: z
		.string({
			invalid_type_error: "Tipo não válido para notas de recência.",
		})
		.optional()
		.nullable(),
	analiseRFMNotasFrequencia: z
		.string({
			invalid_type_error: "Tipo não válido para notas de frequência.",
		})
		.optional()
		.nullable(),
	analiseRFMNotasMonetario: z
		.string({
			invalid_type_error: "Tipo não válido para notas monetárias.",
		})
		.optional()
		.nullable(),
	analiseRFMUltimaAtualizacao: z
		.date({
			invalid_type_error: "Tipo não válido para data de atualização.",
		})
		.optional()
		.nullable(),
	dataInsercao: z.date({
		invalid_type_error: "Tipo não válido para data de inserção.",
	}),
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
	"compras.valor": 1,
	"compras.data": 1,
};
export type TClient = z.infer<typeof ClientSchema>;
export type TClientDTO = TClient & { _id: string };
export type TClientSimplified = Pick<
	TClient,
	| "nome"
	| "telefone"
	| "email"
	| "canalAquisicao"
	| "primeiraCompraData"
	| "ultimaCompraData"
	| "analiseRFMTitulo"
	| "analiseRFMNotasRecencia"
	| "analiseRFMNotasFrequencia"
	| "analiseRFMNotasMonetario"
	| "analiseRFMUltimaAtualizacao"
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
	total: z.object({
		min: z.number({ invalid_type_error: "Tipo não válido para valor mínimo da venda." }).optional().nullable(),
		max: z.number({ invalid_type_error: "Tipo não válido para valor máximo da venda." }).optional().nullable(),
	}),
	saleNatures: z.array(
		z.enum(["SN08", "SN03", "SN11", "SN20", "SN04", "SN09", "SN02", "COND", "SN99", "SN01", "SN05"], {
			required_error: "Natureza de venda não informado.",
			invalid_type_error: "Tipo não válido para natureza de venda.",
		}),
	),
	excludedSalesIds: z.array(z.string({ required_error: "ID da venda não informado.", invalid_type_error: "Tipo não válido para o ID da venda." })),
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
