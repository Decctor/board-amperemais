import { AxiosError } from "axios";
import createHttpError from "http-errors";
import { ZodError } from "zod";

const UNKNOWN_ERROR_MESSAGE = "Houve um erro desconhecido, por favor, comunique o setor de tecnologia.";

export function getErrorMessage(error: any) {
	const isDefaultError = !!error?.response && !!error.response.data && !!error.response.data.message;
	if (isDefaultError) return error.response.data.message as string;
	// Erros HTTP 5xx nao expostos podem conter detalhes internos. Preserve a mensagem somente
	// quando o proprio http-errors a marca como segura para o cliente.
	if (createHttpError.isHttpError(error)) return error.expose ? (error.message as string) : UNKNOWN_ERROR_MESSAGE;
	if (error instanceof AxiosError) {
		const personalizedHttpError = error?.response?.data.error;
		if (personalizedHttpError) return personalizedHttpError.message as string;
		return error.message;
	}
	if (error instanceof ZodError) return error.errors[0].message;
	// Erros de dominio (por exemplo, FiscalReadinessError) sao Error comuns. Ignorar sua
	// mensagem escondia a causa acionavel e persistia apenas o fallback generico no historico.
	if (error instanceof Error && error.message.trim()) return error.message;
	return UNKNOWN_ERROR_MESSAGE;
}

/**
 * Erros de integracao (axios) carregam `config.headers` com credenciais e `config.data` com o corpo
 * enviado - que pode conter senha de certificado, token, etc. Nunca logue nem serialize o erro cru:
 * use este resumo, que expoe apenas o necessario para diagnosticar.
 */
export function describeErrorForLogging(error: unknown): Record<string, unknown> {
	if (error instanceof AxiosError) {
		const baseUrl = error.config?.baseURL ?? "";
		const path = error.config?.url ?? "";
		return {
			name: error.name,
			message: error.message,
			code: error.code ?? null,
			method: error.config?.method?.toUpperCase() ?? null,
			url: `${baseUrl}${path}` || null,
			status: error.response?.status ?? null,
			responseData: error.response?.data ?? null,
		};
	}
	if (createHttpError.isHttpError(error)) {
		return { name: error.name, message: error.message, status: error.statusCode, stack: error.stack };
	}
	if (error instanceof ZodError) {
		return { name: "ZodError", issues: error.errors.map((issue) => ({ path: issue.path.join("."), message: issue.message })) };
	}
	if (error instanceof Error) return { name: error.name, message: error.message, stack: error.stack };
	return { message: String(error) };
}
