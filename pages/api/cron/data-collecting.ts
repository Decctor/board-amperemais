import { OnlineSoftwareSaleImportationSchema } from "@/schemas/online-importation.schema";
import { db } from "@/services/drizzle";
import { clients, products, saleItems, sales, sellers } from "@/services/drizzle/schema";
import connectToDatabase from "@/services/mongodb/main-db-connection";
import axios from "axios";
import dayjs from "dayjs";
import dayjsCustomFormatter from "dayjs/plugin/customParseFormat";
import createHttpError from "http-errors";
import type { NextApiHandler } from "next";
import { z } from "zod";
dayjs.extend(dayjsCustomFormatter);

const handleOnlineSoftwareImportation: NextApiHandler<string> = async (req, res) => {
	// const currentDateFormatted = dayjs().subtract(5, "hour").format("DD/MM/YYYY").replaceAll("/", "");
	const currentDateFormatted = "05102025";
	console.log("DATE BEING USED", dayjs().format("DD/MM/YYYY HH:mm"), dayjs().subtract(5, "hour").format("DD/MM/YYYY HH:mm"), currentDateFormatted);
	const mongoDb = await connectToDatabase();
	const utilsCollection = mongoDb.collection("utils");
	try {
		// Fetching data from the online software API
		const { data: onlineAPIResponse } = await axios.post("https://onlinesoftware.com.br/planodecontas/apirestweb/vends/listvends.php", {
			token: process.env.ONLINE_API_TOKEN,
			rotina: "listarVendas001",
			dtinicio: currentDateFormatted,
			dtfim: currentDateFormatted,
		});
		console.log("[INFO] [DATA_COLLECTING] Online API Response", onlineAPIResponse);
		await utilsCollection.insertOne({
			identificador: "online-importation",
			date: currentDateFormatted,
			content: JSON.stringify(onlineAPIResponse),
		});
		const OnlineSoftwareSales = z
			.array(OnlineSoftwareSaleImportationSchema, {
				required_error: "Payload da Online não é uma lista.",
				invalid_type_error: "Tipo não permitido para o payload.",
			})
			.parse(onlineAPIResponse.resultado);

		console.log(`${OnlineSoftwareSales.length} vendas encontradas.`);
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
			const existingSellers = await tx.query.sellers.findMany({
				columns: {
					id: true,
					nome: true,
				},
			});

			const existingClientsMap = new Map(existingClients.map((client) => [client.nome, client.id]));
			const existingProductsMap = new Map(existingProducts.map((product) => [product.codigo, product.id]));
			const existingSellersMap = new Map(existingSellers.map((seller) => [seller.nome, seller.id]));
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
					if (!insertedClientResponse) throw new createHttpError.InternalServerError("Oops, um erro ocorreu ao criar cliente.");
					saleClientId = insertedClientId;
				}
				const equivalentSaleSeller = existingSellersMap.get(OnlineSale.vendedor);
				let saleSellerId = equivalentSaleSeller;
				if (!saleSellerId) {
					const insertedSellerResponse = await tx
						.insert(sellers)
						.values({ nome: OnlineSale.vendedor || "N/A", identificador: OnlineSale.vendedor || "N/A" })
						.returning({ id: sellers.id });
					const insertedSellerId = insertedSellerResponse[0]?.id;
					if (!insertedSellerResponse) throw new createHttpError.InternalServerError("Oops, um erro ocorreu ao criar vendedor.");
					saleSellerId = insertedSellerId;
				}

				const saleTotalCost = OnlineSale.itens.reduce((acc: number, current) => acc + Number(current.vcusto), 0);
				const saleDate = dayjs(OnlineSale.data, "DD/MM/YYYY").add(3, "hours").toDate();
				const insertedSaleResponse = await tx
					.insert(sales)
					.values({
						idExterno: OnlineSale.id,
						clienteId: saleClientId,
						valorTotal: Number(OnlineSale.valor),
						custoTotal: saleTotalCost,
						vendedorNome: OnlineSale.vendedor || "N/A",
						vendedorId: saleSellerId,
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
				if (!insertedSaleResponse) throw new createHttpError.InternalServerError("Oops, um erro ocorreu ao criar venda.");

				for (const item of OnlineSale.itens) {
					const equivalentProduct = existingProductsMap.get(item.codigo);
					if (item.codigo === "RL6K200GB") console.log("ITEM", item.codigo, item.descricao, item.qtde, item.valorunit, item.vcusto, equivalentProduct);
					let productId = equivalentProduct;
					if (!productId) {
						const insertedProductResponse = await tx
							.insert(products)
							.values({
								codigo: item.codigo,
								descricao: item.descricao,
								unidade: item.unidade,
								grupo: item.grupo,
								ncm: item.ncm,
								tipo: item.tipo,
							})
							.returning({
								id: products.id,
							});
						const insertedProductId = insertedProductResponse[0]?.id;
						if (!insertedProductResponse) throw new createHttpError.InternalServerError("Oops, um erro ocorreu ao criar produto.");
						productId = insertedProductId;
					}
					const quantidade = Number(item.qtde);
					const valorVendaUnitario = Number(item.valorunit);
					const valorVendaTotalBruto = valorVendaUnitario * quantidade;
					const valorTotalDesconto = Number(item.vdesc);
					const valorVendaTotalLiquido = valorVendaTotalBruto - valorTotalDesconto;
					const valorCustoTotal = Number(item.vcusto);

					await tx.insert(saleItems).values({
						vendaId: insertedSaleId,
						clienteId: saleClientId,
						produtoId: productId,
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
					});
				}
			}
			return res.status(201).json("EXECUTADO COM SUCESSO");
		});
	} catch (error) {
		console.error("[ERROR] Running into error for the data collecting cron", error);
		await utilsCollection.insertOne({
			identificador: "error",
			erro: JSON.stringify(error, Object.getOwnPropertyNames(error)),
			descricao: `Tentativa de importação de vendas do Online Software ${currentDateFormatted}.`,
		});
		return res.status(500).json("Erro ao importar vendas do Online Software.");
	}
};

export default handleOnlineSoftwareImportation;
