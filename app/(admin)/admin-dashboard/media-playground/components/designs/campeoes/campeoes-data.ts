export const CAMPEOES_CAMPAIGN = {
	title: "CLUBE CAMPEÕES AMPÈRE+",
	status: "ATIVA" as const,
	description: "Benefício premium para os clientes de maior valor e frequência.",
	trigger: "Nova Compra",
	attribution: "Último Toque",
	windowDays: 14,
	segments: 3,
	period: "01/02/2026 - 30/04/2026",
};

export const CAMPEOES_CORE_KPIS = [
	{ title: "INTERAÇÕES ENVIADAS", value: "191", icon: "message-circle" as const },
	{ title: "CONVERSÕES", value: "144", icon: "mouse-pointer-click" as const },
	{ title: "TAXA DE CONVERSÃO", value: "75,39%", icon: "trending-up" as const },
	{ title: "RECEITA ATRIBUÍDA", value: "R$ 29.408,63", icon: "badge-dollar-sign" as const },
	{ title: "TEMPO MÉDIO DE CONVERSÃO", value: "111,6 horas", icon: "clock" as const },
];

export const CAMPEOES_DELIVERY_KPIS = [
	{ title: "CLIENTES ALCANÇADOS", value: "99", icon: "users" as const },
	{ title: "CLIENTES CONVERTIDOS", value: "36", icon: "user-round-check" as const },
	{ title: "MENSAGENS ENTREGUES", value: "140", icon: "send" as const },
	{ title: "FALHAS DE ENVIO", value: "49", icon: "circle-x" as const },
	{ title: "TICKET MÉDIO DAS CONVERSÕES", value: "R$ 204,23", icon: "badge-dollar-sign" as const },
];

export const CAMPEOES_QUALITY_KPIS = [
	{ title: "AQUISIÇÕES", value: "0", icon: "user-plus" as const },
	{ title: "REATIVAÇÕES", value: "4", icon: "refresh-cw" as const },
	{ title: "ACELERAÇÕES", value: "109", icon: "zap" as const },
	{ title: "ANTECIPAÇÃO MÉDIA", value: "10,7 dias", icon: "trending-up" as const },
	{ title: "IMPACTO NO TICKET", value: "+51,78%", icon: "badge-dollar-sign" as const },
];

export const CAMPEOES_HIGHLIGHT_KPIS = [
	{ title: "CONVERSÕES", value: "144", icon: "mouse-pointer-click" as const },
	{ title: "TAXA DE CONVERSÃO", value: "75,39%", icon: "trending-up" as const },
	{ title: "RECEITA ATRIBUÍDA", value: "R$ 29.408,63", icon: "badge-dollar-sign" as const },
	{ title: "IMPACTO NO TICKET", value: "+51,78%", icon: "zap" as const },
];

export const CAMPEOES_CONVERSION_DISTRIBUTION = [
	{ type: "Aceleração", count: 109, percentage: 75.69, revenue: "R$ 19.936,77", color: "#EAB308" },
	{ type: "Atrasada", count: 17, percentage: 11.81, revenue: "R$ 4.087,13", color: "#EF4444" },
	{ type: "Regular", count: 14, percentage: 9.72, revenue: "R$ 4.938,85", color: "#9CA3AF" },
	{ type: "Reativação", count: 4, percentage: 2.78, revenue: "R$ 445,88", color: "#3B82F6" },
];

export const CAMPEOES_FREQUENCY_IMPACT = {
	accelerated: 109,
	delayed: 21,
	averageAnticipation: "10,7 dias",
};

export const CAMPEOES_MONETARY_IMPACT = {
	aboveAverage: 61,
	belowAverage: 83,
	averageVariation: "+51,78%",
};
