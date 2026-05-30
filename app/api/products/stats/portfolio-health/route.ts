import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { getPortfolioHealth, type TGetPortfolioHealthResult } from "@/lib/products/health";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const GetProductsPortfolioHealthInputSchema = z.object({
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
});

export type TGetProductsPortfolioHealthInput = z.infer<typeof GetProductsPortfolioHealthInputSchema>;

async function getProductsPortfolioHealthRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");

	const userOrgId = session.membership?.organizacao.id;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	const input = GetProductsPortfolioHealthInputSchema.parse({
		periodAfter: request.nextUrl.searchParams.get("periodAfter"),
		periodBefore: request.nextUrl.searchParams.get("periodBefore"),
	});

	const data = await getPortfolioHealth({ input, organizationId: userOrgId });

	return NextResponse.json({
		data,
		message: "Saúde do portfólio calculada com sucesso.",
	});
}

export type TGetProductsPortfolioHealthOutput = {
	data: TGetPortfolioHealthResult;
	message: string;
};

export const GET = appApiHandler({ GET: getProductsPortfolioHealthRoute });
