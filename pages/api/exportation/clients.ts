import { apiHandler } from "@/lib/api";
import { getUserSession } from "@/lib/auth/session";
import { formatDateAsLocale } from "@/lib/formatting";
import type { TClient } from "@/schemas/clients";
import connectToDatabase from "@/services/mongodb/main-db-connection";
import type { NextApiHandler } from "next";

export type TClientExportResult = {
	NOME: string;
	TELEFONE: string;
	EMAIL: string;
	"CANAL DE AQUISIÇÃO": string;
	"DATA DA PRIMEIRA COMPRA": string | null;
	"DATA DA ÚLTIMA COMPRA": string | null;
}[];
type GetResponse = {
	data: TClientExportResult;
};
const getClientsExportation: NextApiHandler<GetResponse> = async (req, res) => {
	const session = await getUserSession({ request: req });

	const db = await connectToDatabase();
	const collection = db.collection<TClient>("clients");

	const clients = await collection.find({}).toArray();

	const exportation = clients.map((client) => ({
		NOME: client.nome,
		TELEFONE: client.telefone || "",
		EMAIL: client.email || "",
		"CANAL DE AQUISIÇÃO": client.canalAquisicao || "",
		"DATA DA PRIMEIRA COMPRA": formatDateAsLocale(client.dataPrimeiraCompra),
		"DATA DA ÚLTIMA COMPRA": formatDateAsLocale(client.dataUltimaCompra),
	}));

	return res.json({ data: exportation });
};

export default apiHandler({ GET: getClientsExportation });
