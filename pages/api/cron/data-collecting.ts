import { getPostponedDateFromReferenceDate } from "@/lib/dates";
import { formatPhoneAsBase } from "@/lib/formatting";
import { OnlineSoftwareSaleImportationSchema } from "@/schemas/online-importation.schema";
import { db } from "@/services/drizzle";
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
import { and, eq } from "drizzle-orm";
import createHttpError from "http-errors";
import type { NextApiHandler } from "next";
import { z } from "zod";
dayjs.extend(dayjsCustomFormatter);

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
					or(eq(fields.gatilhoTipo, "NOVA-COMPRA"), eq(fields.gatilhoTipo, "PRIMEIRA-COMPRA")),
				),
			with: {
				segmentacoes: true,
			},
		});
		const campaignsForNewPurchase = campaigns.filter((campaign) => campaign.gatilhoTipo === "NOVA-COMPRA");
		const campaignsForFirstPurchase = campaigns.filter((campaign) => campaign.gatilhoTipo === "PRIMEIRA-COMPRA");
		console.log(`[ORG: ${organization.id}] ${campaignsForNewPurchase.length} campanhas de nova compra encontradas.`);
		console.log(`[ORG: ${organization.id}] ${campaignsForFirstPurchase.length} campanhas de primeira compra encontradas.`);

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

			return await db.transaction(async (tx) => {
				const cashbackProgram = await tx.query.cashbackPrograms.findFirst({
					where: (fields, { eq }) => eq(fields.organizacaoId, organization.id),
					columns: {
						id: true,
						acumuloTipo: true,
						acumuloRegraValorMinimo: true,
						acumuloValor: true,
						expiracaoRegraValidadeValor: true,
					},
				});

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

					const saleDate = dayjs(OnlineSale.data, "DD/MM/YYYY").add(3, "hours").toDate();
					const isValidSale = OnlineSale.natureza === "SN01";
					// First, we check for an existing client with the same name (in this case, our primary key for the integration)
					const equivalentSaleClient = existingClientsMap.get(OnlineSale.cliente);
					// Initalize the saleClientId holder with the existing client (if any)
					let saleClientId = equivalentSaleClient?.id;
					if (!saleClientId) {
						console.log(`[ORG: ${organization.id}] [INFO] [DATA_COLLECTING] [CLIENT] Creating new client for ${OnlineSale.cliente}`);
						// If no existing client is found, we create a new one
						const insertedClientResponse = await tx
							.insert(clients)
							.values({
								nome: OnlineSale.cliente,
								organizacaoId: organization.id,
								telefone: OnlineSale.clientefone || OnlineSale.clientecelular || "",
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

						// Checking for applicable campaigns for new purchase
						const applicableCampaigns = campaignsForFirstPurchase.filter((campaign) =>
							campaign.segmentacoes.some((s) => s.segmentacao === "CLIENTES RECENTES"),
						);
						if (applicableCampaigns.length > 0 && isValidSale) {
							console.log(
								`[ORG: ${organization.id}] ${applicableCampaigns.length} campanhas de primeira compra aplicáveis encontradas para o cliente ${OnlineSale.cliente}.`,
							);
							for (const campaign of applicableCampaigns) {
								// For the applicable campaigns, we will iterate over them and schedule the interactions
								const interactionScheduleDate = getPostponedDateFromReferenceDate({
									date: dayjs().toDate(),
									unit: campaign.execucaoAgendadaMedida,
									value: campaign.execucaoAgendadaValor,
								});
								await tx.insert(interactions).values({
									clienteId: insertedClientId,
									campanhaId: campaign.id,
									organizacaoId: organization.id,
									titulo: `Envio de mensagem automática via campanha ${campaign.titulo}`,
									tipo: "ENVIO-MENSAGEM",
									descricao: "Cliente realizou sua primeira compra.",
									agendamentoDataReferencia: dayjs(interactionScheduleDate).format("YYYY-MM-DD"),
									agendamentoBlocoReferencia: campaign.execucaoAgendadaBloco,
								});
							}
						}

						if (cashbackProgram) {
							// If there is a cashback program, we need to create a new balance for the client
							await tx.insert(cashbackProgramBalances).values({
								clienteId: insertedClientId,
								programaId: cashbackProgram.id,
								organizacaoId: organization.id,
								saldoValorDisponivel: 0,
								saldoValorAcumuladoTotal: 0,
							});
							existingCashbackProgramBalancesMap.set(insertedClientId, {
								clienteId: insertedClientId,
								programaId: cashbackProgram.id,
								saldoValorDisponivel: 0,
								saldoValorAcumuladoTotal: 0,
							});
						}
					}

					// Then, we check for an existing seller with the same name (in this case, our primary key for the integration)
					const equivalentSaleSeller = existingSellersMap.get(OnlineSale.vendedor);
					// Initalize the saleSellerId holder with the existing seller (if any)
					let saleSellerId = equivalentSaleSeller;
					if (!saleSellerId) {
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
							.values({ organizacaoId: organization.id, nome: "NÃO DEFINIDO", identificador: OnlineSale.parceiro || "N/A" })
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

					// Checking for applicable campaigns for new purchase
					if (isNewSale && !isNewClient && isValidSale) {
						const applicableCampaigns = campaignsForNewPurchase.filter((campaign) =>
							campaign.segmentacoes.some((s) => s.segmentacao === existingClientsMap.get(OnlineSale.cliente)?.rfmTitle),
						);
						if (applicableCampaigns.length > 0) {
							console.log(
								`[ORG: ${organization.id}] ${applicableCampaigns.length} campanhas de nova compra aplicáveis encontradas para o cliente ${OnlineSale.cliente}.`,
							);
							for (const campaign of applicableCampaigns) {
								const interactionScheduleDate = getPostponedDateFromReferenceDate({
									date: dayjs().toDate(),
									unit: campaign.execucaoAgendadaMedida,
									value: campaign.execucaoAgendadaValor,
								});
								await tx.insert(interactions).values({
									clienteId: saleClientId,
									campanhaId: campaign.id,
									organizacaoId: organization.id,
									titulo: `Envio de mensagem automática via campanha ${campaign.titulo}`,
									tipo: "ENVIO-MENSAGEM",
									descricao: `Cliente se enquadrou no parâmetro de nova compra ${existingClientsMap.get(OnlineSale.cliente)?.rfmTitle}.`,
									agendamentoDataReferencia: dayjs(interactionScheduleDate).format("YYYY-MM-DD"),
									agendamentoBlocoReferencia: campaign.execucaoAgendadaBloco,
								});
							}
						}
					}
					// Checking for applicable cashback program balance updates
					if (cashbackProgram && isValidSale && isNewSale) {
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
								existingCashbackProgramBalancesMap.set(saleClientId, {
									clienteId: saleClientId,
									programaId: cashbackProgram.id,
									saldoValorDisponivel: newOverallAvailableBalance,
									saldoValorAcumuladoTotal: newOverallAccumulatedBalance,
								});
							}
						}
					}
					if (isValidSale) {
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
		} catch (error) {
			console.error(`[ORG: ${organization.id}] [ERROR] Running into error for the data collecting cron`, error);
			await db.insert(utils).values({
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
