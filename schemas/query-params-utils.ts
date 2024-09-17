import { z } from "zod";

export const PeriodQueryParamSchema = z.object({
  after: z
    .string({
      required_error: "Parâmetros de período não fornecidos ou inválidos.",
      invalid_type_error: "Parâmetros de período não fornecidos ou inválidos.",
    })
    .datetime({ message: "Tipo inválido para parâmetro de período." }),
  before: z
    .string({
      required_error: "Parâmetros de período não fornecidos ou inválidos.",
      invalid_type_error: "Parâmetros de período não fornecidos ou inválidos.",
    })
    .datetime({ message: "Tipo inválido para parâmetro de período." }),
});
