import type { TSaleAttendanceStatusEnum } from "@/schemas/enums";

// Metadados de exibição compartilhados entre o painel da conta e o board.

export const ORDER_STATUS_META: Record<string, { label: string; className: string }> = {
	NAO_INICIADO: { label: "NA FILA", className: "bg-muted/50 text-muted-foreground" },
	EM_PREPARO: { label: "EM PREPARO", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
	PRONTO: { label: "PRONTO", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
	EM_ENTREGA: { label: "EM ENTREGA", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
	ENTREGUE: { label: "ENTREGUE", className: "bg-green-500/10 text-green-700 dark:text-green-400" },
	PARCIALMENTE_ENTREGUE: { label: "PARCIAL", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
	CANCELADO: { label: "CANCELADO", className: "bg-destructive/10 text-destructive" },
};

// Ação rápida do garçom por status do pedido (a cozinha usa o board de Preparo).
export const ORDER_NEXT_ACTION: Partial<Record<TSaleAttendanceStatusEnum, { status: TSaleAttendanceStatusEnum; label: string }>> = {
	PRONTO: { status: "ENTREGUE", label: "ENTREGAR" },
	EM_PREPARO: { status: "PRONTO", label: "PRONTO" },
	NAO_INICIADO: { status: "EM_PREPARO", label: "INICIAR" },
};

export const TAB_STATUS_META: Record<string, { label: string; className: string }> = {
	ABERTA: { label: "ABERTA", className: "bg-green-500/10 text-green-700 dark:text-green-400" },
	FECHADA: { label: "FECHADA", className: "bg-muted text-muted-foreground" },
	CANCELADA: { label: "CANCELADA", className: "bg-destructive/10 text-destructive" },
};

export function formatTabAge(from: Date | string) {
	const minutes = Math.max(0, Math.floor((Date.now() - new Date(from).getTime()) / 60000));
	if (minutes < 60) return `${minutes}min`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h${(minutes % 60).toString().padStart(2, "0")}`;
	return `${Math.floor(hours / 24)}d`;
}
