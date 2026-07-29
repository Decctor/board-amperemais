import type { TChatBoardStatus } from "@/lib/chats/board";
import type { TChatAssignmentPriority, TChatAssignmentStatus } from "@/schemas/enums";
import { CheckCircle2, CircleDot, Clock, Inbox, type LucideIcon, MessageCircle, UserCheck } from "lucide-react";

/** Cabeçalho de cada coluna. O `hint` é o que a coluna vazia diz — nunca um "nada aqui" seco. */
export const CHAT_BOARD_COLUMN_META: Record<TChatBoardStatus, { label: string; icon: LucideIcon; hint: string }> = {
	ABERTO: { label: "Aberto", icon: Inbox, hint: "Cliente aguardando a primeira resposta" },
	EM_ATENDIMENTO: { label: "Em atendimento", icon: MessageCircle, hint: "Conversas em andamento" },
	AGUARDANDO_CLIENTE: { label: "Aguardando cliente", icon: Clock, hint: "A bola está com o cliente" },
	AGUARDANDO_INTERNO: { label: "Aguardando interno", icon: UserCheck, hint: "Parado por dependência da equipe" },
	RESOLVIDO: { label: "Resolvido", icon: CheckCircle2, hint: "Resolvidos, ainda não encerrados" },
	ENCERRADO: { label: "Encerrado", icon: CircleDot, hint: "Nada encerrado na janela escolhida" },
};

export const CHAT_ASSIGNMENT_STATUS_LABEL: Record<TChatAssignmentStatus, string> = {
	ABERTO: "Aberto",
	EM_ATENDIMENTO: "Em atendimento",
	AGUARDANDO_CLIENTE: "Aguardando cliente",
	AGUARDANDO_INTERNO: "Aguardando interno",
	RESOLVIDO: "Resolvido",
	ENCERRADO: "Encerrado",
	CANCELADO: "Cancelado",
};

/**
 * Só `ALTA` e `URGENTE` recebem tinta.
 *
 * Prioridade baixa e média são o normal da fila, e normal não pede atenção — a mesma regra
 * que faz a inbox não colorir "janela aberta". Colorir as quatro faria quatro sinais
 * competirem e nenhum se destacar.
 */
export const CHAT_PRIORITY_LABEL: Record<TChatAssignmentPriority, string> = {
	BAIXA: "Baixa",
	MEDIA: "Média",
	ALTA: "Alta",
	URGENTE: "Urgente",
};

export const CHAT_PRIORITY_PILL_CLASS: Partial<Record<TChatAssignmentPriority, string>> = {
	// "Soft amber" e destrutivo do DESIGN.md §5 — nada de verde/roxo ad-hoc (regra de fechamento da paleta).
	ALTA: "border border-brand/35 bg-brand/18 text-foreground",
	URGENTE: "border border-destructive/25 bg-destructive/10 text-destructive",
};

/** Ponto de janela de 24h — mesmas cores da inbox, para o sinal significar a mesma coisa. */
export const CHAT_WINDOW_DOT_CLASS = {
	aberta: "bg-muted-foreground/40",
	gateway: "bg-muted-foreground/40",
	expirando: "bg-brand",
	expirada: "bg-destructive",
} as const;
