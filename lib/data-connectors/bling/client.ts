import { db } from "@/services/drizzle";
import { organizations } from "@/services/drizzle/schema";
import axios, { isAxiosError, type AxiosInstance } from "axios";
import dayjs from "dayjs";
import { eq } from "drizzle-orm";
import {
	BLING_API_BASE_URL,
	BLING_TOKEN_URL,
	BlingListOutputSchema,
	BlingSingleOutputSchema,
	BlingTokenResponseSchema,
	type TBlingConfig,
} from "./types";

const BLING_TOKEN_REFRESH_SKEW_MINUTES = 10;
const BLING_PAGE_LIMIT = 100;
const BLING_MAX_PAGES_PER_SYNC = 100;
const BLING_MAX_RETRIES = 3;

function getBlingCredentials() {
	const clientId = process.env.BLING_CLIENT_ID;
	const clientSecret = process.env.BLING_CLIENT_SECRET;
	if (!clientId || !clientSecret) throw new Error("Credenciais do Bling não configuradas.");
	return { clientId, clientSecret };
}

function getBasicAuthorizationHeader() {
	const { clientId, clientSecret } = getBlingCredentials();
	return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
}

function toFormUrlEncoded(data: Record<string, string>) {
	const params = new URLSearchParams();
	for (const [key, value] of Object.entries(data)) params.set(key, value);
	return params;
}

function getExpiresAt(expiresIn: number) {
	return dayjs().add(expiresIn, "seconds").toISOString();
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

export function getBlingRedirectUri() {
	const appUrl = process.env.NEXT_PUBLIC_APP_URL;
	if (!appUrl) throw new Error("NEXT_PUBLIC_APP_URL não configurado.");
	return `${appUrl}/api/integrations/bling/auth/callback`;
}

export async function exchangeBlingAuthorizationCode({ code }: { code: string }) {
	const response = await axios.post(
		BLING_TOKEN_URL,
		toFormUrlEncoded({
			grant_type: "authorization_code",
			code,
			redirect_uri: getBlingRedirectUri(),
		}),
		{
			headers: {
				Authorization: getBasicAuthorizationHeader(),
				"Content-Type": "application/x-www-form-urlencoded",
			},
			timeout: 30000,
		},
	);

	const token = BlingTokenResponseSchema.parse(response.data);
	return {
		tipo: "BLING" as const,
		accessToken: token.accessToken,
		refreshToken: token.refreshToken,
		tokenType: token.tokenType,
		scope: token.scope,
		expiresAt: getExpiresAt(token.expiresIn),
		connectedAt: new Date().toISOString(),
	};
}

export async function refreshBlingToken(config: TBlingConfig): Promise<TBlingConfig> {
	const response = await axios.post(
		BLING_TOKEN_URL,
		toFormUrlEncoded({
			grant_type: "refresh_token",
			refresh_token: config.refreshToken,
		}),
		{
			headers: {
				Authorization: getBasicAuthorizationHeader(),
				"Content-Type": "application/x-www-form-urlencoded",
			},
			timeout: 30000,
		},
	);

	const token = BlingTokenResponseSchema.parse(response.data);
	return {
		...config,
		accessToken: token.accessToken,
		refreshToken: token.refreshToken || config.refreshToken,
		tokenType: token.tokenType || config.tokenType,
		scope: token.scope.length ? token.scope : config.scope,
		expiresAt: getExpiresAt(token.expiresIn),
	};
}

export async function getValidBlingConfig({ organizationId, config }: { organizationId: string; config: TBlingConfig }) {
	const expiresAt = dayjs(config.expiresAt);
	if (expiresAt.isValid() && expiresAt.subtract(BLING_TOKEN_REFRESH_SKEW_MINUTES, "minutes").isAfter(dayjs())) return config;

	const refreshedConfig = await refreshBlingToken(config);
	await db
		.update(organizations)
		.set({
			integracaoConfiguracao: refreshedConfig,
		})
		.where(eq(organizations.id, organizationId));

	return refreshedConfig;
}

export function createBlingClient(config: TBlingConfig): AxiosInstance {
	return axios.create({
		baseURL: BLING_API_BASE_URL,
		headers: {
			Authorization: `${config.tokenType || "Bearer"} ${config.accessToken}`,
			"Content-Type": "application/json",
		},
		timeout: 30000,
	});
}

async function requestWithRetry<T>(request: () => Promise<T>, context: string): Promise<T> {
	for (let attempt = 1; attempt <= BLING_MAX_RETRIES; attempt++) {
		try {
			return await request();
		} catch (error) {
			if (!isAxiosError(error)) throw error;

			const status = error.response?.status;
			const shouldRetry = status === 429 || (status !== undefined && status >= 500) || error.code === "ECONNABORTED";
			if (!shouldRetry || attempt === BLING_MAX_RETRIES) throw error;

			const retryAfterMs = status === 429 ? getRetryAfterMs(error.response?.headers["retry-after"]) : null;
			const waitMs = retryAfterMs ?? 1000 * 2 ** (attempt - 1);
			console.warn(
				`[BLING_CLIENT] ${context} falhou com status ${status ?? error.code}. Tentativa ${attempt}/${BLING_MAX_RETRIES}; aguardando ${waitMs}ms.`,
			);
			await delay(waitMs);
		}
	}

	throw new Error(`[BLING_CLIENT] Falha inesperada em ${context}.`);
}

export async function fetchBlingSingle<T>(client: AxiosInstance, path: string, itemSchema: Parameters<typeof BlingSingleOutputSchema>[0]) {
	const response = await requestWithRetry(() => client.get<unknown>(path), `GET ${path}`);
	return BlingSingleOutputSchema(itemSchema).parse(response.data).data as T;
}

export async function fetchBlingPaginated<T>(
	client: AxiosInstance,
	path: string,
	itemSchema: Parameters<typeof BlingListOutputSchema>[0],
	params: Record<string, string | number | boolean | null | undefined> = {},
): Promise<T[]> {
	const items: T[] = [];

	for (let page = 1; page <= BLING_MAX_PAGES_PER_SYNC; page++) {
		const response = await requestWithRetry(
			() =>
				client.get<unknown>(path, {
					params: {
						...params,
						pagina: page,
						limite: BLING_PAGE_LIMIT,
					},
				}),
			`GET ${path} pagina=${page}`,
		);
		const pageItems = BlingListOutputSchema(itemSchema).parse(response.data).data as T[];
		items.push(...pageItems);
		if (pageItems.length < BLING_PAGE_LIMIT) break;
	}

	return items;
}
