import type { TPaymentMethodEnum } from "@/schemas/enums";
import type { TOrganizationFiscalConfig } from "@/schemas/fiscal";

export type TAutoEmissionExceptions = TOrganizationFiscalConfig["emissaoAutomatica"]["excecoes"];
export type TAutoEmissionExceptionReason = "PAGAMENTO_EXCLUSIVO";

export const EMPTY_AUTO_EMISSION_EXCEPTIONS: TAutoEmissionExceptions = { pagamentoExclusivo: [] };

/**
 * Decide se as exceções de emissão automática suprimem a emissão para o conjunto de métodos de
 * pagamento de uma venda. Compartilhada entre o servidor (enforcement) e o PDV (preview) para as
 * duas leituras nunca divergirem.
 *
 * `pagamentoExclusivo` segue a regra de subconjunto: só casa quando TODOS os métodos da venda estão
 * na lista — um mix com qualquer método fora dela emite normalmente. Exceções futuras entram como
 * novas condições combinadas por OR: a primeira que casar é retornada.
 */
export function resolveAutoEmissionException({
	metodos,
	excecoes,
}: {
	metodos: TPaymentMethodEnum[];
	excecoes: TAutoEmissionExceptions | null | undefined;
}): TAutoEmissionExceptionReason | null {
	const pagamentoExclusivo = excecoes?.pagamentoExclusivo ?? [];
	if (pagamentoExclusivo.length === 0) return null;

	const metodosUnicos = [...new Set(metodos)];
	if (metodosUnicos.length === 0) return null;
	if (metodosUnicos.every((metodo) => pagamentoExclusivo.includes(metodo))) return "PAGAMENTO_EXCLUSIVO";

	return null;
}
