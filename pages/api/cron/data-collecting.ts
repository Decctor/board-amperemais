import { formatPhoneAsBase } from "@/lib/formatting";
import { OnlineSoftwareSaleImportationSchema } from "@/schemas/online-importation.schema";
import { db } from "@/services/drizzle";
import { clients, partners, products, saleItems, sales, sellers, utils } from "@/services/drizzle/schema";
import axios from "axios";
import dayjs from "dayjs";
import dayjsCustomFormatter from "dayjs/plugin/customParseFormat";
import createHttpError from "http-errors";
import type { NextApiHandler } from "next";
import { z } from "zod";
dayjs.extend(dayjsCustomFormatter);

const handleOnlineSoftwareImportation: NextApiHandler<string> = async (req, res) => {
	const currentDateFormatted = "26112025"; // dayjs().subtract(5, "hour").format("DD/MM/YYYY").replaceAll("/", "");
	console.log("DATE BEING USED", dayjs().format("DD/MM/YYYY HH:mm"), dayjs().subtract(5, "hour").format("DD/MM/YYYY HH:mm"), currentDateFormatted);

	try {
		// Fetching data from the online software API
		const { data: onlineAPIResponse } = await axios.post("https://onlinesoftware.com.br/planodecontas/apirestweb/vends/listvends.php", {
			token: process.env.ONLINE_API_TOKEN,
			rotina: "listarVendas001",
			dtinicio: currentDateFormatted,
			dtfim: currentDateFormatted,
		});
		console.log("[INFO] [DATA_COLLECTING] Online API Response", onlineAPIResponse);
		await db
			.insert(utils)
			.values({
				identificador: "ONLINE_IMPORTATION",
				valor: {
					identificador: "ONLINE_IMPORTATION",
					dados: {
						data: currentDateFormatted,
						conteudo: onlineAPIResponse,
					},
				},
			})
			.returning({ id: utils.id });
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
			const existingPartners = await tx.query.partners.findMany({
				columns: {
					id: true,
					identificador: true,
				},
			});
			const existingClientsMap = new Map(existingClients.map((client) => [client.nome, client.id]));
			const existingProductsMap = new Map(existingProducts.map((product) => [product.codigo, product.id]));
			const existingSellersMap = new Map(existingSellers.map((seller) => [seller.nome, seller.id]));
			const existingPartnersMap = new Map(existingPartners.map((partner) => [partner.identificador, partner.id]));
			for (const OnlineSale of OnlineSoftwareSales) {
				// First, we check for an existing client with the same name (in this case, our primary key for the integration)
				const equivalentSaleClient = existingClientsMap.get(OnlineSale.cliente);
				// Initalize the saleClientId holder with the existing client (if any)
				let saleClientId = equivalentSaleClient;
				if (!saleClientId) {
					console.log(`[INFO] [DATA_COLLECTING] [CLIENT] Creating new client for ${OnlineSale.cliente}`);
					// If no existing client is found, we create a new one
					const insertedClientResponse = await tx
						.insert(clients)
						.values({
							nome: OnlineSale.cliente,
							telefone: OnlineSale.clientefone || OnlineSale.clientecelular || "",
							telefoneBase: formatPhoneAsBase(OnlineSale.clientefone || OnlineSale.clientecelular || ""),
						})
						.returning({
							id: clients.id,
						});
					const insertedClientId = insertedClientResponse[0]?.id;
					if (!insertedClientResponse) throw new createHttpError.InternalServerError("Oops, um erro ocorreu ao criar cliente.");
					// Define the saleClientId with the newly created client id
					saleClientId = insertedClientId;
					// Add the new client to the existing clients map
					existingClientsMap.set(OnlineSale.cliente, insertedClientId);
				}

				// Then, we check for an existing seller with the same name (in this case, our primary key for the integration)
				const equivalentSaleSeller = existingSellersMap.get(OnlineSale.vendedor);
				// Initalize the saleSellerId holder with the existing seller (if any)
				let saleSellerId = equivalentSaleSeller;
				if (!saleSellerId) {
					// If no existing seller is found, we create a new one
					const insertedSellerResponse = await tx
						.insert(sellers)
						.values({ nome: OnlineSale.vendedor || "N/A", identificador: OnlineSale.vendedor || "N/A" })
						.returning({ id: sellers.id });
					const insertedSellerId = insertedSellerResponse[0]?.id;
					if (!insertedSellerResponse) throw new createHttpError.InternalServerError("Oops, um erro ocorreu ao criar vendedor.");
					// Define the saleSellerId with the newly created seller id
					saleSellerId = insertedSellerId;
					// Add the new seller to the existing sellers map
					existingSellersMap.set(OnlineSale.vendedor, insertedSellerId);
				}

				// Then, we check for an existing partner with the same identificador (in this case, our primary key for the integration)
				const isValidPartner = OnlineSale.parceiro && OnlineSale.parceiro !== "N/A" && OnlineSale.parceiro !== "0";
				const equivalentSalePartner = isValidPartner ? existingPartnersMap.get(OnlineSale.parceiro as string) : null;
				let salePartnerId = equivalentSalePartner;
				if (!salePartnerId && isValidPartner) {
					// If no existing partner is found, we create a new one
					const insertedPartnerResponse = await tx
						.insert(partners)
						.values({ nome: "NÃO DEFINIDO", identificador: OnlineSale.parceiro || "N/A" })
						.returning({ id: partners.id });
					const insertedPartnerId = insertedPartnerResponse[0]?.id;
					if (!insertedPartnerResponse) throw new createHttpError.InternalServerError("Oops, um erro ocorreu ao criar parceiro.");
					// Define the salePartnerId with the newly created partner id
					salePartnerId = insertedPartnerId;
					// Add the new partner to the existing partners map
					existingPartnersMap.set(OnlineSale.parceiro || "N/A", insertedPartnerId);
				}

				// Now, we extract the data to compose the sale entity
				const saleTotalCost = OnlineSale.itens.reduce((acc: number, current) => acc + Number(current.vcusto), 0);
				const saleDate = dayjs(OnlineSale.data, "DD/MM/YYYY").add(3, "hours").toDate();
				// Insert the sale entity into the database
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
						parceiroId: salePartnerId,
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

				// Now, we iterate over the items to insert the sale items entities into the database
				for (const item of OnlineSale.itens) {
					// First, we check for an existing product with the same code (in this case, our primary key for the integration)
					// Initalize the productId holder with the existing product (if any)
					const equivalentProduct = existingProductsMap.get(item.codigo);
					let productId = equivalentProduct;
					if (!productId) {
						// If no existing product is found, we create a new one
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
						// Define the productId with the newly created product id
						productId = insertedProductId;
						// Add the new product to the existing products map
						existingProductsMap.set(item.codigo, insertedProductId);
					}

					// Now, we extract the data to compose the sale item entity
					const quantidade = Number(item.qtde);
					const valorVendaUnitario = Number(item.valorunit);
					const valorVendaTotalBruto = valorVendaUnitario * quantidade;
					const valorTotalDesconto = Number(item.vdesc);
					const valorVendaTotalLiquido = valorVendaTotalBruto - valorTotalDesconto;
					const valorCustoTotal = Number(item.vcusto);

					// Insert the sale item entity into the database
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
			// Return a success response
			return res.status(201).json("EXECUTADO COM SUCESSO");
		});
	} catch (error) {
		console.error("[ERROR] Running into error for the data collecting cron", error);
		await db.insert(utils).values({
			identificador: "ONLINE_IMPORTATION",
			valor: {
				identificador: "ONLINE_IMPORTATION",
				dados: {
					data: currentDateFormatted,
					erro: JSON.stringify(error, Object.getOwnPropertyNames(error)),
					descricao: `Tentativa de importação de vendas do Online Software ${currentDateFormatted}.`,
				},
			},
		});
		return res.status(500).json("Erro ao importar vendas do Online Software.");
	}
};

export default handleOnlineSoftwareImportation;
