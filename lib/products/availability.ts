import type { TProductStockDeductionModeEnum } from "@/schemas/enums";

/**
 * Disponibilidade em três estados, e nunca um número cru.
 *
 * `NAO_RASTREADO` é o estado que existe para não repetir o desastre do `precoMax: 0`: um consumidor
 * automático lê `quantidade: null` como zero, e um zero inventado já fez o agente de IA afirmar a um
 * cliente que a empresa não vendia chuveiros — havia 45 no catálogo. Saldo desconhecido tem que
 * trafegar *nomeado* como desconhecido, senão vira falta.
 *
 * A regra de fundo é a mesma da vitrine (`productIsAvailableForShop` em `lib/shop/catalog.ts`):
 * rastreamento desligado não significa esgotado, significa que a empresa não controla saldo desse
 * item. A vitrine segue com o predicado booleano próprio porque só precisa filtrar; aqui o estado é
 * ternário porque quem consome precisa distinguir "faltou" de "não sei".
 */

export type TProductAvailabilityStatus = "DISPONIVEL" | "ESGOTADO" | "NAO_RASTREADO";

export type TProductAvailability = {
	disponibilidade: TProductAvailabilityStatus;
	/** Saldo do momento. Só é preenchido quando há rastreamento real — nunca vira 0 por omissão. */
	quantidade: number | null;
};

type TStockSubject = {
	quantidade: number | null;
	rastreamentoEstoqueAtivo: boolean | null;
	/**
	 * Só o produto tem modo de baixa; a variação herda o do produto. Opcional para a função servir
	 * aos dois sem exigir um shape falso do lado da variação.
	 */
	baixaEstoqueModo?: TProductStockDeductionModeEnum | null;
};

/**
 * Resolve a disponibilidade de um produto (ou de qualquer coisa com saldo e flag de rastreamento).
 *
 * `COMPOSICAO` (pratos, drinks, lanches) resolve para `NAO_RASTREADO` mesmo com rastreamento
 * ligado: a `quantidade` própria desses itens não significa nada, porque a disponibilidade real
 * depende de explodir a ficha técnica e olhar os insumos — o que está fiado na Fase 2 de tabs.
 * Reportar `ESGOTADO` neles seria afirmar uma falta que ninguém verificou.
 */
export function resolveProductAvailability(subject: TStockSubject): TProductAvailability {
	if (!subject.rastreamentoEstoqueAtivo) return { disponibilidade: "NAO_RASTREADO", quantidade: null };
	if (subject.baixaEstoqueModo === "COMPOSICAO") return { disponibilidade: "NAO_RASTREADO", quantidade: null };

	// `null` com rastreamento ligado é saldo zerado de fato: a coluna só fica nula em produto que
	// nunca movimentou, e `applyStockMovement` trata o mesmo caso como `COALESCE(quantidade, 0)`.
	const quantidade = Number.isFinite(subject.quantidade) ? (subject.quantidade as number) : 0;
	return { disponibilidade: quantidade > 0 ? "DISPONIVEL" : "ESGOTADO", quantidade };
}

/**
 * Disponibilidade de uma variação: rastreamento e saldo são os dela, o modo de baixa é o do produto
 * (a variação não tem coluna própria).
 */
export function resolveVariantAvailability(
	variant: { quantidade: number | null; rastreamentoEstoqueAtivo: boolean | null },
	product: { baixaEstoqueModo?: TProductStockDeductionModeEnum | null },
): TProductAvailability {
	return resolveProductAvailability({ ...variant, baixaEstoqueModo: product.baixaEstoqueModo });
}
