import { apiHandler } from "@/lib/api";
import { reverseSaleCashback } from "@/lib/cashback/reverse-sale-cashback";
import { processConversionAttribution } from "@/lib/conversions/attribution";
import { fetchCardapioWebOrdersWithDetails } from "@/lib/data-connectors/cardapio-web";
import { extractAllCardapioWebData, MappedCardapioWebSale } from "@/lib/data-connectors/cardapio-web/mappers";
import { TCardapioWebConfig } from "@/lib/data-connectors/cardapio-web/types";
import { ImmediateProcessingData } from "@/lib/interactions";
import { linkPartnerToClient } from "@/lib/partners/link-partner-to-client";
import { db, DBTransaction } from "@/services/drizzle";
import {
	cashbackProgramBalances,
	clients,
	partners,
	productAddOnOptions,
	productAddOns,
	products,
	saleItems,
	sales,
} from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { and, eq } from "drizzle-orm";

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

async function ensureCashbackBalanceEntry({
	tx,
	map,
	organizationId,
	clientId,
	programId,
}: {
	tx: DBTransaction;
	map: Map<string, TCashbackBalanceEntry>;
	organizationId: string;
	clientId: string;
	programId: string;
}): Promise<TCashbackBalanceEntry> {
	const fromMap = map.get(clientId);
	if (fromMap) return fromMap;

	const existingBalance = await tx.query.cashbackProgramBalances.findFirst({
		where: (fields, { and, eq }) => and(eq(fields.organizacaoId, organizationId), eq(fields.clienteId, clientId), eq(fields.programaId, programId)),
		columns: {
			clienteId: true,
			programaId: true,
			saldoValorDisponivel: true,
			saldoValorAcumuladoTotal: true,
		},
	});

	if (existingBalance) {
		updateCashbackBalanceInMap(
			map,
			existingBalance.clienteId,
			existingBalance.programaId,
			existingBalance.saldoValorDisponivel,
			existingBalance.saldoValorAcumuladoTotal,
		);
		return {
			clienteId: existingBalance.clienteId,
			programaId: existingBalance.programaId,
			saldoValorDisponivel: existingBalance.saldoValorDisponivel,
			saldoValorAcumuladoTotal: existingBalance.saldoValorAcumuladoTotal,
		};
	}

	await tx.insert(cashbackProgramBalances).values({
		organizacaoId: organizationId,
		clienteId: clientId,
		programaId: programId,
		saldoValorDisponivel: 0,
		saldoValorAcumuladoTotal: 0,
		saldoValorResgatadoTotal: 0,
	});

	updateCashbackBalanceInMap(map, clientId, programId, 0, 0);
	return {
		clienteId: clientId,
		programaId: programId,
		saldoValorDisponivel: 0,
		saldoValorAcumuladoTotal: 0,
	};
}

async function handleCardapioWebImportation(organizationId: string, config: TCardapioWebConfig) {
	// Fetch orders for the last 6 months (start of day until now)
	const startDate = dayjs().subtract(6, "months").startOf("day").toISOString();
	const endDate = dayjs().toISOString();

	console.log(`[ORG: ${organizationId}] [CARDAPIO-WEB] Fetching orders from ${startDate} to ${endDate}`);

	// Fetch all orders with details from CardapioWeb API
	const orderDetails = await fetchCardapioWebOrdersWithDetails(config, startDate, endDate);

	if (orderDetails.length === 0) {
		console.log(`[ORG: ${organizationId}] [CARDAPIO-WEB] No orders found.`);
		return;
	}

	// Log the raw response for debugging
	// await db
	// 	.insert(utils)
	// 	.values({
	// 		organizacaoId: organizationId,
	// 		identificador: "CARDAPIO_WEB_IMPORTATION" as const,
	// 		valor: {
	// 			identificador: "CARDAPIO_WEB_IMPORTATION" as const,
	// 			dados: {
	// 				organizacaoId: organizationId,
	// 				data: dayjs().format("YYYY-MM-DD"),
	// 				conteudo: orderDetails,
	// 			},
	// 		},
	// 	})
	// 	.returning({ id: utils.id });

	// Extract and map all data
	const {
		sales: mappedSales,
		products: mappedProducts,
		partners: mappedPartners,
		productAddOns: mappedAddOns,
		productAddOnOptions: mappedAddOnOptions,
	} = extractAllCardapioWebData(orderDetails);

	console.log(
		`[ORG: ${organizationId}] [CARDAPIO-WEB] Mapped ${mappedSales.length} sales, ${mappedProducts.length} products, ${mappedPartners.length} partners`,
	);
	console.log(`[ORG: ${organizationId}] [CARDAPIO-WEB] Mapped ${mappedAddOns.length} add-ons, ${mappedAddOnOptions.length} add-on options`);

	const cardapioWebSalesIds = mappedSales.map((sale) => sale.idExterno);

	await db.transaction(async (tx) => {
		// Fetch existing data
		const cashbackProgram = await tx.query.cashbackPrograms.findFirst({
			where: (fields, { eq }) => eq(fields.organizacaoId, organizationId),
			columns: {
				id: true,
				acumuloTipo: true,
				acumuloRegraValorMinimo: true,
				acumuloValor: true,
				acumuloValorParceiro: true,
				expiracaoRegraValidadeValor: true,
				acumuloPermitirViaIntegracao: true,
			},
		});

		const existingSales = await tx.query.sales.findMany({
			where: (fields, { and, eq, inArray }) => and(eq(fields.organizacaoId, organizationId), inArray(fields.idExterno, cardapioWebSalesIds)),
			with: { itens: true },
		});

		const existingClients = await tx.query.clients.findMany({
			where: (fields, { eq }) => eq(fields.organizacaoId, organizationId),
			columns: {
				id: true,
				idExterno: true,
				nome: true,
				telefoneBase: true,
				primeiraCompraData: true,
				ultimaCompraData: true,
				analiseRFMTitulo: true,
				metadataTotalCompras: true,
				metadataValorTotalCompras: true,
			},
		});

		const existingProducts = await tx.query.products.findMany({
			where: (fields, { eq }) => eq(fields.organizacaoId, organizationId),
			columns: { id: true, codigo: true },
		});

		const existingPartners = await tx.query.partners.findMany({
			where: (fields, { eq }) => eq(fields.organizacaoId, organizationId),
			columns: { id: true, identificador: true, clienteId: true },
		});

		const existingAddOns = await tx.query.productAddOns.findMany({
			where: (fields, { eq }) => eq(fields.organizacaoId, organizationId),
			columns: { id: true, idExterno: true },
		});

		const existingAddOnOptions = await tx.query.productAddOnOptions.findMany({
			where: (fields, { eq }) => eq(fields.organizacaoId, organizationId),
			columns: { id: true, idExterno: true, produtoAddOnId: true },
		});

		const existingCashbackProgramBalances = cashbackProgram
			? await tx.query.cashbackProgramBalances.findMany({
					where: (fields, { and, eq }) => and(eq(fields.organizacaoId, organizationId), eq(fields.programaId, cashbackProgram.id)),
					columns: { programaId: true, clienteId: true, saldoValorDisponivel: true, saldoValorAcumuladoTotal: true },
				})
			: [];

		// Create maps for quick lookups
		const existingSalesMap = new Map(existingSales.map((sale) => [sale.idExterno, sale]));
		const buildClientLookupData = (client: (typeof existingClients)[number]) => ({
			id: client.id,
			externalId: client.idExterno,
			basePhone: client.telefoneBase,
			firstPurchaseDate: client.primeiraCompraData,
			lastPurchaseDate: client.ultimaCompraData,
			rfmTitle: client.analiseRFMTitulo,
			metadataTotalCompras: client.metadataTotalCompras ?? 0,
			metadataValorTotalCompras: client.metadataValorTotalCompras ?? 0,
		});
		const existingClientsMapByExternalId = new Map(
			existingClients.filter((client) => !!client.idExterno).map((client) => [client.idExterno, buildClientLookupData(client)]),
		);
		const existingClientsMapByBasePhone = new Map(
			existingClients.filter((client) => !!client.telefoneBase).map((client) => [client.telefoneBase, buildClientLookupData(client)]),
		);
		const indexClientInLookupMaps = (client: ReturnType<typeof buildClientLookupData>) => {
			if (client.externalId) {
				existingClientsMapByExternalId.set(client.externalId, client);
			}
			if (client.basePhone) {
				existingClientsMapByBasePhone.set(client.basePhone, client);
			}
		};
		const resolveExistingClient = (sale: MappedCardapioWebSale) => {
			const externalId = sale.cliente?.idExterno;
			if (externalId) {
				const clientByExternalId = existingClientsMapByExternalId.get(externalId);
				if (clientByExternalId) return clientByExternalId;
			}

			const basePhone = sale.cliente?.telefoneBase;
			if (basePhone) {
				const clientByBasePhone = existingClientsMapByBasePhone.get(basePhone);
				if (clientByBasePhone) {
					// When we match by base phone, we also index by external id for upcoming sales in this same run.
					if (externalId && !existingClientsMapByExternalId.has(externalId)) {
						existingClientsMapByExternalId.set(externalId, clientByBasePhone);
					}
					return clientByBasePhone;
				}
			}

			return undefined;
		};
		const existingProductsMap = new Map(existingProducts.map((product) => [product.codigo, product.id]));
		const existingPartnersMap = new Map(existingPartners.map((partner) => [partner.identificador, { id: partner.id, clienteId: partner.clienteId }]));
		const existingAddOnsMap = new Map(existingAddOns.map((addon) => [addon.idExterno, addon.id]));
		const existingAddOnOptionsMap = new Map(
			existingAddOnOptions.map((option) => [option.idExterno, { id: option.id, addOnId: option.produtoAddOnId }]),
		);
		const existingCashbackProgramBalancesMap = new Map(existingCashbackProgramBalances.map((balance) => [balance.clienteId, balance]));

		// Sync Products
		for (const product of mappedProducts) {
			if (!existingProductsMap.has(product.codigo)) {
				const [inserted] = await tx
					.insert(products)
					.values({
						organizacaoId: organizationId,
						codigo: product.codigo,
						descricao: product.descricao,
						unidade: product.unidade,
						grupo: product.grupo,
						ncm: product.ncm,
						tipo: product.tipo,
					})
					.returning({ id: products.id });
				existingProductsMap.set(product.codigo, inserted.id);
			}
		}

		// Sync Partners
		for (const partner of mappedPartners) {
			if (!existingPartnersMap.has(partner.identificador)) {
				const linkage = await linkPartnerToClient({
					tx,
					orgId: organizationId,
					partner: {
						nome: partner.nome,
					},
					createClientIfNotFound: true,
				});

				const [inserted] = await tx
					.insert(partners)
					.values({
						organizacaoId: organizationId,
						identificador: partner.identificador,
						codigoAfiliacao: partner.identificador,
						nome: partner.nome,
						clienteId: linkage.clientId,
					})
					.returning({ id: partners.id });
				existingPartnersMap.set(partner.identificador, { id: inserted.id, clienteId: linkage.clientId });
			}
		}

		// Sync ProductAddOns
		for (const addon of mappedAddOns) {
			if (!existingAddOnsMap.has(addon.idExterno)) {
				const [inserted] = await tx
					.insert(productAddOns)
					.values({
						organizacaoId: organizationId,
						idExterno: addon.idExterno,
						nome: addon.nome,
						minOpcoes: addon.minOpcoes,
						maxOpcoes: addon.maxOpcoes,
					})
					.returning({ id: productAddOns.id });
				existingAddOnsMap.set(addon.idExterno, inserted.id);
			}
		}

		// Sync ProductAddOnOptions
		for (const option of mappedAddOnOptions) {
			if (!existingAddOnOptionsMap.has(option.idExterno)) {
				const addOnId = existingAddOnsMap.get(option.addOnIdExterno);
				if (addOnId) {
					const [inserted] = await tx
						.insert(productAddOnOptions)
						.values({
							organizacaoId: organizationId,
							produtoAddOnId: addOnId,
							idExterno: option.idExterno,
							nome: option.nome,
							codigo: option.codigo,
							precoDelta: option.precoDelta,
							maxQtdePorItem: option.maxQtdePorItem,
						})
						.returning({ id: productAddOnOptions.id });
					existingAddOnOptionsMap.set(option.idExterno, { id: inserted.id, addOnId });
				}
			}
		}

		let createdSalesCount = 0;
		let updatedSalesCount = 0;

		// Process each sale
		for (const cardapioWebSale of mappedSales) {
			let isNewClient = false;
			let isNewSale = false;

			const saleDate = cardapioWebSale.dataVenda;
			const isValidSale = cardapioWebSale.isValidSale;
			const clientName = cardapioWebSale.cliente?.nome;
			const isValidClient = !!clientName && clientName !== "CLIENTE CARDAPIO WEB";

			// Sync Client
			const equivalentSaleClient = cardapioWebSale.cliente ? resolveExistingClient(cardapioWebSale) : undefined;
			let saleClientId = equivalentSaleClient?.id;

			if (!saleClientId && isValidClient && cardapioWebSale.cliente) {
				console.log(`[ORG: ${organizationId}] [CARDAPIO-WEB] Creating new client: ${clientName}`);
				const [insertedClient] = await tx
					.insert(clients)
					.values({
						idExterno: cardapioWebSale.cliente.idExterno,
						nome: clientName,
						organizacaoId: organizationId,
						telefone: cardapioWebSale.cliente.telefone,
						telefoneBase: cardapioWebSale.cliente.telefoneBase,
						primeiraCompraData: isValidSale ? saleDate : null,
						ultimaCompraData: isValidSale ? saleDate : null,
						analiseRFMTitulo: "CLIENTES RECENTES",
					})
					.returning({ id: clients.id });

				saleClientId = insertedClient.id;
				isNewClient = true;
				indexClientInLookupMaps({
					id: insertedClient.id,
					externalId: cardapioWebSale.cliente.idExterno,
					basePhone: cardapioWebSale.cliente.telefoneBase,
					firstPurchaseDate: isValidSale ? saleDate : null,
					lastPurchaseDate: isValidSale ? saleDate : null,
					rfmTitle: "CLIENTES RECENTES",
					metadataTotalCompras: 0,
					metadataValorTotalCompras: 0,
				});

				if (cashbackProgram) {
					await tx.insert(cashbackProgramBalances).values({
						clienteId: insertedClient.id,
						programaId: cashbackProgram.id,
						organizacaoId: organizationId,
						saldoValorDisponivel: 0,
						saldoValorAcumuladoTotal: 0,
					});
					updateCashbackBalanceInMap(existingCashbackProgramBalancesMap, insertedClient.id, cashbackProgram.id, 0, 0);
				}
			}

			// Sync Partner
			const matchedPartner = cardapioWebSale.parceiro ? existingPartnersMap.get(cardapioWebSale.parceiro.identificador) : null;
			const partnerId = matchedPartner?.id ?? null;
			const partnerClientId = matchedPartner?.clienteId ?? null;

			let saleId: string | null = null;
			const existingSale = existingSalesMap.get(cardapioWebSale.idExterno);

			if (!existingSale) {
				isNewSale = true;
				console.log(
					`[ORG: ${organizationId}] [CARDAPIO-WEB] Creating new sale ${cardapioWebSale.idExterno} with ${cardapioWebSale.itens.length} items...`,
				);

				const [insertedSale] = await tx
					.insert(sales)
					.values({
						organizacaoId: organizationId,
						idExterno: cardapioWebSale.idExterno,
						clienteId: saleClientId,
						valorTotal: cardapioWebSale.valorTotal,
						custoTotal: cardapioWebSale.custoTotal,
						vendedorNome: "CARDAPIO WEB",
						vendedorId: null,
						parceiro: cardapioWebSale.parceiro?.nome || "N/A",
						parceiroId: partnerId,
						chave: "N/A",
						documento: cardapioWebSale.documento || "N/A",
						modelo: "CARDAPIO-WEB",
						movimento: cardapioWebSale.tipo,
						natureza: cardapioWebSale.natureza,
						serie: "N/A",
						situacao: cardapioWebSale.natureza === "SN01" ? "FECHADO" : cardapioWebSale.natureza,
						entregaModalidade: cardapioWebSale.entregaModalidade as (typeof sales.$inferInsert)["entregaModalidade"],
						tipo: cardapioWebSale.tipo,
						canal: cardapioWebSale.salesChannel,
						dataVenda: saleDate,
					})
					.returning({ id: sales.id });

				saleId = insertedSale.id;

				// Insert sale items
				for (const item of cardapioWebSale.itens) {
					const productId = existingProductsMap.get(item.produtoIdExterno);
					if (productId) {
						await tx.insert(saleItems).values({
							organizacaoId: organizationId,
							vendaId: saleId,
							clienteId: saleClientId,
							produtoId: productId,
							quantidade: item.quantidade,
							valorVendaUnitario: item.valorVendaUnitario,
							valorCustoUnitario: 0,
							valorVendaTotalBruto: item.valorVendaTotalBruto,
							valorTotalDesconto: item.valorTotalDesconto,
							valorVendaTotalLiquido: item.valorVendaTotalLiquido,
							valorCustoTotal: 0,
							metadados: {
								observacao: item.observacao,
								options: item.options,
							},
						});
					}
				}

				// Process conversion attribution for new valid sales
				if (saleId && isValidSale && saleClientId) {
					await processConversionAttribution(tx, {
						vendaId: saleId,
						clienteId: saleClientId,
						organizacaoId: organizationId,
						valorVenda: cardapioWebSale.valorTotal,
						dataVenda: saleDate,
					});
				}

				createdSalesCount++;
			} else {
				isNewSale = false;
				console.log(`[ORG: ${organizationId}] [CARDAPIO-WEB] Updating sale ${cardapioWebSale.idExterno}...`);

				// Check if sale was canceled
				const wasPreviouslyValid = existingSale.natureza === "SN01" && existingSale.valorTotal > 0;
				const isNowCanceled = cardapioWebSale.isCanceled || cardapioWebSale.valorTotal === 0;

				if (wasPreviouslyValid && isNowCanceled && saleClientId) {
					console.log(`[ORG: ${organizationId}] [CARDAPIO-WEB] Sale ${cardapioWebSale.idExterno} was canceled. Reversing cashback...`);
					await reverseSaleCashback({
						tx,
						saleId: existingSale.id,
						clientId: saleClientId,
						organizationId: organizationId,
						reason: "VENDA_CANCELADA",
					});
				}

				await tx
					.update(sales)
					.set({
						valorTotal: cardapioWebSale.valorTotal,
						natureza: cardapioWebSale.natureza,
						situacao: cardapioWebSale.natureza === "SN01" ? "FECHADO" : cardapioWebSale.natureza,
						canal: cardapioWebSale.salesChannel,
					})
					.where(eq(sales.id, existingSale.id));

				saleId = existingSale.id;
				updatedSalesCount++;
			}

			// Update client's metadata and last purchase date
			if (isValidSale && saleClientId && isNewSale) {
				const updatedClientData = resolveExistingClient(cardapioWebSale);
				const finalTotalPurchaseCount = (updatedClientData?.metadataTotalCompras ?? 0) + 1;
				const finalTotalPurchaseValue = (updatedClientData?.metadataValorTotalCompras ?? 0) + cardapioWebSale.valorTotal;
				await tx
					.update(clients)
					.set({
						ultimaCompraData: saleDate,
						ultimaCompraId: saleId,
						metadataTotalCompras: finalTotalPurchaseCount,
						metadataValorTotalCompras: finalTotalPurchaseValue,
					})
					.where(and(eq(clients.id, saleClientId), eq(clients.organizacaoId, organizationId)));

				if (cardapioWebSale.cliente && updatedClientData) {
					indexClientInLookupMaps({
						...updatedClientData,
						metadataTotalCompras: finalTotalPurchaseCount,
						metadataValorTotalCompras: finalTotalPurchaseValue,
					});
				}
			}
		}

		console.log(`[ORG: ${organizationId}] [CARDAPIO-WEB] Created ${createdSalesCount} sales, updated ${updatedSalesCount} sales.`);
	});
}

export default apiHandler({
	GET: async (req, res) => {
		const ORG_ID = "c0af84e7-4882-4aac-8d6e-f28ee3541d0b";
		const config = await db.query.organizations.findFirst({
			where: (fields, { eq }) => eq(fields.id, ORG_ID),
			columns: {
				integracaoConfiguracao: true,
			},
		});
		if (!config) {
			return res.status(404).json({ error: "Configuração não encontrada." });
		}

		// await handleCardapioWebImportation(ORG_ID, config.integracaoConfiguracao as TCardapioWebConfig);

		return res.status(200).json({ message: "Importação concluída." });
	},
});
