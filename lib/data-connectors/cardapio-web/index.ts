import axios, { type AxiosInstance, type AxiosError } from "axios";
import {
	CardapioWebConfigSchema,
	GetCardapioWebCatalogOutputSchema,
	GetCardapioWebOrderDetailsInputSchema,
	GetCardapioWebOrderDetailsOutputSchema,
	GetCardapioWebOrderHistoryInputSchema,
	GetCardapioWebOrderHistoryOutputSchema,
	type TCardapioWebConfig,
	type TGetCardapioWebCatalogOutput,
	type TGetCardapioWebOrderDetailsInput,
	type TGetCardapioWebOrderDetailsOutput,
	type TGetCardapioWebOrderHistoryInput,
	type TGetCardapioWebOrderHistoryOutput,
} from "./types";

export const CARDAPIO_WEB_API_URL_PRODUCTION = "https://integracao.cardapioweb.com";
export const CARDAPIO_WEB_RATE_LIMIT_PER_MINUTE = 400;
export const CARDAPIO_WEB_RATE_LIMIT_PER_MINUTE_HISTORY = 5;

/**
 * Rate Limiter com controle de burst (requisições por segundo)
 *
 * Problema: APIs frequentemente têm dois limites:
 * - Rate limit por minuto (ex: 400/min) - documentado
 * - Burst limit por segundo (ex: 5-10/s) - não documentado
 *
 * Esta implementação garante:
 * 1. Delay mínimo entre requisições (controle de burst)
 * 2. Token bucket para controle por minuto
 * 3. Retry automático com backoff quando atingir limite
 */
class RateLimiter {
	private tokens: number;
	private readonly maxTokens: number;
	private readonly refillRate: number; // tokens per ms
	private lastRefillTime: number;
	private lastRequestTime = 0;
	private readonly minDelayBetweenRequests: number; // ms entre requisições
	private requestTimestamps: number[] = [];
	private readonly windowMs: number;

	constructor(requestsPerMinute: number, options: { safetyMargin?: number; maxRequestsPerSecond?: number } = {}) {
		const { safetyMargin = 0.7, maxRequestsPerSecond = 5 } = options;

		// Apply safety margin for per-minute limit
		const safeLimit = Math.floor(requestsPerMinute * safetyMargin);
		this.maxTokens = safeLimit;
		this.tokens = safeLimit;
		this.refillRate = safeLimit / (60 * 1000); // tokens per ms
		this.lastRefillTime = Date.now();
		this.windowMs = 60 * 1000; // 1 minute sliding window

		// Burst control: minimum delay between requests
		// maxRequestsPerSecond = 4 means 250ms minimum between requests
		this.minDelayBetweenRequests = Math.ceil(1000 / maxRequestsPerSecond);
	}

	private refillTokens(): void {
		const now = Date.now();
		const timePassed = now - this.lastRefillTime;
		const tokensToAdd = timePassed * this.refillRate;
		this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
		this.lastRefillTime = now;

		// Clean old timestamps from sliding window
		const windowStart = now - this.windowMs;
		this.requestTimestamps = this.requestTimestamps.filter((t) => t > windowStart);
	}

	/**
	 * Calcula quanto tempo esperar antes de poder fazer a próxima requisição
	 * Considera tanto o token bucket quanto o delay mínimo entre requisições
	 */
	getWaitTime(): number {
		this.refillTokens();
		const now = Date.now();

		// Check burst limit (minimum delay between requests)
		const timeSinceLastRequest = now - this.lastRequestTime;
		const burstWaitTime = Math.max(0, this.minDelayBetweenRequests - timeSinceLastRequest);

		// Check token bucket limit
		let tokenWaitTime = 0;
		if (this.tokens < 1) {
			const tokensNeeded = 1 - this.tokens;
			tokenWaitTime = Math.ceil(tokensNeeded / this.refillRate);
		}

		// Return the maximum of both waits
		return Math.max(burstWaitTime, tokenWaitTime);
	}

	/**
	 * Consome um token e registra a requisição
	 */
	consumeToken(): void {
		this.refillTokens();
		this.tokens = Math.max(0, this.tokens - 1);
		this.lastRequestTime = Date.now();
		this.requestTimestamps.push(this.lastRequestTime);
	}

	/**
	 * Retorna estatísticas atuais do rate limiter
	 */
	getStats(): {
		tokensAvailable: number;
		requestsInWindow: number;
		maxTokens: number;
		minDelayMs: number;
	} {
		this.refillTokens();
		return {
			tokensAvailable: Math.floor(this.tokens),
			requestsInWindow: this.requestTimestamps.length,
			maxTokens: this.maxTokens,
			minDelayMs: this.minDelayBetweenRequests,
		};
	}

	/**
	 * Aguarda até que um token esteja disponível E o delay mínimo tenha passado
	 */
	async waitForToken(): Promise<void> {
		const waitTime = this.getWaitTime();
		if (waitTime > 0) {
			await delay(waitTime);
		}
		this.consumeToken();
	}

	/**
	 * Força uma pausa quando receber 429 (baseado em Retry-After ou backoff)
	 */
	async handleRateLimitHit(retryAfterSeconds?: number): Promise<void> {
		// Reset tokens to 0 since we hit the limit
		this.tokens = 0;
		this.lastRefillTime = Date.now();

		// Use Retry-After header if available, otherwise use exponential backoff base
		const waitMs = retryAfterSeconds ? retryAfterSeconds * 1000 : 30000; // Default 30s
		console.log(`[RATE-LIMITER] Rate limit atingido! Aguardando ${waitMs / 1000}s antes de continuar...`);
		await delay(waitMs);
	}
}

// Global rate limiter instances for CardapioWeb
let cardapioWebHistoryRateLimiter: RateLimiter | null = null;
let cardapioWebDetailsRateLimiter: RateLimiter | null = null;
let cardapioWebCatalogRateLimiter: RateLimiter | null = null;

/**
 * Rate limiter para o endpoint de history (5 req/min)
 */
function getCardapioWebHistoryRateLimiter(): RateLimiter {
	if (!cardapioWebHistoryRateLimiter) {
		cardapioWebHistoryRateLimiter = new RateLimiter(CARDAPIO_WEB_RATE_LIMIT_PER_MINUTE_HISTORY, {
			safetyMargin: 1.0, // Sem margem - já é super baixo (5 req/min)
			maxRequestsPerSecond: 1, // Max 1 req/s para evitar burst
		});
	}
	return cardapioWebHistoryRateLimiter;
}

/**
 * Rate limiter para o endpoint de details (400 req/min)
 */
function getCardapioWebDetailsRateLimiter(): RateLimiter {
	if (!cardapioWebDetailsRateLimiter) {
		cardapioWebDetailsRateLimiter = new RateLimiter(CARDAPIO_WEB_RATE_LIMIT_PER_MINUTE, {
			safetyMargin: 0.7, // 280 req/min (70% of 400)
			maxRequestsPerSecond: 5, // Max 5 req/s = 200ms entre requisições
		});
	}
	return cardapioWebDetailsRateLimiter;
}

/**
 * Rate limiter para o endpoint de catalog (5 req/min - mesmo que history)
 */
function getCardapioWebCatalogRateLimiter(): RateLimiter {
	if (!cardapioWebCatalogRateLimiter) {
		cardapioWebCatalogRateLimiter = new RateLimiter(CARDAPIO_WEB_RATE_LIMIT_PER_MINUTE_HISTORY, {
			safetyMargin: 1.0, // Sem margem - já é super baixo (5 req/min)
			maxRequestsPerSecond: 1, // Max 1 req/s para evitar burst
		});
	}
	return cardapioWebCatalogRateLimiter;
}

/**
 * Reseta os rate limiters (útil para testes ou quando iniciar nova sessão)
 */
export function resetCardapioWebRateLimiters(): void {
	cardapioWebHistoryRateLimiter = null;
	cardapioWebDetailsRateLimiter = null;
	cardapioWebCatalogRateLimiter = null;
}

/**
 * Delay helper function
 */
function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Executa uma requisição com retry automático e rate limiting
 */
async function executeWithRateLimitAndRetry<T>(fn: () => Promise<T>, rateLimiter: RateLimiter, maxRetries = 3, context = "request"): Promise<T> {
	let lastError: Error | null = null;

	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			// Wait for rate limiter before making request
			await rateLimiter.waitForToken();

			return await fn();
		} catch (error) {
			lastError = error as Error;
			const axiosError = error as AxiosError;

			if (axiosError.response?.status === 429) {
				// Rate limit hit - extract Retry-After if available
				const retryAfter = axiosError.response.headers["retry-after"];
				const retryAfterSeconds = retryAfter ? Number.parseInt(retryAfter as string, 10) : undefined;

				console.warn(`[CARDAPIO-WEB] 429 Too Many Requests no ${context} (tentativa ${attempt}/${maxRetries})`);

				if (attempt < maxRetries) {
					// Apply exponential backoff on top of Retry-After
					const backoffMultiplier = 2 ** (attempt - 1);
					const baseWait = retryAfterSeconds || 30;
					await rateLimiter.handleRateLimitHit(baseWait * backoffMultiplier);
					continue;
				}
			} else if (axiosError.response?.status && axiosError.response.status >= 500) {
				// Server error - retry with backoff
				console.warn(`[CARDAPIO-WEB] Erro ${axiosError.response.status} no ${context} (tentativa ${attempt}/${maxRetries})`);

				if (attempt < maxRetries) {
					const backoffMs = 2 ** attempt * 1000; // 2s, 4s, 8s
					await delay(backoffMs);
					continue;
				}
			}

			// For other errors or max retries reached, throw
			throw error;
		}
	}

	throw lastError;
}

/**
 * Creates an authenticated Axios instance for CardapioWeb API
 */
export function createCardapioWebClient(config: TCardapioWebConfig): AxiosInstance {
	const validatedConfig = CardapioWebConfigSchema.parse(config);
	return axios.create({
		baseURL: CARDAPIO_WEB_API_URL_PRODUCTION,
		headers: {
			"X-Merchant-Id": validatedConfig.merchantId,
			"X-Api-Key": validatedConfig.apiKey,
			"Content-Type": "application/json",
		},
	});
}

/**
 * Fetches a single page of order history from CardapioWeb API
 * Usa rate limiting especial para history (5 req/min) e retry automático
 */
export async function getCardapioWebOrderHistory(
	client: AxiosInstance,
	input: TGetCardapioWebOrderHistoryInput,
): Promise<TGetCardapioWebOrderHistoryOutput> {
	const validatedInput = GetCardapioWebOrderHistoryInputSchema.parse(input);
	const searchParams = new URLSearchParams();
	if (validatedInput.page) searchParams.set("page", validatedInput.page.toString());
	if (validatedInput.per_page) searchParams.set("per_page", validatedInput.per_page.toString());
	searchParams.set("start_date", validatedInput.start_date);
	searchParams.set("end_date", validatedInput.end_date);
	if (validatedInput.status && validatedInput.status.length > 0) {
		searchParams.set("status", validatedInput.status.join(","));
	}

	return executeWithRateLimitAndRetry(
		async () => {
			const { data } = await client.get<TGetCardapioWebOrderHistoryOutput>(`/api/partner/v1/orders/history?${searchParams.toString()}`);
			return GetCardapioWebOrderHistoryOutputSchema.parse(data);
		},
		getCardapioWebHistoryRateLimiter(), // Rate limiter específico para history
		3,
		`history page ${validatedInput.page || 1}`,
	);
}

/**
 * Fetches order details from CardapioWeb API
 * Usa rate limiting normal (400 req/min) e retry automático
 */
export async function getCardapioWebOrderDetails(
	client: AxiosInstance,
	input: TGetCardapioWebOrderDetailsInput,
): Promise<TGetCardapioWebOrderDetailsOutput> {
	const validatedInput = GetCardapioWebOrderDetailsInputSchema.parse(input);

	return executeWithRateLimitAndRetry(
		async () => {
			const { data } = await client.get<TGetCardapioWebOrderDetailsOutput>(`/api/partner/v1/orders/${validatedInput.order_id}`);
			return GetCardapioWebOrderDetailsOutputSchema.parse(data);
		},
		getCardapioWebDetailsRateLimiter(), // Rate limiter específico para details
		3,
		`order ${validatedInput.order_id}`,
	);
}

/**
 * Fetches the store catalog from CardapioWeb API
 * Usa rate limiting especial para catalog (5 req/min - mesmo que history) e retry automático
 */
export async function getCardapioWebCatalog(client: AxiosInstance): Promise<TGetCardapioWebCatalogOutput> {
	return executeWithRateLimitAndRetry(
		async () => {
			const { data } = await client.get<TGetCardapioWebCatalogOutput>("/api/partner/v1/catalog");
			return GetCardapioWebCatalogOutputSchema.parse(data);
		},
		getCardapioWebCatalogRateLimiter(), // Rate limiter específico para catalog
		3,
		"catalog",
	);
}

/**
 * Fetches ALL orders for a given date range, handling pagination automatically.
 * Usa rate limiting especial para history (5 req/min - super lento!).
 *
 * ATENÇÃO: Com 5 req/min, cada página leva ~12s. 37 páginas = ~7 minutos!
 */
export async function fetchAllCardapioWebOrders(
	client: AxiosInstance,
	startDate: string,
	endDate: string,
	status?: ("closed" | "canceled")[],
): Promise<TGetCardapioWebOrderHistoryOutput["orders"]> {
	const allOrders: TGetCardapioWebOrderHistoryOutput["orders"] = [];
	let currentPage = 1;
	let totalPages = 1;
	const rateLimiter = getCardapioWebHistoryRateLimiter();
	const startTime = Date.now();

	do {
		const response = await getCardapioWebOrderHistory(client, {
			page: currentPage,
			per_page: 100, // Max allowed
			start_date: startDate,
			end_date: endDate,
			status,
		});

		allOrders.push(...response.orders);
		totalPages = response.pagination.total_pages;

		const stats = rateLimiter.getStats();
		const elapsed = Math.round((Date.now() - startTime) / 1000);
		const avgTimePerPage = elapsed / currentPage;
		const remainingPages = totalPages - currentPage;
		const estimatedRemaining = Math.round(avgTimePerPage * remainingPages);

		console.log(
			`[CARDAPIO-WEB] Página ${currentPage}/${totalPages} ` +
				`(${response.orders.length} pedidos) | ${elapsed}s elapsed | ~${estimatedRemaining}s restante | ` +
				`Rate: ${stats.requestsInWindow}/${stats.maxTokens} req/min (HISTORY endpoint)`,
		);

		currentPage++;
	} while (currentPage <= totalPages);

	return allOrders;
}

/**
 * Fetches order details for multiple orders SEQUENTIALLY.
 * Usa rate limiting normal (400 req/min) para o endpoint de details.
 *
 * Com maxRequestsPerSecond = 5:
 * - 100 pedidos = ~20 segundos
 * - 1000 pedidos = ~3,3 minutos
 * - 3700 pedidos = ~12 minutos
 */
export async function fetchOrderDetailsInBatches(client: AxiosInstance, orderIds: number[]): Promise<TGetCardapioWebOrderDetailsOutput[]> {
	const results: TGetCardapioWebOrderDetailsOutput[] = [];
	const rateLimiter = getCardapioWebDetailsRateLimiter();
	let completed = 0;
	let failed = 0;
	const startTime = Date.now();

	for (let i = 0; i < orderIds.length; i++) {
		const orderId = orderIds[i];

		try {
			const result = await getCardapioWebOrderDetails(client, { order_id: orderId });
			results.push(result);
			completed++;
		} catch (error) {
			failed++;
			const err = error as Error;
			console.error(`[CARDAPIO-WEB] Erro ao buscar pedido ${orderId}:`, err.message || error);
		}

		// Log progress every 50 orders
		if ((completed + failed) % 50 === 0 || i === orderIds.length - 1) {
			const stats = rateLimiter.getStats();
			const elapsed = Math.round((Date.now() - startTime) / 1000);
			const rate = completed / (elapsed || 1);
			const remaining = Math.round((orderIds.length - i - 1) / rate);

			console.log(
				`[CARDAPIO-WEB] Detalhes: ${completed}/${orderIds.length} ` +
					`(${failed} falhas) | ${elapsed}s elapsed | ~${remaining}s restante | ` +
					`Rate: ${stats.requestsInWindow} req/min (DETAILS endpoint)`,
			);
		}
	}

	return results;
}

/**
 * Main function: Fetches all orders for a date range with their full details.
 * This is the primary entry point for the data-collecting cron job.
 */
export async function fetchCardapioWebOrdersWithDetails(
	config: TCardapioWebConfig,
	startDate: string,
	endDate: string,
): Promise<TGetCardapioWebOrderDetailsOutput[]> {
	const client = createCardapioWebClient(config);

	// Step 1: Fetch all order summaries (handles pagination)
	console.log(`[CARDAPIO-WEB] Buscando pedidos de ${startDate} até ${endDate}...`);
	const orderSummaries = await fetchAllCardapioWebOrders(client, startDate, endDate, ["closed", "canceled"]);
	console.log(`[CARDAPIO-WEB] ${orderSummaries.length} pedidos encontrados.`);

	if (orderSummaries.length === 0) {
		return [];
	}

	// Step 2: Fetch details for all orders (handles rate limiting via batches)
	const orderIds = orderSummaries.map((order) => order.id);
	console.log(`[CARDAPIO-WEB] Buscando detalhes de ${orderIds.length} pedidos...`);
	const orderDetails = await fetchOrderDetailsInBatches(client, orderIds);
	console.log(`[CARDAPIO-WEB] Detalhes de ${orderDetails.length} pedidos carregados.`);

	return orderDetails;
}
