import type { TAuthUserSession } from "@/lib/authentication/types";
import createHttpError from "http-errors";

/**
 * Resolve o override tri-state de emissão fiscal automática por venda a partir do input do cliente.
 *
 * Semântica da coluna `sales.emissaoFiscalAutomatica`:
 * - `null` = herda a preferência da organização (`organizations.fiscalEmissaoAutomatica`);
 * - `true`/`false` = decisão explícita da venda, persistida apenas quando DIVERGE do default da org.
 *
 * Regra de permissão (simétrica): qualquer desvio do default da organização — ligar contra ORG=OFF
 * OU desligar contra ORG=ON — exige `permissoes.fiscal.emitir`. Quando o valor pedido coincide com o
 * default (ou não é informado), colapsa para `null` (herda) e nenhuma permissão é exigida.
 *
 * Nunca confie no cliente: `organizationDefault` deve vir do banco e a permissão da sessão.
 *
 * @returns o valor a persistir em `sales.emissaoFiscalAutomatica` (`null` = herda).
 */
export function resolveSaleFiscalEmissionOverride({
	requested,
	organizationDefault,
	session,
}: {
	requested: boolean | null | undefined;
	organizationDefault: boolean;
	session: TAuthUserSession;
}): boolean | null {
	const override = requested ?? null;
	// Sem valor ou coincidindo com o default da org: herda, sem exigir permissão.
	if (override === null || override === organizationDefault) return null;

	if (!session.membership?.permissoes.fiscal.emitir) {
		throw new createHttpError.Forbidden("Você não tem permissão para alterar a emissão fiscal desta venda.");
	}

	return override;
}
