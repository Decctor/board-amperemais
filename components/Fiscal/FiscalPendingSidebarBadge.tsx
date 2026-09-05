"use client";

import { useFiscalPending } from "@/lib/queries/fiscal";

/**
 * Badge do item "Fiscal" na sidebar: quantas pendencias exigem acao humana agora. A API exige
 * `fiscal.visualizar`; sem permissao a query falha silenciosamente e nada e renderizado.
 */
export function FiscalPendingSidebarBadge() {
	const { data } = useFiscalPending({ refetchInterval: 120_000 });
	const total = data?.resumo.total ?? 0;
	if (total === 0) return null;
	return (
		<span className="ml-auto rounded-full bg-destructive px-1.5 py-px text-[10px] font-bold tabular-nums text-destructive-foreground group-data-[collapsible=icon]:hidden">
			{total > 99 ? "99+" : total}
		</span>
	);
}
