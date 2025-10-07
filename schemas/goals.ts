import { z } from "zod";

export const GoalSchema = z.object({
	dataInicio: z
		.string({
			required_error: "Data de início da meta não informada.",
			invalid_type_error: "Tipo inválido para data de início da meta.",
		})
		.datetime({ message: "Tipo inválido para data de início da meta." })
		.transform((val) => new Date(val)),
	dataFim: z
		.string({
			required_error: "Data de fim da meta não informada.",
			invalid_type_error: "Tipo inválido para data de fim da meta.",
		})
		.datetime({ message: "Tipo inválido para data de fim da meta." })
		.transform((val) => new Date(val)),
	objetivoValor: z.number({
		required_error: "Objetivo de valor da meta não informado.",
		invalid_type_error: "Tipo inválido para objetivo de valor da meta.",
	}),
	dataInsercao: z
		.string({
			required_error: "Data de inserção da meta não informada.",
			invalid_type_error: "Tipo inválido para data de inserção da meta.",
		})
		.datetime({ message: "Tipo inválido para data de inserção da meta." })
		.transform((val) => new Date(val)),
});

export const GoalSellerSchema = z.object({
	metaId: z.string({
		required_error: "ID da meta não informado.",
		invalid_type_error: "Tipo inválido para ID da meta.",
	}),
	vendedorId: z.string({
		required_error: "ID do vendedor não informado.",
		invalid_type_error: "Tipo inválido para ID do vendedor.",
	}),
	objetivoValor: z.number({
		required_error: "Objetivo de valor da meta do vendedor não informado.",
		invalid_type_error: "Tipo inválido para objetivo de valor da meta do vendedor.",
	}),
});
