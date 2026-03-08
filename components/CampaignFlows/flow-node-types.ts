// Node subtypes and their metadata for the campaign flow builder

export type TFlowNodeSubtype = {
	subtipo: string;
	rotulo: string;
	descricao: string;
	categoria: string;
	icon: string;
};

export const TRIGGER_SUBTYPES: TFlowNodeSubtype[] = [
	{ subtipo: "NOVA-COMPRA", rotulo: "Nova compra", descricao: "Quando o cliente faz uma compra", categoria: "ATIVIDADE", icon: "ShoppingCart" },
	{
		subtipo: "PRIMEIRA-COMPRA",
		rotulo: "Primeira compra",
		descricao: "Quando o cliente faz sua primeira compra",
		categoria: "ATIVIDADE",
		icon: "ShoppingBag",
	},
	{ subtipo: "ANIVERSARIO_CLIENTE", rotulo: "Aniversário", descricao: "No aniversário do cliente", categoria: "DATA", icon: "Cake" },
	{
		subtipo: "ENTRADA-SEGMENTACAO",
		rotulo: "Entrada em segmento",
		descricao: "Quando cliente entra em um segmento RFM",
		categoria: "SEGMENTO",
		icon: "UserPlus",
	},
	{
		subtipo: "PERMANENCIA-SEGMENTACAO",
		rotulo: "Permanência em segmento",
		descricao: "Enquanto o cliente permanece em um segmento",
		categoria: "SEGMENTO",
		icon: "Users",
	},
	{
		subtipo: "CASHBACK-ACUMULADO",
		rotulo: "Cashback acumulado",
		descricao: "Quando cashback atinge um valor",
		categoria: "FINANCEIRO",
		icon: "Coins",
	},
	{
		subtipo: "CASHBACK-EXPIRANDO",
		rotulo: "Cashback expirando",
		descricao: "Quando cashback está próximo de expirar",
		categoria: "FINANCEIRO",
		icon: "Clock",
	},
	{
		subtipo: "VALOR-TOTAL-COMPRAS",
		rotulo: "Valor total de compras",
		descricao: "Quando valor acumulado atinge meta",
		categoria: "ATIVIDADE",
		icon: "TrendingUp",
	},
	{
		subtipo: "QUANTIDADE-TOTAL-COMPRAS",
		rotulo: "Qtd. total de compras",
		descricao: "Quando quantidade de compras atinge meta",
		categoria: "ATIVIDADE",
		icon: "Hash",
	},
	{ subtipo: "RECORRENTE", rotulo: "Recorrente (Cron)", descricao: "Execução recorrente agendada", categoria: "SISTEMA", icon: "RefreshCw" },
];

export const ACTION_SUBTYPES: TFlowNodeSubtype[] = [
	{
		subtipo: "ENVIAR-WHATSAPP",
		rotulo: "Enviar WhatsApp",
		descricao: "Enviar mensagem via WhatsApp",
		categoria: "COMUNICACAO",
		icon: "MessageCircle",
	},
	{ subtipo: "GERAR-CASHBACK", rotulo: "Gerar cashback", descricao: "Gerar cashback para o cliente", categoria: "FINANCEIRO", icon: "BadgePercent" },
	{ subtipo: "NOTIFICACAO-INTERNA", rotulo: "Notificação interna", descricao: "Notificar equipe internamente", categoria: "GESTAO", icon: "Bell" },
];

export const DELAY_SUBTYPES: TFlowNodeSubtype[] = [
	{ subtipo: "ESPERAR-DURACAO", rotulo: "Esperar duração", descricao: "Aguardar um período de tempo", categoria: "TEMPO", icon: "Timer" },
	{
		subtipo: "ESPERAR-ATE-HORARIO",
		rotulo: "Esperar até horário",
		descricao: "Aguardar até um horário específico",
		categoria: "TEMPO",
		icon: "Clock",
	},
	{ subtipo: "ESPERAR-ATE-DATA", rotulo: "Esperar até data", descricao: "Aguardar até uma data específica", categoria: "TEMPO", icon: "Calendar" },
];

export const CONDITION_SUBTYPES: TFlowNodeSubtype[] = [
	{
		subtipo: "VERIFICAR-ATRIBUTO-CLIENTE",
		rotulo: "Verificar atributo",
		descricao: "Verificar um atributo do cliente",
		categoria: "CONDICOES",
		icon: "UserCheck",
	},
	{
		subtipo: "VERIFICAR-COMPRA-RECENTE",
		rotulo: "Compra recente",
		descricao: "Verificar se houve compra recente",
		categoria: "CONDICOES",
		icon: "ShoppingCart",
	},
	{
		subtipo: "VERIFICAR-INTERACAO-ANTERIOR",
		rotulo: "Interação anterior",
		descricao: "Verificar resultado de interação anterior",
		categoria: "CONDICOES",
		icon: "MessageSquare",
	},
	{
		subtipo: "VERIFICAR-SEGMENTO-RFM",
		rotulo: "Segmento RFM",
		descricao: "Verificar segmento RFM do cliente",
		categoria: "CONDICOES",
		icon: "Grid3X3",
	},
	{ subtipo: "VERIFICAR-CASHBACK-SALDO", rotulo: "Saldo cashback", descricao: "Verificar saldo de cashback", categoria: "CONDICOES", icon: "Wallet" },
];

export const FILTER_SUBTYPES: TFlowNodeSubtype[] = [
	{
		subtipo: "FILTRAR-POR-PUBLICO",
		rotulo: "Filtrar por público",
		descricao: "Filtrar usando um público salvo",
		categoria: "FILTROS",
		icon: "Filter",
	},
	{
		subtipo: "FILTRAR-INLINE",
		rotulo: "Filtro personalizado",
		descricao: "Filtrar com condições personalizadas",
		categoria: "FILTROS",
		icon: "SlidersHorizontal",
	},
];

export function getNodeSubtypesByTipo(tipo: string): TFlowNodeSubtype[] {
	switch (tipo) {
		case "GATILHO":
			return TRIGGER_SUBTYPES;
		case "ACAO":
			return ACTION_SUBTYPES;
		case "DELAY":
			return DELAY_SUBTYPES;
		case "CONDICAO":
			return CONDITION_SUBTYPES;
		case "FILTRO":
			return FILTER_SUBTYPES;
		default:
			return [];
	}
}

export function getNodeSubtype(tipo: string, subtipo: string): TFlowNodeSubtype | undefined {
	return getNodeSubtypesByTipo(tipo).find((s) => s.subtipo === subtipo);
}

export const NODE_TYPE_LABELS: Record<string, string> = {
	GATILHO: "GATILHO",
	ACAO: "AÇÃO",
	DELAY: "DELAY",
	CONDICAO: "LÓGICA",
	FILTRO: "FILTRO",
};

export const NODE_TYPE_COLORS: Record<string, { bg: string; border: string; badge: string; text: string }> = {
	GATILHO: {
		bg: "bg-amber-50 dark:bg-amber-950/30",
		border: "border-amber-200 dark:border-amber-800",
		badge: "bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300",
		text: "text-amber-700 dark:text-amber-300",
	},
	ACAO: {
		bg: "bg-blue-50 dark:bg-blue-950/30",
		border: "border-blue-200 dark:border-blue-800",
		badge: "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300",
		text: "text-blue-700 dark:text-blue-300",
	},
	DELAY: {
		bg: "bg-purple-50 dark:bg-purple-950/30",
		border: "border-purple-200 dark:border-purple-800",
		badge: "bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300",
		text: "text-purple-700 dark:text-purple-300",
	},
	CONDICAO: {
		bg: "bg-orange-50 dark:bg-orange-950/30",
		border: "border-orange-200 dark:border-orange-800",
		badge: "bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300",
		text: "text-orange-700 dark:text-orange-300",
	},
	FILTRO: {
		bg: "bg-green-50 dark:bg-green-950/30",
		border: "border-green-200 dark:border-green-800",
		badge: "bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300",
		text: "text-green-700 dark:text-green-300",
	},
};
