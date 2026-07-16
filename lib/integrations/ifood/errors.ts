import { isAxiosError } from "axios";
import createHttpError from "http-errors";

/**
 * Payloads de erro do iFood variam por módulo: `{ error: { code, message, details } }`,
 * `{ message }`, ou uma lista de violações. Extraímos a melhor mensagem disponível.
 */
function extractIfoodErrorMessage(data: unknown): string | null {
	if (!data || typeof data !== "object") return null;
	const payload = data as Record<string, unknown>;

	const error = payload.error;
	if (error && typeof error === "object") {
		const errorPayload = error as Record<string, unknown>;
		if (typeof errorPayload.message === "string" && errorPayload.message.trim()) return errorPayload.message;
		if (Array.isArray(errorPayload.details)) {
			const detail = errorPayload.details.find((item) => typeof item === "string" && item.trim());
			if (detail) return detail as string;
		}
	}

	if (typeof payload.message === "string" && payload.message.trim()) return payload.message;
	if (Array.isArray(payload.details)) {
		const detail = payload.details.find((item) => typeof item === "string" && item.trim());
		if (detail) return detail as string;
	}

	return null;
}

/**
 * Mapeia erros de chamadas à API do iFood para HTTP errors da casa (createHttpError), com
 * mensagens em PT prontas para a UI. Sempre lança — use como último recurso do catch:
 * `catch (error) { mapIfoodError("contexto", error); }`
 */
export function mapIfoodError(context: string, error: unknown): never {
	if (createHttpError.isHttpError(error)) throw error;

	if (isAxiosError(error)) {
		const status = error.response?.status ?? null;
		const ifoodMessage = extractIfoodErrorMessage(error.response?.data);

		console.error(`[ERROR] [IFOOD] API error (${context}):`, {
			status,
			message: ifoodMessage ?? error.message,
		});

		if (status === 401 || status === 403) {
			throw new createHttpError.Unauthorized("Credenciais do iFood expiradas ou inválidas. Reconecte a integração.");
		}
		if (status === 404) {
			throw new createHttpError.NotFound(ifoodMessage ?? "Recurso não encontrado no iFood.");
		}
		if (status === 429) {
			throw new createHttpError.TooManyRequests("Limite de requisições do iFood atingido. Tente novamente em instantes.");
		}
		if (status && status >= 400 && status < 500) {
			throw new createHttpError.BadRequest(ifoodMessage ?? "O iFood rejeitou a solicitação. Verifique os dados informados.");
		}
		throw new createHttpError.BadGateway(ifoodMessage ?? "Erro ao comunicar com o iFood. Tente novamente em instantes.");
	}

	console.error(`[ERROR] [IFOOD] Unexpected error (${context}):`, error);
	throw new createHttpError.InternalServerError("Erro inesperado ao comunicar com o iFood.");
}
