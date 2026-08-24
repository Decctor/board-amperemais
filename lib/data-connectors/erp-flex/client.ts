import axios, { isAxiosError, type AxiosInstance } from "axios";
import dayjs from "dayjs";
import {
	ERP_FLEX_API_V1_BASE_URL,
	ERP_FLEX_API_V2_BASE_URL,
	ERP_FLEX_BILLING_PAGE_SIZE,
	ErpFlexBillingListResponseSchema,
	ErpFlexBillingSchema,
	ErpFlexClientSchema,
	ErpFlexProductSchema,
	type TErpFlexBilling,
	type TErpFlexClient,
	type TErpFlexConfig,
	type TErpFlexProduct,
} from "./types";

const ERP_FLEX_MAX_RETRIES = 3;
const ERP_FLEX_MAX_PAGES_PER_DAY = 200;

export type TErpFlexClients = {
	v1: AxiosInstance;
	v2: AxiosInstance;
};

/**
 * Basic Auth com o usuário/senha de API provisionados pelo time do ERPFlex. As duas gerações da
 * API (V1 cadastros, V2 lançamentos) compartilham as mesmas credenciais.
 */
export function createErpFlexClients(config: TErpFlexConfig): TErpFlexClients {
	const auth = { username: config.username, password: config.password };
	const headers = { "Content-Type": "application/json" };
	return {
		v1: axios.create({ baseURL: ERP_FLEX_API_V1_BASE_URL, auth, headers, timeout: 30000 }),
		v2: axios.create({ baseURL: ERP_FLEX_API_V2_BASE_URL, auth, headers, timeout: 30000 }),
	};
}

function delay(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * A base da API do ERPFlex é atualizada periodicamente com cópia da produção e a documentação
 * recomenda aguardar e tentar de novo em instabilidades — daí o retry com backoff em 5xx/timeout.
 */
async function requestWithRetry<T>(request: () => Promise<T>, context: string): Promise<T> {
	for (let attempt = 1; attempt <= ERP_FLEX_MAX_RETRIES; attempt++) {
		try {
			return await request();
		} catch (error) {
			if (!isAxiosError(error)) throw error;

			const status = error.response?.status;
			const shouldRetry = status === 429 || (status !== undefined && status >= 500) || error.code === "ECONNABORTED";
			if (!shouldRetry || attempt === ERP_FLEX_MAX_RETRIES) throw error;

			const waitMs = 1000 * 2 ** (attempt - 1);
			console.warn(
				`[ERP_FLEX_CLIENT] ${context} falhou com status ${status ?? error.code}. Tentativa ${attempt}/${ERP_FLEX_MAX_RETRIES}; aguardando ${waitMs}ms.`,
			);
			await delay(waitMs);
		}
	}

	throw new Error(`[ERP_FLEX_CLIENT] Falha inesperada em ${context}.`);
}

/**
 * Normaliza os envelopes da API: lista embrulhada (`{ faturamentos: [...] }`), lista crua ou
 * objeto único — a documentação não fixa um formato e as consultas unitárias variam.
 */
function unwrapErpFlexList(data: unknown): unknown[] {
	if (Array.isArray(data)) return data;
	if (data && typeof data === "object") {
		const parsed = ErpFlexBillingListResponseSchema.safeParse(data);
		if (parsed.success && Array.isArray(parsed.data.faturamentos)) return parsed.data.faturamentos;
		return [data];
	}
	return [];
}

function unwrapErpFlexEntity(data: unknown, listKeys: string[]): unknown | null {
	if (Array.isArray(data)) return data[0] ?? null;
	if (!data || typeof data !== "object") return null;
	for (const key of listKeys) {
		const nested = (data as Record<string, unknown>)[key];
		if (Array.isArray(nested)) return nested[0] ?? null;
		if (nested && typeof nested === "object") return nested;
	}
	return data;
}

function formatErpFlexDateSegment(date: Date) {
	return dayjs(date).format("DD-MM-YYYY");
}

/**
 * Lista os faturamentos de UM dia — a consulta V2 só filtra por data específica (`/d{DD-MM-YYYY}`),
 * paginada em blocos de 10 (`/P{n}`). A composição `d{data}/P{n}` segue a regra documentada de
 * anexar comandos ao fim da URL; validar na primeira execução com credenciais reais.
 */
export async function fetchErpFlexBillingsForDate({
	clients,
	date,
	includeCanceled,
}: {
	clients: TErpFlexClients;
	date: Date;
	includeCanceled: boolean;
}): Promise<TErpFlexBilling[]> {
	const dateSegment = formatErpFlexDateSegment(date);
	const billings: TErpFlexBilling[] = [];

	for (let page = 1; page <= ERP_FLEX_MAX_PAGES_PER_DAY; page++) {
		const path = `/faturamento/d${dateSegment}/P${page}`;
		const response = await requestWithRetry(
			() => clients.v2.get<unknown>(path, { params: includeCanceled ? { nf_canceladas: "S" } : undefined }),
			`GET ${path}${includeCanceled ? "?nf_canceladas=S" : ""}`,
		);
		const pageItems = unwrapErpFlexList(response.data).map((item) => ErpFlexBillingSchema.parse(item));
		billings.push(...pageItems);
		if (pageItems.length < ERP_FLEX_BILLING_PAGE_SIZE) break;
	}

	return billings;
}

/** Consulta unitária com itens (`/faturamento/itens/{id}`) — é o único caminho documentado para os itens. */
export async function fetchErpFlexBillingWithItems({
	clients,
	billingId,
}: {
	clients: TErpFlexClients;
	billingId: string;
}): Promise<TErpFlexBilling | null> {
	const path = `/faturamento/itens/${billingId}`;
	const response = await requestWithRetry(() => clients.v2.get<unknown>(path), `GET ${path}`);
	const entity = unwrapErpFlexEntity(response.data, ["faturamentos", "faturamento"]);
	if (!entity) return null;
	return ErpFlexBillingSchema.parse(entity);
}

export async function fetchErpFlexClientById({
	clients,
	clientId,
}: {
	clients: TErpFlexClients;
	clientId: string;
}): Promise<TErpFlexClient | null> {
	const path = `/cliente/${clientId}`;
	const response = await requestWithRetry(() => clients.v1.get<unknown>(path), `GET ${path}`);
	const entity = unwrapErpFlexEntity(response.data, ["clientes", "cliente"]);
	if (!entity) return null;
	return ErpFlexClientSchema.parse(entity);
}

export async function fetchErpFlexProductById({
	clients,
	productId,
}: {
	clients: TErpFlexClients;
	productId: string;
}): Promise<TErpFlexProduct | null> {
	const path = `/produto/${productId}`;
	const response = await requestWithRetry(() => clients.v1.get<unknown>(path), `GET ${path}`);
	const entity = unwrapErpFlexEntity(response.data, ["produtos", "produto"]);
	if (!entity) return null;
	return ErpFlexProductSchema.parse(entity);
}
