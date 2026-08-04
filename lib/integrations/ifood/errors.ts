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
 * O `code` estruturado do iFood (`{ error: { code } }`) é mais confiável que a mensagem para
 * decidir o que dizer ao lojista: a mensagem vem em inglês e muda sem aviso; o código, não.
 */
function extractIfoodErrorCode(data: unknown): string | null {
	if (!data || typeof data !== "object") return null;
	const payload = data as Record<string, unknown>;

	const error = payload.error;
	if (error && typeof error === "object") {
		const code = (error as Record<string, unknown>).code;
		if (typeof code === "string" && code.trim()) return code.trim().toUpperCase();
	}

	if (typeof payload.code === "string" && payload.code.trim()) return payload.code.trim().toUpperCase();
	return null;
}

/**
 * Mensagens em PT para os códigos que a homologação do Catalog cobra explicitamente. Só entra aqui
 * o código cuja mensagem crua do iFood não diz ao lojista o que fazer a seguir.
 */
const IFOOD_ERROR_CODE_MESSAGES: Record<string, string> = {
	VALIDATION_ERROR: "O iFood recusou os dados enviados. Revise nome, descrição, preço e status antes de salvar de novo.",
	CONFLICT: "Já existe um registro com esses dados no iFood. Verifique o código externo e o nome antes de tentar de novo.",
	NOT_FOUND: "Esse registro não existe mais no catálogo do iFood. Atualize a página para ver o estado atual.",
};

/**
 * Mapeia erros de chamadas à API do iFood para HTTP errors da casa (createHttpError), com
 * mensagens em PT prontas para a UI. Sempre lança — use como último recurso do catch:
 * `catch (error) { mapIfoodError("contexto", error); }`
 */
export function mapIfoodError(context: string, error: unknown): never {
	if (createHttpError.isHttpError(error)) throw error;

	if (isAxiosError(error)) {
		const status = error.response?.status ?? null;
		const ifoodCode = extractIfoodErrorCode(error.response?.data);
		// A mensagem por código ganha da mensagem crua: aquela diz o que fazer, esta só descreve.
		const ifoodMessage = (ifoodCode ? IFOOD_ERROR_CODE_MESSAGES[ifoodCode] : null) ?? extractIfoodErrorMessage(error.response?.data);

		console.error(`[ERROR] [IFOOD] API error (${context}):`, {
			status,
			code: ifoodCode,
			message: ifoodMessage ?? error.message,
		});

		// Sem resposta: a rede caiu ou o timeout de 30s estourou depois das retentativas. O lojista
		// precisa saber que o pedido pode ou não ter chegado — "tente de novo" sozinho engana.
		if (!error.response) {
			throw new createHttpError.GatewayTimeout(
				"O iFood não respondeu a tempo. A alteração pode não ter sido aplicada — atualize a página antes de tentar de novo.",
			);
		}

		// 401 e 403 pedem ações opostas do lojista: um exige refazer a conexão, o outro é uma
		// permissão que falta na aplicação — mandar reconectar num 403 só faz ele perder tempo.
		if (status === 401) {
			throw new createHttpError.Unauthorized("Credenciais do iFood expiradas ou inválidas. Reconecte a integração.");
		}
		if (status === 403) {
			throw new createHttpError.Forbidden(
				ifoodMessage ?? "Sua conta do iFood não tem permissão para este recurso. Verifique os módulos liberados para a aplicação no Portal do Parceiro.",
			);
		}
		if (status === 404) {
			throw new createHttpError.NotFound(ifoodMessage ?? "Recurso não encontrado no iFood.");
		}
		if (status === 409) {
			throw new createHttpError.Conflict(ifoodMessage ?? IFOOD_ERROR_CODE_MESSAGES.CONFLICT);
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
