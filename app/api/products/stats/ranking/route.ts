import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { runPagesRouteHandler, type PagesRouteHandler } from "@/lib/pages-route-compat";
import { GetProductsRankingInputSchema, getProductsRanking, type TGetProductsRankingOutput } from "@/lib/products/ranking";
import createHttpError from "http-errors";

export type { TGetProductsRankingInput, TGetProductsRankingOutput } from "@/lib/products/ranking";

const getProductsRankingRoute: PagesRouteHandler<TGetProductsRankingOutput> = async (req, res) => {
	const sessionUser = await getCurrentSessionUncached();
	if (!sessionUser) throw new createHttpError.Unauthorized("Você não está autenticado.");
	console.log("[INFO] [GET PRODUCTS RANKING] Starting:", {
		userOrg: sessionUser.membership?.organizacao.id,
		query: req.query,
	});
	const input = GetProductsRankingInputSchema.parse({
		periodAfter: (req.query.periodAfter as string | undefined) ?? null,
		periodBefore: (req.query.periodBefore as string | undefined) ?? null,
		comparingPeriodAfter: (req.query.comparingPeriodAfter as string | undefined) ?? null,
		comparingPeriodBefore: (req.query.comparingPeriodBefore as string | undefined) ?? null,
		rankingBy: (req.query.rankingBy as "sales-total-value" | "sales-total-qty" | "sales-total-margin" | undefined) ?? "sales-total-value",
	});

	const organizacaoId = sessionUser.membership?.organizacao.id;
	if (!organizacaoId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	const data = await getProductsRanking({ input, organizacaoId });
	return res.status(200).json(data);
};

const routeHandlers = {
	GET: getProductsRankingRoute,
} satisfies Partial<Record<"GET" | "POST" | "PUT" | "PATCH" | "DELETE", PagesRouteHandler<any>>>;

export const GET = appApiHandler({
	GET: (request) => runPagesRouteHandler({ request, handler: routeHandlers.GET! }),
});
