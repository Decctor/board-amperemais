/**
 * Idade de um orçamento em aberto.
 *
 * `sales` não tem coluna de criação: `dataVenda` só é preenchido na confirmação
 * (`process-sale-confirmation.ts`) e a tabela não segue a convenção `dataInsercao` do resto do
 * schema. Sem um instante de criação não há como ordenar nem envelhecer um orçamento, então a data
 * é reconstruída da melhor fonte disponível, em ordem de confiabilidade:
 *
 * 1. `rascunhoMetadados.criadoEm` — carimbado por `createSaleDraft` (agente e hub);
 * 2. o epoch embutido no `idExterno` legado do POS (`POS-1730240000000`);
 * 3. desconhecida.
 *
 * Quando é desconhecida a interface não mostra idade nem marca o orçamento como antigo: um "há 0
 * dias" fabricado é pior que a ausência do dado. A correção estrutural é adicionar
 * `sales.dataInsercao`, que exige migration.
 */

/** Acima disso o orçamento perde credibilidade comercial: preço congelado, cliente esfriado. */
export const QUOTE_STALE_AFTER_DAYS = 7;

const POS_EXTERNAL_ID_PATTERN = /^POS-(\d{10,16})$/;

/** Viaja como dado para a interface, então os campos seguem a língua do payload. */
export type TQuoteFreshness = {
	dias: number;
	envelhecido: boolean;
};

export function resolveQuoteCreationDate({
	rascunhoMetadados,
	idExterno,
}: {
	rascunhoMetadados: unknown;
	idExterno: string | null;
}): Date | null {
	const criadoEm =
		rascunhoMetadados && typeof rascunhoMetadados === "object" && "criadoEm" in rascunhoMetadados
			? (rascunhoMetadados as { criadoEm?: unknown }).criadoEm
			: null;

	if (typeof criadoEm === "string") {
		const parsed = new Date(criadoEm);
		if (!Number.isNaN(parsed.getTime())) return parsed;
	}

	const posEpoch = idExterno?.match(POS_EXTERNAL_ID_PATTERN)?.[1];
	if (posEpoch) {
		const parsed = new Date(Number(posEpoch));
		if (!Number.isNaN(parsed.getTime())) return parsed;
	}

	return null;
}

export function resolveQuoteFreshness(criadoEm: Date | string | null, now: Date = new Date()): TQuoteFreshness | null {
	if (!criadoEm) return null;

	const created = new Date(criadoEm);
	if (Number.isNaN(created.getTime())) return null;

	const dias = Math.max(0, Math.floor((now.getTime() - created.getTime()) / 86_400_000));
	return { dias, envelhecido: dias >= QUOTE_STALE_AFTER_DAYS };
}
