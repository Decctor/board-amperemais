/** Configuração visual dos estados de disponibilidade da loja no iFood. */

export type TIfoodStatusVisualConfig = {
	label: string;
	className: string;
};

const STATUS_CONFIGS: Record<string, TIfoodStatusVisualConfig> = {
	OK: { label: "ABERTA", className: "bg-emerald-500/15 text-emerald-600" },
	OPENED: { label: "ABERTA", className: "bg-emerald-500/15 text-emerald-600" },
	WARNING: { label: "ATENÇÃO", className: "bg-amber-500/15 text-amber-600" },
	CLOSED: { label: "FECHADA", className: "bg-red-500/15 text-red-600" },
	ERROR: { label: "ERRO", className: "bg-red-500/15 text-red-600" },
};

const UNKNOWN_STATUS_CONFIG: TIfoodStatusVisualConfig = { label: "INDISPONÍVEL", className: "bg-muted text-muted-foreground" };

export function getIfoodStatusConfig(state: string | null, disponivel: boolean): TIfoodStatusVisualConfig {
	if (state && STATUS_CONFIGS[state.toUpperCase()]) return STATUS_CONFIGS[state.toUpperCase()];
	if (disponivel) return STATUS_CONFIGS.OK;
	return UNKNOWN_STATUS_CONFIG;
}

export const IFOOD_DAY_LABELS: Record<string, string> = {
	MONDAY: "Segunda-feira",
	TUESDAY: "Terça-feira",
	WEDNESDAY: "Quarta-feira",
	THURSDAY: "Quinta-feira",
	FRIDAY: "Sexta-feira",
	SATURDAY: "Sábado",
	SUNDAY: "Domingo",
};
