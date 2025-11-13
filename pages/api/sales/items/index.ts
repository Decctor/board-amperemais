import { apiHandler } from "@/lib/api";
import { getCurrentSessionUncached } from "@/lib/authentication/pages-session";

import { db } from "@/services/drizzle";
import createHttpError from "http-errors";
import type { NextApiHandler, NextApiRequest } from "next";

const fetchProducts = async (req: NextApiRequest) => {
	const items = await db.query.products.findMany({});
	return items;
};
type GetResponse = {
	data: string[];
};
export type TGetProductsOutput = Awaited<ReturnType<typeof fetchProducts>>;

const handleGetProductsRoute: NextApiHandler<{
	data: TGetProductsOutput;
}> = async (req, res) => {
	const sessionUser = await getCurrentSessionUncached(req.cookies);
	if (!sessionUser) throw new createHttpError.Unauthorized("Você não está autenticado.");

	const data = await fetchProducts(req);

	return res.status(200).json({
		data: data,
	});
};

export default apiHandler({ GET: handleGetProductsRoute });
