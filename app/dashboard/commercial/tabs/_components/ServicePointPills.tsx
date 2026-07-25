"use client";
import type { TGetServicePointsOutput } from "@/app/api/service-points/route";
import type { TTabListItem } from "@/app/api/tabs/route";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatToMoney } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import { ChevronLeft, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { URGENCY_META, getOpenRounds, urgencyRank, worstUrgency } from "./board-meta";

// ============================================================================
// Faixa de pontos de atendimento, no padrao das pills de conexao do dashboard.
// Mostra no maximo MAX_VISIBLE_PILLS; o resto entra num chip "+X" que sinaliza
// se ha ocupacao/atraso escondido e expande a faixa inteira sob demanda.
// A visao completa do salao vive no modo "Por mesa" — aqui e atalho.
// ============================================================================

const MAX_VISIBLE_PILLS = 5;

type TServicePoint = NonNullable<TGetServicePointsOutput["data"]["default"]>[number];

type ServicePointPillsProps = {
	points: TServicePoint[];
	tabsByPoint: Map<string, TTabListItem[]>;
	now: number;
	onSelectPoint: (point: TServicePoint) => void;
	onCreatePoint: () => void;
};

export function ServicePointPills({ points, tabsByPoint, now, onSelectPoint, onCreatePoint }: ServicePointPillsProps) {
	const [expanded, setExpanded] = useState(false);

	// Urgencia primeiro, depois ocupacao. Com so 5 vagas visiveis, ordenar por
	// ordem de cadastro esconderia uma mesa atrasada atras do "+X" enquanto uma
	// mesa ociosa ocupa a faixa — o oposto do que o board existe para responder.
	// Atraso muda devagar (uma vez por rodada), entao a faixa nao fica dancando.
	const ordered = useMemo(() => {
		const withState = points.map((point) => {
			const pointTabs = tabsByPoint.get(point.id) ?? [];
			const rounds = pointTabs.flatMap((tab) => getOpenRounds(tab, now));
			return {
				point,
				pointTabs,
				occupied: pointTabs.length > 0,
				consumo: pointTabs.reduce((sum, tab) => sum + (tab.consumoParcial ?? 0), 0),
				urgencia: worstUrgency(rounds),
			};
		});
		return withState.sort((a, b) => urgencyRank(b.urgencia) - urgencyRank(a.urgencia) || Number(b.occupied) - Number(a.occupied));
	}, [points, tabsByPoint, now]);

	const visible = expanded ? ordered : ordered.slice(0, MAX_VISIBLE_PILLS);
	const hidden = expanded ? [] : ordered.slice(MAX_VISIBLE_PILLS);
	const hiddenOccupied = hidden.filter((entry) => entry.occupied).length;
	const hiddenHasLate = hidden.some((entry) => entry.urgencia === "atrasado");

	return (
		<div className="flex w-full min-w-0 flex-wrap items-center gap-2">
			{visible.map((entry) => (
				<PointPill
					key={entry.point.id}
					point={entry.point}
					occupied={entry.occupied}
					tabCount={entry.pointTabs.length}
					consumo={entry.consumo}
					urgencia={entry.urgencia}
					onClick={() => onSelectPoint(entry.point)}
				/>
			))}

			{hidden.length > 0 ? (
				<button
					type="button"
					onClick={() => setExpanded(true)}
					aria-label={`Mostrar mais ${hidden.length} pontos de atendimento`}
					className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-secondary px-2.5 text-xs font-bold transition-colors hover:bg-secondary/70"
				>
					+{hidden.length}
					{hiddenOccupied > 0 ? (
						<span className={cn("size-1.5 rounded-full", hiddenHasLate ? "bg-destructive" : "bg-amber-500")} aria-hidden />
					) : null}
					<span className="sr-only">
						{hiddenOccupied > 0 ? `${hiddenOccupied} ocupados entre os ocultos` : "todos os ocultos estão livres"}
					</span>
				</button>
			) : null}

			{expanded && ordered.length > MAX_VISIBLE_PILLS ? (
				<button
					type="button"
					onClick={() => setExpanded(false)}
					className="flex h-9 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-bold text-muted-foreground transition-colors hover:bg-secondary"
				>
					<ChevronLeft className="size-3.5" />
					RECOLHER
				</button>
			) : null}

			<Button variant={points.length > 0 ? "secondary" : "default"} size="sm" className="h-9 shrink-0 gap-1.5 px-2.5 sm:px-3" onClick={onCreatePoint}>
				<Plus className="size-4 shrink-0" />
				<span className="hidden text-xs font-bold sm:inline">NOVO PONTO</span>
				<span className="sr-only sm:hidden">Novo ponto de atendimento</span>
			</Button>
		</div>
	);
}

type PointPillProps = {
	point: TServicePoint;
	occupied: boolean;
	tabCount: number;
	consumo: number;
	urgencia: ReturnType<typeof worstUrgency>;
	onClick: () => void;
};

function PointPill({ point, occupied, tabCount, consumo, urgencia, onClick }: PointPillProps) {
	// Livre e estado calmo (pouca tinta); ocupado ganha peso, e atraso vira a cor
	// mais forte da pill — o operador varre a faixa procurando vermelho.
	const tone = !occupied
		? "border-border bg-background text-muted-foreground hover:bg-secondary/60"
		: urgencia === "atrasado"
			? "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/15"
			: urgencia === "atencao"
				? "border-amber-500/40 bg-amber-500/10 text-amber-700 hover:bg-amber-500/15 dark:text-amber-400"
				: "border-border bg-secondary text-foreground hover:bg-secondary/70";

	const statusLabel = !occupied ? "Livre" : tabCount > 1 ? `${tabCount} contas` : formatToMoney(consumo);

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<button
					type="button"
					onClick={onClick}
					className={cn("flex h-9 max-w-full shrink-0 items-center gap-2 rounded-lg border px-2.5 transition-colors", tone)}
				>
					<span
						className={cn("size-2 shrink-0 rounded-full", occupied ? (urgencia ? URGENCY_META[urgencia].dot : "bg-foreground/40") : "bg-green-500")}
						aria-hidden
					/>
					<span className="min-w-0 max-w-28 truncate text-xs font-bold">{point.rotulo}</span>
					<span className="shrink-0 text-xs font-semibold tabular-nums opacity-80">{statusLabel}</span>
				</button>
			</TooltipTrigger>
			<TooltipContent side="bottom" className="flex flex-col gap-0.5 px-3 py-2">
				<span className="font-semibold">
					{point.rotulo}
					{point.grupo ? ` · ${point.grupo}` : ""}
				</span>
				<span>{occupied ? `Ocupado · ${formatToMoney(consumo)}` : "Livre · toque para abrir conta"}</span>
			</TooltipContent>
		</Tooltip>
	);
}
