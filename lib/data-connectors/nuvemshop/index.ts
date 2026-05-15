import axios, { isAxiosError, type AxiosInstance } from "axios";
import type { TCanonicalImportWindow } from "../types";
import { toCanonicalNuvemshopImportBatch } from "./mappers";
import { NuvemshopConfigSchema, NuvemshopOrdersOutputSchema, type TNuvemshopConfig, type TNuvemshopOrder } from "./types";

const NUVEMSHOP_API_URL = "https://api.nuvemshop.com.br";
const NUVEMSHOP_ORDERS_PER_PAGE = 200;
const NUVEMSHOP_MAX_PAGES_PER_WINDOW = 50;

function getUserAgent() {
	const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://recompracrm.com";
	return `RecompraCRM (${appUrl})`;
}

function createNuvemshopClient(config: TNuvemshopConfig) {
	return axios.create({
		baseURL: `${NUVEMSHOP_API_URL}/v1/${config.storeId}`,
		headers: {
			Authentication: `bearer ${config.accessToken}`,
			"User-Agent": getUserAgent(),
			"Content-Type": "application/json",
		},
		timeout: 30000,
	});
}

function getRetryAfterMs(value: string | undefined) {
	if (!value) return null;
	const seconds = Number(value);
	if (!Number.isFinite(seconds)) return null;
	return seconds * 1000;
}

function delay(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getNuvemshopOrdersPage({
	client,
	window,
	page,
}: {
	client: AxiosInstance;
	window: TCanonicalImportWindow;
	page: number;
}) {
	try {
		const response = await client.get<unknown>("/orders", {
			params: {
				status: "any",
				updated_at_min: window.startDate.toISOString(),
				updated_at_max: window.endDate.toISOString(),
				page,
				per_page: NUVEMSHOP_ORDERS_PER_PAGE,
			},
		});

		return NuvemshopOrdersOutputSchema.parse(response.data);
	} catch (error) {
		if (isAxiosError(error) && error.response?.status === 429) {
			const retryAfterMs = getRetryAfterMs(error.response.headers["retry-after"]) ?? 30000;
			console.warn(`[NUVEMSHOP] Rate limit atingido. Aguardando ${retryAfterMs / 1000}s antes de tentar novamente.`);
			await delay(retryAfterMs);
			const response = await client.get<unknown>("/orders", {
				params: {
					status: "any",
					updated_at_min: window.startDate.toISOString(),
					updated_at_max: window.endDate.toISOString(),
					page,
					per_page: NUVEMSHOP_ORDERS_PER_PAGE,
				},
			});
			return NuvemshopOrdersOutputSchema.parse(response.data);
		}

		throw error;
	}
}

export async function fetchAllNuvemshopOrders(config: TNuvemshopConfig, window: TCanonicalImportWindow) {
	const client = createNuvemshopClient(config);
	const orders: TNuvemshopOrder[] = [];

	for (let page = 1; page <= NUVEMSHOP_MAX_PAGES_PER_WINDOW; page++) {
		const pageOrders = await getNuvemshopOrdersPage({ client, window, page });
		orders.push(...pageOrders);

		if (pageOrders.length < NUVEMSHOP_ORDERS_PER_PAGE) break;
	}

	return orders;
}

export async function fetchNuvemshopImportBatch({
	organizationId,
	config,
	window,
}: {
	organizationId: string;
	config: TNuvemshopConfig;
	window: TCanonicalImportWindow;
}) {
	const parsedConfig = NuvemshopConfigSchema.parse(config);
	const orders = await fetchAllNuvemshopOrders(parsedConfig, window);
	return toCanonicalNuvemshopImportBatch({ organizationId, window, orders });
}

export * from "./mappers";
export * from "./types";
