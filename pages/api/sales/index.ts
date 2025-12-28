import { getCurrentSessionUncached } from "@/lib/authentication/pages-session";
import type { TSale } from "@/schemas/sales";
import { db } from "@/services/drizzle";
import { sales } from "@/services/drizzle/schema";
import { and, eq, gte, lte } from "drizzle-orm";
import createHttpError from "http-errors";
import type { NextApiHandler } from "next";

type GetResponse = {
	data: TSale | TSale[];
};

const getSalesRoute: NextApiHandler<GetResponse> = async (req, res) => {
	const sessionUser = await getCurrentSessionUncached(req.cookies);
	if (!sessionUser) throw new createHttpError.Unauthorized("Você não está autenticado.");

	const userOrgId = sessionUser.user.organizacaoId;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	const { id, after, before } = req.query;

	const conditions = [eq(sales.organizacaoId, userOrgId)];
	if (id && typeof id === "string") conditions.push(eq(sales.id, id));
	if (after && typeof after === "string") conditions.push(gte(sales.dataVenda, new Date(after)));
	if (before && typeof before === "string") conditions.push(lte(sales.dataVenda, new Date(before)));
	const salesResult = await db.query.sales.findMany({
		where: and(...conditions),
	});

	return res.status(200).json({
		data: salesResult,
	});
};
