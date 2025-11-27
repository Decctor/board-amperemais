// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { OnlineSoftwareSaleImportationSchema } from "@/schemas/online-importation.schema";
import { db } from "@/services/drizzle";
import { sales } from "@/services/drizzle/schema";
import axios from "axios";
import dayjs from "dayjs";
import { and, count, gte, lte, sum } from "drizzle-orm";
import type { NextApiRequest, NextApiResponse } from "next";
import z from "zod";

export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
	const currentDateFormatted = "26112025"; // dayjs().subtract(5, "hour").format("DD/MM/YYYY").replaceAll("/", "");
	console.log("DATE BEING USED", dayjs().format("DD/MM/YYYY HH:mm"), dayjs().subtract(5, "hour").format("DD/MM/YYYY HH:mm"), currentDateFormatted);

	// Fetching data from the online software API
	const { data: onlineAPIResponse } = await axios.post("https://onlinesoftware.com.br/planodecontas/apirestweb/vends/listvends.php", {
		token: process.env.ONLINE_API_TOKEN,
		rotina: "listarVendas001",
		dtinicio: currentDateFormatted,
		dtfim: currentDateFormatted,
	});

	const OnlineSoftwareSales = z
		.array(OnlineSoftwareSaleImportationSchema, {
			required_error: "Payload da Online não é uma lista.",
			invalid_type_error: "Tipo não permitido para o payload.",
		})
		.parse(onlineAPIResponse.resultado);
	const total = OnlineSoftwareSales.reduce((acc, curr) => acc + Number(curr.valor), 0);
	return res.status(200).json({ total });
}
