import { apiHandler } from "@/lib/api";
import { formatPhoneAsBase } from "@/lib/formatting";
import { ClientSchema } from "@/schemas/clients";
import { db } from "@/services/drizzle";
import { clients } from "@/services/drizzle/schema";
import createHttpError from "http-errors";
import type { NextApiHandler } from "next";

const getClientsRoute: NextApiHandler<any> = async (req, res) => {
	const { id } = req.query;

	if (id) {
		if (typeof id !== "string") throw new createHttpError.BadRequest("ID inválido.");
		const client = await db.query.clients.findFirst({
			where: (fields, { eq }) => eq(fields.id, id),
		});
		if (!client) throw new createHttpError.NotFound("Cliente não encontrado.");
		return res.status(200).json({ data: client });
	}

	const clients = await db.query.clients.findMany();
	return res.status(200).json({ data: clients });
};

type PostResponse = {
	data: { insertedId: string };
	message: string;
};

const createClientRoute: NextApiHandler<PostResponse> = async (req, res) => {
	const client = ClientSchema.parse(req.body);

	const insertResponse = await db
		.insert(clients)
		.values({ ...client, telefone: client.telefone ?? "", telefoneBase: formatPhoneAsBase(client.telefone ?? "") })
		.returning({ id: clients.id });
	const insertedId = insertResponse[0]?.id;
	if (!insertedId) throw new createHttpError.InternalServerError("Oops, houve um erro desconhecido ao criar cliente.");

	return res.status(201).json({ data: { insertedId }, message: "Cliente criado com sucesso." });
};
export default apiHandler({ POST: createClientRoute, GET: getClientsRoute });
