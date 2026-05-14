"use client";

import DateIntervalInput from "@/components/Inputs/DateIntervalInput";
import { hexToRgba, useOrgColors } from "@/components/Providers/OrgColorsProvider";
import StatUnitCard from "@/components/Stats/StatUnitCard";
import ResponsiveMenuViewOnly from "@/components/Utils/ResponsiveMenuViewOnly";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getErrorMessage } from "@/lib/errors";
import { formatDecimalPlaces, formatToMoney } from "@/lib/formatting";
import { useSalesDetailedAnalysis } from "@/lib/queries/stats/sales-detailed-analysis";
import type { TSalesDetailedAnalysisInput } from "@/app/api/stats/sales-detailed-analysis/route";
import dayjs from "dayjs";
import { BadgeDollarSign, CalendarDays, CirclePlus, Clock, Package, ShoppingCart, Users } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const WEEKDAY_FULL = {
	0: "Domingo",
	1: "Segunda-Feira",
	2: "Terça-Feira",
	3: "Quarta-Feira",
	4: "Quinta-Feira",
	5: "Sexta-Feira",
	6: "Sábado",
} as const;

const WEEKDAY_SHORT = {
	0: "DOM",
	1: "SEG",
	2: "TER",
	3: "QUA",
	4: "QUI",
	5: "SEX",
	6: "SÁB",
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components (defined outside to prevent remount on parent re-render)
// ─────────────────────────────────────────────────────────────────────────────

type ContextBannerProps = {
	params: TSalesDetailedAnalysisInput;
	updateParams: (newParams: Partial<TSalesDetailedAnalysisInput>) => void;
};
function ContextBanner({ params, updateParams }: ContextBannerProps) {
	const weekdayKey = params.weekday as keyof typeof WEEKDAY_FULL;
	const hasHour = typeof params.hourIntervalStart === "number" && typeof params.hourIntervalEnd === "number";
	const periodStart = dayjs(params.periodStart).format("DD/MM/YYYY");
	const periodEnd = dayjs(params.periodEnd).format("DD/MM/YYYY");

	return (
		<div className="flex flex-wrap items-center gap-2">
			<div className="flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-1.5">
				<CalendarDays className="h-3.5 min-h-3.5 w-3.5 min-w-3.5 text-primary" />
				<span className="text-xs font-semibold tracking-tight text-primary">{WEEKDAY_FULL[weekdayKey].toUpperCase()}</span>
			</div>
			{hasHour ? (
				<div className="flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-1.5">
					<Clock className="h-3.5 min-h-3.5 w-3.5 min-w-3.5 text-primary" />
					<span className="text-xs font-semibold tracking-tight text-primary">
						{params.hourIntervalStart}:00 — {params.hourIntervalEnd}:00
					</span>
				</div>
			) : null}
			<DateIntervalInput
				label="Período"
				labelClassName="hidden"
				className="hover:bg-accent hover:text-accent-foreground border-none shadow-none"
				value={{
					after: params.periodStart ? new Date(params.periodStart) : undefined,
					before: params.periodEnd ? new Date(params.periodEnd) : undefined,
				}}
				handleChange={(value) =>
					updateParams({
						periodStart: value.after ? dayjs(value.after).toISOString() : undefined,
						periodEnd: value.before ? dayjs(value.before).toISOString() : undefined,
					})
				}
			/>
		</div>
	);
}

function SectionLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
	return (
		<div className="flex w-fit items-center gap-2 rounded bg-primary/20 px-2 py-1">
			{icon}
			<h2 className="w-fit text-start text-xs font-medium tracking-tight">{label}</h2>
		</div>
	);
}

type RankedRow = {
	id: string;
	name: string;
	subtitle?: string | null;
	quantity: number;
	total: number;
};

function RankedListRow({ row, index, maxTotal }: { row: RankedRow; index: number; maxTotal: number }) {
	const { colors } = useOrgColors();
	const percentage = maxTotal > 0 ? (row.total / maxTotal) * 100 : 0;
	// Intensity tapers from 0.12 (rank 1) down so rows feel heat-mapped
	const intensity = maxTotal > 0 ? 0.04 + (row.total / maxTotal) * 0.1 : 0.04;
	const rowBg = hexToRgba(colors.primary, intensity);

	return (
		<div className="flex w-full items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:brightness-95" style={{ backgroundColor: rowBg }}>
			{/* Rank badge */}
			<span className="w-6 shrink-0 text-right text-[0.65rem] font-bold text-muted-foreground">#{index + 1}</span>

			{/* Name + subtitle */}
			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				<span className="truncate text-xs font-medium leading-none" title={row.name}>
					{row.name}
				</span>
				{row.subtitle ? <span className="truncate text-[0.6rem] text-muted-foreground">{row.subtitle}</span> : null}
			</div>

			{/* Progress bar (hidden on small screens) */}
			<div className="hidden w-[90px] shrink-0 sm:block">
				<Progress value={percentage} className="h-1.5 w-full" />
			</div>

			{/* Value + quantity */}
			<div className="flex shrink-0 flex-col items-end gap-0.5">
				<span className="text-xs font-bold leading-none">{formatToMoney(row.total)}</span>
				<span className="text-[0.6rem] text-muted-foreground">{formatDecimalPlaces(row.quantity)} vend.</span>
			</div>
		</div>
	);
}

function RankedList({ rows, emptyMessage }: { rows: RankedRow[]; emptyMessage: string }) {
	const maxTotal = rows.length > 0 ? Math.max(...rows.map((r) => r.total)) : 0;

	if (rows.length === 0) {
		return (
			<div className="flex items-center justify-center rounded-xl border border-dashed border-primary/20 py-8">
				<p className="text-xs text-muted-foreground">{emptyMessage}</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-1">
			{rows.map((row, index) => (
				<RankedListRow key={row.id} row={row} index={index} maxTotal={maxTotal} />
			))}
		</div>
	);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

type WeeklyStatsDetailMenuProps = {
	params: TSalesDetailedAnalysisInput;
	closeMenu: () => void;
};

export default function WeeklyStatsDetailMenu({ params, closeMenu }: WeeklyStatsDetailMenuProps) {
	const { data, isLoading, error, params: queryParams, updateParams: updateQueryParams } = useSalesDetailedAnalysis({ initialParams: params });

	const weekdayKey = params.weekday as keyof typeof WEEKDAY_FULL;
	const hasHour = typeof params.hourIntervalStart === "number" && typeof params.hourIntervalEnd === "number";

	const menuTitle = hasHour
		? `${WEEKDAY_SHORT[weekdayKey]} · ${params.hourIntervalStart}:00 — ${params.hourIntervalEnd}:00`
		: WEEKDAY_FULL[weekdayKey].toUpperCase();

	const menuDescription = hasHour
		? `Análise detalhada para ${WEEKDAY_FULL[weekdayKey].toLowerCase()} das ${params.hourIntervalStart}h às ${params.hourIntervalEnd}h.`
		: `Análise detalhada para ${WEEKDAY_FULL[weekdayKey].toLowerCase()}.`;

	const topClientRows: RankedRow[] = data
		? data.topClients.map((c) => ({
				id: c.clientId,
				name: c.clientName,
				subtitle: c.identifier || null,
				quantity: c.quantity,
				total: c.total,
			}))
		: [];

	const topProductRows: RankedRow[] = data
		? data.topProducts.map((p) => ({
				id: p.productId,
				name: p.productDescription,
				subtitle: p.productGroup,
				quantity: p.quantity,
				total: p.total,
			}))
		: [];

	return (
		<ResponsiveMenuViewOnly
			menuTitle={menuTitle}
			menuDescription={menuDescription}
			menuCancelButtonText="FECHAR"
			closeMenu={closeMenu}
			stateIsLoading={isLoading}
			stateError={error ? getErrorMessage(error) : null}
			dialogVariant="lg"
			drawerVariant="lg"
		>
			{data ? (
				<div className="flex w-full flex-col gap-5">
					{/* Context banner — weekday + optional hour + period */}
					<ContextBanner params={queryParams} updateParams={updateQueryParams} />

					{/* KPI indicators */}
					<div className="flex w-full flex-col gap-2">
						<SectionLabel icon={<BadgeDollarSign className="h-4 min-h-4 w-4 min-w-4" />} label="INDICADORES" />
						<div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
							<StatUnitCard
								title="VENDAS"
								icon={<CirclePlus className="h-4 min-h-4 w-4 min-w-4" />}
								current={{ value: data.kpis.salesQuantity, format: (v) => formatDecimalPlaces(v) }}
								className="w-full"
							/>
							<StatUnitCard
								title="FATURAMENTO"
								icon={<BadgeDollarSign className="h-4 min-h-4 w-4 min-w-4" />}
								current={{ value: data.kpis.totalRevenue, format: (v) => formatToMoney(v) }}
								className="w-full"
							/>
							<StatUnitCard
								title="TICKET MÉDIO"
								icon={<ShoppingCart className="h-4 min-h-4 w-4 min-w-4" />}
								current={{ value: data.kpis.avgTicket, format: (v) => formatToMoney(v) }}
								className="w-full"
							/>
						</div>
					</div>

					{/* Top clients */}
					<div className="flex w-full flex-col gap-2">
						<SectionLabel icon={<Users className="h-4 min-h-4 w-4 min-w-4" />} label="TOP 25 CLIENTES" />
						<ScrollArea className="h-[340px] w-full pr-2">
							<div className="pb-1">
								<RankedList rows={topClientRows} emptyMessage="Não há clientes identificados nesta segmentação." />
							</div>
						</ScrollArea>
					</div>

					{/* Top products */}
					<div className="flex w-full flex-col gap-2">
						<SectionLabel icon={<Package className="h-4 min-h-4 w-4 min-w-4" />} label="TOP 25 PRODUTOS" />
						<ScrollArea className="h-[340px] w-full pr-2">
							<div className="pb-1">
								<RankedList rows={topProductRows} emptyMessage="Não há produtos vendidos nesta segmentação." />
							</div>
						</ScrollArea>
					</div>
				</div>
			) : null}
		</ResponsiveMenuViewOnly>
	);
}
