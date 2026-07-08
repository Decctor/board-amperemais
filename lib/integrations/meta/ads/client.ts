import createHttpError from "http-errors";

import { META_GRAPH_API_VERSION } from "./types";

type MetaGraphResponse<T> = T & {
	error?: {
		message?: string;
		type?: string;
		code?: number;
		error_subcode?: number;
		fbtrace_id?: string;
	};
};

export function getMetaGraphUrl(path: string) {
	const normalizedPath = path.startsWith("/") ? path : `/${path}`;
	return new URL(`https://graph.facebook.com/${META_GRAPH_API_VERSION}${normalizedPath}`);
}

/** Mapeia erros da Graph API para HTTP errors da casa (createHttpError). */
function throwMetaGraphError(context: string, status: number, error: MetaGraphResponse<unknown>["error"]): never {
	console.error(`[ERROR] [META_ADS] Graph API error (${context}):`, {
		status,
		code: error?.code,
		subcode: error?.error_subcode,
		type: error?.type,
		fbtraceId: error?.fbtrace_id,
		message: error?.message,
	});

	if (status === 401 || status === 403 || error?.code === 190) {
		throw new createHttpError.Unauthorized("Credenciais do Meta Ads expiradas ou inválidas. Reconecte a integração.");
	}
	if (status === 429 || error?.code === 4 || error?.code === 17 || error?.code === 613) {
		throw new createHttpError.TooManyRequests("Limite de requisições da Meta atingido. Tente novamente em instantes.");
	}
	throw new createHttpError.InternalServerError(error?.message ?? "Erro ao consultar a Meta.");
}

async function parseMetaResponse<T>(response: Response, context: string): Promise<T> {
	let payload: MetaGraphResponse<T>;
	try {
		payload = (await response.json()) as MetaGraphResponse<T>;
	} catch {
		throw new createHttpError.InternalServerError("Resposta inválida da Meta.");
	}
	if (!response.ok || payload.error) throwMetaGraphError(context, response.status, payload.error);
	return payload as T;
}

export async function metaGraphGet<T>(path: string, params: Record<string, string>, accessToken: string): Promise<T> {
	const url = getMetaGraphUrl(path);
	for (const [key, value] of Object.entries(params)) {
		url.searchParams.set(key, value);
	}
	const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
	return parseMetaResponse<T>(response, path);
}

export async function metaGraphPost<T>(path: string, params: Record<string, string>, accessToken: string): Promise<T> {
	const url = getMetaGraphUrl(path);
	const body = new URLSearchParams(params);
	const response = await fetch(url, {
		method: "POST",
		headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/x-www-form-urlencoded" },
		body,
	});
	return parseMetaResponse<T>(response, `${path} (mutation)`);
}

export async function metaGraphDelete<T>(path: string, params: Record<string, string>, accessToken: string): Promise<T> {
	const url = getMetaGraphUrl(path);
	const body = new URLSearchParams(params);
	const response = await fetch(url, {
		method: "DELETE",
		headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/x-www-form-urlencoded" },
		body,
	});
	return parseMetaResponse<T>(response, `${path} (delete)`);
}

/** Segue `paging.next` da Graph API (a URL já inclui credenciais quando fornecida pela Meta). */
export async function metaGraphGetByFullUrl<T>(nextUrl: string): Promise<T> {
	const response = await fetch(nextUrl);
	return parseMetaResponse<T>(response, "paged");
}
