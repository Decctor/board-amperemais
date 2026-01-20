import type { NextApiHandler } from "next";

import { apiHandler } from "@/lib/api";
import { getCurrentSessionUncached } from "@/lib/authentication/pages-session";
import { db } from "@/services/drizzle";
import createHttpError from "http-errors";

export type TRFMLabelledStats = {
	rfmLabel: string;
	backgroundCollor: string;
	gridArea: string;
	clientsQty: number;
}[];
type GetResponse = {
	data: TRFMLabelledStats;
};
const getSalesRFMLabelledRoute: NextApiHandler<GetResponse> = async (req, res) => {
	const sessionUser = await getCurrentSessionUncached(req.cookies);
	if (!sessionUser) throw new createHttpError.Unauthorized("Você não está autenticado.");

	const userOrgId = sessionUser.membership?.organizacao.id;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	const allClients = await db.query.clients.findMany({
		where: (fields, { eq }) => eq(fields.organizacaoId, userOrgId),
		columns: {
			analiseRFMTitulo: true,
		},
	});

	const gridItems = [
		{
			rfmLabel: "NÃO PODE PERDÊ-LOS",
			backgroundCollor: "bg-blue-400",
			gridArea: "1 / 1 / 2 / 3",
			clientsQty: allClients?.filter((x) => x.analiseRFMTitulo === "NÃO PODE PERDÊ-LOS").length || 0,
		},
		{
			rfmLabel: "CLIENTES LEAIS",
			backgroundCollor: "bg-green-400",
			gridArea: "1 / 3 / 3 / 6",
			clientsQty: allClients?.filter((x) => x.analiseRFMTitulo === "CLIENTES LEAIS").length || 0,
		},
		{
			rfmLabel: "CAMPEÕES",
			backgroundCollor: "bg-orange-400",
			gridArea: "1 / 5 / 2 / 6",
			clientsQty: allClients?.filter((x) => x.analiseRFMTitulo === "CAMPEÕES").length || 0,
		},
		{
			rfmLabel: "EM RISCO",
			backgroundCollor: "bg-yellow-400",
			gridArea: "2 / 1 / 4 / 3",
			clientsQty: allClients?.filter((x) => x.analiseRFMTitulo === "EM RISCO").length || 0,
		},
		{
			rfmLabel: "PRECISAM DE ATENÇÃO",
			backgroundCollor: "bg-indigo-400",
			gridArea: "3 / 3 / 4 / 4",
			clientsQty: allClients?.filter((x) => x.analiseRFMTitulo === "PRECISAM DE ATENÇÃO").length || 0,
		},
		{
			rfmLabel: "POTENCIAIS CLIENTES LEAIS",
			backgroundCollor: "bg-[#5C4033]",
			gridArea: "3 / 4 / 5 / 6",
			clientsQty: allClients?.filter((x) => x.analiseRFMTitulo === "POTENCIAIS CLIENTES LEAIS").length || 0,
		},
		{
			rfmLabel: "HIBERNANDO",
			backgroundCollor: "bg-purple-400",
			gridArea: "4 / 2 / 5 / 3",
			clientsQty: allClients?.filter((x) => x.analiseRFMTitulo === "HIBERNANDO").length || 0,
		},
		{
			rfmLabel: "PRESTES A DORMIR",
			backgroundCollor: "bg-yellow-600",
			gridArea: "4 / 3 / 6 / 4",
			clientsQty: allClients?.filter((x) => x.analiseRFMTitulo === "PRESTES A DORMIR").length || 0,
		},
		{
			rfmLabel: "PERDIDOS",
			backgroundCollor: "bg-red-500",
			gridArea: "4 / 1 / 6 / 2",
			clientsQty: allClients?.filter((x) => x.analiseRFMTitulo === "PERDIDOS").length || 0,
		},
		{
			rfmLabel: "PERDIDOS (extensão)",
			backgroundCollor: "bg-red-500",
			gridArea: "5 / 2 / 6 / 3",
			clientsQty: allClients?.filter((x) => x.analiseRFMTitulo === "PERDIDOS (extensão)").length || 0,
		},
		{
			rfmLabel: "PROMISSORES",
			backgroundCollor: "bg-pink-400",
			gridArea: "5 / 4 / 6 / 5",
			clientsQty: allClients?.filter((x) => x.analiseRFMTitulo === "PROMISSORES").length || 0,
		},
		{
			rfmLabel: "CLIENTES RECENTES",
			backgroundCollor: "bg-teal-400",
			gridArea: "5 / 5 / 6 / 6",
			clientsQty: allClients?.filter((x) => x.analiseRFMTitulo === "CLIENTES RECENTES").length || 0,
		},
	];

	return res.status(200).json({ data: gridItems });
};

export default apiHandler({ GET: getSalesRFMLabelledRoute });
