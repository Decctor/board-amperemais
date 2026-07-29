import type { TChatAssignmentPriority, TChatAssignmentResponsibleType, TChatAssignmentStatus, TChatMessageAuthorTypeEnum } from "@/schemas/enums";

/**
 * Constantes e rótulos da aba de estatísticas.
 *
 * Separado de `lib/chats/analytics.ts` de propósito: aquele módulo importa `drizzle-orm`
 * para montar SQL e não pode ser puxado por um componente cliente sem arrastar o ORM
 * inteiro para o bundle.
 */

/** Abaixo desta amostra o p90 é ruído — melhor não exibir do que exibir um número frágil. */
export const CHAT_STATS_MIN_SAMPLE_FOR_P90 = 10;

export const CHAT_RESPONSIBLE_TYPE_LABEL: Record<TChatAssignmentResponsibleType, string> = {
	USUARIO: "Equipe",
	AGENTE: "Automação",
	EXTERNO: "Telefone",
	NAO_ATRIBUIDO: "Sem responsável",
};

export const CHAT_MESSAGE_AUTHOR_LABEL: Record<TChatMessageAuthorTypeEnum, string> = {
	CLIENTE: "Cliente",
	"USUÁRIO": "Equipe",
	AI: "Automação",
	"BUSINESS-APP": "Telefone",
};

export const CHAT_STATS_STATUS_LABEL: Record<TChatAssignmentStatus, string> = {
	ABERTO: "Aberto",
	EM_ATENDIMENTO: "Em atendimento",
	AGUARDANDO_CLIENTE: "Aguardando cliente",
	AGUARDANDO_INTERNO: "Aguardando interno",
	RESOLVIDO: "Resolvido",
	ENCERRADO: "Encerrado",
	CANCELADO: "Cancelado",
};

export const CHAT_STATS_PRIORITY_LABEL: Record<TChatAssignmentPriority, string> = {
	BAIXA: "Baixa",
	MEDIA: "Média",
	ALTA: "Alta",
	URGENTE: "Urgente",
};

/** Paleta dourada de dataviz do DESIGN.md §2 — a marca também vale dentro dos gráficos. */
export const CHAT_STATS_CHART_COLORS = {
	azul: "#24549C",
	ouro: "#FFB900",
	bronze: "#C98A2C",
	bronzeEscuro: "#9A691E",
	neutro: "#A3A3A3",
} as const;
