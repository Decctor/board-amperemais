import { apiHandler } from "@/lib/api";
import { getUserSession } from "@/lib/auth/session";

import { db } from "@/services/drizzle";

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
	const session = await getUserSession({ request: req });

	const data = await fetchProducts(req);

	return res.status(200).json({
		data: data,
	});
};

export default apiHandler({ GET: handleGetProductsRoute });
