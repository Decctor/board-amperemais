import dayjs from "dayjs";
import type { TCanonicalImportWindow, TDataConnector } from "../types";
import {
	createErpFlexClients,
	fetchErpFlexBillingsForDate,
	fetchErpFlexBillingWithItems,
	fetchErpFlexClientById,
	fetchErpFlexProductById,
	type TErpFlexClients,
} from "./client";
import { toCanonicalErpFlexImportBatch } from "./mappers";
import { ErpFlexConfigSchema, type TErpFlexBilling, type TErpFlexClient, type TErpFlexProduct } from "./types";

const LOG_PREFIX = "[ERP_FLEX_SYNC]";
const ERP_FLEX_MAX_DAYS_PER_SYNC = 92;

function toStringId(value: string | number | null | undefined) {
	if (value === null || value === undefined || value === "") return null;
	return String(value);
}

function listWindowDays(window: TCanonicalImportWindow) {
	const startDay = dayjs(window.startDate).startOf("day");
	const endDay = dayjs(window.endDate).startOf("day");
	const days: Date[] = [];
	for (let day = startDay; !day.isAfter(endDay) && days.length < ERP_FLEX_MAX_DAYS_PER_SYNC; day = day.add(1, "day")) {
		days.push(day.toDate());
	}
	return days;
}

/**
 * A consulta V2 não devolve flag de cancelamento: o filtro padrão OMITE canceladas e
 * `?nf_canceladas=S` as inclui. Cancelada = presente na lista completa e ausente da lista padrão.
 */
async function fetchDayBillings(clients: TErpFlexClients, date: Date) {
	const [allBillings, activeBillings] = await Promise.all([
		fetchErpFlexBillingsForDate({ clients, date, includeCanceled: true }),
		fetchErpFlexBillingsForDate({ clients, date, includeCanceled: false }),
	]);
	const activeIds = new Set(activeBillings.map((billing) => toStringId(billing.faturamento_id)).filter(Boolean));
	const canceledIds = new Set(
		allBillings
			.map((billing) => toStringId(billing.faturamento_id))
			.filter((id): id is string => !!id && !activeIds.has(id)),
	);
	return { billings: allBillings, canceledIds };
}

async function fetchBillingsWithItems(clients: TErpFlexClients, billings: TErpFlexBilling[]) {
	const detailed: TErpFlexBilling[] = [];
	const total = billings.length;

	for (const [index, billing] of billings.entries()) {
		const billingId = toStringId(billing.faturamento_id);
		if (!billingId) continue;
		if (billing.itens.length > 0) {
			detailed.push(billing);
			continue;
		}

		console.log(`${LOG_PREFIX} Buscando itens do faturamento ${index + 1}/${total} (id=${billingId})...`);

		try {
			const withItems = await fetchErpFlexBillingWithItems({ clients, billingId });
			detailed.push(withItems ? { ...billing, ...withItems, itens: withItems.itens } : billing);
		} catch (error) {
			console.warn(`${LOG_PREFIX} Falha ao buscar itens do faturamento ${billingId}. Usando dados da listagem.`, error);
			detailed.push(billing);
		}
	}

	return detailed;
}

async function fetchClientsForBillings(clients: TErpFlexClients, billings: TErpFlexBilling[]) {
	const clientIds = Array.from(new Set(billings.map((billing) => toStringId(billing.cliente_id)).filter(Boolean))) as string[];
	const clientsById = new Map<string, TErpFlexClient>();
	const total = clientIds.length;

	console.log(`${LOG_PREFIX} Buscando ${total} cliente(s) único(s)...`);

	for (const [index, clientId] of clientIds.entries()) {
		console.log(`${LOG_PREFIX} Buscando cliente ${index + 1}/${total} (id=${clientId})...`);

		try {
			const client = await fetchErpFlexClientById({ clients, clientId });
			if (client) clientsById.set(clientId, client);
		} catch (error) {
			console.warn(`${LOG_PREFIX} Falha ao buscar cliente ${clientId}.`, error);
		}
	}

	console.log(`${LOG_PREFIX} ${clientsById.size}/${total} cliente(s) obtido(s).`);
	return clientsById;
}

async function fetchProductsForBillings(clients: TErpFlexClients, billings: TErpFlexBilling[]) {
	const productIds = Array.from(
		new Set(billings.flatMap((billing) => billing.itens.map((item) => toStringId(item.produto_id))).filter(Boolean)),
	) as string[];
	const products: TErpFlexProduct[] = [];
	const total = productIds.length;

	console.log(`${LOG_PREFIX} Buscando ${total} produto(s) único(s)...`);

	for (const [index, productId] of productIds.entries()) {
		console.log(`${LOG_PREFIX} Buscando produto ${index + 1}/${total} (id=${productId})...`);

		try {
			const product = await fetchErpFlexProductById({ clients, productId });
			if (product) products.push(product);
		} catch (error) {
			console.warn(`${LOG_PREFIX} Falha ao buscar produto ${productId}.`, error);
		}
	}

	console.log(`${LOG_PREFIX} ${products.length}/${total} produto(s) obtido(s).`);
	return products;
}

export const erpFlexDataConnector: TDataConnector = {
	kind: "ERP-FLEX",
	fetchImportBatch: async ({ organizationId, integrationId, config, window }) => {
		const days = listWindowDays(window);
		console.log(
			`${LOG_PREFIX} Iniciando importação (org=${organizationId}, integração=${integrationId}, ${days.length} dia(s) na janela)...`,
		);

		const parsedConfig = ErpFlexConfigSchema.parse(config);
		const clients = createErpFlexClients(parsedConfig);

		const billings: TErpFlexBilling[] = [];
		const canceledBillingIds = new Set<string>();
		for (const day of days) {
			const dayResult = await fetchDayBillings(clients, day);
			billings.push(...dayResult.billings);
			for (const canceledId of dayResult.canceledIds) canceledBillingIds.add(canceledId);
		}
		console.log(`${LOG_PREFIX} ${billings.length} faturamento(s) encontrado(s) (${canceledBillingIds.size} cancelado(s)).`);

		const detailedBillings = await fetchBillingsWithItems(clients, billings);
		const [clientsById, products] = await Promise.all([
			fetchClientsForBillings(clients, detailedBillings),
			fetchProductsForBillings(clients, detailedBillings),
		]);

		const batch = toCanonicalErpFlexImportBatch({
			organizationId,
			window,
			billings: detailedBillings,
			canceledBillingIds,
			clientsById,
			products,
		});

		console.log(
			`${LOG_PREFIX} Batch canônico montado: ${batch.sales.length} venda(s), ${batch.products.length} produto(s).`,
		);

		return batch;
	},
};
