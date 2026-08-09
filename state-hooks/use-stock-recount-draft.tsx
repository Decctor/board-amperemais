"use client";

import type { TGetStockRecountOutputRow } from "@/app/api/products/stock-recount/route";
import { useCallback, useEffect, useMemo, useState } from "react";

// Rascunho local de uma recontagem de estoque. Persistido em localStorage por organização para
// sobreviver a refresh, navegação e paginação durante uma sessão de contagem física. Sincronização
// entre abas (evento `storage`) fica fora do escopo da v1.

export type TStockRecountDraftEntry = {
	produtoId: string;
	produtoVarianteId: string | null;
	quantidadeContada: number;
	// Saldo visto no momento da contagem — apenas para exibição/aviso de staleness. O delta real é
	// sempre calculado no servidor contra o saldo do momento da aplicação.
	quantidadeReferencia: number;
	nome: string;
	varianteNome: string | null;
	unidade: string;
	atualizadoEm: string;
};

type TStockRecountDraftPayload = {
	versao: 1;
	itens: TStockRecountDraftEntry[];
};

export function stockRecountEntryKey(produtoId: string, produtoVarianteId: string | null) {
	return produtoVarianteId ? `${produtoId}::${produtoVarianteId}` : produtoId;
}

function getStorageKey(organizationId: string) {
	return `recompra:stock-recount-draft:${organizationId}`;
}

function readStoredDraft(organizationId: string): Record<string, TStockRecountDraftEntry> {
	if (typeof window === "undefined") return {};
	try {
		const raw = window.localStorage.getItem(getStorageKey(organizationId));
		if (!raw) return {};
		const parsed = JSON.parse(raw) as TStockRecountDraftPayload;
		if (!parsed || parsed.versao !== 1 || !Array.isArray(parsed.itens)) return {};
		const entries: Record<string, TStockRecountDraftEntry> = {};
		for (const item of parsed.itens) {
			if (!item?.produtoId || typeof item.quantidadeContada !== "number") continue;
			entries[stockRecountEntryKey(item.produtoId, item.produtoVarianteId ?? null)] = item;
		}
		return entries;
	} catch {
		return {};
	}
}

function persistDraft(organizationId: string, entries: Record<string, TStockRecountDraftEntry>) {
	if (typeof window === "undefined") return;
	try {
		const itens = Object.values(entries);
		if (itens.length === 0) {
			window.localStorage.removeItem(getStorageKey(organizationId));
			return;
		}
		const payload: TStockRecountDraftPayload = { versao: 1, itens };
		window.localStorage.setItem(getStorageKey(organizationId), JSON.stringify(payload));
	} catch {
		// Quota cheia ou storage indisponível — o rascunho segue em memória.
	}
}

export function useStockRecountDraft({ organizationId }: { organizationId: string }) {
	const [entries, setEntries] = useState<Record<string, TStockRecountDraftEntry>>(() => readStoredDraft(organizationId));

	useEffect(() => {
		persistDraft(organizationId, entries);
	}, [organizationId, entries]);

	const setCount = useCallback((row: TGetStockRecountOutputRow, quantidadeContada: number) => {
		setEntries((prev) => ({
			...prev,
			[stockRecountEntryKey(row.produtoId, row.produtoVarianteId)]: {
				produtoId: row.produtoId,
				produtoVarianteId: row.produtoVarianteId,
				quantidadeContada,
				quantidadeReferencia: row.quantidade,
				nome: row.nome,
				varianteNome: row.varianteNome,
				unidade: row.unidade,
				atualizadoEm: new Date().toISOString(),
			},
		}));
	}, []);

	const clearEntry = useCallback((key: string) => {
		setEntries((prev) => {
			if (!(key in prev)) return prev;
			const next = { ...prev };
			delete next[key];
			return next;
		});
	}, []);

	const discardAll = useCallback(() => {
		setEntries({});
	}, []);

	const getEntry = useCallback((key: string) => entries[key], [entries]);

	const entriesList = useMemo(() => Object.values(entries).sort((a, b) => a.atualizadoEm.localeCompare(b.atualizadoEm)), [entries]);

	const count = entriesList.length;

	return {
		entries,
		entriesList,
		count,
		isDirty: count > 0,
		setCount,
		clearEntry,
		discardAll,
		getEntry,
	};
}
export type TUseStockRecountDraft = ReturnType<typeof useStockRecountDraft>;
