import type { TChatAssignmentPriority, TChatAssignmentStatus } from "@/schemas/enums";
import { ArrowUp, CircleCheck, CircleCheckBig, CircleDot, CircleSlash, Clock, MessageCircle, PauseCircle, type LucideIcon } from "lucide-react";

/**
 * Vocabulário visual dos estados de atendimento, compartilhado entre o select de ações,
 * o card da inbox e o painel de contexto.
 *
 * Vive fora dos componentes porque três superfícies precisam concordar: se o card mostra
 * um verde e o select outro para o mesmo estado, o usuário deixa de confiar na cor.
 *
 * Cada estado tem cor **e** forma. A cor dá a leitura periférica; o ícone garante que a
 * distinção sobreviva a daltonismo — dois passos de verde (RESOLVIDO/ENCERRADO) seriam
 * indistinguíveis só por matiz. Mapeamento documentado em DESIGN.md §2.
 */

export type TAttendanceStatusMeta = {
	label: string;
	/** Classe de fundo para o ponto; `.replace("bg-","text-")` dá a do ícone. */
	dot: string;
	icon: LucideIcon;
};

export const STATUS_META: Record<TChatAssignmentStatus, TAttendanceStatusMeta> = {
	ABERTO: { label: "Aberto", dot: "bg-brand", icon: CircleDot },
	EM_ATENDIMENTO: { label: "Em atendimento", dot: "bg-primary", icon: MessageCircle },
	AGUARDANDO_CLIENTE: { label: "Aguardando cliente", dot: "bg-muted-foreground/50", icon: Clock },
	AGUARDANDO_INTERNO: { label: "Aguardando interno", dot: "bg-muted-foreground/50", icon: PauseCircle },
	RESOLVIDO: { label: "Resolvido", dot: "bg-success", icon: CircleCheck },
	ENCERRADO: { label: "Encerrado", dot: "bg-success-strong", icon: CircleCheckBig },
	CANCELADO: { label: "Cancelado", dot: "bg-destructive", icon: CircleSlash },
};

/**
 * Prioridade só aparece quando foi atribuída, e só as duas altas ganham cor: um pill
 * colorido em toda conversa "média" tornaria a urgência invisível justamente onde importa.
 */
export type TAttendancePriorityMeta = { label: string; pill: string; icon: LucideIcon | null };

export const PRIORITY_META: Record<TChatAssignmentPriority, TAttendancePriorityMeta> = {
	BAIXA: { label: "Baixa", pill: "border-border text-muted-foreground", icon: null },
	MEDIA: { label: "Média", pill: "border-border text-muted-foreground", icon: null },
	ALTA: { label: "Alta", pill: "border-brand/40 bg-brand/15 text-foreground", icon: ArrowUp },
	URGENTE: { label: "Urgente", pill: "border-destructive/30 bg-destructive/10 text-destructive", icon: ArrowUp },
};
