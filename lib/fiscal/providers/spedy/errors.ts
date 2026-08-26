import axios from "axios";
import createHttpError from "http-errors";

/**
 * A Spedy responde erros de validacao como `{ errors: [{ message, path }] }`, erros de negocio como
 * `{ message }` / `{ title }` e, ocasionalmente, como texto puro. Normalizamos as tres formas.
 */
export function extractSpedyErrorMessages(error: unknown): string[] {
	if (!axios.isAxiosError(error)) return [];
	const data = error.response?.data;
	const messages: string[] = [];

	if (typeof data === "string" && data.trim()) messages.push(data.trim());
	if (data && typeof data === "object") {
		const payload = data as { errors?: unknown; message?: unknown; title?: unknown; detail?: unknown };
		if (Array.isArray(payload.errors)) {
			for (const item of payload.errors) {
				if (typeof item === "string") messages.push(item);
				else if (item && typeof item === "object" && typeof (item as { message?: unknown }).message === "string")
					messages.push((item as { message: string }).message);
			}
		}
		for (const value of [payload.message, payload.title, payload.detail]) {
			if (typeof value === "string" && value.trim()) messages.push(value.trim());
		}
	}

	return [...new Set(messages)];
}

/**
 * Resumo seguro de um erro da Spedy para logs: nunca inclui headers (X-Api-Key) nem o corpo enviado
 * (que pode conter senha de certificado).
 */
export function describeSpedyError(error: unknown) {
	if (axios.isAxiosError(error)) {
		return {
			method: error.config?.method?.toUpperCase() ?? null,
			url: error.config?.url ?? null,
			status: error.response?.status ?? null,
			code: error.code ?? null,
			messages: extractSpedyErrorMessages(error),
		};
	}
	if (error instanceof Error) return { name: error.name, message: error.message };
	return { message: String(error) };
}

/**
 * Converte um erro da Spedy em um erro HTTP exposto ao usuario, preservando o status original quando
 * ele faz sentido para o cliente e escondendo detalhes de infraestrutura.
 */
export function toSpedyHttpError(error: unknown, fallbackMessage: string) {
	if (createHttpError.isHttpError(error)) return error;
	if (!axios.isAxiosError(error)) return new createHttpError.InternalServerError(fallbackMessage);

	const status = error.response?.status ?? 0;
	const messages = extractSpedyErrorMessages(error);
	const detail = messages.length > 0 ? `${fallbackMessage} ${messages.join(" ")}` : fallbackMessage;

	if (status === 400 || status === 409 || status === 422) return createHttpError(status, detail);
	if (status === 401 || status === 403) return new createHttpError.BadGateway(`${fallbackMessage} Credenciais da Spedy recusadas.`);
	if (status === 404) return new createHttpError.NotFound(detail);
	if (status === 429) return new createHttpError.TooManyRequests(`${fallbackMessage} Limite de requisicoes da Spedy atingido, tente novamente em instantes.`);
	return new createHttpError.BadGateway(messages.length > 0 ? detail : `${fallbackMessage} Servico da Spedy indisponivel no momento.`);
}
