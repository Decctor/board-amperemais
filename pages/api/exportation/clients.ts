import { apiHandler } from "@/lib/api";
import { getUserSession } from "@/lib/auth/session";
import { formatDateAsLocale, formatToMoney } from "@/lib/formatting";
import type { TClient } from "@/schemas/clients";
import connectToDatabase from "@/services/mongodb/main-db-connection";
import { ObjectId } from "mongodb";
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
	console.log("Iniciando exportação de clientes...");
	const clients = await collection.find({}, {
		projection: {
			nome: 1,
			email: 1,
			telefone: 1,
			canalAquisicao: 1,
			dataPrimeiraCompra: 1,
			dataUltimaCompra: 1,
			'analiseRFM.titulo': 1,
			compras: 1,
		}
	}).toArray();

	console.log("Convertendo clientes para formato de exportação...");

	const clientsWithSales = clients.map((client) => {

		const totalPurchases = client.compras?.length || 0;
		const totalSpent = client.compras?.reduce((acc, sale) => acc + sale.valor, 0) || 0;
		const avgTicket = totalPurchases > 0 ? totalSpent / totalPurchases : 0;
		return {
			NOME: client.nome,
			TELEFONE: client.telefone || "",
			EMAIL: client.email || "",
			"CANAL DE AQUISIÇÃO": client.canalAquisicao || "",
			"DATA DA PRIMEIRA COMPRA": formatDateAsLocale(client.dataPrimeiraCompra),
			"DATA DA ÚLTIMA COMPRA": formatDateAsLocale(client.dataUltimaCompra),
			"CLASSIFICAÇÃO RFM": client.analiseRFM.titulo,
			"QUANTIDADE DE COMPRAS": totalPurchases,
			"TOTAL COMPRO": formatToMoney(totalSpent),
			"TICKET MÉDIO": formatToMoney(avgTicket)

		}
	})

	return res.json({ data: clientsWithSales });
};

export default apiHandler({ GET: getClientsExportation });
