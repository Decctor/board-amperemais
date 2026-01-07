import type { TAuthUserSession } from "@/lib/authentication/types";
import createHttpError from "http-errors";
import { z } from "zod";

const GetClientsRankingInputSchema = z.object({
	periodAfter: z
		.string({
			required_error: "Período não informado.",
			invalid_type_error: "Tipo inválido para período.",
		})
		.datetime({ message: "Tipo inválido para período." })
		.optional()
		.nullable()
		.transform((val) => (val ? new Date(val) : null)),
	periodBefore: z
		.string({
			required_error: "Período não informado.",
			invalid_type_error: "Tipo inválido para período.",
		})
		.datetime({ message: "Tipo inválido para período." })
		.optional()
		.nullable()
		.transform((val) => (val ? new Date(val) : null)),
	comparingPeriodAfter: z
		.string({
			required_error: "Período não informado.",
			invalid_type_error: "Tipo inválido para período.",
		})
		.datetime({ message: "Tipo inválido para período." })
		.optional()
		.nullable()
		.transform((val) => (val ? new Date(val) : null)),
	comparingPeriodBefore: z
		.string({
			required_error: "Período não informado.",
			invalid_type_error: "Tipo inválido para período.",
		})
		.datetime({ message: "Tipo inválido para período." })
		.optional()
		.nullable()
		.transform((val) => (val ? new Date(val) : null)),
	saleNatures: z
		.array(
			z.string({
				invalid_type_error: "Tipo inválido para natureza de venda.",
			}),
		)
		.optional()
		.nullable(),
	excludedSalesIds: z
		.array(
			z.string({
				invalid_type_error: "Tipo inválido para ID da venda.",
			}),
		)
		.optional()
		.nullable(),
	totalMin: z
		.number({
			invalid_type_error: "Tipo inválido para valor mínimo da venda.",
		})
		.optional()
		.nullable(),
	totalMax: z
		.number({
			invalid_type_error: "Tipo inválido para valor máximo da venda.",
		})
		.optional()
		.nullable(),
	rankingBy: z.enum(["purchases-total-qty", "purchases-total-value"]).optional().nullable(),
});
export type TGetClientsRankingInput = z.infer<typeof GetClientsRankingInputSchema>;

async function getClientsRanking({ input, session }: { input: TGetClientsRankingInput; session: TAuthUserSession["user"] }) {
	const userOrgId = session.organizacaoId;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");
}
