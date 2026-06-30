import { z } from "zod";
import { TimeDurationUnitsEnum } from "./enums";

const PRODUCTION_DURATION_UNITS = ["MINUTOS", "HORAS", "DIAS"] as const;

export const ProductionDurationUnitEnum = TimeDurationUnitsEnum.refine(
	(value) => PRODUCTION_DURATION_UNITS.includes(value as (typeof PRODUCTION_DURATION_UNITS)[number]),
	{
		message: "Unidade de tempo não permitida para produção.",
	},
);
export type TProductionDurationUnitEnum = z.infer<typeof ProductionDurationUnitEnum>;

export const ProductionRecipeBaseSchema = z.object({
	organizacaoId: z.string({
		required_error: "ID da organização não informado.",
		invalid_type_error: "Tipo não válido para ID da organização.",
	}),
	titulo: z
		.string({
			required_error: "Título da receita não informado.",
			invalid_type_error: "Tipo não válido para título da receita.",
		})
		.min(1, { message: "Título da receita não informado." }),
	descricao: z
		.string({
			invalid_type_error: "Tipo não válido para descrição da receita.",
		})
		.optional()
		.nullable()
		.transform((value) => {
			const trimmed = value?.trim();
			return trimmed ? trimmed : null;
		}),
	previsaoTempoMedida: ProductionDurationUnitEnum.optional().nullable(),
	previsaoTempoValor: z
		.number({
			invalid_type_error: "Tipo não válido para previsão de tempo da receita.",
		})
		.nonnegative({ message: "Previsão de tempo da receita não pode ser negativa." })
		.optional()
		.nullable(),
	ativo: z
		.boolean({
			required_error: "Status da receita não informado.",
			invalid_type_error: "Tipo não válido para status da receita.",
		})
		.default(true),
	dataInsercao: z
		.string({
			required_error: "Data de inserção não informada.",
			invalid_type_error: "Tipo não válido para data de inserção.",
		})
		.datetime({ message: "Tipo não válido para data de inserção." })
		.default(new Date().toISOString())
		.transform((val) => new Date(val)),
});
export const ProductionRecipeSchema = ProductionRecipeBaseSchema.superRefine((value, ctx) => {
	if (value.previsaoTempoValor != null && !value.previsaoTempoMedida) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			path: ["previsaoTempoMedida"],
			message: "Medida da previsão de tempo não informada.",
		});
	}
	if (value.previsaoTempoMedida && value.previsaoTempoValor == null) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			path: ["previsaoTempoValor"],
			message: "Valor da previsão de tempo não informado.",
		});
	}
});
export type TProductionRecipe = z.infer<typeof ProductionRecipeSchema>;

export const ProductionRecipeInputSchema = z.object({
	organizacaoId: z.string({
		required_error: "ID da organização não informado.",
		invalid_type_error: "Tipo não válido para ID da organização.",
	}),
	receitaId: z.string({
		required_error: "ID da receita não informado.",
		invalid_type_error: "Tipo não válido para ID da receita.",
	}),
	produtoId: z.string({
		required_error: "ID do produto não informado.",
		invalid_type_error: "Tipo não válido para ID do produto.",
	}),
	produtoVarianteId: z
		.string({
			invalid_type_error: "Tipo não válido para ID da variante.",
		})
		.optional()
		.nullable(),
	quantidade: z
		.number({
			required_error: "Quantidade do insumo não informada.",
			invalid_type_error: "Tipo não válido para quantidade do insumo.",
		})
		.positive({ message: "Quantidade do insumo deve ser maior que zero." }),
});
export type TProductionRecipeInput = z.infer<typeof ProductionRecipeInputSchema>;

export const ProductionRecipeOutputBaseSchema = z.object({
	organizacaoId: z.string({
		required_error: "ID da organização não informado.",
		invalid_type_error: "Tipo não válido para ID da organização.",
	}),
	receitaId: z.string({
		required_error: "ID da receita não informado.",
		invalid_type_error: "Tipo não válido para ID da receita.",
	}),
	produtoId: z.string({
		required_error: "ID do produto não informado.",
		invalid_type_error: "Tipo não válido para ID do produto.",
	}),
	produtoVarianteId: z
		.string({
			invalid_type_error: "Tipo não válido para ID da variante.",
		})
		.optional()
		.nullable(),
	quantidade: z
		.number({
			required_error: "Quantidade da saída não informada.",
			invalid_type_error: "Tipo não válido para quantidade da saída.",
		})
		.positive({ message: "Quantidade da saída deve ser maior que zero." }),
	prazoValidadeMedida: ProductionDurationUnitEnum.optional().nullable(),
	prazoValidadeValor: z
		.number({
			invalid_type_error: "Tipo não válido para prazo de validade.",
		})
		.nonnegative({ message: "Prazo de validade não pode ser negativo." })
		.optional()
		.nullable(),
});
export const ProductionRecipeOutputSchema = ProductionRecipeOutputBaseSchema.superRefine((value, ctx) => {
	if (value.prazoValidadeValor != null && !value.prazoValidadeMedida) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			path: ["prazoValidadeMedida"],
			message: "Medida do prazo de validade não informada.",
		});
	}
	if (value.prazoValidadeMedida && value.prazoValidadeValor == null) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			path: ["prazoValidadeValor"],
			message: "Valor do prazo de validade não informado.",
		});
	}
});
export type TProductionRecipeOutput = z.infer<typeof ProductionRecipeOutputSchema>;
