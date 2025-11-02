import { z } from "zod";

export const MonthGoalInformation = z.object({
	dias: z.number({
		required_error: "Dias do mês de referência da meta não informados.",
		invalid_type_error: "Tipo não válidos para dias do mês de referência da meta.",
	}),
	inicio: z.string({
		required_error: "Início do mês de referência da meta não informado.",
		invalid_type_error: "Tipo não válido para o início do mês de referência da meta.",
	}),
	fim: z.string({
		required_error: "Início do mês de referência da meta não informado.",
		invalid_type_error: "Tipo não válido para o início do mês de referência da meta.",
	}),
	vendas: z.number({
		required_error: "Valor de meta de vendas não informado.",
		invalid_type_error: "Tipo não válido para o valor de meta de vendas.",
	}),
});

export const SaleGoalSchema = z.object({
	ano: z.number({
		required_error: "Ano de referência da meta não informado.",
		invalid_type_error: "Tipo não válido para o ano de referência da meta.",
	}),
	inicio: z.string({
		required_error: "Início do mês de referência da meta não informado.",
		invalid_type_error: "Tipo não válido para o início do mês de referência da meta.",
	}),
	fim: z.string({
		required_error: "Início do mês de referência da meta não informado.",
		invalid_type_error: "Tipo não válido para o início do mês de referência da meta.",
	}),
	meses: z.object({
		"1": MonthGoalInformation,
		"2": MonthGoalInformation,
		"3": MonthGoalInformation,
		"4": MonthGoalInformation,
		"5": MonthGoalInformation,
		"6": MonthGoalInformation,
		"7": MonthGoalInformation,
		"8": MonthGoalInformation,
		"9": MonthGoalInformation,
		"10": MonthGoalInformation,
		"11": MonthGoalInformation,
		"12": MonthGoalInformation,
	}),
	dataInsercao: z.string({
		required_error: "Data de inserção da meta não informada.",
		invalid_type_error: "Tipo não válido para data de inserção da meta.",
	}),
});

export type TSaleGoal = z.infer<typeof SaleGoalSchema>;
