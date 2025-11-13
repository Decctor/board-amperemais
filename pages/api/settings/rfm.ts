import { apiHandler } from "@/lib/api";
import { getCurrentSessionUncached } from "@/lib/authentication/pages-session";
import connectToDatabase from "@/services/mongodb/main-db-connection";
import type { TRFMConfig } from "@/utils/rfm";
import createHttpError from "http-errors";
import type { NextApiHandler } from "next";

type GetResponse = {
	data: TRFMConfig;
};
const getRFMConfigRoute: NextApiHandler<GetResponse> = async (req, res) => {
	const sessionUser = await getCurrentSessionUncached(req.cookies);
	if (!sessionUser) throw new createHttpError.Unauthorized("Você não está autenticado.");

	const db = await connectToDatabase();
	const utilsCollection = db.collection<TRFMConfig>("utils");

	const rfmConfig = (await utilsCollection.findOne({
		identificador: "CONFIG_RFM",
	})) as TRFMConfig;

	return res.status(200).json({ data: rfmConfig });
};

type PutResponse = {
	data: string;
	message: string;
};

const updateRFMConfigRoute: NextApiHandler<PutResponse> = async (req, res) => {
	const sessionUser = await getCurrentSessionUncached(req.cookies);
	if (!sessionUser) throw new createHttpError.Unauthorized("Você não está autenticado.");

	const db = await connectToDatabase();
	const utilsCollection = db.collection<TRFMConfig>("utils");

	const payload = req.body;

	// @ts-ignore
	delete payload._id;

	const updateResponse = await utilsCollection.updateOne(
		{ identificador: "CONFIG_RFM" },
		{
			$set: {
				...payload,
			},
		},
	);

	if (!updateResponse.acknowledged) throw createHttpError.InternalServerError("Oops, houve um erro desconhecido ao atualizar configuração.");

	return res.status(200).json({
		data: "Atualização feita com sucesso !",
		message: "Atualização feita com sucesso !",
	});
};

export default apiHandler({
	GET: getRFMConfigRoute,
	PUT: updateRFMConfigRoute,
});
