import "@/utils/scripts/load-next-env";
import { reverseSaleCashback } from "@/lib/cashback/reverse-sale-cashback";
import { processConversionAttribution } from "@/lib/conversions/attribution";
import { fetchCardapioWebOrdersWithDetails } from "@/lib/data-connectors/cardapio-web";
import { extractAllCardapioWebData, MappedCardapioWebSale } from "@/lib/data-connectors/cardapio-web/mappers";
import { TCardapioWebConfig } from "@/lib/data-connectors/cardapio-web/types";
import { linkPartnerToClient } from "@/lib/partners/link-partner-to-client";
import { connection, db } from "@/services/drizzle";
import {
	cashbackProgramBalances,
	clients,
	partners,
	productAddOnOptions,
	productAddOns,
	products,
	saleItems,
	sales,
	sellers,
	utils,
} from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { and, eq } from "drizzle-orm";
import { formatPhoneAsBase, formatToCPForCNPJ, formatToPhone } from "@/lib/formatting";
import { OnlineSoftwareSaleImportationSchema } from "@/schemas/online-importation.schema";
import z from "zod";
import axios from "axios";

const SCRIPT_NAME = "SYNC-ORG-SALES-HISTORY";
const DEFAULT_ORGANIZATION_ID = "12204136-080b-4e4d-92bb-668c48bf0cb7";
const DEFAULT_LOOKBACK_MONTHS = 3;
const SUPPORTING_DATA_BATCH_SIZE = 250;
const SALES_BATCH_SIZE = 100;

type TCashbackBalanceEntry = {
	clienteId: string;
	programaId: string;
	saldoValorDisponivel: number;
	saldoValorAcumuladoTotal: number;
};

type TScriptOptions = {
	organizationId: string;
	startDate: string;
	endDate: string;
	dryRun: boolean;
};

type TClientLookupData = {
	id: string;
	externalId: string | null;
	basePhone: string | null;
	firstPurchaseDate: Date | null;
	lastPurchaseDate: Date | null;
	rfmTitle: string | null;
	metadataTotalCompras: number;
	metadataValorTotalCompras: number;
};

type TExistingSaleLookupData = {
	id: string;
	idExterno: string;
	natureza: string;
	valorTotal: number;
};

type TPartnerLookupData = {
	id: string;
	clienteId: string | null;
};

type TAddOnOptionLookupData = {
	id: string;
	addOnId: string;
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

function serializeError(error: unknown) {
	if (error instanceof z.ZodError) {
		return {
			type: "ZodError",
			message: error.message,
			issues: error.issues.map((issue) => ({
				path: issue.path.join("."),
				message: issue.message,
				code: issue.code,
				expected: "expected" in issue ? issue.expected : undefined,
				received: "received" in issue ? issue.received : undefined,
			})),
		};
	}
	if (axios.isAxiosError(error)) {
		return {
			type: "AxiosError",
			message: error.message,
			code: error.code,
			status: error.response?.status,
			statusText: error.response?.statusText,
			url: error.config?.url,
			method: error.config?.method,
			requestData: error.config?.data,
			responseData: error.response?.data,
		};
	}
	if (error instanceof Error) {
		return {
			type: error.name,
			message: error.message,
			stack: error.stack,
			cause: error.cause,
		};
	}
	return {
		type: typeof error,
		value: error,
	};
}

function chunkArray<T>(array: T[], size: number): T[][] {
	if (size <= 0) {
		throw new Error("Batch size must be greater than zero.");
	}

	const chunks: T[][] = [];
	for (let index = 0; index < array.length; index += size) {
		chunks.push(array.slice(index, index + size));
	}
	return chunks;
}

function readArgumentValue(name: string): string | undefined {
	const prefix = `--${name}=`;
	return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function hasFlag(name: string): boolean {
	return process.argv.includes(`--${name}`);
}

function getUsageText() {
	return [
		`Uso: npm run sync:org-sales-history -- --orgId=<uuid> [--startDate=<iso>] [--endDate=<iso>] [--lookbackMonths=<n>] [--dryRun]`,
		"",
		"Exemplos:",
		`  npm run sync:org-sales-history -- --orgId=${DEFAULT_ORGANIZATION_ID}`,
		`  npm run sync:org-sales-history -- --orgId=${DEFAULT_ORGANIZATION_ID} --lookbackMonths=12`,
		`  npm run sync:org-sales-history -- --orgId=${DEFAULT_ORGANIZATION_ID} --startDate=2025-01-01T00:00:00.000Z --endDate=2025-12-31T23:59:59.999Z`,
		`  npm run sync:org-sales-history -- --orgId=${DEFAULT_ORGANIZATION_ID} --dryRun`,
	].join("\n");
}

function readScriptOptions(): TScriptOptions | null {
	if (hasFlag("help") || process.argv.includes("-h")) {
		return null;
	}

	const organizationId = readArgumentValue("orgId") ?? readArgumentValue("organizationId") ?? DEFAULT_ORGANIZATION_ID;
	const startDateArgument = readArgumentValue("startDate");
	const endDateArgument = readArgumentValue("endDate");
	const lookbackMonthsArgument = readArgumentValue("lookbackMonths");
	const lookbackMonths = lookbackMonthsArgument ? Number.parseInt(lookbackMonthsArgument, 10) : DEFAULT_LOOKBACK_MONTHS;

	if (!Number.isInteger(lookbackMonths) || lookbackMonths <= 0) {
		throw new Error("O argumento --lookbackMonths deve ser um inteiro positivo.");
	}

	const endDate = endDateArgument ?? dayjs().toISOString();
	const startDate = startDateArgument ?? dayjs(endDate).subtract(lookbackMonths, "months").startOf("day").toISOString();

	if (!dayjs(startDate).isValid()) {
		throw new Error("O argumento --startDate deve ser uma data ISO válida.");
	}

	if (!dayjs(endDate).isValid()) {
		throw new Error("O argumento --endDate deve ser uma data ISO válida.");
	}

	return {
		organizationId,
		startDate,
		endDate,
		dryRun: hasFlag("dryRun"),
	};
}

async function handleCardapioWebImportation({
	organizationId,
	config,
	startDate,
	endDate,
	dryRun,
}: {
	organizationId: string;
	config: TCardapioWebConfig;
	startDate: string;
	endDate: string;
	dryRun: boolean;
}) {
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
		sales: rawMappedSales,
		products: mappedProducts,
		partners: mappedPartners,
		productAddOns: mappedAddOns,
		productAddOnOptions: mappedAddOnOptions,
	} = extractAllCardapioWebData(orderDetails);
	const mappedSales = [...rawMappedSales].sort((saleA, saleB) => dayjs(saleA.dataVenda).valueOf() - dayjs(saleB.dataVenda).valueOf());

	console.log(
		`[ORG: ${organizationId}] [CARDAPIO-WEB] Mapped ${mappedSales.length} sales, ${mappedProducts.length} products, ${mappedPartners.length} partners`,
	);
	console.log(`[ORG: ${organizationId}] [CARDAPIO-WEB] Mapped ${mappedAddOns.length} add-ons, ${mappedAddOnOptions.length} add-on options`);

	if (dryRun) {
		console.log(`[ORG: ${organizationId}] [CARDAPIO-WEB] Dry run enabled. No database changes will be made.`);
		return;
	}

	const cardapioWebSalesIds = mappedSales.map((sale) => sale.idExterno);

	const cashbackProgram = await db.query.cashbackPrograms.findFirst({
		where: (fields, { eq: equals }) => equals(fields.organizacaoId, organizationId),
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

	const existingSales = cardapioWebSalesIds.length
		? await db.query.sales.findMany({
				where: (fields, { and: combine, eq: equals, inArray }) =>
					combine(equals(fields.organizacaoId, organizationId), inArray(fields.idExterno, cardapioWebSalesIds)),
				columns: {
					id: true,
					idExterno: true,
					natureza: true,
					valorTotal: true,
				},
			})
		: [];

	const existingClients = await db.query.clients.findMany({
		where: (fields, { eq: equals }) => equals(fields.organizacaoId, organizationId),
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

	const existingProducts = await db.query.products.findMany({
		where: (fields, { eq: equals }) => equals(fields.organizacaoId, organizationId),
		columns: { id: true, codigo: true },
	});

	const existingPartners = await db.query.partners.findMany({
		where: (fields, { eq: equals }) => equals(fields.organizacaoId, organizationId),
		columns: { id: true, identificador: true, clienteId: true },
	});

	const existingAddOns = await db.query.productAddOns.findMany({
		where: (fields, { eq: equals }) => equals(fields.organizacaoId, organizationId),
		columns: { id: true, idExterno: true },
	});

	const existingAddOnOptions = await db.query.productAddOnOptions.findMany({
		where: (fields, { eq: equals }) => equals(fields.organizacaoId, organizationId),
		columns: { id: true, idExterno: true, produtoAddOnId: true },
	});

	const existingCashbackProgramBalances = cashbackProgram
		? await db.query.cashbackProgramBalances.findMany({
				where: (fields, { and: combine, eq: equals }) =>
					combine(equals(fields.organizacaoId, organizationId), equals(fields.programaId, cashbackProgram.id)),
				columns: {
					programaId: true,
					clienteId: true,
					saldoValorDisponivel: true,
					saldoValorAcumuladoTotal: true,
				},
			})
		: [];

	const buildClientLookupData = (client: (typeof existingClients)[number]): TClientLookupData => ({
		id: client.id,
		externalId: client.idExterno,
		basePhone: client.telefoneBase,
		firstPurchaseDate: client.primeiraCompraData,
		lastPurchaseDate: client.ultimaCompraData,
		rfmTitle: client.analiseRFMTitulo,
		metadataTotalCompras: client.metadataTotalCompras ?? 0,
		metadataValorTotalCompras: client.metadataValorTotalCompras ?? 0,
	});

	let existingSalesMap = new Map<string, TExistingSaleLookupData>(existingSales.map((sale) => [sale.idExterno, sale]));
	let existingClientsMapByExternalId = new Map<string, TClientLookupData>(
		existingClients.filter((client) => !!client.idExterno).map((client) => [client.idExterno as string, buildClientLookupData(client)]),
	);
	let existingClientsMapByBasePhone = new Map<string, TClientLookupData>(
		existingClients.filter((client) => !!client.telefoneBase).map((client) => [client.telefoneBase as string, buildClientLookupData(client)]),
	);
	let existingProductsMap = new Map<string, string>(existingProducts.map((product) => [product.codigo, product.id]));
	let existingPartnersMap = new Map<string, TPartnerLookupData>(
		existingPartners.map((partner) => [partner.identificador, { id: partner.id, clienteId: partner.clienteId }]),
	);
	let existingAddOnsMap = new Map<string, string>(existingAddOns.map((addon) => [addon.idExterno, addon.id]));
	let existingAddOnOptionsMap = new Map<string, TAddOnOptionLookupData>(
		existingAddOnOptions.map((option) => [option.idExterno, { id: option.id, addOnId: option.produtoAddOnId }]),
	);
	let existingCashbackProgramBalancesMap = new Map<string, TCashbackBalanceEntry>(
		existingCashbackProgramBalances.map((balance) => [balance.clienteId, balance]),
	);

	const indexClientInLookupMaps = ({
		client,
		clientsMapByExternalId,
		clientsMapByBasePhone,
	}: {
		client: TClientLookupData;
		clientsMapByExternalId: Map<string, TClientLookupData>;
		clientsMapByBasePhone: Map<string, TClientLookupData>;
	}) => {
		if (client.externalId) {
			clientsMapByExternalId.set(client.externalId, client);
		}
		if (client.basePhone) {
			clientsMapByBasePhone.set(client.basePhone, client);
		}
	};

	const resolveExistingClient = ({
		sale,
		clientsMapByExternalId,
		clientsMapByBasePhone,
	}: {
		sale: MappedCardapioWebSale;
		clientsMapByExternalId: Map<string, TClientLookupData>;
		clientsMapByBasePhone: Map<string, TClientLookupData>;
	}) => {
		const externalId = sale.cliente?.idExterno;
		if (externalId) {
			const clientByExternalId = clientsMapByExternalId.get(externalId);
			if (clientByExternalId) return clientByExternalId;
		}

		const basePhone = sale.cliente?.telefoneBase;
		if (basePhone) {
			const clientByBasePhone = clientsMapByBasePhone.get(basePhone);
			if (clientByBasePhone) {
				if (externalId && !clientsMapByExternalId.has(externalId)) {
					clientsMapByExternalId.set(externalId, clientByBasePhone);
				}
				return clientByBasePhone;
			}
		}

		return undefined;
	};

	const productBatches = chunkArray(mappedProducts, SUPPORTING_DATA_BATCH_SIZE);
	for (const [batchIndex, productsBatch] of productBatches.entries()) {
		const batchProductsMap = new Map(existingProductsMap);
		let insertedProductsCount = 0;

		console.log(
			`[ORG: ${organizationId}] [CARDAPIO-WEB] Syncing products batch ${batchIndex + 1}/${productBatches.length} (${productsBatch.length} items)...`,
		);

		await db.transaction(async (tx) => {
			for (const product of productsBatch) {
				if (!batchProductsMap.has(product.codigo)) {
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
					batchProductsMap.set(product.codigo, inserted.id);
					insertedProductsCount++;
				}
			}
		});

		existingProductsMap = batchProductsMap;
		console.log(
			`[ORG: ${organizationId}] [CARDAPIO-WEB] Products batch ${batchIndex + 1}/${productBatches.length} committed with ${insertedProductsCount} new products.`,
		);
	}

	const partnerBatches = chunkArray(mappedPartners, SUPPORTING_DATA_BATCH_SIZE);
	for (const [batchIndex, partnersBatch] of partnerBatches.entries()) {
		const batchPartnersMap = new Map(existingPartnersMap);
		let insertedPartnersCount = 0;

		console.log(
			`[ORG: ${organizationId}] [CARDAPIO-WEB] Syncing partners batch ${batchIndex + 1}/${partnerBatches.length} (${partnersBatch.length} items)...`,
		);

		await db.transaction(async (tx) => {
			for (const partner of partnersBatch) {
				if (!batchPartnersMap.has(partner.identificador)) {
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
					batchPartnersMap.set(partner.identificador, { id: inserted.id, clienteId: linkage.clientId });
					insertedPartnersCount++;
				}
			}
		});

		existingPartnersMap = batchPartnersMap;
		console.log(
			`[ORG: ${organizationId}] [CARDAPIO-WEB] Partners batch ${batchIndex + 1}/${partnerBatches.length} committed with ${insertedPartnersCount} new partners.`,
		);
	}

	const addOnBatches = chunkArray(mappedAddOns, SUPPORTING_DATA_BATCH_SIZE);
	for (const [batchIndex, addOnsBatch] of addOnBatches.entries()) {
		const batchAddOnsMap = new Map(existingAddOnsMap);
		let insertedAddOnsCount = 0;

		console.log(
			`[ORG: ${organizationId}] [CARDAPIO-WEB] Syncing add-ons batch ${batchIndex + 1}/${addOnBatches.length} (${addOnsBatch.length} items)...`,
		);

		await db.transaction(async (tx) => {
			for (const addon of addOnsBatch) {
				if (!batchAddOnsMap.has(addon.idExterno)) {
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
					batchAddOnsMap.set(addon.idExterno, inserted.id);
					insertedAddOnsCount++;
				}
			}
		});

		existingAddOnsMap = batchAddOnsMap;
		console.log(
			`[ORG: ${organizationId}] [CARDAPIO-WEB] Add-ons batch ${batchIndex + 1}/${addOnBatches.length} committed with ${insertedAddOnsCount} new add-ons.`,
		);
	}

	const addOnOptionBatches = chunkArray(mappedAddOnOptions, SUPPORTING_DATA_BATCH_SIZE);
	for (const [batchIndex, addOnOptionsBatch] of addOnOptionBatches.entries()) {
		const batchAddOnOptionsMap = new Map(existingAddOnOptionsMap);
		const batchAddOnsMap = new Map(existingAddOnsMap);
		let insertedAddOnOptionsCount = 0;

		console.log(
			`[ORG: ${organizationId}] [CARDAPIO-WEB] Syncing add-on options batch ${batchIndex + 1}/${addOnOptionBatches.length} (${addOnOptionsBatch.length} items)...`,
		);

		await db.transaction(async (tx) => {
			for (const option of addOnOptionsBatch) {
				if (!batchAddOnOptionsMap.has(option.idExterno)) {
					const addOnId = batchAddOnsMap.get(option.addOnIdExterno);
					if (!addOnId) continue;

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
					batchAddOnOptionsMap.set(option.idExterno, { id: inserted.id, addOnId });
					insertedAddOnOptionsCount++;
				}
			}
		});

		existingAddOnOptionsMap = batchAddOnOptionsMap;
		console.log(
			`[ORG: ${organizationId}] [CARDAPIO-WEB] Add-on options batch ${batchIndex + 1}/${addOnOptionBatches.length} committed with ${insertedAddOnOptionsCount} new options.`,
		);
	}

	let createdSalesCount = 0;
	let updatedSalesCount = 0;
	const salesBatches = chunkArray(mappedSales, SALES_BATCH_SIZE);

	for (const [batchIndex, salesBatch] of salesBatches.entries()) {
		const batchExistingSalesMap = new Map(existingSalesMap);
		const batchClientsMapByExternalId = new Map(existingClientsMapByExternalId);
		const batchClientsMapByBasePhone = new Map(existingClientsMapByBasePhone);
		const batchCashbackProgramBalancesMap = new Map(existingCashbackProgramBalancesMap);
		let batchCreatedSalesCount = 0;
		let batchUpdatedSalesCount = 0;
		const batchStartSaleIndex = batchIndex * SALES_BATCH_SIZE;

		console.log(
			`[ORG: ${organizationId}] [CARDAPIO-WEB] Processing sales batch ${batchIndex + 1}/${salesBatches.length} (${salesBatch.length} sales)...`,
		);

		await db.transaction(async (tx) => {
			for (const [saleOffset, cardapioWebSale] of salesBatch.entries()) {
				console.log(`[ORG: ${organizationId}] [CARDAPIO-WEB] Processing sale ${batchStartSaleIndex + saleOffset + 1} of ${mappedSales.length}...`);
				let isNewSale = false;

				const saleDate = cardapioWebSale.dataVenda;
				const isValidSale = cardapioWebSale.isValidSale;
				const clientName = cardapioWebSale.cliente?.nome;
				const isValidClient = !!clientName && clientName !== "CLIENTE CARDAPIO WEB";

				const equivalentSaleClient = cardapioWebSale.cliente
					? resolveExistingClient({
							sale: cardapioWebSale,
							clientsMapByExternalId: batchClientsMapByExternalId,
							clientsMapByBasePhone: batchClientsMapByBasePhone,
						})
					: undefined;
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
					indexClientInLookupMaps({
						client: {
							id: insertedClient.id,
							externalId: cardapioWebSale.cliente.idExterno,
							basePhone: cardapioWebSale.cliente.telefoneBase,
							firstPurchaseDate: isValidSale ? saleDate : null,
							lastPurchaseDate: isValidSale ? saleDate : null,
							rfmTitle: "CLIENTES RECENTES",
							metadataTotalCompras: 0,
							metadataValorTotalCompras: 0,
						},
						clientsMapByExternalId: batchClientsMapByExternalId,
						clientsMapByBasePhone: batchClientsMapByBasePhone,
					});

					if (cashbackProgram) {
						await tx.insert(cashbackProgramBalances).values({
							clienteId: insertedClient.id,
							programaId: cashbackProgram.id,
							organizacaoId: organizationId,
							saldoValorDisponivel: 0,
							saldoValorAcumuladoTotal: 0,
						});
						updateCashbackBalanceInMap(batchCashbackProgramBalancesMap, insertedClient.id, cashbackProgram.id, 0, 0);
					}
				}

				const matchedPartner = cardapioWebSale.parceiro ? existingPartnersMap.get(cardapioWebSale.parceiro.identificador) : null;
				const partnerId = matchedPartner?.id ?? null;

				let saleId: string | null = null;
				const existingSale = batchExistingSalesMap.get(cardapioWebSale.idExterno);

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
					batchExistingSalesMap.set(cardapioWebSale.idExterno, {
						id: insertedSale.id,
						idExterno: cardapioWebSale.idExterno,
						natureza: cardapioWebSale.natureza,
						valorTotal: cardapioWebSale.valorTotal,
					});

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

					if (saleId && isValidSale && saleClientId) {
						await processConversionAttribution(tx, {
							vendaId: saleId,
							clienteId: saleClientId,
							organizacaoId: organizationId,
							valorVenda: cardapioWebSale.valorTotal,
							dataVenda: saleDate,
						});
					}

					batchCreatedSalesCount++;
				} else {
					console.log(`[ORG: ${organizationId}] [CARDAPIO-WEB] Updating sale ${cardapioWebSale.idExterno}...`);

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
					batchExistingSalesMap.set(cardapioWebSale.idExterno, {
						...existingSale,
						natureza: cardapioWebSale.natureza,
						valorTotal: cardapioWebSale.valorTotal,
					});
					batchUpdatedSalesCount++;
				}

				if (isValidSale && saleClientId && isNewSale) {
					const updatedClientData = resolveExistingClient({
						sale: cardapioWebSale,
						clientsMapByExternalId: batchClientsMapByExternalId,
						clientsMapByBasePhone: batchClientsMapByBasePhone,
					});
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
							client: {
								...updatedClientData,
								metadataTotalCompras: finalTotalPurchaseCount,
								metadataValorTotalCompras: finalTotalPurchaseValue,
							},
							clientsMapByExternalId: batchClientsMapByExternalId,
							clientsMapByBasePhone: batchClientsMapByBasePhone,
						});
					}
				}
			}
		});

		existingSalesMap = batchExistingSalesMap;
		existingClientsMapByExternalId = batchClientsMapByExternalId;
		existingClientsMapByBasePhone = batchClientsMapByBasePhone;
		existingCashbackProgramBalancesMap = batchCashbackProgramBalancesMap;
		createdSalesCount += batchCreatedSalesCount;
		updatedSalesCount += batchUpdatedSalesCount;

		console.log(
			`[ORG: ${organizationId}] [CARDAPIO-WEB] Sales batch ${batchIndex + 1}/${salesBatches.length} committed. Created ${batchCreatedSalesCount}, updated ${batchUpdatedSalesCount}.`,
		);
	}

	console.log(`[ORG: ${organizationId}] [CARDAPIO-WEB] Created ${createdSalesCount} sales, updated ${updatedSalesCount} sales.`);
}

type TOnlineSoftwareImportationOptions = {
	organizationId: string;
	config: { tipo: "ONLINE-SOFTWARE"; token: string; serverUrl: string };
	startDate: string;
	endDate: string;
	dryRun: boolean;
};
async function handleOnlineSoftwareImportation({ organizationId, config, startDate, endDate, dryRun }: TOnlineSoftwareImportationOptions) {
	try {
		const parsedStartDate = dayjs(startDate);
		const parsedEndDate = dayjs(endDate);
		if (parsedStartDate.isAfter(parsedEndDate)) {
			throw new Error("O período informado para importação da Online Software é inválido.");
		}

		const weekPeriods: Array<{ startDate: string; endDate: string }> = [];
		let currentPeriodStart = parsedStartDate;
		while (currentPeriodStart.isBefore(parsedEndDate) || currentPeriodStart.isSame(parsedEndDate)) {
			const candidatePeriodEnd = currentPeriodStart.add(6, "day").endOf("day");
			const currentPeriodEnd = candidatePeriodEnd.isAfter(parsedEndDate) ? parsedEndDate : candidatePeriodEnd;
			weekPeriods.push({
				startDate: currentPeriodStart.toISOString(),
				endDate: currentPeriodEnd.toISOString(),
			});
			currentPeriodStart = currentPeriodEnd.add(1, "millisecond");
		}

		console.log(
			`[ORG: ${organizationId}] [INFO] [DATA_COLLECTING] [ONLINE-SOFTWARE] Starting OnlineSoftware integration in ${weekPeriods.length} weekly period(s)`,
		);

		for (const weekPeriod of weekPeriods) {
			console.log(
				`[ORG: ${organizationId}] [INFO] [DATA_COLLECTING] [ONLINE-SOFTWARE] Processing period from ${weekPeriod.startDate} to ${weekPeriod.endDate}`,
			);
			const startDateFixed = dayjs(weekPeriod.startDate).format("DD/MM/YYYY").replaceAll("/", "");
			const endDateFixed = dayjs(weekPeriod.endDate).format("DD/MM/YYYY").replaceAll("/", "");
			// Fetching data from the online software API
			const onlineSoftwareConfig = config as { tipo: "ONLINE-SOFTWARE"; token: string; serverUrl: string };
			const { data: onlineAPIResponse } = await axios.post(onlineSoftwareConfig.serverUrl, {
				token: onlineSoftwareConfig.token,
				rotina: "listarVendas001",
				dtinicio: startDateFixed,
				dtfim: endDateFixed,
			});
			console.log("ONLINE API RECEIVED RESULT", onlineAPIResponse.resultado[0]);
			const OnlineSoftwareSales = z
				.array(OnlineSoftwareSaleImportationSchema, {
					required_error: "Payload da Online não é uma lista.",
					invalid_type_error: "Tipo não permitido para o payload.",
				})
				.parse(onlineAPIResponse.resultado);
			console.log("ONLINE SALES PARSED", OnlineSoftwareSales.length);
			console.log(`[ORG: ${organizationId}] ${OnlineSoftwareSales.length} vendas encontradas.`);
			if (OnlineSoftwareSales.length === 0) {
				continue;
			}

			const OnlineSoftwareSalesIds = OnlineSoftwareSales.map((sale) => sale.id);

			await db.transaction(async (tx) => {
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
					where: (fields, { and, eq, inArray }) => and(eq(fields.organizacaoId, organizationId), inArray(fields.idExterno, OnlineSoftwareSalesIds)),
					with: {
						itens: true,
					},
				});

				const existingClients = await tx.query.clients.findMany({
					where: (fields, { eq }) => eq(fields.organizacaoId, organizationId),
					columns: {
						id: true,
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
					columns: {
						id: true,
						codigo: true,
					},
				});
				const existingSellers = await tx.query.sellers.findMany({
					where: (fields, { eq }) => eq(fields.organizacaoId, organizationId),
					columns: {
						id: true,
						nome: true,
					},
				});
				const existingPartners = await tx.query.partners.findMany({
					where: (fields, { eq }) => eq(fields.organizacaoId, organizationId),
					columns: {
						id: true,
						identificador: true,
						clienteId: true,
					},
				});
				const existingCashbackProgramBalances = cashbackProgram
					? await tx.query.cashbackProgramBalances.findMany({
							where: (fields, { and, eq }) => and(eq(fields.organizacaoId, organizationId), eq(fields.programaId, cashbackProgram.id)),
							columns: {
								programaId: true,
								clienteId: true,
								saldoValorDisponivel: true,
								saldoValorAcumuladoTotal: true,
							},
						})
					: [];

				const existingSalesMap = new Map(existingSales.map((sale) => [sale.idExterno, sale]));
				const normalizeOnlineClientName = (name?: string | null) => (name ?? "").trim().toUpperCase();
				const buildOnlineClientLookupData = (client: (typeof existingClients)[number]) => ({
					id: client.id,
					name: client.nome,
					basePhone: client.telefoneBase,
					firstPurchaseDate: client.primeiraCompraData,
					lastPurchaseDate: client.ultimaCompraData,
					rfmTitle: client.analiseRFMTitulo,
					metadataTotalCompras: client.metadataTotalCompras ?? 0,
					metadataValorTotalCompras: client.metadataValorTotalCompras ?? 0,
				});
				const existingClientsMapByName = new Map(
					existingClients.filter((client) => !!client.nome).map((client) => [normalizeOnlineClientName(client.nome), buildOnlineClientLookupData(client)]),
				);
				const existingClientsMapByBasePhone = new Map(
					existingClients.filter((client) => !!client.telefoneBase).map((client) => [client.telefoneBase as string, buildOnlineClientLookupData(client)]),
				);
				const indexOnlineClientInLookupMaps = (client: ReturnType<typeof buildOnlineClientLookupData>) => {
					const normalizedName = normalizeOnlineClientName(client.name);
					if (normalizedName) {
						existingClientsMapByName.set(normalizedName, client);
					}
					if (client.basePhone) {
						existingClientsMapByBasePhone.set(client.basePhone, client);
					}
				};
				const resolveExistingOnlineClient = (clientName?: string | null, clientBasePhone?: string | null) => {
					const normalizedName = normalizeOnlineClientName(clientName);
					if (normalizedName) {
						const clientByName = existingClientsMapByName.get(normalizedName);
						if (clientByName) return clientByName;
					}

					if (clientBasePhone) {
						const clientByPhone = existingClientsMapByBasePhone.get(clientBasePhone);
						if (clientByPhone) {
							if (normalizedName && !existingClientsMapByName.has(normalizedName)) {
								existingClientsMapByName.set(normalizedName, clientByPhone);
							}
							return clientByPhone;
						}
					}

					return undefined;
				};
				const existingProductsMap = new Map(existingProducts.map((product) => [product.codigo, product.id]));
				const existingSellersMap = new Map(existingSellers.map((seller) => [seller.nome, seller.id]));
				const existingPartnersMap = new Map(existingPartners.map((partner) => [partner.identificador, { id: partner.id, clienteId: partner.clienteId }]));
				const existingCashbackProgramBalancesMap = new Map(existingCashbackProgramBalances.map((balance) => [balance.clienteId, balance]));

				let createdSalesCount = 0;
				let updatedSalesCount = 0;
				for (const OnlineSale of OnlineSoftwareSales) {
					let isNewClient = false;
					let isNewSale = false;
					let newTotalPurchaseCountForSale: number | undefined;
					let newTotalPurchaseValueForSale: number | undefined;

					const onlineSaleDateTime = OnlineSale.datahora ? dayjs(OnlineSale.datahora, "DD/MM/YYYY HH:mm:ss", true) : null;
					const onlineBaseSaleDate = onlineSaleDateTime?.isValid() ? onlineSaleDateTime : dayjs(OnlineSale.data, "DD/MM/YYYY", true);
					// If the Online sale date is the same as the current date, we use the current date (with time frame component, since cron runs every 5 minutes, we get approximately real time),
					// Otherwise we use the online sale date + 3 hours (to compensate for lack of time component in Online date field)
					const saleDate = onlineSaleDateTime?.isValid()
						? onlineSaleDateTime.toDate()
						: dayjs().isSame(onlineBaseSaleDate, "day")
							? dayjs().toDate()
							: onlineBaseSaleDate.add(3, "hours").toDate();
					const isValidSale = OnlineSale.natureza === "SN01";
					// First, we check for an existing client with the same name (in this case, our primary key for the integration)
					const isValidClient = OnlineSale.cliente !== "AO CONSUMIDOR";
					const onlineSaleClientBasePhone = formatPhoneAsBase(OnlineSale.clientefone || OnlineSale.clientecelular || "");

					console.log(`[ORG: ${organizationId}] [INFO] [DATA_COLLECTING] [CLIENT] Client: ${OnlineSale.cliente}.`);
					if (!isValidClient)
						console.log(`[ORG: ${organizationId}] [INFO] [DATA_COLLECTING] [CLIENT] Non-identified client detected: ${OnlineSale.cliente}`);

					const equivalentSaleClient = isValidClient ? resolveExistingOnlineClient(OnlineSale.cliente, onlineSaleClientBasePhone) : undefined;
					// Initalize the saleClientId holder with the existing client (if any)
					let saleClientId = equivalentSaleClient?.id;
					if (!saleClientId && isValidClient) {
						console.log(`[ORG: ${organizationId}] [INFO] [DATA_COLLECTING] [CLIENT] Creating new client for ${OnlineSale.cliente}`);
						// If no existing client is found, we create a new one
						const insertedClientResponse = await tx
							.insert(clients)
							.values({
								nome: OnlineSale.cliente,
								organizacaoId: organizationId,
								telefone: formatToPhone(OnlineSale.clientefone || OnlineSale.clientecelular || ""),
								telefoneBase: onlineSaleClientBasePhone,
								primeiraCompraData: isValidSale ? saleDate : null,
								ultimaCompraData: isValidSale ? saleDate : null,
								analiseRFMTitulo: "CLIENTES RECENTES",
							})
							.returning({
								id: clients.id,
							});
						const insertedClientId = insertedClientResponse[0]?.id;
						if (!insertedClientResponse) throw new Error("Oops, um erro ocorreu ao criar cliente.");
						// Define the saleClientId with the newly created client id
						saleClientId = insertedClientId;
						isNewClient = true;
						// Add the new client to the existing clients map
						indexOnlineClientInLookupMaps({
							id: insertedClientId,
							name: OnlineSale.cliente,
							basePhone: onlineSaleClientBasePhone,
							firstPurchaseDate: isValidSale ? saleDate : null,
							lastPurchaseDate: isValidSale ? saleDate : null,
							rfmTitle: "CLIENTES RECENTES",
							metadataTotalCompras: 0,
							metadataValorTotalCompras: 0,
						});

						if (cashbackProgram) {
							// If there is a cashback program, we need to create a new balance for the client
							await tx.insert(cashbackProgramBalances).values({
								clienteId: insertedClientId,
								programaId: cashbackProgram.id,
								organizacaoId: organizationId,
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
							.values({ organizacaoId: organizationId, nome: OnlineSale.vendedor || "N/A", identificador: OnlineSale.vendedor || "N/A" })
							.returning({ id: sellers.id });
						const insertedSellerId = insertedSellerResponse[0]?.id;
						if (!insertedSellerResponse) throw new Error("Oops, um erro ocorreu ao criar vendedor.");
						// Define the saleSellerId with the newly created seller id
						saleSellerId = insertedSellerId;
						// Add the new seller to the existing sellers map
						existingSellersMap.set(OnlineSale.vendedor, insertedSellerId);
					}

					// Then, we check for an existing partner with the same identificador (in this case, our primary key for the integration)
					const isValidPartner = OnlineSale.parceiro && OnlineSale.parceiro !== "N/A" && OnlineSale.parceiro !== "0";
					const equivalentSalePartner = isValidPartner ? existingPartnersMap.get(OnlineSale.parceiro as string) : null;
					let salePartnerId = equivalentSalePartner?.id ?? null;
					let salePartnerClientId = equivalentSalePartner?.clienteId ?? null;
					if (!salePartnerId && isValidPartner) {
						const partnerIdentifier = OnlineSale.parceiro || "N/A";
						const partnerDocument = formatToCPForCNPJ(partnerIdentifier);
						const linkage = await linkPartnerToClient({
							tx,
							orgId: organizationId,
							partner: {
								nome: "NÃO DEFINIDO",
								cpfCnpj: partnerDocument,
							},
							createClientIfNotFound: true,
						});

						// If no existing partner is found, we create a new one
						const insertedPartnerResponse = await tx
							.insert(partners)
							.values({
								organizacaoId: organizationId,
								nome: "NÃO DEFINIDO",
								identificador: partnerIdentifier,
								codigoAfiliacao: partnerIdentifier,
								cpfCnpj: partnerDocument,
								clienteId: linkage.clientId,
							})
							.returning({ id: partners.id });
						const insertedPartnerId = insertedPartnerResponse[0]?.id;
						if (!insertedPartnerResponse) throw new Error("Oops, um erro ocorreu ao criar parceiro.");
						// Define the salePartnerId with the newly created partner id
						salePartnerId = insertedPartnerId;
						salePartnerClientId = linkage.clientId;
						// Add the new partner to the existing partners map
						existingPartnersMap.set(OnlineSale.parceiro || "N/A", { id: insertedPartnerId, clienteId: linkage.clientId });
					}

					let saleId = null;
					const existingSale = existingSalesMap.get(OnlineSale.id);
					if (!existingSale) {
						isNewSale = true; // MARCA COMO NOVA VENDA
						console.log(
							`[ORG: ${organizationId}] [INFO] [DATA_COLLECTING] [SALE] Creating new sale ${OnlineSale.id} with ${OnlineSale.itens.length} items...`,
						);
						// Now, we extract the data to compose the sale entity
						const saleTotalCost = OnlineSale.itens.reduce((acc: number, current) => acc + Number(current.vcusto), 0);
						// Insert the sale entity into the database
						const insertedSaleResponse = await tx
							.insert(sales)
							.values({
								organizacaoId: organizationId,
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
								canal: "Loja Física",
								entregaModalidade: "PRESENCIAL",
								dataVenda: saleDate,
							})
							.returning({
								id: sales.id,
							});
						const insertedSaleId = insertedSaleResponse[0]?.id;
						if (!insertedSaleResponse) throw new Error("Oops, um erro ocorreu ao criar venda.");

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
										organizacaoId: organizationId,
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
								if (!insertedProductResponse) throw new Error("Oops, um erro ocorreu ao criar produto.");
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
								organizacaoId: organizationId,
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
								organizacaoId: organizationId,
								valorVenda: Number(OnlineSale.valor),
								dataVenda: saleDate,
							});
						}

						createdSalesCount++;
					} else {
						isNewSale = false; // É APENAS ATUALIZAÇÃO
						console.log(`[ORG: ${organizationId}] [INFO] [DATA_COLLECTING] [SALE] Updating sale ${OnlineSale.id} with ${OnlineSale.itens.length} items...`);
						// Handle sales updates
						const saleTotalCost = OnlineSale.itens.reduce((acc: number, current) => acc + Number(current.vcusto), 0);
						const saleDate = dayjs(OnlineSale.data, "DD/MM/YYYY").add(3, "hours").toDate();
						await tx
							.update(sales)
							.set({
								organizacaoId: organizationId,
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
								canal: "Loja Física",
								entregaModalidade: "PRESENCIAL",
								dataVenda: saleDate,
							})
							.where(eq(sales.id, existingSale.id));

						// Check if sale was canceled
						const wasPreviouslyValid = existingSale.natureza === "SN01" && existingSale.valorTotal > 0;
						const isNowCanceled = OnlineSale.natureza !== "SN01" || Number(OnlineSale.valor) === 0;

						if (wasPreviouslyValid && isNowCanceled && saleClientId) {
							console.log(`[ORG: ${organizationId}] [SALE_CANCELED] Venda ${OnlineSale.id} foi cancelada. Revertendo cashback e cancelando interações...`);

							await reverseSaleCashback({
								tx,
								saleId: existingSale.id,
								clientId: saleClientId,
								organizationId: organizationId,
								reason: "VENDA_CANCELADA",
							});
						}

						// Now, since we can reliably update sale items, we will delete all previous items and insert the new ones

						await tx.delete(saleItems).where(and(eq(saleItems.vendaId, existingSale.id), eq(saleItems.organizacaoId, organizationId)));
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
										organizacaoId: organizationId,
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
								if (!insertedProductResponse) throw new Error("Oops, um erro ocorreu ao criar produto.");
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
								organizacaoId: organizationId,
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

					// Process QUANTIDADE-TOTAL-COMPRAS and VALOR-TOTAL-COMPRAS campaigns
					if (isNewSale && isValidSale && saleClientId) {
						const clientData = resolveExistingOnlineClient(OnlineSale.cliente, onlineSaleClientBasePhone);
						const previousPurchaseCount = clientData?.metadataTotalCompras ?? 0;
						const previousPurchaseValue = clientData?.metadataValorTotalCompras ?? 0;
						const newTotalPurchaseCount = previousPurchaseCount + 1;
						const newTotalPurchaseValue = previousPurchaseValue + Number(OnlineSale.valor);
						newTotalPurchaseCountForSale = newTotalPurchaseCount;
						newTotalPurchaseValueForSale = newTotalPurchaseValue;
						const clientRfmTitle = clientData?.rfmTitle ?? "CLIENTES RECENTES";

						// Update client metadata in the map for subsequent sales in the same batch
						if (clientData) {
							indexOnlineClientInLookupMaps({
								...clientData,
								metadataTotalCompras: newTotalPurchaseCount,
								metadataValorTotalCompras: newTotalPurchaseValue,
							});
						}
					}

					if (isValidSale && saleClientId && isNewSale) {
						const clientData = resolveExistingOnlineClient(OnlineSale.cliente, onlineSaleClientBasePhone);
						const finalTotalPurchaseCount = newTotalPurchaseCountForSale ?? (clientData?.metadataTotalCompras ?? 0) + 1;
						const finalTotalPurchaseValue = newTotalPurchaseValueForSale ?? (clientData?.metadataValorTotalCompras ?? 0) + Number(OnlineSale.valor);
						await tx
							.update(clients)
							.set({
								ultimaCompraData: saleDate,
								ultimaCompraId: saleId,
								metadataTotalCompras: finalTotalPurchaseCount,
								metadataValorTotalCompras: finalTotalPurchaseValue,
							})
							.where(and(eq(clients.id, saleClientId), eq(clients.organizacaoId, organizationId)));

						if (clientData) {
							indexOnlineClientInLookupMaps({
								...clientData,
								metadataTotalCompras: finalTotalPurchaseCount,
								metadataValorTotalCompras: finalTotalPurchaseValue,
							});
						}
					}
				}

				console.log(
					`[ORG: ${organizationId}] [INFO] [DATA_COLLECTING] [SALES] Created ${createdSalesCount} sales and updated ${updatedSalesCount} sales.`,
				);
			});
		}
	} catch (error) {
		const serializedError = serializeError(error);
		console.error(`[ORG: ${organizationId}] [ERROR] Running into error for the data collecting cron`, serializedError);
		await db.insert(utils).values({
			organizacaoId: organizationId,
			identificador: "ONLINE_IMPORTATION",
			valor: {
				identificador: "ONLINE_IMPORTATION",
				dados: {
					organizacaoId: organizationId,
					data: startDate,
					erro: JSON.stringify(error, Object.getOwnPropertyNames(error)),
					descricao: `Tentativa de importação de vendas do Online Software ${startDate} to ${endDate}.`,
				},
			},
		});
	}
}
export async function syncOrganizationSalesHistory(options: TScriptOptions) {
	const config = await db.query.organizations.findFirst({
		where: (fields, { eq: equals }) => equals(fields.id, options.organizationId),
		columns: {
			nome: true,
			integracaoConfiguracao: true,
		},
	});

	if (!config?.integracaoConfiguracao) {
		throw new Error(`Configuração de integração não encontrada para a organização ${options.organizationId}.`);
	}
	console.log("Running sync for organization:", {
		organizationId: options.organizationId,
		organizationName: config.nome,
	});
	if (config.integracaoConfiguracao.tipo === "CARDAPIO-WEB") {
		await handleCardapioWebImportation({
			organizationId: options.organizationId,
			config: config.integracaoConfiguracao as TCardapioWebConfig,
			startDate: options.startDate,
			endDate: options.endDate,
			dryRun: options.dryRun,
		});
	} else if (config.integracaoConfiguracao.tipo === "ONLINE-SOFTWARE") {
		await handleOnlineSoftwareImportation({
			organizationId: options.organizationId,
			config: { ...config.integracaoConfiguracao, serverUrl: "http://onlineitba.ddns.com.br/pdc/apirestweb/vends/listvends.php" } as {
				tipo: "ONLINE-SOFTWARE";
				token: string;
				serverUrl: string;
			},
			startDate: options.startDate,
			endDate: options.endDate,
			dryRun: options.dryRun,
		});
	} else {
		throw new Error(`Tipo de integração não suportado: ${config.integracaoConfiguracao.tipo}.`);
	}
	return {
		message: options.dryRun ? "Dry run concluído." : "Importação concluída.",
		organizationId: options.organizationId,
		startDate: options.startDate,
		endDate: options.endDate,
		dryRun: options.dryRun,
	};
}

async function main() {
	const options = readScriptOptions();

	if (!options) {
		console.log(getUsageText());
		return;
	}

	const startedAt = Date.now();
	console.log(`[${SCRIPT_NAME}] Starting with options:`, options);

	const result = await syncOrganizationSalesHistory(options);
	const elapsedMs = Date.now() - startedAt;

	console.log(`[${SCRIPT_NAME}] Finished successfully in ${elapsedMs}ms.`);
	console.log(`[${SCRIPT_NAME}] Result:`, result);
}

void main()
	.then(() => {
		process.exitCode = 0;
	})
	.catch((error) => {
		console.error(`[${SCRIPT_NAME}] Error:`, error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await connection.end().catch((error) => {
			console.error(`[${SCRIPT_NAME}] Error while closing database connection:`, error);
		});

		process.exit(process.exitCode ?? 0);
	});
