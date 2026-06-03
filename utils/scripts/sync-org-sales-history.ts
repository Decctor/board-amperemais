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
import dayjsCustomParseFormat from "dayjs/plugin/customParseFormat";
import { and, eq } from "drizzle-orm";
import { formatPhoneAsBase, formatToCPForCNPJ, formatToPhone } from "@/lib/formatting";
import { OnlineSoftwareSaleImportationSchema } from "@/schemas/online-importation.schema";
import z from "zod";
import axios from "axios";

dayjs.extend(dayjsCustomParseFormat);

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
		existingPartners.flatMap((partner) =>
			partner.identificador ? ([[partner.identificador, { id: partner.id, clienteId: partner.clienteId }]] as const) : [],
		),
	);
	let existingAddOnsMap = new Map<string, string>(
		existingAddOns.flatMap((addon) => (addon.idExterno ? ([[addon.idExterno, addon.id]] as const) : [])),
	);
	let existingAddOnOptionsMap = new Map<string, TAddOnOptionLookupData>(
		existingAddOnOptions.flatMap((option) =>
			option.idExterno ? ([[option.idExterno, { id: option.id, addOnId: option.produtoAddOnId }]] as const) : [],
		),
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
							nome: product.nome,
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
						`[ORG: ${organizationId}] [CARDAPIO-WEB] Creating new sale ${cardapioWebSale.idExterno} (${saleDate.toLocaleString()}) with ${cardapioWebSale.itens.length} items...`,
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
					console.log(`[ORG: ${organizationId}] [CARDAPIO-WEB] Updating sale ${cardapioWebSale.idExterno} (${saleDate.toLocaleString()})...`);

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
async function handleOnlineSoftwareImportation({ organizationId, config, startDate, endDate, dryRun: _dryRun }: TOnlineSoftwareImportationOptions) {
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
		const onlineSoftwareConfig = config as { tipo: "ONLINE-SOFTWARE"; token: string; serverUrl: string };
		const [cashbackProgram, existingClients, existingProducts, existingSellers, existingPartners] = await Promise.all([
			db.query.cashbackPrograms.findFirst({
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
			}),
			db.query.clients.findMany({
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
			}),
			db.query.products.findMany({
				where: (fields, { eq }) => eq(fields.organizacaoId, organizationId),
				columns: {
					id: true,
					codigo: true,
				},
			}),
			db.query.sellers.findMany({
				where: (fields, { eq }) => eq(fields.organizacaoId, organizationId),
				columns: {
					id: true,
					nome: true,
				},
			}),
			db.query.partners.findMany({
				where: (fields, { eq }) => eq(fields.organizacaoId, organizationId),
				columns: {
					id: true,
					identificador: true,
					clienteId: true,
				},
			}),
		]);
		const existingCashbackProgramBalances = cashbackProgram
			? await db.query.cashbackProgramBalances.findMany({
					where: (fields, { and, eq }) => and(eq(fields.organizacaoId, organizationId), eq(fields.programaId, cashbackProgram.id)),
					columns: {
						programaId: true,
						clienteId: true,
						saldoValorDisponivel: true,
						saldoValorAcumuladoTotal: true,
					},
				})
			: [];

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
		const computeOnlineSaleDate = (onlineSale: (typeof OnlineSoftwareSaleImportationSchema)["_output"]) => {
			const onlineSaleDateTime = onlineSale.datahora ? dayjs(onlineSale.datahora, ["DD/MM/YYYY HH:mm:ss", "DD/MM/YYYY HH:mm"], true) : null;
			const onlineBaseSaleDate = onlineSaleDateTime?.isValid() ? onlineSaleDateTime : dayjs(onlineSale.data, "DD/MM/YYYY", true);

			if (!onlineBaseSaleDate.isValid()) {
				throw new Error(`Data inválida recebida da Online Software. data="${onlineSale.data}" datahora="${onlineSale.datahora ?? ""}"`);
			}

			return onlineSaleDateTime?.isValid()
				? onlineSaleDateTime.toDate()
				: dayjs().isSame(onlineBaseSaleDate, "day")
					? dayjs().toDate()
					: onlineBaseSaleDate.add(3, "hours").toDate();
		};

		let existingSalesMap = new Map<string, TExistingSaleLookupData>();
		let existingClientsMapByName = new Map(
			existingClients.filter((client) => !!client.nome).map((client) => [normalizeOnlineClientName(client.nome), buildOnlineClientLookupData(client)]),
		);
		let existingClientsMapByBasePhone = new Map(
			existingClients.filter((client) => !!client.telefoneBase).map((client) => [client.telefoneBase as string, buildOnlineClientLookupData(client)]),
		);
		let existingProductsMap = new Map(existingProducts.map((product) => [product.codigo, product.id]));
		let existingSellersMap = new Map(existingSellers.map((seller) => [seller.nome, seller.id]));
		let existingPartnersMap = new Map(existingPartners.map((partner) => [partner.identificador, { id: partner.id, clienteId: partner.clienteId }]));
		let existingCashbackProgramBalancesMap = new Map(existingCashbackProgramBalances.map((balance) => [balance.clienteId, balance]));
		let createdSalesCount = 0;
		let updatedSalesCount = 0;

		for (const weekPeriod of weekPeriods) {
			console.log(
				`[ORG: ${organizationId}] [INFO] [DATA_COLLECTING] [ONLINE-SOFTWARE] Processing period from ${weekPeriod.startDate} to ${weekPeriod.endDate}`,
			);
			const startDateFixed = dayjs(weekPeriod.startDate).format("DD/MM/YYYY").replaceAll("/", "");
			const endDateFixed = dayjs(weekPeriod.endDate).format("DD/MM/YYYY").replaceAll("/", "");
			const { data: onlineAPIResponse } = await axios.post(onlineSoftwareConfig.serverUrl, {
				token: onlineSoftwareConfig.token,
				rotina: "listarVendas001",
				dtinicio: startDateFixed,
				dtfim: endDateFixed,
			});
			console.log("ONLINE API RECEIVED RESULT", onlineAPIResponse.resultado[0]);
			const onlineSoftwareSales = z
				.array(OnlineSoftwareSaleImportationSchema, {
					required_error: "Payload da Online não é uma lista.",
					invalid_type_error: "Tipo não permitido para o payload.",
				})
				.parse(onlineAPIResponse.resultado);
			const deduplicatedOnlineSalesMap = new Map<string, (typeof onlineSoftwareSales)[number]>();
			for (const onlineSale of onlineSoftwareSales) {
				deduplicatedOnlineSalesMap.set(onlineSale.id, onlineSale);
			}
			const deduplicatedOnlineSales = Array.from(deduplicatedOnlineSalesMap.values());
			const duplicatedSalesCount = onlineSoftwareSales.length - deduplicatedOnlineSales.length;

			console.log("ONLINE SALES PARSED", onlineSoftwareSales.length);
			if (duplicatedSalesCount > 0) {
				console.log(
					`[ORG: ${organizationId}] [ONLINE-SOFTWARE] ${duplicatedSalesCount} venda(s) duplicada(s) foram descartadas do payload desta janela.`,
				);
			}
			console.log(`[ORG: ${organizationId}] ${deduplicatedOnlineSales.length} vendas encontradas após deduplicação.`);
			if (deduplicatedOnlineSales.length === 0) {
				continue;
			}

			const salesBatches = chunkArray(deduplicatedOnlineSales, SALES_BATCH_SIZE);
			for (const [batchIndex, salesBatch] of salesBatches.entries()) {
				const batchExistingSalesMap = new Map(existingSalesMap);
				const batchClientsMapByName = new Map(existingClientsMapByName);
				const batchClientsMapByBasePhone = new Map(existingClientsMapByBasePhone);
				const batchProductsMap = new Map(existingProductsMap);
				const batchSellersMap = new Map(existingSellersMap);
				const batchPartnersMap = new Map(existingPartnersMap);
				const batchCashbackProgramBalancesMap = new Map(existingCashbackProgramBalancesMap);
				let batchCreatedSalesCount = 0;
				let batchUpdatedSalesCount = 0;
				const batchStartSaleIndex = batchIndex * SALES_BATCH_SIZE;

				const batchMissingSaleIds = salesBatch.map((sale) => sale.id).filter((saleId) => !batchExistingSalesMap.has(saleId));
				if (batchMissingSaleIds.length > 0) {
					const fetchedExistingSales = await db.query.sales.findMany({
						where: (fields, { and, eq, inArray }) => and(eq(fields.organizacaoId, organizationId), inArray(fields.idExterno, batchMissingSaleIds)),
						columns: {
							id: true,
							idExterno: true,
							natureza: true,
							valorTotal: true,
						},
					});
					for (const existingSale of fetchedExistingSales) {
						batchExistingSalesMap.set(existingSale.idExterno, existingSale);
					}
				}

				console.log(
					`[ORG: ${organizationId}] [ONLINE-SOFTWARE] Processing sales batch ${batchIndex + 1}/${salesBatches.length} (${salesBatch.length} sales)...`,
				);

				await db.transaction(async (tx) => {
					const indexOnlineClientInLookupMaps = (
						client: ReturnType<typeof buildOnlineClientLookupData>,
						clientsMapByName: Map<string, ReturnType<typeof buildOnlineClientLookupData>>,
						clientsMapByBasePhone: Map<string, ReturnType<typeof buildOnlineClientLookupData>>,
					) => {
						const normalizedName = normalizeOnlineClientName(client.name);
						if (normalizedName) {
							clientsMapByName.set(normalizedName, client);
						}
						if (client.basePhone) {
							clientsMapByBasePhone.set(client.basePhone, client);
						}
					};
					const resolveExistingOnlineClient = (
						clientName: string | null | undefined,
						clientBasePhone: string | null | undefined,
						clientsMapByName: Map<string, ReturnType<typeof buildOnlineClientLookupData>>,
						clientsMapByBasePhone: Map<string, ReturnType<typeof buildOnlineClientLookupData>>,
					) => {
						const normalizedName = normalizeOnlineClientName(clientName);
						if (normalizedName) {
							const clientByName = clientsMapByName.get(normalizedName);
							if (clientByName) {
								return clientByName;
							}
						}

						if (clientBasePhone) {
							const clientByPhone = clientsMapByBasePhone.get(clientBasePhone);
							if (clientByPhone) {
								if (normalizedName && !clientsMapByName.has(normalizedName)) {
									clientsMapByName.set(normalizedName, clientByPhone);
								}
								return clientByPhone;
							}
						}

						return undefined;
					};
					const buildSaleItemsValues = (onlineSale: (typeof salesBatch)[number], saleId: string, saleClientId: string | null) =>
						onlineSale.itens.map((item) => {
							const productId = batchProductsMap.get(item.codigo);
							if (!productId) {
								throw new Error(`Produto não encontrado no cache para o código ${item.codigo}.`);
							}

							const quantidade = Number(item.qtde);
							const valorVendaUnitario = Number(item.valorunit);
							const valorVendaTotalBruto = valorVendaUnitario * quantidade;
							const valorTotalDesconto = Number(item.vdesc);
							const valorVendaTotalLiquido = valorVendaTotalBruto - valorTotalDesconto;
							const valorCustoTotal = Number(item.vcusto);

							return {
								organizacaoId: organizationId,
								vendaId: saleId,
								clienteId: saleClientId,
								produtoId: productId,
								quantidade,
								valorVendaUnitario,
								valorCustoUnitario: quantidade === 0 ? 0 : valorCustoTotal / quantidade,
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
						});
					const clientPurchaseUpdates = new Map<
						string,
						{ ultimaCompraData: Date; ultimaCompraId: string; metadataTotalCompras: number; metadataValorTotalCompras: number }
					>();

					const newSellerNames = Array.from(
						new Set(
							salesBatch
								.map((sale) => sale.vendedor)
								.filter((sellerName): sellerName is string => !!sellerName && sellerName !== "N/A" && sellerName !== "0" && !batchSellersMap.has(sellerName)),
						),
					);
					if (newSellerNames.length > 0) {
						const insertedSellers = await tx
							.insert(sellers)
							.values(newSellerNames.map((sellerName) => ({ organizacaoId: organizationId, nome: sellerName, identificador: sellerName })))
							.returning({ id: sellers.id, nome: sellers.nome });
						for (const insertedSeller of insertedSellers) {
							batchSellersMap.set(insertedSeller.nome, insertedSeller.id);
						}
					}

					const batchReferencedProductCodes = Array.from(new Set(salesBatch.flatMap((sale) => sale.itens.map((item) => item.codigo))));
					if (batchReferencedProductCodes.length > 0) {
						const persistedBatchProducts = await tx.query.products.findMany({
							where: (fields, { and, eq, inArray }) =>
								and(eq(fields.organizacaoId, organizationId), inArray(fields.codigo, batchReferencedProductCodes)),
							columns: {
								id: true,
								codigo: true,
							},
						});
						for (const persistedProduct of persistedBatchProducts) {
							batchProductsMap.set(persistedProduct.codigo, persistedProduct.id);
						}
					}

					const missingProductsMap = new Map<string, { codigo: string; nome: string; unidade: string; grupo: string; ncm: string; tipo: string }>();
					for (const onlineSale of salesBatch) {
						for (const item of onlineSale.itens) {
							if (!batchProductsMap.has(item.codigo) && !missingProductsMap.has(item.codigo)) {
								missingProductsMap.set(item.codigo, {
									codigo: item.codigo,
									nome: item.descricao,
									unidade: item.unidade,
									grupo: item.grupo,
									ncm: item.ncm,
									tipo: item.tipo,
								});
							}
						}
					}
					if (missingProductsMap.size > 0) {
						const insertedProducts = await tx
							.insert(products)
							.values(
								Array.from(missingProductsMap.values()).map((product) => ({
									organizacaoId: organizationId,
									codigo: product.codigo,
									nome: product.nome,
									unidade: product.unidade,
									grupo: product.grupo,
									ncm: product.ncm,
									tipo: product.tipo,
								})),
							)
							.returning({ id: products.id, codigo: products.codigo });
						for (const insertedProduct of insertedProducts) {
							batchProductsMap.set(insertedProduct.codigo, insertedProduct.id);
						}
					}

					const pendingNewClientsMap = new Map<
						string,
						{ nome: string; telefone: string; telefoneBase: string; primeiraCompraData: Date | null; ultimaCompraData: Date | null }
					>();
					const pendingClientsMapByName = new Map<
						string,
						{ nome: string; telefone: string; telefoneBase: string; primeiraCompraData: Date | null; ultimaCompraData: Date | null }
					>();
					const pendingClientsMapByBasePhone = new Map<
						string,
						{ nome: string; telefone: string; telefoneBase: string; primeiraCompraData: Date | null; ultimaCompraData: Date | null }
					>();
					for (const onlineSale of salesBatch) {
						const isValidClient = onlineSale.cliente !== "AO CONSUMIDOR";
						if (!isValidClient) {
							continue;
						}

						const saleDate = computeOnlineSaleDate(onlineSale);
						const isValidSale = onlineSale.natureza === "SN01";
						const onlineSaleClientBasePhone = formatPhoneAsBase(onlineSale.clientefone || onlineSale.clientecelular || "");
						const normalizedName = normalizeOnlineClientName(onlineSale.cliente);
						const existingClient = resolveExistingOnlineClient(
							onlineSale.cliente,
							onlineSaleClientBasePhone,
							batchClientsMapByName,
							batchClientsMapByBasePhone,
						);
						if (existingClient) {
							continue;
						}

						const pendingClientByName = normalizedName ? pendingClientsMapByName.get(normalizedName) : undefined;
						const pendingClientByPhone = onlineSaleClientBasePhone ? pendingClientsMapByBasePhone.get(onlineSaleClientBasePhone) : undefined;
						const pendingClient = pendingClientByName ?? pendingClientByPhone;
						if (pendingClient) {
							if (normalizedName && !pendingClientsMapByName.has(normalizedName)) {
								pendingClientsMapByName.set(normalizedName, pendingClient);
							}
							continue;
						}

						const pendingKey = normalizedName || `PHONE:${onlineSaleClientBasePhone}` || `SALE:${onlineSale.id}`;
						const pendingClientData = {
							nome: onlineSale.cliente,
							telefone: formatToPhone(onlineSale.clientefone || onlineSale.clientecelular || ""),
							telefoneBase: onlineSaleClientBasePhone,
							primeiraCompraData: isValidSale ? saleDate : null,
							ultimaCompraData: isValidSale ? saleDate : null,
						};
						pendingNewClientsMap.set(pendingKey, pendingClientData);
						if (normalizedName) {
							pendingClientsMapByName.set(normalizedName, pendingClientData);
						}
						if (onlineSaleClientBasePhone) {
							pendingClientsMapByBasePhone.set(onlineSaleClientBasePhone, pendingClientData);
						}
					}

					if (pendingNewClientsMap.size > 0) {
						const insertedClients = await tx
							.insert(clients)
							.values(
								Array.from(pendingNewClientsMap.values()).map((client) => ({
									nome: client.nome,
									organizacaoId: organizationId,
									telefone: client.telefone,
									telefoneBase: client.telefoneBase,
									primeiraCompraData: client.primeiraCompraData,
									ultimaCompraData: client.ultimaCompraData,
									analiseRFMTitulo: "CLIENTES RECENTES",
								})),
							)
							.returning({
								id: clients.id,
								nome: clients.nome,
								telefoneBase: clients.telefoneBase,
								primeiraCompraData: clients.primeiraCompraData,
								ultimaCompraData: clients.ultimaCompraData,
								analiseRFMTitulo: clients.analiseRFMTitulo,
								metadataTotalCompras: clients.metadataTotalCompras,
								metadataValorTotalCompras: clients.metadataValorTotalCompras,
							});
						for (const insertedClient of insertedClients) {
							indexOnlineClientInLookupMaps(buildOnlineClientLookupData(insertedClient), batchClientsMapByName, batchClientsMapByBasePhone);
						}

						if (cashbackProgram) {
							await tx.insert(cashbackProgramBalances).values(
								insertedClients.map((client) => ({
									clienteId: client.id,
									programaId: cashbackProgram.id,
									organizacaoId: organizationId,
									saldoValorDisponivel: 0,
									saldoValorAcumuladoTotal: 0,
								})),
							);
							for (const insertedClient of insertedClients) {
								updateCashbackBalanceInMap(batchCashbackProgramBalancesMap, insertedClient.id, cashbackProgram.id, 0, 0);
							}
						}
					}

					const newPartnerIdentifiers = Array.from(
						new Set(
							salesBatch
								.map((sale) => sale.parceiro)
								.filter(
									(partnerIdentifier): partnerIdentifier is string =>
										!!partnerIdentifier && partnerIdentifier !== "N/A" && partnerIdentifier !== "0" && !batchPartnersMap.has(partnerIdentifier),
								),
						),
					);
					for (const partnerIdentifier of newPartnerIdentifiers) {
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
						const [insertedPartner] = await tx
							.insert(partners)
							.values({
								organizacaoId: organizationId,
								nome: "NÃO DEFINIDO",
								identificador: partnerIdentifier,
								codigoAfiliacao: partnerIdentifier,
								cpfCnpj: partnerDocument,
								clienteId: linkage.clientId,
							})
							.returning({ id: partners.id, identificador: partners.identificador, clienteId: partners.clienteId });
						batchPartnersMap.set(insertedPartner.identificador, { id: insertedPartner.id, clienteId: insertedPartner.clienteId });
					}

					for (const [saleOffset, onlineSale] of salesBatch.entries()) {
						console.log(
							`[ORG: ${organizationId}] [ONLINE-SOFTWARE] Processing sale ${batchStartSaleIndex + saleOffset + 1} of ${deduplicatedOnlineSales.length}...`,
						);
						const saleDate = computeOnlineSaleDate(onlineSale);
						const isValidSale = onlineSale.natureza === "SN01";
						const isValidClient = onlineSale.cliente !== "AO CONSUMIDOR";
						const onlineSaleClientBasePhone = formatPhoneAsBase(onlineSale.clientefone || onlineSale.clientecelular || "");

						console.log(`[ORG: ${organizationId}] [INFO] [DATA_COLLECTING] [CLIENT] Client: ${onlineSale.cliente}.`);
						if (!isValidClient) {
							console.log(`[ORG: ${organizationId}] [INFO] [DATA_COLLECTING] [CLIENT] Non-identified client detected: ${onlineSale.cliente}`);
						}

						const equivalentSaleClient = isValidClient
							? resolveExistingOnlineClient(onlineSale.cliente, onlineSaleClientBasePhone, batchClientsMapByName, batchClientsMapByBasePhone)
							: undefined;
						let saleClientId = equivalentSaleClient?.id ?? null;
						if (!saleClientId && isValidClient) {
							throw new Error(`Cliente ${onlineSale.cliente} não foi encontrado no cache após o preload do lote.`);
						}

						const isValidSeller = !!onlineSale.vendedor && onlineSale.vendedor !== "N/A" && onlineSale.vendedor !== "0";
						const saleSellerId = isValidSeller ? (batchSellersMap.get(onlineSale.vendedor) ?? null) : null;

						const isValidPartner = !!onlineSale.parceiro && onlineSale.parceiro !== "N/A" && onlineSale.parceiro !== "0";
						const matchedPartner = isValidPartner ? batchPartnersMap.get(onlineSale.parceiro as string) : null;
						const salePartnerId = matchedPartner?.id ?? null;

						let saleId: string | null = null;
						let isNewSale = false;
						const existingSale = batchExistingSalesMap.get(onlineSale.id);
						const saleTotalCost = onlineSale.itens.reduce((acc: number, current) => acc + Number(current.vcusto), 0);

						if (!existingSale) {
							isNewSale = true;
							console.log(
								`[ORG: ${organizationId}] [INFO] [DATA_COLLECTING] [SALE] Creating new sale ${onlineSale.id} (${saleDate.toLocaleString()}) with ${onlineSale.itens.length} items...`,
							);
							const [insertedSale] = await tx
								.insert(sales)
								.values({
									organizacaoId: organizationId,
									idExterno: onlineSale.id,
									clienteId: saleClientId,
									valorTotal: Number(onlineSale.valor),
									custoTotal: saleTotalCost,
									vendedorNome: onlineSale.vendedor || "N/A",
									vendedorId: saleSellerId,
									parceiro: onlineSale.parceiro || "N/A",
									parceiroId: salePartnerId,
									chave: onlineSale.chave || "N/A",
									documento: onlineSale.documento || "N/A",
									modelo: onlineSale.modelo || "N/A",
									movimento: onlineSale.movimento || "N/A",
									natureza: onlineSale.natureza || "N/A",
									serie: onlineSale.serie || "N/A",
									situacao: onlineSale.situacao || "N/A",
									tipo: onlineSale.tipo,
									canal: "Loja Física",
									entregaModalidade: "PRESENCIAL",
									dataVenda: saleDate,
								})
								.returning({ id: sales.id });
							saleId = insertedSale.id;
							batchExistingSalesMap.set(onlineSale.id, {
								id: insertedSale.id,
								idExterno: onlineSale.id,
								natureza: onlineSale.natureza,
								valorTotal: Number(onlineSale.valor),
							});

							const newSaleItems = buildSaleItemsValues(onlineSale, insertedSale.id, saleClientId);
							if (newSaleItems.length > 0) {
								await tx.insert(saleItems).values(newSaleItems);
							}

							if (isValidSale && saleClientId) {
								await processConversionAttribution(tx, {
									vendaId: insertedSale.id,
									clienteId: saleClientId,
									organizacaoId: organizationId,
									valorVenda: Number(onlineSale.valor),
									dataVenda: saleDate,
								});
							}

							batchCreatedSalesCount++;
						} else {
							console.log(
								`[ORG: ${organizationId}] [INFO] [DATA_COLLECTING] [SALE] Updating sale ${onlineSale.id} (${saleDate.toLocaleString()}) with ${onlineSale.itens.length} items...`,
							);
							await tx
								.update(sales)
								.set({
									organizacaoId: organizationId,
									idExterno: onlineSale.id,
									clienteId: saleClientId,
									valorTotal: Number(onlineSale.valor),
									custoTotal: saleTotalCost,
									vendedorNome: onlineSale.vendedor || "N/A",
									vendedorId: saleSellerId,
									parceiro: onlineSale.parceiro || "N/A",
									parceiroId: salePartnerId,
									chave: onlineSale.chave || "N/A",
									documento: onlineSale.documento || "N/A",
									modelo: onlineSale.modelo || "N/A",
									movimento: onlineSale.movimento || "N/A",
									natureza: onlineSale.natureza || "N/A",
									serie: onlineSale.serie || "N/A",
									situacao: onlineSale.situacao || "N/A",
									tipo: onlineSale.tipo,
									canal: "Loja Física",
									entregaModalidade: "PRESENCIAL",
									dataVenda: saleDate,
								})
								.where(eq(sales.id, existingSale.id));

							const wasPreviouslyValid = existingSale.natureza === "SN01" && existingSale.valorTotal > 0;
							const isNowCanceled = onlineSale.natureza !== "SN01" || Number(onlineSale.valor) === 0;
							if (wasPreviouslyValid && isNowCanceled && saleClientId) {
								console.log(`[ORG: ${organizationId}] [SALE_CANCELED] Venda ${onlineSale.id} foi cancelada. Revertendo cashback e cancelando interações...`);
								await reverseSaleCashback({
									tx,
									saleId: existingSale.id,
									clientId: saleClientId,
									organizationId: organizationId,
									reason: "VENDA_CANCELADA",
								});
							}

							await tx.delete(saleItems).where(and(eq(saleItems.vendaId, existingSale.id), eq(saleItems.organizacaoId, organizationId)));
							const replacementSaleItems = buildSaleItemsValues(onlineSale, existingSale.id, saleClientId);
							if (replacementSaleItems.length > 0) {
								await tx.insert(saleItems).values(replacementSaleItems);
							}

							saleId = existingSale.id;
							batchExistingSalesMap.set(onlineSale.id, {
								id: existingSale.id,
								idExterno: onlineSale.id,
								natureza: onlineSale.natureza,
								valorTotal: Number(onlineSale.valor),
							});
							batchUpdatedSalesCount++;
						}

						if (isNewSale && isValidSale && saleClientId && saleId) {
							const clientData = resolveExistingOnlineClient(
								onlineSale.cliente,
								onlineSaleClientBasePhone,
								batchClientsMapByName,
								batchClientsMapByBasePhone,
							);
							const finalTotalPurchaseCount = (clientData?.metadataTotalCompras ?? 0) + 1;
							const finalTotalPurchaseValue = (clientData?.metadataValorTotalCompras ?? 0) + Number(onlineSale.valor);

							if (clientData) {
								indexOnlineClientInLookupMaps(
									{
										...clientData,
										lastPurchaseDate: saleDate,
										metadataTotalCompras: finalTotalPurchaseCount,
										metadataValorTotalCompras: finalTotalPurchaseValue,
									},
									batchClientsMapByName,
									batchClientsMapByBasePhone,
								);
							}

							clientPurchaseUpdates.set(saleClientId, {
								ultimaCompraData: saleDate,
								ultimaCompraId: saleId,
								metadataTotalCompras: finalTotalPurchaseCount,
								metadataValorTotalCompras: finalTotalPurchaseValue,
							});
						}
					}

					for (const [clientId, clientPurchaseUpdate] of clientPurchaseUpdates.entries()) {
						await tx
							.update(clients)
							.set({
								ultimaCompraData: clientPurchaseUpdate.ultimaCompraData,
								ultimaCompraId: clientPurchaseUpdate.ultimaCompraId,
								metadataTotalCompras: clientPurchaseUpdate.metadataTotalCompras,
								metadataValorTotalCompras: clientPurchaseUpdate.metadataValorTotalCompras,
							})
							.where(and(eq(clients.id, clientId), eq(clients.organizacaoId, organizationId)));
					}
				});

				existingSalesMap = batchExistingSalesMap;
				existingClientsMapByName = batchClientsMapByName;
				existingClientsMapByBasePhone = batchClientsMapByBasePhone;
				existingProductsMap = batchProductsMap;
				existingSellersMap = batchSellersMap;
				existingPartnersMap = batchPartnersMap;
				existingCashbackProgramBalancesMap = batchCashbackProgramBalancesMap;
				createdSalesCount += batchCreatedSalesCount;
				updatedSalesCount += batchUpdatedSalesCount;

				console.log(
					`[ORG: ${organizationId}] [ONLINE-SOFTWARE] Sales batch ${batchIndex + 1}/${salesBatches.length} committed. Created ${batchCreatedSalesCount}, updated ${batchUpdatedSalesCount}.`,
				);
			}
		}

		console.log(`[ORG: ${organizationId}] [INFO] [DATA_COLLECTING] [SALES] Created ${createdSalesCount} sales and updated ${updatedSalesCount} sales.`);
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
		throw new Error("Tipo de integração não suportado.");
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
