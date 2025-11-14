import { apiHandler } from "@/lib/api";
import { getCurrentSessionUncached } from "@/lib/authentication/pages-session";
import { db } from "@/services/drizzle";
import { utils } from "@/services/drizzle/schema";
import type { TRFMConfig } from "@/utils/rfm";
import { eq } from "drizzle-orm";
import createHttpError from "http-errors";
import type { NextApiHandler } from "next";

type GetResponse = {
	data: TRFMConfig;
};
const getRFMConfigRoute: NextApiHandler<GetResponse> = async (req, res) => {
	const sessionUser = await getCurrentSessionUncached(req.cookies);
	if (!sessionUser) throw new createHttpError.Unauthorized("Você não está autenticado.");

	const rfmConfig = await db.query.utils.findFirst({
		where: eq(utils.identificador, "CONFIG_RFM"),
	});

	return res.status(200).json({ data: rfmConfig });
};

type PutResponse = {
	data: string;
	message: string;
};

const updateRFMConfigRoute: NextApiHandler<PutResponse> = async (req, res) => {
	const sessionUser = await getCurrentSessionUncached(req.cookies);
	if (!sessionUser) throw new createHttpError.Unauthorized("Você não está autenticado.");

	const payload = req.body;

	// @ts-ignore
	delete payload._id;

	const updateResponse = await db
		.update(utils)
		.set({
			identificador: "CONFIG_RFM",
			valor: payload,
		})
		.where(eq(utils.identificador, "CONFIG_RFM"));

	if (updateResponse.length === 0) throw createHttpError.InternalServerError("Oops, houve um erro desconhecido ao atualizar configuração.");

	return res.status(200).json({
		data: "Atualização feita com sucesso !",
		message: "Atualização feita com sucesso !",
	});
};

export default apiHandler({
	GET: getRFMConfigRoute,
	PUT: updateRFMConfigRoute,
});
