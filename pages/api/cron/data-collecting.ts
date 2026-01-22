import { generateCashbackForCampaign } from "@/lib/cashback/generate-campaign-cashback";
import { reverseSaleCashback } from "@/lib/cashback/reverse-sale-cashback";
import { processConversionAttribution } from "@/lib/conversions/attribution";
import { DASTJS_TIME_DURATION_UNITS_MAP, getPostponedDateFromReferenceDate } from "@/lib/dates";
import { formatPhoneAsBase, formatToCPForCNPJ, formatToPhone } from "@/lib/formatting";
import { type ImmediateProcessingData, delay, processSingleInteractionImmediately } from "@/lib/interactions";
import type { TTimeDurationUnitsEnum } from "@/schemas/enums";
import { OnlineSoftwareSaleImportationSchema } from "@/schemas/online-importation.schema";
import { type DBTransaction, db } from "@/services/drizzle";
import {
	cashbackProgramBalances,
	cashbackProgramTransactions,
	clients,
	interactions,
	partners,
	products,
	saleItems,
	sales,
	sellers,
	utils,
} from "@/services/drizzle/schema";
import axios from "axios";
import dayjs from "dayjs";
import dayjsCustomFormatter from "dayjs/plugin/customParseFormat";
import { and, eq, gt } from "drizzle-orm";
import createHttpError from "http-errors";
import type { NextApiHandler } from "next";
import { z } from "zod";
dayjs.extend(dayjsCustomFormatter);

/**
 * Helper function to check if a campaign can be scheduled for a client based on frequency rules
 * @param tx - Database transaction instance
 * @param clienteId - Client ID
 * @param campanhaId - Campaign ID
 * @param permitirRecorrencia - Whether the campaign allows recurrence
 * @param frequenciaIntervaloValor - Frequency interval value
 * @param frequenciaIntervaloMedida - Frequency interval unit (DIAS, HORAS, etc.)
 * @returns true if the campaign can be scheduled, false otherwise
 */
async function canScheduleCampaignForClient(
	tx: DBTransaction,
	clienteId: string,
	campanhaId: string,
	permitirRecorrencia: boolean,
	frequenciaIntervaloValor: number | null,
	frequenciaIntervaloMedida: string | null,
): Promise<boolean> {
	// Check if campaign allows recurrence
	if (!permitirRecorrencia) {
		const previousInteraction = await tx.query.interactions.findFirst({
			where: (fields, { and, eq }) => and(eq(fields.clienteId, clienteId), eq(fields.campanhaId, campanhaId)),
		});
		if (previousInteraction) {
			console.log(`[CAMPAIGN_FREQUENCY] Campaign ${campanhaId} does not allow recurrence. Skipping for client ${clienteId}.`);
			return false;
		}
	}

	// Check for time interval (Frequency Cap)
	if (permitirRecorrencia && frequenciaIntervaloValor && frequenciaIntervaloValor > 0 && frequenciaIntervaloMedida) {
		// Map the enum to dayjs units
		const dayjsUnit = DASTJS_TIME_DURATION_UNITS_MAP[frequenciaIntervaloMedida as TTimeDurationUnitsEnum] || "day";

		// Calculate the cutoff date based on the campaign's interval settings
		const cutoffDate = dayjs().subtract(frequenciaIntervaloValor, dayjsUnit).toDate();

		const recentInteraction = await tx.query.interactions.findFirst({
			where: (fields, { and, eq, gt }) => and(eq(fields.clienteId, clienteId), eq(fields.campanhaId, campanhaId), gt(fields.dataInsercao, cutoffDate)),
		});

		if (recentInteraction) {
			console.log(
				`[CAMPAIGN_FREQUENCY] Campaign ${campanhaId} frequency limit reached for client ${clienteId}. Last interaction was at ${recentInteraction.dataInsercao}.`,
			);
			return false;
		}
	}

	return true;
}

/**
 * Type definition for cashback balance entries stored in the local Map cache
 */
type TCashbackBalanceEntry = {
	clienteId: string;
	programaId: string;
	saldoValorDisponivel: number;
	saldoValorAcumuladoTotal: number;
};

/**
 * Helper function to update the local cashback balance Map cache.
 * This ensures consistency when tracking balances across multiple sales iterations.
 * @param map - The Map storing cashback balances by clientId
 * @param clientId - Client ID (key for the Map)
 * @param programId - Cashback program ID
 * @param availableBalance - New available balance value
 * @param accumulatedTotal - New accumulated total value
 */
function updateCashbackBalanceInMap(
	map: Map<string, TCashbackBalanceEntry>,
	clientId: string,
	programId: string,
	availableBalance: number,
	accumulatedTotal: number,
): void {
	map.set(clientId, {
		clienteId: clientId,
		programaId: programId,
		saldoValorDisponivel: availableBalance,
		saldoValorAcumuladoTotal: accumulatedTotal,
	});
}

const handleOnlineSoftwareImportation: NextApiHandler<string> = async (req, res) => {
	const currentDateFormatted = dayjs().subtract(5, "hour").format("DD/MM/YYYY").replaceAll("/", "");
	console.log("DATE BEING USED", dayjs().format("DD/MM/YYYY HH:mm"), dayjs().subtract(5, "hour").format("DD/MM/YYYY HH:mm"), currentDateFormatted);

	const organizations = await db.query.organizations.findMany({
		columns: {
			id: true,
			integracaoTipo: true,
			integracaoConfiguracao: true,
		},
	});

	for (const organization of organizations) {
		const campaigns = await db.query.campaigns.findMany({
			where: (fields, { and, or, eq }) =>
				and(
					eq(fields.organizacaoId, organization.id),
					eq(fields.ativo, true),
					or(eq(fields.gatilhoTipo, "NOVA-COMPRA"), eq(fields.gatilhoTipo, "PRIMEIRA-COMPRA"), eq(fields.gatilhoTipo, "CASHBACK-ACUMULADO")),
				),
			with: {
				segmentacoes: true,
				whatsappTemplate: true,
			},
		});
		const campaignsForNewPurchase = campaigns.filter((campaign) => campaign.gatilhoTipo === "NOVA-COMPRA");
		const campaignsForFirstPurchase = campaigns.filter((campaign) => campaign.gatilhoTipo === "PRIMEIRA-COMPRA");
		const campaignsForCashbackAccumulation = campaigns.filter((campaign) => campaign.gatilhoTipo === "CASHBACK-ACUMULADO");
		console.log(`[ORG: ${organization.id}] ${campaignsForNewPurchase.length} campanhas de nova compra encontradas.`);
		console.log(`[ORG: ${organization.id}] ${campaignsForFirstPurchase.length} campanhas de primeira compra encontradas.`);
		console.log(`[ORG: ${organization.id}] ${campaignsForCashbackAccumulation.length} campanhas de cashback acumulado encontradas.`);

		// Query whatsappConnection for immediate processing
		const whatsappConnection = await db.query.whatsappConnections.findFirst({
			where: (fields, { eq }) => eq(fields.organizacaoId, organization.id),
		});

		// Collect data for immediate processing
		const immediateProcessingDataList: ImmediateProcessingData[] = [];

		if (organization.integracaoTipo !== "ONLINE-SOFTWARE") {
			console.log(`[INFO] [DATA_COLLECTING] [ORGANIZATION] Organization ${organization.id} does not have ONLINE-SOFTWARE integration type.`);
			continue;
		}
		try {
			// Fetching data from the online software API
			const { data: onlineAPIResponse } = await axios.post("https://onlinesoftware.com.br/planodecontas/apirestweb/vends/listvends.php", {
				token: organization.integracaoConfiguracao?.token,
				rotina: "listarVendas001",
				dtinicio: currentDateFormatted,
				dtfim: currentDateFormatted,
			});
			await db
				.insert(utils)
				.values({
					organizacaoId: organization.id,
					identificador: "ONLINE_IMPORTATION",
					valor: {
						identificador: "ONLINE_IMPORTATION",
						dados: {
							organizacaoId: organization.id,
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

			console.log(`[ORG: ${organization.id}] ${OnlineSoftwareSales.length} vendas encontradas.`);

			const OnlineSoftwareSalesIds = OnlineSoftwareSales.map((sale) => sale.id);

			await db.transaction(async (tx) => {
				const cashbackProgram = await tx.query.cashbackPrograms.findFirst({
					where: (fields, { eq }) => eq(fields.organizacaoId, organization.id),
					columns: {
						id: true,
						acumuloTipo: true,
						acumuloRegraValorMinimo: true,
						acumuloValor: true,
						expiracaoRegraValidadeValor: true,
						acumuloPermitirViaIntegracao: true,
					},
				});
				const cashbackProgramAllowsAccumulationViaIntegration = cashbackProgram?.acumuloPermitirViaIntegracao;
				const existingSales = await tx.query.sales.findMany({
					where: (fields, { and, eq, inArray }) => and(eq(fields.organizacaoId, organization.id), inArray(fields.idExterno, OnlineSoftwareSalesIds)),
					with: {
						itens: true,
					},
				});

				const existingClients = await tx.query.clients.findMany({
					where: (fields, { eq }) => eq(fields.organizacaoId, organization.id),
					columns: {
						id: true,
						nome: true,
						primeiraCompraData: true,
						ultimaCompraData: true,
						analiseRFMTitulo: true,
					},
				});
				const existingProducts = await tx.query.products.findMany({
					where: (fields, { eq }) => eq(fields.organizacaoId, organization.id),
					columns: {
						id: true,
						codigo: true,
					},
				});
				const existingSellers = await tx.query.sellers.findMany({
					where: (fields, { eq }) => eq(fields.organizacaoId, organization.id),
					columns: {
						id: true,
						nome: true,
					},
				});
				const existingPartners = await tx.query.partners.findMany({
					where: (fields, { eq }) => eq(fields.organizacaoId, organization.id),
					columns: {
						id: true,
						identificador: true,
					},
				});
				const existingCashbackProgramBalances = cashbackProgram
					? await tx.query.cashbackProgramBalances.findMany({
							where: (fields, { and, eq }) => and(eq(fields.organizacaoId, organization.id), eq(fields.programaId, cashbackProgram.id)),
							columns: {
								programaId: true,
								clienteId: true,
								saldoValorDisponivel: true,
								saldoValorAcumuladoTotal: true,
							},
						})
					: [];

				const existingSalesMap = new Map(existingSales.map((sale) => [sale.idExterno, sale]));
				const existingClientsMap = new Map(
					existingClients.map((client) => [
						client.nome,
						{
							id: client.id,
							firstPurchaseDate: client.primeiraCompraData,
							lastPurchaseDate: client.ultimaCompraData,
							rfmTitle: client.analiseRFMTitulo,
						},
					]),
				);
				const existingProductsMap = new Map(existingProducts.map((product) => [product.codigo, product.id]));
				const existingSellersMap = new Map(existingSellers.map((seller) => [seller.nome, seller.id]));
				const existingPartnersMap = new Map(existingPartners.map((partner) => [partner.identificador, partner.id]));
				const existingCashbackProgramBalancesMap = new Map(existingCashbackProgramBalances.map((balance) => [balance.clienteId, balance]));

				let createdSalesCount = 0;
				let updatedSalesCount = 0;
				for (const OnlineSale of OnlineSoftwareSales) {
					let isNewClient = false;
					let isNewSale = false;

					const onlineBaseSaleDate = dayjs(OnlineSale.data, "DD/MM/YYYY");
					// If the Online sale date is the same as the current date, we use the current date (with time frame component, since cron runs every 5 minutes, we get approximately real time),
					// Otherwise we use the online sale date + 3 hours (to compensate for lack of time component in Online date field)
					const saleDate = dayjs().isSame(onlineBaseSaleDate, "day") ? dayjs().toDate() : onlineBaseSaleDate.add(3, "hours").toDate();
					const isValidSale = OnlineSale.natureza === "SN01";
					// First, we check for an existing client with the same name (in this case, our primary key for the integration)
					const equivalentSaleClient = existingClientsMap.get(OnlineSale.cliente);
					const isValidClient = OnlineSale.cliente !== "AO CONSUMIDOR";
					// Initalize the saleClientId holder with the existing client (if any)
					let saleClientId = equivalentSaleClient?.id;
					if (!saleClientId && isValidClient) {
						console.log(`[ORG: ${organization.id}] [INFO] [DATA_COLLECTING] [CLIENT] Creating new client for ${OnlineSale.cliente}`);
						// If no existing client is found, we create a new one
						const insertedClientResponse = await tx
							.insert(clients)
							.values({
								nome: OnlineSale.cliente,
								organizacaoId: organization.id,
								telefone: formatToPhone(OnlineSale.clientefone || OnlineSale.clientecelular || ""),
								telefoneBase: formatPhoneAsBase(OnlineSale.clientefone || OnlineSale.clientecelular || ""),
								primeiraCompraData: isValidSale ? saleDate : null,
								ultimaCompraData: isValidSale ? saleDate : null,
							})
							.returning({
								id: clients.id,
							});
						const insertedClientId = insertedClientResponse[0]?.id;
						if (!insertedClientResponse) throw new createHttpError.InternalServerError("Oops, um erro ocorreu ao criar cliente.");
						// Define the saleClientId with the newly created client id
						saleClientId = insertedClientId;
						isNewClient = true;
						// Add the new client to the existing clients map
						existingClientsMap.set(OnlineSale.cliente, {
							id: insertedClientId,
							firstPurchaseDate: isValidSale ? saleDate : null,
							lastPurchaseDate: isValidSale ? saleDate : null,
							rfmTitle: "CLIENTES RECENTES",
						});

						if (cashbackProgram) {
							// If there is a cashback program, we need to create a new balance for the client
							await tx.insert(cashbackProgramBalances).values({
								clienteId: insertedClientId,
								programaId: cashbackProgram.id,
								organizacaoId: organization.id,
								saldoValorDisponivel: 0,
								saldoValorAcumuladoTotal: 0,
							});
							updateCashbackBalanceInMap(existingCashbackProgramBalancesMap, insertedClientId, cashbackProgram.id, 0, 0);
						}
					}

					// Then, we check for an existing seller with the same name (in this case, our primary key for the integration)
					const isValidSeller = !!OnlineSale.vendedor && OnlineSale.vendedor !== "N/A" && OnlineSale.vendedor !== "0";
					const equivalentSaleSeller = isValidSeller ? existingSellersMap.get(OnlineSale.vendedor) : null;
					// Initalize the saleSellerId holder with the existing seller (if any)
					let saleSellerId = equivalentSaleSeller;
					if (!saleSellerId && isValidSeller) {
						// If no existing seller is found, we create a new one
						const insertedSellerResponse = await tx
							.insert(sellers)
							.values({ organizacaoId: organization.id, nome: OnlineSale.vendedor || "N/A", identificador: OnlineSale.vendedor || "N/A" })
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
							.values({
								organizacaoId: organization.id,
								nome: "NÃO DEFINIDO",
								identificador: OnlineSale.parceiro || "N/A",
								cpfCnpj: formatToCPForCNPJ(OnlineSale.parceiro || "N/A"),
							})
							.returning({ id: partners.id });
						const insertedPartnerId = insertedPartnerResponse[0]?.id;
						if (!insertedPartnerResponse) throw new createHttpError.InternalServerError("Oops, um erro ocorreu ao criar parceiro.");
						// Define the salePartnerId with the newly created partner id
						salePartnerId = insertedPartnerId;
						// Add the new partner to the existing partners map
						existingPartnersMap.set(OnlineSale.parceiro || "N/A", insertedPartnerId);
					}

					let saleId = null;
					const existingSale = existingSalesMap.get(OnlineSale.id);
					if (!existingSale) {
						isNewSale = true; // MARCA COMO NOVA VENDA
						console.log(
							`[ORG: ${organization.id}] [INFO] [DATA_COLLECTING] [SALE] Creating new sale ${OnlineSale.id} with ${OnlineSale.itens.length} items...`,
						);
						// Now, we extract the data to compose the sale entity
						const saleTotalCost = OnlineSale.itens.reduce((acc: number, current) => acc + Number(current.vcusto), 0);
						// Insert the sale entity into the database
						const insertedSaleResponse = await tx
							.insert(sales)
							.values({
								organizacaoId: organization.id,
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
										organizacaoId: organization.id,
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
								organizacaoId: organization.id,
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
						// Defining the saleId
						saleId = insertedSaleId;

						// Process conversion attribution for new valid sales (and valid client)
						if (insertedSaleId && isValidSale && saleClientId) {
							await processConversionAttribution(tx, {
								vendaId: insertedSaleId,
								clienteId: saleClientId,
								organizacaoId: organization.id,
								valorVenda: Number(OnlineSale.valor),
								dataVenda: saleDate,
							});
						}

						createdSalesCount++;
					} else {
						isNewSale = false; // É APENAS ATUALIZAÇÃO
						console.log(
							`[ORG: ${organization.id}] [INFO] [DATA_COLLECTING] [SALE] Updating sale ${OnlineSale.id} with ${OnlineSale.itens.length} items...`,
						);
						// Handle sales updates
						const saleTotalCost = OnlineSale.itens.reduce((acc: number, current) => acc + Number(current.vcusto), 0);
						const saleDate = dayjs(OnlineSale.data, "DD/MM/YYYY").add(3, "hours").toDate();
						await tx
							.update(sales)
							.set({
								organizacaoId: organization.id,
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
							.where(eq(sales.id, existingSale.id));

						// Check if sale was canceled
						const wasPreviouslyValid = existingSale.natureza === "SN01" && existingSale.valorTotal > 0;
						const isNowCanceled = OnlineSale.natureza !== "SN01" || Number(OnlineSale.valor) === 0;

						if (wasPreviouslyValid && isNowCanceled && saleClientId) {
							console.log(
								`[ORG: ${organization.id}] [SALE_CANCELED] Venda ${OnlineSale.id} foi cancelada. ` + "Revertendo cashback e cancelando interações...",
							);

							await reverseSaleCashback({
								tx,
								saleId: existingSale.id,
								clientId: saleClientId,
								organizationId: organization.id,
								reason: "VENDA_CANCELADA",
							});
						}

						// Now, since we can reliably update sale items, we will delete all previous items and insert the new ones

						await tx.delete(saleItems).where(and(eq(saleItems.vendaId, existingSale.id), eq(saleItems.organizacaoId, organization.id)));
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
										organizacaoId: organization.id,
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
								organizacaoId: organization.id,
								vendaId: existingSale.id,
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
						// Defining the saleId
						saleId = existingSale.id;
						updatedSalesCount++;
					}

					// Checking for applicable campaigns for first purchases
					if (isNewSale && isNewClient && isValidSale && saleClientId) {
						// Checking for applicable campaigns for new purchase
						const applicableCampaigns = campaignsForFirstPurchase.filter((campaign) =>
							campaign.segmentacoes.some((s) => s.segmentacao === "CLIENTES RECENTES"),
						);
						if (applicableCampaigns.length > 0 && isValidSale) {
							console.log(
								`[ORG: ${organization.id}] ${applicableCampaigns.length} campanhas de primeira compra aplicáveis encontradas para o cliente ${OnlineSale.cliente}.`,
							);
							for (const campaign of applicableCampaigns) {
								// Validate campaign frequency before scheduling
								const canSchedule = await canScheduleCampaignForClient(
									tx,
									saleClientId,
									campaign.id,
									campaign.permitirRecorrencia,
									campaign.frequenciaIntervaloValor,
									campaign.frequenciaIntervaloMedida,
								);

								if (!canSchedule) {
									console.log(
										`[ORG: ${organization.id}] [CAMPAIGN_FREQUENCY] Skipping campaign ${campaign.titulo} for client ${OnlineSale.cliente} due to frequency limits.`,
									);
									continue;
								}

								// For the applicable campaigns, we will iterate over them and schedule the interactions
								const interactionScheduleDate = getPostponedDateFromReferenceDate({
									date: dayjs().toDate(),
									unit: campaign.execucaoAgendadaMedida,
									value: campaign.execucaoAgendadaValor,
								});
								const [insertedInteraction] = await tx
									.insert(interactions)
									.values({
										clienteId: saleClientId,
										campanhaId: campaign.id,
										organizacaoId: organization.id,
										titulo: `Envio de mensagem automática via campanha ${campaign.titulo}`,
										tipo: "ENVIO-MENSAGEM",
										descricao: "Cliente realizou sua primeira compra.",
										agendamentoDataReferencia: dayjs(interactionScheduleDate).format("YYYY-MM-DD"),
										agendamentoBlocoReferencia: campaign.execucaoAgendadaBloco,
									})
									.returning({ id: interactions.id });

								// Check for immediate processing (execucaoAgendadaValor === 0)
								if (campaign.execucaoAgendadaValor === 0 && campaign.whatsappTemplate && whatsappConnection) {
									// Query client data for immediate processing
									const clientData = await tx.query.clients.findFirst({
										where: (fields, { eq }) => eq(fields.id, saleClientId),
										columns: {
											id: true,
											nome: true,
											telefone: true,
											email: true,
											analiseRFMTitulo: true,
										},
									});

									if (clientData) {
										immediateProcessingDataList.push({
											interactionId: insertedInteraction.id,
											organizationId: organization.id,
											client: {
												id: clientData.id,
												nome: clientData.nome,
												telefone: clientData.telefone,
												email: clientData.email,
												analiseRFMTitulo: clientData.analiseRFMTitulo,
											},
											campaign: {
												autorId: campaign.autorId,
												whatsappTelefoneId: campaign.whatsappTelefoneId,
												whatsappTemplate: campaign.whatsappTemplate,
											},
											whatsappToken: whatsappConnection.token,
										});
									}
								}

								// Generate campaign cashback for PRIMEIRA-COMPRA trigger
								if (cashbackProgram && campaign.cashbackGeracaoAtivo && campaign.cashbackGeracaoTipo && campaign.cashbackGeracaoValor) {
									const saleValue = Number(OnlineSale.valor);
									const cashbackGenerationResult = await generateCashbackForCampaign({
										tx,
										organizationId: organization.id,
										clientId: saleClientId,
										campaignId: campaign.id,
										cashbackType: campaign.cashbackGeracaoTipo,
										cashbackValue: campaign.cashbackGeracaoValor,
										saleId: saleId,
										saleValue: saleValue,
										expirationMeasure: campaign.cashbackGeracaoExpiracaoMedida,
										expirationValue: campaign.cashbackGeracaoExpiracaoValor,
									});

									if (cashbackGenerationResult) {
										updateCashbackBalanceInMap(
											existingCashbackProgramBalancesMap,
											saleClientId,
											cashbackProgram.id,
											cashbackGenerationResult.clientNewAvailableBalance,
											cashbackGenerationResult.clientNewAccumulatedTotal,
										);
									}
								}
							}
						}
					}
					// Checking for applicable campaigns for new purchase
					if (isNewSale && !isNewClient && isValidSale) {
						const applicableCampaigns = campaignsForNewPurchase.filter((campaign) => {
							// Validate campaign trigger for new purchase
							const meetsNewPurchaseValueTrigger =
								campaign.gatilhoNovaCompraValorMinimo === null ||
								campaign.gatilhoNovaCompraValorMinimo === undefined ||
								Number(OnlineSale.valor) >= campaign.gatilhoNovaCompraValorMinimo;

							const meetsSegmentationTrigger = campaign.segmentacoes.some(
								(s) => s.segmentacao === (existingClientsMap.get(OnlineSale.cliente)?.rfmTitle ?? "CLIENTES RECENTES"),
							);

							return meetsNewPurchaseValueTrigger && meetsSegmentationTrigger;
						});
						if (applicableCampaigns.length > 0) {
							console.log(
								`[ORG: ${organization.id}] ${applicableCampaigns.length} campanhas de nova compra aplicáveis encontradas para o cliente ${OnlineSale.cliente}.`,
							);
							for (const campaign of applicableCampaigns) {
								if (!saleClientId) continue; // If no sale client id is found, skip the campaign
								// Validate campaign frequency before scheduling
								const canSchedule = await canScheduleCampaignForClient(
									tx,
									saleClientId,
									campaign.id,
									campaign.permitirRecorrencia,
									campaign.frequenciaIntervaloValor,
									campaign.frequenciaIntervaloMedida,
								);

								if (!canSchedule) {
									console.log(
										`[ORG: ${organization.id}] [CAMPAIGN_FREQUENCY] Skipping campaign ${campaign.titulo} for client ${OnlineSale.cliente} due to frequency limits.`,
									);
									continue;
								}

								const interactionScheduleDate = getPostponedDateFromReferenceDate({
									date: dayjs().toDate(),
									unit: campaign.execucaoAgendadaMedida,
									value: campaign.execucaoAgendadaValor,
								});
								const [insertedInteraction] = await tx
									.insert(interactions)
									.values({
										clienteId: saleClientId,
										campanhaId: campaign.id,
										organizacaoId: organization.id,
										titulo: `Envio de mensagem automática via campanha ${campaign.titulo}`,
										tipo: "ENVIO-MENSAGEM",
										descricao: `Cliente se enquadrou no parâmetro de nova compra ${existingClientsMap.get(OnlineSale.cliente)?.rfmTitle}.`,
										agendamentoDataReferencia: dayjs(interactionScheduleDate).format("YYYY-MM-DD"),
										agendamentoBlocoReferencia: campaign.execucaoAgendadaBloco,
									})
									.returning({ id: interactions.id });

								// Check for immediate processing (execucaoAgendadaValor === 0)
								if (campaign.execucaoAgendadaValor === 0 && campaign.whatsappTemplate && whatsappConnection) {
									// Query client data for immediate processing
									const clientData = await tx.query.clients.findFirst({
										where: (fields, { eq }) => eq(fields.id, saleClientId),
										columns: {
											id: true,
											nome: true,
											telefone: true,
											email: true,
											analiseRFMTitulo: true,
										},
									});

									if (clientData) {
										immediateProcessingDataList.push({
											interactionId: insertedInteraction.id,
											organizationId: organization.id,
											client: {
												id: clientData.id,
												nome: clientData.nome,
												telefone: clientData.telefone,
												email: clientData.email,
												analiseRFMTitulo: clientData.analiseRFMTitulo,
											},
											campaign: {
												autorId: campaign.autorId,
												whatsappTelefoneId: campaign.whatsappTelefoneId,
												whatsappTemplate: campaign.whatsappTemplate,
											},
											whatsappToken: whatsappConnection.token,
										});
									}
								}

								// Generate campaign cashback for NOVA-COMPRA trigger
								if (campaign.cashbackGeracaoAtivo && campaign.cashbackGeracaoTipo && campaign.cashbackGeracaoValor) {
									const saleValue = Number(OnlineSale.valor);
									const cashbackGenerationResult = await generateCashbackForCampaign({
										tx,
										organizationId: organization.id,
										clientId: saleClientId,
										campaignId: campaign.id,
										cashbackType: campaign.cashbackGeracaoTipo,
										cashbackValue: campaign.cashbackGeracaoValor,
										saleId: saleId,
										saleValue: saleValue,
										expirationMeasure: campaign.cashbackGeracaoExpiracaoMedida,
										expirationValue: campaign.cashbackGeracaoExpiracaoValor,
									});

									if (cashbackGenerationResult) {
										const clientCashbackProgramBalance = existingCashbackProgramBalancesMap.get(saleClientId);
										if (clientCashbackProgramBalance) {
											updateCashbackBalanceInMap(
												existingCashbackProgramBalancesMap,
												saleClientId,
												clientCashbackProgramBalance.programaId,
												cashbackGenerationResult.clientNewAvailableBalance,
												cashbackGenerationResult.clientNewAccumulatedTotal,
											);
										}
									}
								}
							}
						}
					}
					// Checking for applicable cashback program balance updates
					if (cashbackProgram && cashbackProgramAllowsAccumulationViaIntegration && isValidSale && isNewSale) {
						if (!saleClientId) continue; // If no sale client id is found, skip the cashback program balance update
						const clientCashbackProgramBalance = existingCashbackProgramBalancesMap.get(saleClientId);

						if (clientCashbackProgramBalance) {
							const saleValue = Number(OnlineSale.valor);
							const previousOverallAvailableBalance = clientCashbackProgramBalance.saldoValorDisponivel;
							const previousOverallAccumulatedBalance = clientCashbackProgramBalance.saldoValorAcumuladoTotal;

							let accumulatedBalance = 0;
							if (cashbackProgram.acumuloTipo === "FIXO") {
								if (saleValue >= cashbackProgram.acumuloRegraValorMinimo) {
									accumulatedBalance = cashbackProgram.acumuloValor;
								}
							} else if (cashbackProgram.acumuloTipo === "PERCENTUAL") {
								if (saleValue >= cashbackProgram.acumuloRegraValorMinimo) {
									accumulatedBalance = (saleValue * cashbackProgram.acumuloValor) / 100;
								}
							}

							const newOverallAvailableBalance = previousOverallAvailableBalance + accumulatedBalance;
							const newOverallAccumulatedBalance = previousOverallAccumulatedBalance + accumulatedBalance;

							if (accumulatedBalance > 0) {
								await tx
									.update(cashbackProgramBalances)
									.set({
										saldoValorDisponivel: newOverallAvailableBalance,
										saldoValorAcumuladoTotal: newOverallAccumulatedBalance,
									})
									.where(
										and(
											eq(cashbackProgramBalances.clienteId, saleClientId),
											eq(cashbackProgramBalances.programaId, cashbackProgram.id),
											eq(cashbackProgramBalances.organizacaoId, organization.id),
										),
									);

								await tx.insert(cashbackProgramTransactions).values({
									organizacaoId: organization.id,
									clienteId: saleClientId,
									vendaId: saleId,
									programaId: cashbackProgram.id,
									tipo: "ACÚMULO",
									valor: accumulatedBalance,
									valorRestante: accumulatedBalance,
									saldoValorAnterior: previousOverallAvailableBalance,
									saldoValorPosterior: newOverallAvailableBalance,
									expiracaoData: dayjs().add(cashbackProgram.expiracaoRegraValidadeValor, "day").toDate(),
									dataInsercao: saleDate,
									status: "ATIVO",
								});

								// Update the map for subsequent iterations
								updateCashbackBalanceInMap(
									existingCashbackProgramBalancesMap,
									saleClientId,
									cashbackProgram.id,
									newOverallAvailableBalance,
									newOverallAccumulatedBalance,
								);

								// Checking for applicable campaigns for cashback accumulation
								if (campaignsForCashbackAccumulation.length > 0) {
									const applicableCampaigns = campaignsForCashbackAccumulation.filter((campaign) => {
										// Check if the new accumulated cashback meets the minimum threshold (if defined)
										const meetsNewCashbackThreshold =
											campaign.gatilhoNovoCashbackAcumuladoValorMinimo === null ||
											campaign.gatilhoNovoCashbackAcumuladoValorMinimo === undefined ||
											accumulatedBalance >= campaign.gatilhoNovoCashbackAcumuladoValorMinimo;

										// Check if the total accumulated cashback meets the minimum threshold (if defined)
										const meetsTotalCashbackThreshold =
											campaign.gatilhoTotalCashbackAcumuladoValorMinimo === null ||
											campaign.gatilhoTotalCashbackAcumuladoValorMinimo === undefined ||
											newOverallAvailableBalance >= campaign.gatilhoTotalCashbackAcumuladoValorMinimo;

										const meetsSegmentationTrigger = campaign.segmentacoes.some(
											(s) => s.segmentacao === (existingClientsMap.get(OnlineSale.cliente)?.rfmTitle ?? "CLIENTES RECENTES"),
										);
										// All conditions must be met (if defined)
										return meetsNewCashbackThreshold && meetsTotalCashbackThreshold && meetsSegmentationTrigger;
									});

									if (applicableCampaigns.length > 0) {
										console.log(
											`[ORG: ${organization.id}] ${applicableCampaigns.length} campanhas de cashback acumulado aplicáveis encontradas para o cliente ${OnlineSale.cliente}.`,
										);
									}

									for (const campaign of applicableCampaigns) {
										// Validate campaign frequency before scheduling
										const canSchedule = await canScheduleCampaignForClient(
											tx,
											saleClientId,
											campaign.id,
											campaign.permitirRecorrencia,
											campaign.frequenciaIntervaloValor,
											campaign.frequenciaIntervaloMedida,
										);

										if (!canSchedule) {
											console.log(
												`[ORG: ${organization.id}] [CAMPAIGN_FREQUENCY] Skipping campaign ${campaign.titulo} for client ${OnlineSale.cliente} due to frequency limits.`,
											);
											continue;
										}

										const interactionScheduleDate = getPostponedDateFromReferenceDate({
											date: dayjs().toDate(),
											unit: campaign.execucaoAgendadaMedida,
											value: campaign.execucaoAgendadaValor,
										});

										const [insertedInteraction] = await tx
											.insert(interactions)
											.values({
												clienteId: saleClientId,
												campanhaId: campaign.id,
												organizacaoId: organization.id,
												titulo: `Envio de mensagem automática via campanha ${campaign.titulo}`,
												tipo: "ENVIO-MENSAGEM",
												descricao: `Cliente acumulou R$ ${(accumulatedBalance / 100).toFixed(2)} em cashback. Total acumulado: R$ ${(newOverallAccumulatedBalance / 100).toFixed(2)}.`,
												agendamentoDataReferencia: dayjs(interactionScheduleDate).format("YYYY-MM-DD"),
												agendamentoBlocoReferencia: campaign.execucaoAgendadaBloco,
												metadados: {
													cashbackAcumuladoValor: accumulatedBalance,
													whatsappMensagemId: null,
													whatsappTemplateId: null,
												},
											})
											.returning({ id: interactions.id });

										// Check for immediate processing (execucaoAgendadaValor === 0)
										if (campaign.execucaoAgendadaValor === 0 && campaign.whatsappTemplate && whatsappConnection) {
											// Query client data for immediate processing
											const clientData = await tx.query.clients.findFirst({
												where: (fields, { eq }) => eq(fields.id, saleClientId),
												columns: {
													id: true,
													nome: true,
													telefone: true,
													email: true,
													analiseRFMTitulo: true,
												},
											});

											if (clientData) {
												immediateProcessingDataList.push({
													interactionId: insertedInteraction.id,
													organizationId: organization.id,
													client: {
														id: clientData.id,
														nome: clientData.nome,
														telefone: clientData.telefone,
														email: clientData.email,
														analiseRFMTitulo: clientData.analiseRFMTitulo,
													},
													campaign: {
														autorId: campaign.autorId,
														whatsappTelefoneId: campaign.whatsappTelefoneId,
														whatsappTemplate: campaign.whatsappTemplate,
													},
													whatsappToken: whatsappConnection.token,
												});
											}
										}

										// Generate campaign cashback for CASHBACK-ACUMULADO trigger (FIXO only)
										if (campaign.cashbackGeracaoAtivo && campaign.cashbackGeracaoTipo === "FIXO" && campaign.cashbackGeracaoValor) {
											const cashbackGenerationResult = await generateCashbackForCampaign({
												tx,
												organizationId: organization.id,
												clientId: saleClientId,
												campaignId: campaign.id,
												cashbackType: "FIXO",
												cashbackValue: campaign.cashbackGeracaoValor,
												saleValue: saleValue,
												saleId: saleId,
												expirationMeasure: campaign.cashbackGeracaoExpiracaoMedida,
												expirationValue: campaign.cashbackGeracaoExpiracaoValor,
											});

											if (cashbackGenerationResult) {
												updateCashbackBalanceInMap(
													existingCashbackProgramBalancesMap,
													saleClientId,
													cashbackProgram.id,
													cashbackGenerationResult.clientNewAvailableBalance,
													cashbackGenerationResult.clientNewAccumulatedTotal,
												);
											}
										}
									}
								}
							}
						}
					}
					if (isValidSale && saleClientId && isNewSale) {
						await tx
							.update(clients)
							.set({
								ultimaCompraData: saleDate,
								ultimaCompraId: saleId,
							})
							.where(and(eq(clients.id, saleClientId), eq(clients.organizacaoId, organization.id)));
					}
				}

				console.log(
					`[ORG: ${organization.id}] [INFO] [DATA_COLLECTING] [SALES] Created ${createdSalesCount} sales and updated ${updatedSalesCount} sales.`,
				);
			});

			// Process interactions immediately after transaction (with delay to avoid rate limiting)
			if (immediateProcessingDataList.length > 0) {
				console.log(`[ORG: ${organization.id}] [INFO] Processing ${immediateProcessingDataList.length} immediate interactions`);
				for (const processingData of immediateProcessingDataList) {
					processSingleInteractionImmediately(processingData).catch((err) =>
						console.error(`[IMMEDIATE_PROCESS] Failed to process interaction ${processingData.interactionId}:`, err),
					);
					await delay(100); // Small delay between sends to avoid rate limiting
				}
			}
		} catch (error) {
			console.error(`[ORG: ${organization.id}] [ERROR] Running into error for the data collecting cron`, error);
			await db.insert(utils).values({
				organizacaoId: organization.id,
				identificador: "ONLINE_IMPORTATION",
				valor: {
					identificador: "ONLINE_IMPORTATION",
					dados: {
						organizacaoId: organization.id,
						data: currentDateFormatted,
						erro: JSON.stringify(error, Object.getOwnPropertyNames(error)),
						descricao: `Tentativa de importação de vendas do Online Software ${currentDateFormatted}.`,
					},
				},
			});
		}
	}

	console.log("[INFO] [DATA_COLLECTING] Processing Concluded successfully.");
	return res.status(201).json("EXECUTADO COM SUCESSO");
};

export default handleOnlineSoftwareImportation;
