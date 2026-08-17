/**
 * SANDBOX ONLY — App centralizado de teste do iFood (client_credentials).
 * Remover este arquivo e as referências em client.ts / Settings / app/api/.../sandbox quando não precisar mais.
 */
import { db } from "@/services/drizzle";
import { integrations } from "@/services/drizzle/schema";
import axios from "axios";
import dayjs from "dayjs";
import { eq } from "drizzle-orm";
import z from "zod";
import { IFOOD_AUTH_BASE_URL, IFOOD_MERCHANT_BASE_URL, IfoodMerchantsOutputSchema, type TIfoodConfig } from "./types";

export const IFOOD_SANDBOX_REFRESH_TOKEN_HOLDER = "__IFOOD_SANDBOX_PLACEHOLDER__";

const IFOOD_SANDBOX_TOKEN_REFRESH_SKEW_MINUTES = 10;

const IfoodSandboxTokenRawResponseSchema = z
	.object({
		accessToken: z.string().optional(),
		access_token: z.string().optional(),
		tokenType: z.string().optional(),
		token_type: z.string().optional(),
		expiresIn: z.number().optional(),
		expires_in: z.number().optional(),
		scope: z.union([z.string(), z.array(z.string())]).optional(),
	})
	.passthrough();

function toFormUrlEncoded(data: Record<string, string>) {
	const params = new URLSearchParams();
	for (const [key, value] of Object.entries(data)) params.set(key, value);
	return params;
}

function getExpiresAt(expiresIn: number) {
	return dayjs().add(expiresIn, "seconds").toISOString();
}

function parseScope(scope: string | string[] | undefined) {
	if (Array.isArray(scope)) return scope;
	if (!scope) return [];
	return scope
		.split(/[,\s]+/)
		.map((item) => item.trim())
		.filter(Boolean);
}

export function isIfoodSandboxEnabled() {
	return process.env.IFOOD_SANDBOX_ENABLED === "true";
}

export function isIfoodSandboxConfig(config: TIfoodConfig) {
	return config.refreshToken === IFOOD_SANDBOX_REFRESH_TOKEN_HOLDER;
}

function getIfoodSandboxCredentials() {
	const clientId = process.env.IFOOD_SANDBOX_CLIENT_ID;
	const clientSecret = process.env.IFOOD_SANDBOX_CLIENT_SECRET;
	if (!clientId || !clientSecret) {
		throw new Error("Credenciais do iFood sandbox não configuradas (IFOOD_SANDBOX_CLIENT_ID / IFOOD_SANDBOX_CLIENT_SECRET).");
	}
	return { clientId, clientSecret };
}

export async function exchangeIfoodSandboxClientCredentials() {
	const { clientId, clientSecret } = getIfoodSandboxCredentials();
	const response = await axios.post(
		`${IFOOD_AUTH_BASE_URL}/oauth/token`,
		toFormUrlEncoded({
			grantType: "client_credentials",
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

	const parsed = IfoodSandboxTokenRawResponseSchema.parse(response.data);
	const accessToken = parsed.accessToken ?? parsed.access_token;
	const expiresIn = parsed.expiresIn ?? parsed.expires_in ?? 60 * 60 * 6;

	if (!accessToken) throw new Error("Resposta de autenticação do iFood sandbox sem access token.");

	return {
		accessToken,
		tokenType: "bearer" as const,
		scope: parseScope(parsed.scope),
		expiresAt: getExpiresAt(expiresIn),
	};
}

async function fetchSandboxMerchantIds(accessToken: string) {
	const response = await axios.get<unknown>(`${IFOOD_MERCHANT_BASE_URL}/merchants`, {
		headers: {
			Authorization: `Bearer ${accessToken}`,
			"Content-Type": "application/json",
		},
		timeout: 30000,
	});

	const parsed = IfoodMerchantsOutputSchema.parse(response.data);
	const merchants = Array.isArray(parsed) ? parsed : parsed.merchants;
	return merchants.map((merchant) => merchant.id).filter(Boolean);
}

export async function buildIfoodSandboxIntegrationConfig() {
	const token = await exchangeIfoodSandboxClientCredentials();

	let merchantIds: string[] = [];
	try {
		merchantIds = await fetchSandboxMerchantIds(token.accessToken);
	} catch {
		merchantIds = [];
	}

	return {
		tipo: "IFOOD" as const,
		merchantIds,
		accessToken: token.accessToken,
		refreshToken: IFOOD_SANDBOX_REFRESH_TOKEN_HOLDER,
		tokenType: token.tokenType,
		scope: token.scope,
		expiresAt: token.expiresAt,
		authorizedAt: new Date().toISOString(),
		aceiteAutomaticoPedidos: false,
	};
}

export async function refreshIfoodSandboxConfig({ integrationId, config }: { integrationId: string; config: TIfoodConfig }) {
	const token = await exchangeIfoodSandboxClientCredentials();
	const refreshedConfig: TIfoodConfig = {
		...config,
		accessToken: token.accessToken,
		refreshToken: IFOOD_SANDBOX_REFRESH_TOKEN_HOLDER,
		tokenType: token.tokenType,
		scope: token.scope.length ? token.scope : config.scope,
		expiresAt: token.expiresAt,
	};

	await db
		.update(integrations)
		.set({ configuracao: refreshedConfig, status: "CONECTADO", ultimoErro: null })
		.where(eq(integrations.id, integrationId));

	return refreshedConfig;
}

export async function getValidIfoodSandboxConfig({ integrationId, config }: { integrationId: string; config: TIfoodConfig }) {
	const expiresAt = dayjs(config.expiresAt);
	if (expiresAt.isValid() && expiresAt.subtract(IFOOD_SANDBOX_TOKEN_REFRESH_SKEW_MINUTES, "minutes").isAfter(dayjs())) {
		return config;
	}

	return refreshIfoodSandboxConfig({ integrationId, config });
}
