import type { TDemandTrendEnum, TReplenishmentStatusEnum } from "@/schemas/enums";
import { cn } from "@/lib/utils";
import {
	ArrowDownRight,
	ArrowRight,
	ArrowUpRight,
	type LucideIcon,
	AlertOctagon,
	AlertTriangle,
	CheckCircle2,
	Clock,
	Layers,
	Moon,
} from "lucide-react";

// Vocabulário único da tela: o mesmo rótulo e a mesma cor aparecem no card de resumo, no chip da
// linha e na planilha exportada. Situações diferentes com a mesma cor foi o que fez a versão em
// planilha da compradora precisar de uma legenda à parte.
export const REPLENISHMENT_STATUS_META: Record<
	TReplenishmentStatusEnum,
	{ label: string; descricao: string; icon: LucideIcon; chipClassName: string; toneClassName: string }
> = {
	RUPTURA: {
		label: "Ruptura",
		descricao: "Saldo zerado com demanda ativa — já está deixando de vender.",
		icon: AlertOctagon,
		chipClassName: "bg-red-600 text-white dark:bg-red-700",
		toneClassName: "text-red-600 dark:text-red-400",
	},
	CRITICO: {
		label: "Crítico",
		descricao: "Vai faltar antes de a mercadoria chegar, mesmo comprando hoje.",
		icon: AlertTriangle,
		chipClassName: "bg-orange-500 text-white dark:bg-orange-600",
		toneClassName: "text-orange-600 dark:text-orange-400",
	},
	ATENCAO: {
		label: "Atenção",
		descricao: "Chegou ao ponto de pedido: comprar nesta rodada.",
		icon: Clock,
		chipClassName: "bg-yellow-500 text-white dark:bg-yellow-600",
		toneClassName: "text-yellow-700 dark:text-yellow-400",
	},
	SAUDAVEL: {
		label: "Saudável",
		descricao: "Cobertura dentro da política. Nada a fazer.",
		icon: CheckCircle2,
		chipClassName: "bg-green-600 text-white dark:bg-green-700",
		toneClassName: "text-green-600 dark:text-green-400",
	},
	EXCESSO: {
		label: "Excesso",
		descricao: "Cobertura acima do limite — capital parado, candidato a oferta.",
		icon: Layers,
		chipClassName: "bg-blue-600 text-white dark:bg-blue-700",
		toneClassName: "text-blue-600 dark:text-blue-400",
	},
	SEM_GIRO: {
		label: "Sem giro",
		descricao: "Saldo em estoque sem nenhuma saída na janela analisada.",
		icon: Moon,
		chipClassName: "bg-zinc-500 text-white dark:bg-zinc-600",
		toneClassName: "text-zinc-600 dark:text-zinc-400",
	},
};

export const REPLENISHMENT_STATUS_ORDER: TReplenishmentStatusEnum[] = ["RUPTURA", "CRITICO", "ATENCAO", "SAUDAVEL", "EXCESSO", "SEM_GIRO"];

export function StatusChip({ status, className }: { status: TReplenishmentStatusEnum; className?: string }) {
	const meta = REPLENISHMENT_STATUS_META[status];
	const Icon = meta.icon;
	return (
		<span
			title={meta.descricao}
			className={cn(
				"inline-flex w-fit items-center gap-1 rounded-md px-2 py-0.5 text-[0.65rem] font-bold tracking-tight",
				meta.chipClassName,
				className,
			)}
		>
			<Icon className="h-3 w-3 min-h-3 min-w-3" />
			{meta.label.toUpperCase()}
		</span>
	);
}

export const DEMAND_TREND_META: Record<TDemandTrendEnum, { label: string; icon: LucideIcon; className: string }> = {
	ALTA: { label: "Demanda em alta", icon: ArrowUpRight, className: "text-green-600 dark:text-green-400" },
	ESTAVEL: { label: "Demanda estável", icon: ArrowRight, className: "text-muted-foreground" },
	QUEDA: { label: "Demanda em queda", icon: ArrowDownRight, className: "text-red-600 dark:text-red-400" },
};

export function TrendIcon({ tendencia }: { tendencia: TDemandTrendEnum }) {
	const meta = DEMAND_TREND_META[tendencia];
	const Icon = meta.icon;
	return <Icon className={cn("h-3.5 w-3.5 min-h-3.5 min-w-3.5", meta.className)} aria-label={meta.label} />;
}

// Cobertura nula quer dizer "sem demanda para projetar", não "zero dias". A distinção é o que
// separa um item parado de um item prestes a faltar, e um "0" ali inverteria a leitura.
export function formatCoverage(coberturaDias: number | null) {
	if (coberturaDias == null) return "—";
	if (coberturaDias >= 999) return "999+ dias";
	if (coberturaDias < 1) return "menos de 1 dia";
	return `${Math.round(coberturaDias)} dias`;
}

export function formatQuantity(value: number, unidade?: string) {
	const formatted = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(value);
	return unidade ? `${formatted} ${unidade}` : formatted;
}
