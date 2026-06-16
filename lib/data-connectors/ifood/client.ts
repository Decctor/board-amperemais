import { db } from "@/services/drizzle";
import { organizations } from "@/services/drizzle/schema";
import axios, { isAxiosError, type AxiosInstance } from "axios";
import dayjs from "dayjs";
import { eq } from "drizzle-orm";
import {
	IFOOD_AUTH_BASE_URL,
	IFOOD_EVENTS_BASE_URL,
	IFOOD_MERCHANT_BASE_URL,
	IFOOD_ORDER_BASE_URL,
	IfoodEventsPollingOutputSchema,
	IfoodMerchantsOutputSchema,
	IfoodOrderSchema,
	IfoodTokenResponseSchema,
	IfoodUserCodeResponseSchema,
	type TIfoodConfig,
	type TIfoodEvent,
	type TIfoodMerchant,
	type TIfoodOrder,
	type TIfoodUserCodeResponse,
} from "./types";
// SANDBOX: remover import e bloco em getValidIfoodConfig ao deletar ifood/sandbox
import { getValidIfoodSandboxConfig, isIfoodSandboxConfig } from "./sandbox";

const IFOOD_TOKEN_REFRESH_SKEW_MINUTES = 10;
const IFOOD_EVENTS_POLLING_LIMIT = 100;
const IFOOD_ACKNOWLEDGMENT_CHUNK_SIZE = 2000;

function getIfoodCredentials() {
	const clientId = process.env.IFOOD_CLIENT_ID;
	const clientSecret = process.env.IFOOD_CLIENT_SECRET;
	if (!clientId || !clientSecret) throw new Error("Credenciais do iFood não configuradas.");
	return { clientId, clientSecret };
}

function toFormUrlEncoded(data: Record<string, string>) {
	const params = new URLSearchParams();
	for (const [key, value] of Object.entries(data)) params.set(key, value);
	return params;
}

function getExpiresAt(expiresIn: number) {
	return dayjs().add(expiresIn, "seconds").toISOString();
}

export async function createIfoodUserCode(): Promise<TIfoodUserCodeResponse> {
	const { clientId, clientSecret } = getIfoodCredentials();
	const response = await axios.post(
		`${IFOOD_AUTH_BASE_URL}/oauth/userCode`,
		toFormUrlEncoded({
			clientId,
			clientSecret,
		}),
		{
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			timeout: 30000,
		},
	);

	return IfoodUserCodeResponseSchema.parse(response.data);
}

export async function exchangeIfoodAuthorizationCode({
	authorizationCode,
	authorizationCodeVerifier,
}: {
	authorizationCode: string;
	authorizationCodeVerifier: string;
}) {
	const { clientId, clientSecret } = getIfoodCredentials();
	const response = await axios.post(
		`${IFOOD_AUTH_BASE_URL}/oauth/token`,
		toFormUrlEncoded({
			grantType: "authorization_code",
			clientId,
			clientSecret,
			authorizationCode,
			authorizationCodeVerifier,
		}),
		{
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			timeout: 30000,
		},
	);

	const token = IfoodTokenResponseSchema.parse(response.data);
	return {
		...token,
		expiresAt: getExpiresAt(token.expiresIn),
	};
}

export async function refreshIfoodToken(config: TIfoodConfig) {
	const { clientId, clientSecret } = getIfoodCredentials();
	const response = await axios.post(
		`${IFOOD_AUTH_BASE_URL}/oauth/token`,
		toFormUrlEncoded({
			grantType: "refresh_token",
			clientId,
			clientSecret,
			refreshToken: config.refreshToken,
		}),
		{
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			timeout: 30000,
		},
	);

	const token = IfoodTokenResponseSchema.parse(response.data);
	return {
		...config,
		accessToken: token.accessToken,
		refreshToken: token.refreshToken,
		tokenType: token.tokenType,
		scope: token.scope.length ? token.scope : config.scope,
		expiresAt: getExpiresAt(token.expiresIn),
	};
}

export async function getValidIfoodConfig({ organizationId, config }: { organizationId: string; config: TIfoodConfig }) {
	// SANDBOX: remover este bloco ao deletar ifood/sandbox
	if (isIfoodSandboxConfig(config)) {
		return getValidIfoodSandboxConfig({ organizationId, config });
	}

	const expiresAt = dayjs(config.expiresAt);
	if (expiresAt.isValid() && expiresAt.subtract(IFOOD_TOKEN_REFRESH_SKEW_MINUTES, "minutes").isAfter(dayjs())) return config;

	const refreshedConfig = await refreshIfoodToken(config);
	await db
		.update(organizations)
		.set({
			integracaoConfiguracao: refreshedConfig,
		})
		.where(eq(organizations.id, organizationId));

	return refreshedConfig;
}

export function createIfoodClient(config: TIfoodConfig): AxiosInstance {
	return axios.create({
		headers: {
			Authorization: `Bearer ${config.accessToken}`,
			"Content-Type": "application/json",
		},
		timeout: 30000,
	});
}

function normalizeEvents(data: unknown): TIfoodEvent[] {
	const parsed = IfoodEventsPollingOutputSchema.parse(data);
	return Array.isArray(parsed) ? parsed : parsed.events;
}

function normalizeMerchants(data: unknown): TIfoodMerchant[] {
	const parsed = IfoodMerchantsOutputSchema.parse(data);
	return Array.isArray(parsed) ? parsed : parsed.merchants;
}

export async function fetchIfoodMerchants(client: AxiosInstance) {
	const response = await client.get<unknown>(`${IFOOD_MERCHANT_BASE_URL}/merchants`);
	return normalizeMerchants(response.data);
}

export async function pollIfoodEvents(client: AxiosInstance, { merchantIds = [] }: { merchantIds?: string[] } = {}) {
	try {
		const headers: Record<string, string> = {};
		if (merchantIds.length) {
			headers["x-polling-merchants"] = merchantIds.join(",");
		}

		const response = await client.get<unknown>(`${IFOOD_EVENTS_BASE_URL}/events:polling`, {
			headers,
			params: {
				limit: IFOOD_EVENTS_POLLING_LIMIT,
			},
		});

		if (response.status === 204) return [];
		return normalizeEvents(response.data);
	} catch (error) {
		if (isAxiosError(error) && error.response?.status === 204) return [];
		throw error;
	}
}

export async function getIfoodOrder(client: AxiosInstance, orderId: string): Promise<TIfoodOrder> {
	const response = await client.get<unknown>(`${IFOOD_ORDER_BASE_URL}/orders/${orderId}`);
	return IfoodOrderSchema.parse(response.data);
}

export async function acknowledgeIfoodEvents(client: AxiosInstance, eventIds: string[]) {
	for (let index = 0; index < eventIds.length; index += IFOOD_ACKNOWLEDGMENT_CHUNK_SIZE) {
		const acknowledgedEventIds = eventIds.slice(index, index + IFOOD_ACKNOWLEDGMENT_CHUNK_SIZE);
		await client.post(`${IFOOD_EVENTS_BASE_URL}/events/acknowledgment`, {
			acknowledgedEventIds,
		});
	}
}
