import { appApiHandler } from "@/lib/app-api";
import { runPagesRouteHandler, type PagesRouteHandler, type PagesRouteRequest, type PagesRouteResponse } from "@/lib/pages-route-compat";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { db } from "@/services/drizzle";
import { products } from "@/services/drizzle/schema";
import { eq } from "drizzle-orm";
import createHttpError from "http-errors";

async function getPOSGroups({ userOrgId }: { userOrgId: string }) {
	const groupedProductGroups = await db
		.selectDistinct({
			grupo: products.grupo,
		})
		.from(products)
		.where(eq(products.organizacaoId, userOrgId))
		.orderBy(products.grupo);

	return {
		data: {
			groups: groupedProductGroups.map((g) => g.grupo).filter((g) => g && g.trim().length > 0),
		},
	};
}

export type TGetPOSGroupsOutput = Awaited<ReturnType<typeof getPOSGroups>>;

const getPOSGroupsHandler: PagesRouteHandler<TGetPOSGroupsOutput> = async (req, res) => {
	const sessionUser = await getCurrentSessionUncached();
	if (!sessionUser) throw new createHttpError.Unauthorized("Você não está autenticado.");

	const userOrgId = sessionUser.membership?.organizacao.id;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	const data = await getPOSGroups({ userOrgId });
	return res.status(200).json(data);
};

const routeHandlers = {
	GET: getPOSGroupsHandler,
} satisfies Partial<Record<"GET" | "POST" | "PUT" | "PATCH" | "DELETE", PagesRouteHandler<any>>>;

export const GET = appApiHandler({
	GET: (request) => runPagesRouteHandler({ request, handler: routeHandlers.GET! }),
});
