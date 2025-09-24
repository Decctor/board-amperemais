import type { TSale } from "@/schemas/sales";
import connectToDatabase from "@/services/mongodb/main-db-connection";
import createHttpError from "http-errors";
import type { Collection } from "mongodb";
import type { NextApiHandler } from "next";
import { z } from "zod";

type GetResponse = {
	data: TSale | TSale[];
};

const getSalesRoute: NextApiHandler<GetResponse> = async (req, res) => {
	const { id, after, before } = req.query;
	const db = await connectToDatabase();
	const collection: Collection<TSale> = db.collection("sales");

	if (id) {
		throw new createHttpError.BadRequest("Requisição inválida.");
	}

	if (!after || typeof after !== "string" || !before || typeof before === "string")
		throw new createHttpError.BadRequest("Parâmetros de período não fornecidos ou inválidos");
};
