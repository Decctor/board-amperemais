import type { TIfoodItemDTO } from "@/lib/integrations/ifood/catalog-types";
import type { TCatalogLinkEntity } from "@/services/drizzle/schema";

export type TMatchCandidate = {
	produtoId: string;
	produtoVarianteId: string | null;
	nome: string;
	codigo: string | null;
	precoVenda: number | null;
};

export type TMatchSuggestion = {
	/** Item remoto ainda sem vínculo. */
	item: { id: string; nome: string | null; codigoExterno: string | null; preco: number | null };
	candidato: TMatchCandidate | null;
	/** FORTE: código bate exatamente. FRACA: só o nome se parece — exige confirmação humana. */
	forca: "FORTE" | "FRACA" | "NENHUMA";
	motivo: string;
};

function normalize(value: string) {
	return value
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, " ")
		.trim();
}

/**
 * Similaridade por tokens (Jaccard). Escolhida em vez de distância de edição porque os nomes aqui
 * divergem por palavras inteiras ("X-Burger" vs "X Burger Especial"), não por typos.
 */
function nameSimilarity(a: string, b: string) {
	const tokensA = new Set(normalize(a).split(" ").filter(Boolean));
	const tokensB = new Set(normalize(b).split(" ").filter(Boolean));
	if (tokensA.size === 0 || tokensB.size === 0) return 0;
	let intersection = 0;
	for (const token of tokensA) if (tokensB.has(token)) intersection += 1;
	return intersection / (tokensA.size + tokensB.size - intersection);
}

const WEAK_MATCH_THRESHOLD = 0.6;

/**
 * Sugere vínculos para os itens remotos ainda não vinculados.
 *
 * O casamento por código é o mesmo par que a ingestão de pedidos já usa hoje (`externalCode` ↔
 * `codigo`), então um match FORTE aqui também conserta o matching do pedido quando o vínculo é
 * criado. Candidatos já vinculados a OUTRO item são excluídos: um produto interno pertence a no
 * máximo um item por loja.
 */
export function suggestCatalogLinks({
	items,
	candidates,
	existingLinks,
}: {
	items: TIfoodItemDTO[];
	candidates: TMatchCandidate[];
	existingLinks: TCatalogLinkEntity[];
}): TMatchSuggestion[] {
	const linkedItemIds = new Set(
		existingLinks.filter((link) => link.status !== "DESVINCULADO" && link.externoItemId).map((link) => link.externoItemId),
	);
	const linkedNodeIds = new Set(
		existingLinks.filter((link) => link.status !== "DESVINCULADO").map((link) => link.produtoVarianteId ?? link.produtoId ?? ""),
	);

	const available = candidates.filter((candidate) => !linkedNodeIds.has(candidate.produtoVarianteId ?? candidate.produtoId));
	const byCode = new Map<string, TMatchCandidate>();
	for (const candidate of available) {
		if (candidate.codigo) byCode.set(candidate.codigo.trim().toLowerCase(), candidate);
	}

	return items
		.filter((item) => item.id && !linkedItemIds.has(item.id))
		.map((item): TMatchSuggestion => {
			const base = { id: item.id as string, nome: item.nome, codigoExterno: item.codigoExterno, preco: item.preco };

			const code = item.codigoExterno?.trim().toLowerCase();
			const strong = code ? byCode.get(code) : undefined;
			if (strong) {
				return { item: base, candidato: strong, forca: "FORTE", motivo: `Código "${item.codigoExterno}" idêntico ao do cadastro.` };
			}

			if (!item.nome) return { item: base, candidato: null, forca: "NENHUMA", motivo: "Item sem nome no iFood — vincule manualmente." };

			let best: { candidate: TMatchCandidate; score: number } | null = null;
			for (const candidate of available) {
				const score = nameSimilarity(item.nome, candidate.nome);
				if (!best || score > best.score) best = { candidate, score };
			}
			if (best && best.score >= WEAK_MATCH_THRESHOLD) {
				return {
					item: base,
					candidato: best.candidate,
					forca: "FRACA",
					motivo: `Nome parecido com "${best.candidate.nome}" (${Math.round(best.score * 100)}%). Confirme antes de vincular.`,
				};
			}

			return { item: base, candidato: null, forca: "NENHUMA", motivo: "Sem correspondência no cadastro — publique ou importe." };
		});
}
