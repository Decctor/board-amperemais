import dayjs from "dayjs";
import type { TCanonicalImportWindow, TDataConnector } from "../types";
import { createBlingClient, fetchBlingPaginated, fetchBlingSingle, getValidBlingConfig } from "./client";
import { toCanonicalBlingImportBatch } from "./mappers";
import {
	BlingChannelSchema,
	BlingConfigSchema,
	BlingContactSchema,
	BlingProductSchema,
	BlingSaleSchema,
	type TBlingChannel,
	type TBlingContact,
	type TBlingProduct,
	type TBlingSale,
} from "./types";

function formatBlingDate(date: Date) {
	return dayjs(date).format("YYYY-MM-DD");
}

async function fetchBlingSalesWithDetails(client: ReturnType<typeof createBlingClient>, window: TCanonicalImportWindow) {
	const saleSummaries = await fetchBlingPaginated<TBlingSale>(client, "/pedidos/vendas", BlingSaleSchema, {
		dataInicial: formatBlingDate(window.startDate),
		dataFinal: formatBlingDate(window.endDate),
	});

	const sales: TBlingSale[] = [];
	for (const sale of saleSummaries) {
		const saleId = sale.id ? String(sale.id) : null;
		if (!saleId) continue;

		try {
			sales.push(await fetchBlingSingle<TBlingSale>(client, `/pedidos/vendas/${saleId}`, BlingSaleSchema));
		} catch (error) {
			console.warn(`[BLING_SYNC] Falha ao buscar detalhes do pedido ${saleId}. Usando dados da listagem.`, error);
			sales.push(sale);
		}
	}

	return sales;
}

async function fetchBlingContactsForSales(client: ReturnType<typeof createBlingClient>, sales: TBlingSale[]) {
	const contactIds = Array.from(new Set(sales.map((sale) => (sale.contato?.id ? String(sale.contato.id) : null)).filter(Boolean)));
	const contacts: TBlingContact[] = [];

	for (const contactId of contactIds) {
		try {
			contacts.push(await fetchBlingSingle<TBlingContact>(client, `/contatos/${contactId}`, BlingContactSchema));
		} catch (error) {
			console.warn(`[BLING_SYNC] Falha ao buscar contato ${contactId}.`, error);
		}
	}

	return contacts;
}

async function fetchBlingProductsForSales(client: ReturnType<typeof createBlingClient>, sales: TBlingSale[]) {
	const productIds = Array.from(
		new Set(sales.flatMap((sale) => sale.itens.map((item) => (item.produto?.id ? String(item.produto.id) : null))).filter(Boolean)),
	);
	const products: TBlingProduct[] = [];

	for (const productId of productIds) {
		try {
			products.push(await fetchBlingSingle<TBlingProduct>(client, `/produtos/${productId}`, BlingProductSchema));
		} catch (error) {
			console.warn(`[BLING_SYNC] Falha ao buscar produto ${productId}.`, error);
		}
	}

	return products;
}

async function fetchBlingChannelsForSales(client: ReturnType<typeof createBlingClient>, sales: TBlingSale[]) {
	const channelIds = Array.from(new Set(sales.map((sale) => (sale.loja?.id ? String(sale.loja.id) : null)).filter(Boolean)));
	const channels: TBlingChannel[] = [];

	for (const channelId of channelIds) {
		try {
			channels.push(await fetchBlingSingle<TBlingChannel>(client, `/canais-venda/${channelId}`, BlingChannelSchema));
		} catch (error) {
			console.warn(`[BLING_SYNC] Falha ao buscar canal de venda ${channelId}.`, error);
		}
	}

	return channels;
}

export const blingDataConnector: TDataConnector = {
	kind: "BLING",
	fetchImportBatch: async ({ organizationId, config, window }) => {
		const parsedConfig = BlingConfigSchema.parse(config);
		const validConfig = await getValidBlingConfig({ organizationId, config: parsedConfig });
		const client = createBlingClient(validConfig);
		const sales = await fetchBlingSalesWithDetails(client, window);
		const [contacts, products, channels] = await Promise.all([
			fetchBlingContactsForSales(client, sales),
			fetchBlingProductsForSales(client, sales),
			fetchBlingChannelsForSales(client, sales),
		]);

		return toCanonicalBlingImportBatch({
			organizationId,
			window,
			sales,
			contacts,
			products,
			channels,
		});
	},
};
