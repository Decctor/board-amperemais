import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { buildClientPortfolioQueue } from "@/lib/client-portfolios/queue";
import { resolveClientPortfolioSeller } from "@/lib/client-portfolios/resolve-seller";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const GetClientPortfolioInputSchema = z.object({
	vendedorId: z
		.string({ invalid_type_error: "Tipo inválido para o ID do vendedor." })
		.optional()
		.nullable()
		.transform((v) => v || null),
});
export type TGetClientPortfolioInput = z.infer<typeof GetClientPortfolioInputSchema>;

async function getClientPortfolio({ input, session }: { input: TGetClientPortfolioInput; session: TAuthUserSession }) {
	const { organizacaoId, seller } = await resolveClientPortfolioSeller({ session, explicitSellerId: input.vendedorId });

	const queueResult = await buildClientPortfolioQueue({ organizacaoId, vendedorId: seller.id });

	return {
		data: {
			vendedor: seller,
			fila: queueResult.queue,
			totalEmDebito: queueResult.totalEmDebito,
			carteiraTotal: queueResult.carteiraTotal,
		},
		message: "Carteira carregada com sucesso.",
	};
}
export type TGetClientPortfolioOutput = Awaited<ReturnType<typeof getClientPortfolio>>;

async function getClientPortfolioRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	if (!session.membership) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização.");
	if (!session.membership.organizacao.configuracao.preferencias.carteirasClientes?.habilitado)
		throw new createHttpError.Forbidden("O módulo de carteira de clientes não está habilitado para esta organização.");

	const { searchParams } = new URL(request.url);
	const input = GetClientPortfolioInputSchema.parse({ vendedorId: searchParams.get("vendedorId") });
	const result = await getClientPortfolio({ input, session });
	return NextResponse.json(result, { status: 200 });
}

export const GET = appApiHandler({ GET: getClientPortfolioRoute });
