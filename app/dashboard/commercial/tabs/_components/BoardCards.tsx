"use client";
import type { TGetServicePointsOutput } from "@/app/api/service-points/route";
import type { TTabListItem } from "@/app/api/tabs/route";
import { Button } from "@/components/ui/button";
import { formatToMoney } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import { ChefHat, CircleUser, Clock, MapPin, Pencil, Plus, UserRound, Utensils } from "lucide-react";
import { URGENCY_META, describeRound, formatTabAge, getOpenRounds, tabLabel, worstUrgency } from "./board-meta";

// ============================================================================
// Cards do board. Densidade e proposital: ponto livre e um slot quieto de pouca
// tinta, conta aberta e um card cheio. A diferenca entre os dois estados e o que
// da leitura de salao a distancia.
// ============================================================================

type TServicePoint = NonNullable<TGetServicePointsOutput["data"]["default"]>[number];

// ----------------------------------------------------------------- Por conta

export function TabCard({ tab, now, onOpen }: { tab: TTabListItem; now: number; onOpen: () => void }) {
	const rounds = getOpenRounds(tab, now);
	const urgencia = worstUrgency(rounds);
	const critical = rounds[0];

	return (
		<button
			type="button"
			onClick={onOpen}
			className={cn(
				// self-start: o card assume a altura do proprio conteudo em vez de esticar
				// ate o mais alto da linha, o que abria vazios embaixo dos mais curtos.
				"flex min-h-44 w-full flex-col gap-3 self-start rounded-2xl border bg-card px-4 py-3.5 text-left shadow-2xs transition-all hover:shadow-sm",
				urgencia === "atrasado" ? "border-destructive/40" : "border-border",
			)}
		>
			<header className="flex items-start justify-between gap-2">
				<div className="flex min-w-0 flex-col">
					<span className="flex items-center gap-1.5 text-sm font-extrabold uppercase tracking-tight">
						<MapPin className="size-3.5 shrink-0" />
						<span className="truncate">{tabLabel(tab)}</span>
					</span>
					{tab.codigo && tab.servicePoint ? <span className="pl-5 text-xs font-medium text-muted-foreground">Comanda {tab.codigo}</span> : null}
				</div>
				<span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
					<Clock className="size-3" />
					{formatTabAge(tab.dataAbertura, now)}
				</span>
			</header>

			<div className="flex flex-col gap-0.5">
				<span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-muted-foreground">Consumo em aberto</span>
				<span className="text-2xl font-black tabular-nums tracking-tight">{formatToMoney(tab.consumoParcial ?? 0)}</span>
			</div>

			<RoundsSummary rounds={rounds} totalRounds={tab.pedidos.length} critical={critical} />

			{tab.cliente || tab.responsavelVendedor ? (
				<footer className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border/60 pt-2 text-xs text-muted-foreground">
					{tab.cliente ? (
						<span className="flex min-w-0 items-center gap-1.5">
							<CircleUser className="size-3 shrink-0" />
							<span className="truncate">{tab.cliente.nome}</span>
						</span>
					) : null}
					{tab.responsavelVendedor ? (
						<span className="flex min-w-0 items-center gap-1.5">
							<UserRound className="size-3 shrink-0" />
							<span className="truncate">{tab.responsavelVendedor.nome}</span>
						</span>
					) : null}
				</footer>
			) : null}
		</button>
	);
}

function RoundsSummary({
	rounds,
	totalRounds,
	critical,
}: {
	rounds: ReturnType<typeof getOpenRounds>;
	totalRounds: number;
	critical?: ReturnType<typeof getOpenRounds>[number];
}) {
	if (totalRounds === 0) {
		return (
			<div className="flex items-center gap-1.5 rounded-lg bg-secondary/50 px-2.5 py-1.5 text-xs text-muted-foreground">
				<ChefHat className="size-3.5" />
				Nenhum pedido lançado
			</div>
		);
	}

	if (rounds.length === 0) {
		return (
			<div className="flex items-center gap-1.5 rounded-lg bg-secondary/50 px-2.5 py-1.5 text-xs text-muted-foreground">
				<Utensils className="size-3.5" />
				{totalRounds} {totalRounds === 1 ? "rodada entregue" : "rodadas entregues"} · nada em aberto
			</div>
		);
	}

	const meta = URGENCY_META[critical?.urgencia ?? "no-prazo"];

	return (
		<div className="flex flex-col gap-1">
			<div className={cn("flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold", meta.surface)}>
				<span className={cn("size-1.5 shrink-0 rounded-full", meta.dot)} aria-hidden />
				<span className="truncate">{critical ? describeRound(critical) : ""}</span>
			</div>
			{/* So conta a historia quando ha mais de uma rodada; "1 de 1" nao informa nada. */}
			{rounds.length > 1 ? (
				<span className="pl-1 text-[11px] text-muted-foreground">
					+{rounds.length - 1} {rounds.length - 1 === 1 ? "rodada" : "rodadas"} em aberto de {totalRounds}
				</span>
			) : totalRounds > 1 ? (
				<span className="pl-1 text-[11px] text-muted-foreground">1 de {totalRounds} em aberto</span>
			) : null}
		</div>
	);
}

// ------------------------------------------------------------------ Por mesa

type ServicePointCardProps = {
	point: TServicePoint;
	pointTabs: TTabListItem[];
	now: number;
	onOpenTab: (tabId: string) => void;
	onCreateTab: () => void;
	onEditPoint: () => void;
};

export function ServicePointCard({ point, pointTabs, now, onOpenTab, onCreateTab, onEditPoint }: ServicePointCardProps) {
	const occupied = pointTabs.length > 0;
	const rounds = pointTabs.flatMap((tab) => getOpenRounds(tab, now));
	const urgencia = worstUrgency(rounds);
	const consumoTotal = pointTabs.reduce((sum, tab) => sum + (tab.consumoParcial ?? 0), 0);

	// Ponto livre: slot silencioso e curto. Nao estica junto com os ocupados —
	// a diferenca de altura e o que da leitura de salao a distancia.
	if (!occupied) {
		return (
			<div className="group relative flex flex-col self-start rounded-2xl border border-dashed border-border">
				<button
					type="button"
					onClick={onCreateTab}
					className="flex flex-col items-center justify-center gap-1.5 rounded-2xl px-4 py-5 transition-colors hover:bg-secondary/40"
				>
					<span className="text-sm font-bold tracking-tight">{point.rotulo}</span>
					<span className="flex items-center gap-1.5 text-xs text-muted-foreground">
						<span className="size-1.5 rounded-full bg-green-500" aria-hidden />
						Livre
						{point.capacidade ? ` · ${point.capacidade} lugares` : ""}
					</span>
					{/* Sempre visivel: no celular (dispositivo primario) nao existe hover. */}
					<span className="mt-1 flex items-center gap-1 text-xs font-bold text-primary">
						<Plus className="size-3.5" />
						ABRIR CONTA
					</span>
				</button>
				<EditPointButton onClick={onEditPoint} label={point.rotulo} />
			</div>
		);
	}

	return (
		<div
			className={cn(
				"group relative flex min-h-44 flex-col gap-3 self-start rounded-2xl border bg-card px-4 py-3.5 shadow-2xs",
				urgencia === "atrasado" ? "border-destructive/40" : "border-border",
			)}
		>
			<header className="flex items-start justify-between gap-2 pr-6">
				<div className="flex min-w-0 flex-col">
					<span className="truncate text-sm font-extrabold uppercase tracking-tight">{point.rotulo}</span>
					<span className="text-xs text-muted-foreground">
						{point.grupo ? `${point.grupo} · ` : ""}
						{pointTabs.length > 1 ? `${pointTabs.length} contas` : "Ocupado"}
					</span>
				</div>
				<span className="shrink-0 text-lg font-black tabular-nums tracking-tight">{formatToMoney(consumoTotal)}</span>
			</header>

			<div className="flex flex-col gap-2">
				{pointTabs.map((tab) => {
					const tabRounds = getOpenRounds(tab, now);
					const critical = tabRounds[0];
					const meta = URGENCY_META[critical?.urgencia ?? "no-prazo"];
					return (
						<button
							key={tab.id}
							type="button"
							onClick={() => onOpenTab(tab.id)}
							className="flex flex-col gap-1 rounded-xl bg-secondary/40 px-2.5 py-2 text-left transition-colors hover:bg-secondary/70"
						>
							<div className="flex items-center justify-between gap-2">
								<span className="flex min-w-0 items-center gap-1.5 text-xs font-bold">
									<span className="truncate">{tab.codigo ? `Comanda ${tab.codigo}` : "Conta"}</span>
									{tab.cliente ? <span className="truncate font-medium text-muted-foreground">· {tab.cliente.nome}</span> : null}
								</span>
								<span className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
									<Clock className="size-3" />
									{formatTabAge(tab.dataAbertura, now)}
								</span>
							</div>
							{pointTabs.length > 1 ? <span className="text-xs font-bold tabular-nums">{formatToMoney(tab.consumoParcial ?? 0)}</span> : null}
							{critical ? (
								<span className={cn("flex items-center gap-1.5 text-[11px] font-semibold", meta.text)}>
									<span className={cn("size-1.5 shrink-0 rounded-full", meta.dot)} aria-hidden />
									<span className="truncate">{describeRound(critical)}</span>
									{tabRounds.length > 1 ? <span className="shrink-0 font-medium opacity-70">+{tabRounds.length - 1}</span> : null}
								</span>
							) : (
								<span className="text-[11px] text-muted-foreground">Nada em aberto</span>
							)}
						</button>
					);
				})}
			</div>

			<EditPointButton onClick={onEditPoint} label={point.rotulo} />
		</div>
	);
}

function EditPointButton({ onClick, label }: { onClick: () => void; label: string }) {
	return (
		<Button
			size="icon"
			variant="ghost"
			aria-label={`Editar ponto ${label}`}
			// Discreto, mas nunca invisivel: esconder atras de hover deixaria a edicao
			// inalcancavel no toque.
			className="absolute right-1.5 top-1.5 size-7 text-muted-foreground/50 transition-colors hover:text-foreground focus-visible:text-foreground"
			onClick={(event) => {
				event.stopPropagation();
				onClick();
			}}
		>
			<Pencil className="size-3.5" />
		</Button>
	);
}
