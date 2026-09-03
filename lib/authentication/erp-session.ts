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

/**
 * Guard das rotas que exigem apenas vinculo com organizacao, sem o modulo de ERP. E o caso das
 * telas da loja digital: a pagina /dashboard/catalog/store nao checa ERP, entao uma rota dela
 * exigir o modulo seria um 403 dentro de uma tela aberta.
 */
export function requireOrgSession(session: TAuthUserSession | null): TAuthUserSession {
	if (!session) throw new createHttpError.Unauthorized("Voce nao esta autenticado.");
	if (!session.membership) throw new createHttpError.Unauthorized("Voce precisa estar vinculado a uma organizacao.");
	return session;
}
