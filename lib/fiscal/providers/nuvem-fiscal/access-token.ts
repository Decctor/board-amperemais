import type { TUtilsNuvemFiscalApiTokenValor } from "@/schemas/utils";
import { db } from "@/services/drizzle";
import { NUVEM_FISCAL_API_TOKEN_UTIL_IDENTIFICADOR, utils } from "@/services/drizzle/schema/utils";
import axios from "axios";
import { and, eq, isNull } from "drizzle-orm";
import createHttpError from "http-errors";

const NUVEM_FISCAL_OAUTH_URL = "https://auth.nuvemfiscal.com.br/oauth/token";
const DEFAULT_SCOPE = "empresa nfce nfe";
/**
 * Renova o token quando faltar menos que este intervalo até a expiração. A margem precisa ser
 * bem menor que a vida útil do token (~24h na Nuvem Fiscal): uma margem maior ou igual à vida
 * útil renovaria a cada requisição, estourando o rate limit do endpoint OAuth.
 */
const RENEW_BEFORE_EXPIRY_MS = 5 * 60 * 1000;

type TNuvemFiscalOAuthResponse = {
	access_token: string;
	expires_in: number;
};

let refreshInFlight: Promise<string> | null = null;

function parseStoredTokenValor(valor: unknown): TUtilsNuvemFiscalApiTokenValor | null {
	if (!valor || typeof valor !== "object") return null;
	const record = valor as TUtilsNuvemFiscalApiTokenValor;
	if (record.identificador !== NUVEM_FISCAL_API_TOKEN_UTIL_IDENTIFICADOR) return null;
	if (!record.accessToken || !record.dataExpiracao) return null;
	return record;
}

function shouldRenewToken(dataExpiracao: Date): boolean {
	return Date.now() >= dataExpiracao.getTime() - RENEW_BEFORE_EXPIRY_MS;
}

async function fetchNuvemFiscalOAuthToken(): Promise<TUtilsNuvemFiscalApiTokenValor> {
	const clientId = process.env.NUVEM_FISCAL_CLIENT_ID;
	const clientSecret = process.env.NUVEM_FISCAL_SECRET_KEY;
	if (!clientId || !clientSecret) {
		throw new createHttpError.InternalServerError(
			"Credenciais da Nuvem Fiscal nao configuradas. Defina NUVEM_FISCAL_CLIENT_ID e NUVEM_FISCAL_SECRET_KEY.",
		);
	}

	const scope = process.env.NUVEM_FISCAL_SCOPE ?? DEFAULT_SCOPE;

	try {
		const { data } = await axios.post<TNuvemFiscalOAuthResponse>(
			NUVEM_FISCAL_OAUTH_URL,
			new URLSearchParams({
				grant_type: "client_credentials",
				client_id: clientId,
				client_secret: clientSecret,
				scope,
			}),
			{ headers: { "Content-Type": "application/x-www-form-urlencoded" } },
		);

		if (!data.access_token || !data.expires_in) {
			throw new createHttpError.BadGateway("Resposta invalida ao obter token da Nuvem Fiscal.");
		}

		const dataExpiracao = new Date(Date.now() + data.expires_in * 1000);

		return {
			identificador: NUVEM_FISCAL_API_TOKEN_UTIL_IDENTIFICADOR,
			accessToken: data.access_token,
			dataExpiracao: dataExpiracao.toISOString(),
		};
	} catch (error) {
		if (axios.isAxiosError(error)) {
			const detail = typeof error.response?.data === "string" ? error.response.data : JSON.stringify(error.response?.data ?? {});
			throw new createHttpError.BadGateway(`Falha ao obter token da Nuvem Fiscal: ${detail}`);
		}
		throw error;
	}
}

async function persistNuvemFiscalApiToken(valor: TUtilsNuvemFiscalApiTokenValor) {
	const existing = await db.query.utils.findFirst({
		where: and(eq(utils.identificador, NUVEM_FISCAL_API_TOKEN_UTIL_IDENTIFICADOR), isNull(utils.organizacaoId)),
	});

	if (existing) {
		await db
			.update(utils)
			.set({
				valor,
				dataUltimaAtualizacao: new Date(),
			})
			.where(eq(utils.id, existing.id));
		return;
	}

	await db.insert(utils).values({
		identificador: NUVEM_FISCAL_API_TOKEN_UTIL_IDENTIFICADOR,
		organizacaoId: null,
		valor,
	});
}

async function resolveNuvemFiscalAccessToken(): Promise<string> {
	const stored = await db.query.utils.findFirst({
		where: and(eq(utils.identificador, NUVEM_FISCAL_API_TOKEN_UTIL_IDENTIFICADOR), isNull(utils.organizacaoId)),
	});

	const parsed = parseStoredTokenValor(stored?.valor);
	if (parsed) {
		const expiresAt = new Date(parsed.dataExpiracao);
		if (!shouldRenewToken(expiresAt)) {
			return parsed.accessToken;
		}
	}

	const freshValor = await fetchNuvemFiscalOAuthToken();
	await persistNuvemFiscalApiToken(freshValor);
	return freshValor.accessToken;
}

/** Token OAuth global da aplicacao (util sem organizacaoId). Renova automaticamente perto da expiracao. */
export async function getNuvemFiscalAccessToken(): Promise<string> {
	if (refreshInFlight) {
		return refreshInFlight;
	}

	refreshInFlight = resolveNuvemFiscalAccessToken().finally(() => {
		refreshInFlight = null;
	});

	return refreshInFlight;
}
