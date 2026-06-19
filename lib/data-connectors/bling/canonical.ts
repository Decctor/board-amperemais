import dayjs from "dayjs";
import type { TCanonicalImportWindow, TDataConnector } from "../types";
import { createBlingClient, fetchBlingPaginated, fetchBlingSingle, getValidBlingConfig } from "./client";
import { toCanonicalBlingImportBatch } from "./mappers";
import { BlingConfigSchema, BlingContactSchema, BlingProductSchema, BlingSaleSchema, type TBlingContact, type TBlingProduct, type TBlingSale } from "./types";

const LOG_PREFIX = "[BLING_SYNC]";

function formatBlingDate(date: Date) {
	return dayjs(date).format("YYYY-MM-DD");
}

async function fetchBlingSalesWithDetails(client: ReturnType<typeof createBlingClient>, window: TCanonicalImportWindow) {
	const dataInicial = formatBlingDate(window.startDate);
	const dataFinal = formatBlingDate(window.endDate);
	console.log(`${LOG_PREFIX} Listando pedidos de venda (${dataInicial} a ${dataFinal})...`);

	const saleSummaries = await fetchBlingPaginated<TBlingSale>(client, "/pedidos/vendas", BlingSaleSchema, {
		dataInicial,
		dataFinal,
	});
	console.log(`${LOG_PREFIX} ${saleSummaries.length} pedido(s) encontrado(s) na listagem.`);

	const sales: TBlingSale[] = [];
	const total = saleSummaries.length;

	for (const [index, sale] of saleSummaries.entries()) {
		const saleId = sale.id ? String(sale.id) : null;
		if (!saleId) continue;

		console.log(`${LOG_PREFIX} Buscando detalhes do pedido ${index + 1}/${total} (id=${saleId})...`);

		try {
			sales.push(await fetchBlingSingle<TBlingSale>(client, `/pedidos/vendas/${saleId}`, BlingSaleSchema));
		} catch (error) {
			console.warn(`${LOG_PREFIX} Falha ao buscar detalhes do pedido ${saleId}. Usando dados da listagem.`, error);
			sales.push(sale);
		}
	}

	console.log(`${LOG_PREFIX} Detalhes de ${sales.length} pedido(s) obtidos.`);
	return sales;
}

async function fetchBlingContactsForSales(client: ReturnType<typeof createBlingClient>, sales: TBlingSale[]) {
	const contactIds = Array.from(new Set(sales.map((sale) => (sale.contato?.id ? String(sale.contato.id) : null)).filter(Boolean)));
	const contacts: TBlingContact[] = [];
	const total = contactIds.length;

	console.log(`${LOG_PREFIX} Buscando ${total} contato(s) único(s)...`);

	for (const [index, contactId] of contactIds.entries()) {
		console.log(`${LOG_PREFIX} Buscando contato ${index + 1}/${total} (id=${contactId})...`);

		try {
			contacts.push(await fetchBlingSingle<TBlingContact>(client, `/contatos/${contactId}`, BlingContactSchema));
		} catch (error) {
			console.warn(`${LOG_PREFIX} Falha ao buscar contato ${contactId}.`, error);
		}
	}

	console.log(`${LOG_PREFIX} ${contacts.length}/${total} contato(s) obtido(s).`);
	return contacts;
}

async function fetchBlingProductsForSales(client: ReturnType<typeof createBlingClient>, sales: TBlingSale[]) {
	const productIds = Array.from(
		new Set(sales.flatMap((sale) => sale.itens.map((item) => (item.produto?.id ? String(item.produto.id) : null))).filter(Boolean)),
	);
	const products: TBlingProduct[] = [];
	const total = productIds.length;

	console.log(`${LOG_PREFIX} Buscando ${total} produto(s) único(s)...`);

	for (const [index, productId] of productIds.entries()) {
		console.log(`${LOG_PREFIX} Buscando produto ${index + 1}/${total} (id=${productId})...`);

		try {
			products.push(await fetchBlingSingle<TBlingProduct>(client, `/produtos/${productId}`, BlingProductSchema));
		} catch (error) {
			console.warn(`${LOG_PREFIX} Falha ao buscar produto ${productId}.`, error);
		}
	}

	console.log(`${LOG_PREFIX} ${products.length}/${total} produto(s) obtido(s).`);
	return products;
}

export const blingDataConnector: TDataConnector = {
	kind: "BLING",
	fetchImportBatch: async ({ organizationId, config, window }) => {
		const dataInicial = formatBlingDate(window.startDate);
		const dataFinal = formatBlingDate(window.endDate);
		console.log(`${LOG_PREFIX} Iniciando importação (org=${organizationId}, período=${dataInicial} a ${dataFinal})...`);

		const parsedConfig = BlingConfigSchema.parse(config);
		const validConfig = await getValidBlingConfig({ organizationId, config: parsedConfig });
		const client = createBlingClient(validConfig);

		const sales = await fetchBlingSalesWithDetails(client, window);
		const [contacts, products] = await Promise.all([
			fetchBlingContactsForSales(client, sales),
			fetchBlingProductsForSales(client, sales),
		]);

		const batch = toCanonicalBlingImportBatch({
			organizationId,
			window,
			sales,
			contacts,
			products,
		});

		console.log(`${LOG_PREFIX} Batch canônico montado: ${batch.sales.length} venda(s), ${batch.products.length} produto(s), ${batch.sellers.length} vendedor(es).`);

		return batch;
	},
};
