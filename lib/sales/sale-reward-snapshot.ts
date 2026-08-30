// Parte client-safe do resgate de recompensa: tipo do snapshot, chave de origem do item e o
// parser do rascunho. Vive separada de sale-reward-redemption.ts porque aquele módulo importa
// o banco (loadChannelState) e é proibido em bundle de cliente — map-sale-to-sale-state.ts
// (página de edição, "use client") precisa apenas do que está aqui.

export const POS_REWARD_SALE_ITEM_ORIGIN = "POS-RESGATE-RECOMPENSA";

// Snapshot da recompensa carimbado pelo servidor em sales.rascunhoMetadados.recompensa (PDV) ou
// sales.rascunhoMetadados.shop.recompensa (loja digital). É a chave autoritativa lida pela
// confirmação de orçamento (via parseSaleRewardDraftSnapshot) — o blob enviado pelo cliente
// pode carregar o estado da UI em outra chave, mas nunca é lido para efeitos.
export type TSaleRewardDraftSnapshot = {
	recompensaId: string;
	programaId: string;
	titulo: string;
	valor: number;
	valorVenda: number;
};

/**
 * Lê o snapshot autoritativo da recompensa de um rascunho. O PDV grava em
 * `rascunhoMetadados.recompensa`; a loja digital grava o mesmo snapshot (carimbado pelo servidor)
 * dentro de `rascunhoMetadados.shop.recompensa` — sem a segunda leitura, um pedido da loja
 * confirmado pelo PDV entregaria o prêmio sem debitar o saldo.
 */
export function parseSaleRewardDraftSnapshot(rascunhoMetadados: unknown): TSaleRewardDraftSnapshot | null {
	if (!rascunhoMetadados || typeof rascunhoMetadados !== "object") return null;
	const root = rascunhoMetadados as { recompensa?: unknown; shop?: { recompensa?: unknown } | null };
	const recompensa = root.recompensa ?? (root.shop && typeof root.shop === "object" ? root.shop.recompensa : undefined);
	if (!recompensa || typeof recompensa !== "object") return null;
	const snapshot = recompensa as Partial<TSaleRewardDraftSnapshot>;
	if (typeof snapshot.recompensaId !== "string" || typeof snapshot.programaId !== "string") return null;
	return {
		recompensaId: snapshot.recompensaId,
		programaId: snapshot.programaId,
		titulo: typeof snapshot.titulo === "string" ? snapshot.titulo : "",
		valor: typeof snapshot.valor === "number" ? snapshot.valor : 0,
		valorVenda: typeof snapshot.valorVenda === "number" ? snapshot.valorVenda : 0,
	};
}
