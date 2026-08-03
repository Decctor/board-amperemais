export const META_AD_EFFECTIVE_STATUS_CONFIG = {
	ACTIVE: {
		label: "ATIVO",
		className: "bg-green-100 text-green-700",
	},
	PAUSED: {
		label: "PAUSADO",
		className: "bg-muted text-muted-foreground",
	},
	ADSET_PAUSED: {
		label: "CONJUNTO PAUSADO",
		className: "bg-muted text-muted-foreground",
	},
	CAMPAIGN_PAUSED: {
		label: "CAMPANHA PAUSADA",
		className: "bg-muted text-muted-foreground",
	},
	PENDING_REVIEW: {
		label: "EM REVISÃO",
		className: "bg-primary/10 text-primary",
	},
	PREAPPROVED: {
		label: "PRÉ-APROVADO",
		className: "bg-primary/10 text-primary",
	},
	IN_PROCESS: {
		label: "EM PROCESSAMENTO",
		className: "bg-primary/10 text-primary",
	},
	PENDING_BILLING_INFO: {
		label: "AGUARDANDO COBRANÇA",
		className: "bg-brand/15 text-foreground",
	},
	WITH_ISSUES: {
		label: "COM PROBLEMAS",
		className: "bg-destructive/10 text-destructive",
	},
	DISAPPROVED: {
		label: "REPROVADO",
		className: "bg-destructive/10 text-destructive",
	},
	DELETED: {
		label: "EXCLUÍDO",
		className: "bg-destructive/10 text-destructive",
	},
	ARCHIVED: {
		label: "ARQUIVADO",
		className: "bg-muted text-muted-foreground",
	},
	UNKNOWN: {
		label: "DESCONHECIDO",
		className: "bg-muted text-muted-foreground",
	},
} as const;

export type TMetaAdEffectiveStatus = keyof typeof META_AD_EFFECTIVE_STATUS_CONFIG;

export function getMetaAdEffectiveStatusConfig(status: string | null | undefined) {
	const key = (status ?? "UNKNOWN") as TMetaAdEffectiveStatus;
	return META_AD_EFFECTIVE_STATUS_CONFIG[key] ?? META_AD_EFFECTIVE_STATUS_CONFIG.UNKNOWN;
}
