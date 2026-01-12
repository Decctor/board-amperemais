import { apiHandler } from "@/lib/api";
import { getCurrentSessionUncached } from "@/lib/authentication/pages-session";
import { db } from "@/services/drizzle";
import { products } from "@/services/drizzle/schema";
import { eq } from "drizzle-orm";
import createHttpError from "http-errors";
import type { NextApiHandler } from "next";

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

const getPOSGroupsHandler: NextApiHandler<TGetPOSGroupsOutput> = async (req, res) => {
	const sessionUser = await getCurrentSessionUncached(req.cookies);
	if (!sessionUser) throw new createHttpError.Unauthorized("Você não está autenticado.");

	const userOrgId = sessionUser.user.organizacaoId;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	const data = await getPOSGroups({ userOrgId });
	return res.status(200).json(data);
};

export default apiHandler({
	GET: getPOSGroupsHandler,
});
