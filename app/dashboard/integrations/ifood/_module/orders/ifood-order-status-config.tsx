import type { TIfoodOrderActionEnum } from "@/lib/integrations/ifood/order-types";

/**
 * Config de exibição/ações do ciclo de vida do pedido iFood. O `situacao` da venda vem do
 * pipeline de ingestão (order.status ou status derivado de eventos) — valores como PLACED,
 * CONFIRMED, PREPARATION_STARTED, READY_TO_PICKUP, DISPATCHED, CONCLUDED, CANCELLED.
 */

type TIfoodOrderStatusConfig = {
	label: string;
	className: string;
};

const IFOOD_ORDER_STATUS_CONFIG: Record<string, TIfoodOrderStatusConfig> = {
	PLACED: { label: "NOVO PEDIDO", className: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400" },
	CONFIRMED: { label: "CONFIRMADO", className: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400" },
	PREPARATION_STARTED: { label: "EM PREPARO", className: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400" },
	SEPARATION_STARTED: { label: "EM SEPARAÇÃO", className: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400" },
	SEPARATION_ENDED: { label: "SEPARADO", className: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400" },
	READY_TO_PICKUP: { label: "PRONTO", className: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-400" },
	DISPATCHED: { label: "DESPACHADO", className: "border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-400" },
	CONCLUDED: { label: "CONCLUÍDO", className: "border-green-600/25 bg-green-500/10 text-green-700 dark:text-green-400" },
	CANCELLED: { label: "CANCELADO", className: "border-destructive/30 bg-destructive/10 text-destructive" },
	CANCELED: { label: "CANCELADO", className: "border-destructive/30 bg-destructive/10 text-destructive" },
};

export function getIfoodOrderStatusConfig(situacao: string | null | undefined): TIfoodOrderStatusConfig {
	const normalized = situacao?.toUpperCase() ?? "";
	return (
		IFOOD_ORDER_STATUS_CONFIG[normalized] ?? { label: normalized || "DESCONHECIDO", className: "border-border/60 bg-muted/30 text-foreground/80" }
	);
}

const FINAL_STATUSES = new Set(["DISPATCHED", "CONCLUDED", "CANCELLED", "CANCELED"]);

/** Ações do iFood disponíveis conforme o status atual. Status desconhecido libera o fluxo todo (o iFood valida). */
export function getAvailableIfoodOrderActions(situacao: string | null | undefined): TIfoodOrderActionEnum[] {
	const normalized = situacao?.toUpperCase() ?? "";

	if (normalized === "PLACED") return ["confirm", "requestCancellation"];
	if (normalized === "CONFIRMED") return ["startPreparation", "readyToPickup", "dispatch", "requestCancellation"];
	if (normalized === "PREPARATION_STARTED" || normalized === "SEPARATION_STARTED" || normalized === "SEPARATION_ENDED") {
		return ["readyToPickup", "dispatch", "requestCancellation"];
	}
	if (normalized === "READY_TO_PICKUP") return ["dispatch", "requestCancellation"];
	if (FINAL_STATUSES.has(normalized)) return [];
	return ["confirm", "startPreparation", "readyToPickup", "dispatch", "requestCancellation"];
}

export const IFOOD_ORDER_ACTION_BUTTON_LABELS: Record<TIfoodOrderActionEnum, string> = {
	confirm: "CONFIRMAR",
	startPreparation: "INICIAR PREPARO",
	readyToPickup: "PRONTO",
	dispatch: "DESPACHAR",
	requestCancellation: "CANCELAR PEDIDO",
};
