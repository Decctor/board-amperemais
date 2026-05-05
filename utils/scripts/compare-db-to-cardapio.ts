import "@/utils/scripts/load-next-env";

import { writeFile } from "node:fs/promises";
import path from "node:path";

import { generateCashbackForCampaign } from "@/lib/cashback/generate-campaign-cashback";
import { reverseSaleCashback } from "@/lib/cashback/reverse-sale-cashback";
import { processConversionAttribution } from "@/lib/conversions/attribution";
import { fetchCardapioWebOrdersWithDetails } from "@/lib/data-connectors/cardapio-web";
import { type MappedCardapioWebSale, extractAllCardapioWebData } from "@/lib/data-connectors/cardapio-web/mappers";
import type { TCardapioWebConfig } from "@/lib/data-connectors/cardapio-web/types";
import { DASTJS_TIME_DURATION_UNITS_MAP, getPostponedDateFromReferenceDate } from "@/lib/dates";
import { formatPhoneAsBase, formatToCPForCNPJ } from "@/lib/formatting";
import { type ImmediateProcessingData, delay, processSingleInteractionImmediately } from "@/lib/interactions";
import { linkPartnerToClient } from "@/lib/partners/link-partner-to-client";
import type { TTimeDurationUnitsEnum } from "@/schemas/enums";
import { type DBTransaction, db } from "@/services/drizzle";
import {
	cashbackProgramBalances,
	cashbackProgramTransactions,
	clients,
	interactions,
	partners,
	productAddOnOptions,
	productAddOns,
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
import type { NextApiHandler, NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
dayjs.extend(dayjsCustomFormatter);

const TARGET_ORGANIZATION_ID = "c0af84e7-4882-4aac-8d6e-f28ee3541d0b";
const START_DATE = "2026-05-01T00:00:00.000Z";
const END_DATE = "2026-05-04T23:59:59.999Z";

const DB_IMPORTATION_COMPARISON_JSON_PATH = path.join(process.cwd(), "db-importation-comparison.json");

type TDbImportationComparisonSaleRow = {
	dbSaleValue: number;
	dbSaleDate: string;
	importedSaleValue: number | null;
	importedSaleDate: string | null;
};

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

/**
 * Type for campaigns with relations (used by both ONLINE-SOFTWARE and CARDAPIO-WEB handlers)
 */
type TCampaignWithRelations = Awaited<
	ReturnType<typeof db.query.campaigns.findMany<{ with: { segmentacoes: true; whatsappTemplate: true } }>>
>[number];

/**
 * Handler for CARDAPIO-WEB integration.
 * Fetches orders for the current day and processes them following the same patterns as ONLINE-SOFTWARE.
 */
export async function handleCardapioWebImportation(organizationId: string, config: TCardapioWebConfig) {
	// Fetch orders for today (start of day until now)

	console.log(`[ORG: ${organizationId}] [CARDAPIO-WEB] Fetching orders from ${START_DATE} to ${END_DATE}`);

	// Fetch all orders with details from CardapioWeb API
	const orderDetails = await fetchCardapioWebOrdersWithDetails(config, START_DATE, END_DATE);

	if (orderDetails.length === 0) {
		console.log(`[ORG: ${organizationId}] [CARDAPIO-WEB] No orders found.`);
		return;
	}

	const totalByStatus = orderDetails.reduce(
		(acc, order) => {
			if (!acc[order.status]) {
				acc[order.status] = { count: 0, totalValue: 0 };
			}
			acc[order.status].count = (acc[order.status].count || 0) + 1;
			acc[order.status].totalValue = (acc[order.status].totalValue || 0) + order.total;
			return acc;
		},
		{} as Record<string, { count: number; totalValue: number }>,
	);

	const totalValue = Object.values(totalByStatus).reduce((acc, status) => acc + status.totalValue, 0);

	console.log(`[ORG: ${organizationId}] [CARDAPIO-WEB] Total value: ${totalValue}`);
	console.log(`[ORG: ${organizationId}] [CARDAPIO-WEB] Total by status: ${JSON.stringify(totalByStatus)}`);

	// Log the raw response for debugging
	await db
		.insert(utils)
		.values({
			organizacaoId: organizationId,
			identificador: "CARDAPIO_WEB_IMPORTATION" as const,
			valor: {
				identificador: "CARDAPIO_WEB_IMPORTATION" as const,
				dados: {
					organizacaoId: organizationId,
					data: dayjs().format("YYYY-MM-DD"),
					conteudo: orderDetails,
				},
			},
		})
		.returning({ id: utils.id });

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

	let salesByExternalIdEntries: Array<[string, TDbImportationComparisonSaleRow]> = [];

	await db.transaction(async (tx) => {
		const existingSales = await tx.query.sales.findMany({
			where: (fields, { and, eq, inArray }) => and(eq(fields.organizacaoId, organizationId), inArray(fields.idExterno, cardapioWebSalesIds)),
			with: { itens: true },
		});

		let createdSalesCount = 0;
		let updatedSalesCount = 0;

		const salesByExternalId = new Map(
			existingSales.map((sale) => [
				sale.idExterno,
				{
					dbSaleValue: sale.valorTotal,
					dbSaleDate: dayjs(sale.dataVenda).format("YYYY-MM-DD HH:mm:ss"),
					importedSaleValue: null as number | null,
					importedSaleDate: null as string | null,
				},
			]),
		);
		for (const sale of mappedSales) {
			const existingSale = salesByExternalId.get(sale.idExterno);
			if (existingSale) {
				existingSale.importedSaleValue = sale.valorTotal;
				existingSale.importedSaleDate = dayjs(sale.dataVenda).format("YYYY-MM-DD HH:mm:ss");
			}
		}

		salesByExternalIdEntries = Array.from(salesByExternalId.entries());
	});

	const dbImportationComparisonPayload = {
		geradoEm: new Date().toISOString(),
		organizacaoId: organizationId,
		intervalo: { inicio: START_DATE, fim: END_DATE },
		vendasPorIdExterno: salesByExternalIdEntries.map(([idExterno, row]) => ({
			idExterno,
			...row,
		})),
	};

	await writeFile(DB_IMPORTATION_COMPARISON_JSON_PATH, JSON.stringify(dbImportationComparisonPayload, null, 2), "utf8");
	console.log(`[ORG: ${organizationId}] [CARDAPIO-WEB] Comparação DB/importação gravada em ${DB_IMPORTATION_COMPARISON_JSON_PATH}`);
}

export async function syncCardapioWebManualCollecting() {
	const config = await db.query.organizations.findFirst({
		where: (fields, { eq }) => eq(fields.id, TARGET_ORGANIZATION_ID),
		columns: {
			nome: true,
			integracaoConfiguracao: true,
		},
	});

	if (!config) {
		throw new Error("Configuração não encontrada.");
	}
	console.log(`[SYNC-CARDAPIO-WEB-MANUAL-COLLECTING] Config found: ${config.nome}`);
	const configData = config.integracaoConfiguracao as TCardapioWebConfig;
	await handleCardapioWebImportation(TARGET_ORGANIZATION_ID, configData);

	const result = {
		message: "Importação concluída",
		organizationId: TARGET_ORGANIZATION_ID,
		configData,
	};

	console.log("[SYNC-CARDAPIO-WEB-MANUAL-COLLECTING] Done:", result.message);
	return result;
}

void syncCardapioWebManualCollecting()
	.then(() => {
		process.exit(0);
	})
	.catch((error) => {
		console.error("[SYNC-CARDAPIO-WEB-MANUAL-COLLECTING] Error:", error);
		process.exit(1);
	});
