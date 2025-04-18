import axios from "axios";
import dayjs from "dayjs";
import type { NextApiHandler } from "next";
import dayjsCustomFormatter from "dayjs/plugin/customParseFormat";
import { OnlineSoftwareSaleImportationSchema } from "@/schemas/online-importation.schema";
import { z } from "zod";
import { db } from "@/services/drizzle";
import {
	clients,
	saleItems,
	sales,
	type TNewSaleItemEntity,
} from "@/services/drizzle/schema";
import createHttpError from "http-errors";
dayjs.extend(dayjsCustomFormatter);

const handleOnlineSoftwareImportation: NextApiHandler<string> = async (
	req,
	res,
) => {
	const currentDateFormatted = dayjs()
		.subtract(5, "hour")
		.format("DD/MM/YYYY")
		.replaceAll("/", "");
	console.log(
		"DATE BEING USED",
		dayjs().format("DD/MM/YYYY HH:mm"),
		dayjs().subtract(5, "hour").format("DD/MM/YYYY HH:mm"),
		currentDateFormatted,
	);

	// Fetching data from the online software API
	const { data: onlineAPIResponse } = await axios.post(
		"https://onlinesoftware.com.br/planodecontas/apirestweb/vends/listvends.php",
		{
			token: process.env.ONLINE_API_TOKEN,
			rotina: "listarVendas001",
			dtinicio: currentDateFormatted,
			dtfim: currentDateFormatted,
		},
	);

	const OnlineSoftwareSales = z
		.array(OnlineSoftwareSaleImportationSchema, {
			required_error: "Payload da Online não é uma lista.",
			invalid_type_error: "Tipo não permitido para o payload.",
		})
		.parse(onlineAPIResponse.resultado);

	return await db.transaction(async (tx) => {
		const existingClients = await tx.query.clients.findMany({
			columns: {
				id: true,
				nome: true,
			},
		});
		const existingProducts = await tx.query.products.findMany({
			columns: {
				id: true,
				codigo: true,
			},
		});

		const existingClientsMap = new Map(
			existingClients.map((client) => [client.nome, client.id]),
		);
		const existingProductsMap = new Map(
			existingProducts.map((product) => [product.codigo, product.id]),
		);
		for (const OnlineSale of OnlineSoftwareSales) {
			const equivalentSaleClient = existingClientsMap.get(OnlineSale.cliente);

			let saleClientId = equivalentSaleClient;
			if (!saleClientId) {
				const insertedClientResponse = await tx
					.insert(clients)
					.values({
						nome: OnlineSale.cliente,
						telefone: OnlineSale.clientefone || OnlineSale.clientecelular,
					})
					.returning({
						id: clients.id,
					});
				const insertedClientId = insertedClientResponse[0]?.id;
				if (!insertedClientResponse)
					throw new createHttpError.InternalServerError(
						"Oops, um erro ocorreu ao criar cliente.",
					);
				saleClientId = insertedClientId;
			}

			const saleTotalCost = OnlineSale.itens.reduce(
				(acc: number, current) => acc + Number(current.vcusto),
				0,
			);
			const saleDate = dayjs(OnlineSale.data, "DD/MM/YYYY")
				.add(3, "hours")
				.toDate();
			const insertedSaleResponse = await tx
				.insert(sales)
				.values({
					idExterno: OnlineSale.id,
					clienteId: saleClientId,
					valorTotal: Number(OnlineSale.valor),
					custoTotal: saleTotalCost,
					vendedor: OnlineSale.vendedor || "N/A",
					parceiro: OnlineSale.parceiro || "N/A",
					chave: OnlineSale.chave || "N/A",
					documento: OnlineSale.documento || "N/A",
					modelo: OnlineSale.modelo || "N/A",
					movimento: OnlineSale.movimento || "N/A",
					natureza: OnlineSale.natureza || "N/A",
					serie: OnlineSale.serie || "N/A",
					situacao: OnlineSale.situacao || "N/A",
					tipo: OnlineSale.tipo,
					dataVenda: saleDate,
				})
				.returning({
					id: sales.id,
				});
			const insertedSaleId = insertedSaleResponse[0]?.id;
			if (!insertedSaleResponse)
				throw new createHttpError.InternalServerError(
					"Oops, um erro ocorreu ao criar venda.",
				);

			const saleItemsToInsert: TNewSaleItemEntity[] = OnlineSale.itens.map(
				(item) => {
					const equivalentProduct = existingProductsMap.get(item.codigo);
					if (!equivalentProduct) {
						throw new createHttpError.InternalServerError(
							`Produto ${item.codigo} não encontrado.`,
						);
					}
					const quantidade = Number(item.qtde);
					const valorVendaUnitario = Number(item.valorunit);
					const valorVendaTotalBruto = valorVendaUnitario * quantidade;
					const valorTotalDesconto = Number(item.vdesc);
					const valorVendaTotalLiquido =
						valorVendaTotalBruto - valorTotalDesconto;
					const valorCustoTotal = Number(item.vcusto);
					return {
						vendaId: insertedSaleId,
						clienteId: saleClientId,
						produtoId: equivalentProduct,
						quantidade: Number(item.qtde),
						valorVendaUnitario: valorVendaUnitario,
						valorCustoUnitario: valorCustoTotal / quantidade,
						valorVendaTotalBruto,
						valorTotalDesconto,
						valorVendaTotalLiquido,
						valorCustoTotal,
						metadados: {
							baseicms: item.baseicms,
							percent: item.percent,
							icms: item.icms,
							cst_icms: item.cst_icms,
							csosn: item.csosn,
							cst_pis: item.cst_pis,
							cfop: item.cfop,
							vfrete: item.vfrete,
							vseg: item.vseg,
							voutro: item.voutro,
							vipi: item.vipi,
							vicmsst: item.vicmsst,
							vicms_desonera: item.vicms_desonera,
							cest: item.cest,
						},
					};
				},
			);
			await tx.insert(saleItems).values(saleItemsToInsert);
		}
		return res.status(201).json("EXECUTADO COM SUCESSO");
	});
};

export default handleOnlineSoftwareImportation;
