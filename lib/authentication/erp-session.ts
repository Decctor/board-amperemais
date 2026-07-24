import createHttpError from "http-errors";
import type { TAuthUserSession } from "./types";

/**
 * Guard comum das rotas do modulo de ERP: sessao autenticada, vinculo com
 * organizacao e acesso ao modulo. Retorna a sessao com membership garantido.
 */
export function requireERPSession(session: TAuthUserSession | null): TAuthUserSession {
	if (!session) throw new createHttpError.Unauthorized("Voce nao esta autenticado.");
	if (!session.membership) throw new createHttpError.Unauthorized("Voce precisa estar vinculado a uma organizacao.");
	if (!session.membership.organizacao.configuracao.recursos.erp.acesso) {
		throw new createHttpError.Forbidden("Sua organizacao nao possui acesso ao modulo de ERP.");
	}
	return session;
}
