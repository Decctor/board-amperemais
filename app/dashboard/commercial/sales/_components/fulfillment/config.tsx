import type { TSaleAttendanceStatusEnum, TSaleFinancialDerivedStatusEnum, TSaleFiscalDerivedStatusEnum } from "@/schemas/enums";
import { isValidAttendanceTransition } from "@/lib/sale-processing/attendance";
import {
	CircleCheck,
	ClipboardList,
	type LucideIcon,
	Inbox,
	Package,
	PackageCheck,
	PackageOpen,
	Store,
	Truck,
} from "lucide-react";

// Colunas do quadro de atendimento, na ordem do fluxo operacional.
// CANCELADO e acao (nao coluna); PARCIALMENTE_ENTREGUE e sub-estado exibido dentro de ENTREGUE.
export const BOARD_STATUSES = ["NAO_INICIADO", "EM_PREPARO", "PRONTO", "EM_ENTREGA", "ENTREGUE"] as const;
export type TBoardStatus = (typeof BOARD_STATUSES)[number];

export const ATTENDANCE_COLUMN_META: Record<TBoardStatus, { label: string; icon: LucideIcon; hint: string }> = {
	NAO_INICIADO: { label: "Não iniciado", icon: Inbox, hint: "Pedidos confirmados aguardando início" },
	EM_PREPARO: { label: "Em preparo", icon: PackageOpen, hint: "Sendo preparados/separados" },
	PRONTO: { label: "Pronto", icon: PackageCheck, hint: "Prontos para retirada ou despacho" },
	EM_ENTREGA: { label: "Em entrega", icon: Truck, hint: "A caminho do cliente" },
	ENTREGUE: { label: "Entregue", icon: CircleCheck, hint: "Concluídos (baixa de estoque feita)" },
};

// Rotulo curto de todas as etapas (inclui as que ficam fora do quadro).
export const ATTENDANCE_STATUS_LABEL: Record<TSaleAttendanceStatusEnum, string> = {
	NAO_INICIADO: "Não iniciado",
	EM_PREPARO: "Em preparo",
	PRONTO: "Pronto",
	EM_ENTREGA: "Em entrega",
	ENTREGUE: "Entregue",
	PARCIALMENTE_ENTREGUE: "Parcialmente entregue",
	CANCELADO: "Cancelado",
};

// Transicoes que disparam baixa fisica de estoque, logo exigem confirmacao leve.
export function transitionNeedsConfirmation(to: TSaleAttendanceStatusEnum): boolean {
	return to === "ENTREGUE";
}

// Alvos validos (entre as colunas do quadro) para o card a partir do status atual.
export function getValidBoardTargets(from: TSaleAttendanceStatusEnum): TBoardStatus[] {
	return BOARD_STATUSES.filter((target) => isValidAttendanceTransition(from, target));
}

// Badge financeiro derivado. Apenas o estado problematico (atraso) usa enfase destrutiva.
export const FINANCIAL_BADGE_META: Record<TSaleFinancialDerivedStatusEnum, { label: string; tone: "muted" | "neutral" | "danger" }> = {
	NAO_GERADO: { label: "Sem financeiro", tone: "muted" },
	PENDENTE: { label: "A receber", tone: "neutral" },
	PARCIALMENTE_RECEBIDA: { label: "Parcial", tone: "neutral" },
	RECEBIDA: { label: "Recebida", tone: "neutral" },
	EM_ATRASO: { label: "Em atraso", tone: "danger" },
};

// Badge fiscal derivado. Rejeicao/erro usam enfase destrutiva.
export const FISCAL_BADGE_META: Record<TSaleFiscalDerivedStatusEnum, { label: string; tone: "muted" | "neutral" | "danger" }> = {
	NAO_EMITIDO: { label: "Sem nota", tone: "muted" },
	PENDENTE: { label: "Nota pendente", tone: "neutral" },
	EM_PROCESSAMENTO: { label: "Processando", tone: "neutral" },
	AUTORIZADO: { label: "Autorizada", tone: "neutral" },
	REJEITADO: { label: "Rejeitada", tone: "danger" },
	CANCELADO: { label: "Cancelada", tone: "muted" },
	INUTILIZADO: { label: "Inutilizada", tone: "muted" },
	ERRO: { label: "Erro fiscal", tone: "danger" },
};

export const DELIVERY_MODE_META: Record<string, { label: string; icon: LucideIcon }> = {
	PRESENCIAL: { label: "Presencial", icon: Store },
	RETIRADA: { label: "Retirada", icon: Package },
	ENTREGA: { label: "Entrega", icon: Truck },
	COMANDA: { label: "Comanda", icon: ClipboardList },
};
