"use client";

import ErrorComponent from "@/components/Layouts/ErrorComponent";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getErrorMessage } from "@/lib/errors";
import { resolveInteraction } from "@/lib/mutations/interactions";
import { useClientPortfolioAgendaCalendar, useClientPortfolioAgendaDay } from "@/lib/queries/client-portfolios";
import { cn } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs, { type Dayjs } from "dayjs";
import "dayjs/locale/pt-br";
import { AlarmClock, Calendar as CalendarIcon, Check, ChevronLeft, ChevronRight, CircleDot, Clock, LayoutList, Plus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { CreateAgendaInteractionMenu } from "./create-agenda-interaction-menu";

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MAX_DOTS = 5;

// Cores dos pontos por status da interação (adaptação do getActivityDotClass do Control):
// PLANEJADA vencida → vermelho; PLANEJADA → laranja; REALIZADA → verde.
function getInteractionDotClass(status: string, date?: Date | string | null) {
	const isOverduePlanned = status === "PLANEJADA" && date && dayjs(date).startOf("day").isBefore(dayjs().startOf("day"));
	if (isOverduePlanned) return "bg-red-500";
	if (status === "REALIZADA") return "bg-green-500";
	if (status === "PLANEJADA") return "bg-orange-400";
	return "bg-primary/40";
}

function getDayLabel(date: Dayjs) {
	const today = dayjs();
	if (date.isSame(today, "day")) return "Hoje";
	if (date.isSame(today.add(1, "day"), "day")) return "Amanhã";
	if (date.isSame(today.subtract(1, "day"), "day")) return "Ontem";
	return date.locale("pt-br").format("dddd, DD/MM");
}

type PortfolioAgendaProps = {
	vendedorId: string | null;
	onChanged: () => void;
};

export function PortfolioAgenda({ vendedorId, onChanged }: PortfolioAgendaProps) {
	const queryClient = useQueryClient();
	const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
	const [selectedDate, setSelectedDate] = useState(() => dayjs().startOf("day"));
	const [calendarMonth, setCalendarMonth] = useState(() => dayjs().startOf("month"));
	const [createForDate, setCreateForDate] = useState<Dayjs | null>(null);

	const dayQuery = useClientPortfolioAgendaDay({ vendedorId, dateKey: selectedDate.format("YYYY-MM-DD") });
	const calendarQuery = useClientPortfolioAgendaCalendar({ vendedorId, monthKey: calendarMonth.format("YYYY-MM") });
	const stats = calendarQuery.data?.stats;

	const { mutate: resolve, isPending: resolvePending } = useMutation({
		mutationKey: ["resolve-follow-up"],
		mutationFn: resolveInteraction,
		onSuccess: (data) => {
			toast.success(data.message);
			queryClient.invalidateQueries({ queryKey: ["client-portfolios-agenda-day"] });
			queryClient.invalidateQueries({ queryKey: ["client-portfolios-agenda-calendar"] });
			onChanged();
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const chips = [
		{
			icon: <CircleDot className="w-4 h-4 min-w-4 min-h-4" />,
			className: "bg-blue-200 text-blue-600",
			label: "Planejadas no mês visível",
			simplifiedLabel: "PLANEJADAS",
			value: stats?.planejadasMes ?? 0,
		},
		{
			icon: <AlarmClock className="w-4 h-4 min-w-4 min-h-4" />,
			className: "bg-red-200 text-red-600",
			label: "Em atraso (independente do mês)",
			simplifiedLabel: "ATRASADAS",
			value: stats?.atrasadas ?? 0,
		},
		{
			icon: <Check className="w-4 h-4 min-w-4 min-h-4" />,
			className: "bg-green-200 text-green-600",
			label: "Realizadas no mês visível",
			simplifiedLabel: "REALIZADAS",
			value: stats?.realizadasMes ?? 0,
		},
	];

	function handleSelectDay(date: Dayjs) {
		setSelectedDate(date.startOf("day"));
		setViewMode("list");
	}

	return (
		<div className="bg-card border-border flex w-full flex-col gap-4 rounded-xl border px-3 py-4 shadow-2xs">
			{/* Header: título + toggle list/calendar */}
			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-1.5">
					<Clock className="h-4 w-4 min-h-4 min-w-4" />
					<h1 className="text-xs font-bold tracking-tight uppercase">Follow-ups</h1>
				</div>
				<TooltipProvider>
					<div className="flex items-center gap-1 rounded-full bg-primary/10 p-0.5">
						<Tooltip>
							<TooltipTrigger asChild>
								<button
									type="button"
									onClick={() => setViewMode("list")}
									className={cn("flex h-6 min-h-6 w-6 min-w-6 items-center justify-center rounded-full text-foreground duration-300 ease-in-out", {
										"bg-primary text-primary-foreground": viewMode === "list",
									})}
								>
									<LayoutList className="w-3.5 h-3.5" />
								</button>
							</TooltipTrigger>
							<TooltipContent>
								<p>Visualização em lista</p>
							</TooltipContent>
						</Tooltip>
						<Tooltip>
							<TooltipTrigger asChild>
								<button
									type="button"
									onClick={() => setViewMode("calendar")}
									className={cn("flex h-6 min-h-6 w-6 min-w-6 items-center justify-center rounded-full text-foreground duration-300 ease-in-out", {
										"bg-primary text-primary-foreground": viewMode === "calendar",
									})}
								>
									<CalendarIcon className="w-3.5 h-3.5" />
								</button>
							</TooltipTrigger>
							<TooltipContent>
								<p>Visualização em calendário</p>
							</TooltipContent>
						</Tooltip>
					</div>
				</TooltipProvider>
			</div>

			{/* Chips de stats do mês visível */}
			<TooltipProvider>
				<div className="flex flex-wrap gap-2">
					{chips.map((chip) => (
						<Tooltip key={chip.simplifiedLabel}>
							<TooltipTrigger asChild>
								<div className={cn("flex items-center gap-2 rounded-lg px-2 py-1 shadow-2xs h-7", chip.className)}>
									{chip.icon}
									<span className="text-xs font-medium">
										{chip.value} {chip.simplifiedLabel}
									</span>
								</div>
							</TooltipTrigger>
							<TooltipContent>
								<p>{chip.label}</p>
							</TooltipContent>
						</Tooltip>
					))}
				</div>
			</TooltipProvider>

			{viewMode === "list" ? (
				<AgendaDayList
					selectedDate={selectedDate}
					onNavigate={(next) => setSelectedDate(next.startOf("day"))}
					followUps={dayQuery.data ?? []}
					isLoading={dayQuery.isLoading}
					isError={dayQuery.isError}
					error={dayQuery.error}
					resolve={resolve}
					resolvePending={resolvePending}
				/>
			) : (
				<AgendaCalendar
					calendarMonth={calendarMonth}
					onMonthChange={setCalendarMonth}
					days={calendarQuery.data?.days ?? {}}
					isLoading={calendarQuery.isLoading}
					isError={calendarQuery.isError}
					error={calendarQuery.error}
					onSelectDay={handleSelectDay}
					onCreate={setCreateForDate}
				/>
			)}

			{createForDate ? (
				<CreateAgendaInteractionMenu
					date={createForDate}
					vendedorId={vendedorId}
					closeModal={() => setCreateForDate(null)}
					callbacks={{ onSuccess: onChanged }}
				/>
			) : null}
		</div>
	);
}

// ---------------------------------------------------------------------------
// Lista do dia (view principal): day-switcher ◀ Hoje ▶ + linhas de follow-up
// ---------------------------------------------------------------------------
type AgendaDayListProps = {
	selectedDate: Dayjs;
	onNavigate: (next: Dayjs) => void;
	followUps: NonNullable<ReturnType<typeof useClientPortfolioAgendaDay>["data"]>;
	isLoading: boolean;
	isError: boolean;
	error: Error | null;
	resolve: (input: { id: string; resolution: "REALIZADA" | "CANCELADA"; descricao: string | null }) => void;
	resolvePending: boolean;
};

function AgendaDayList({ selectedDate, onNavigate, followUps, isLoading, isError, error, resolve, resolvePending }: AgendaDayListProps) {
	const isToday = selectedDate.isSame(dayjs(), "day");
	const dayLabel = getDayLabel(selectedDate);

	return (
		<div className="flex flex-col gap-2">
			{/* Day switcher */}
			<div className="flex items-center justify-between">
				<button
					type="button"
					onClick={() => onNavigate(selectedDate.subtract(1, "day"))}
					className="flex h-6 w-6 items-center justify-center rounded-full text-foreground hover:bg-primary/10 transition-colors"
					aria-label="Dia anterior"
				>
					<ChevronLeft className="w-4 h-4" />
				</button>
				<button
					type="button"
					onClick={() => !isToday && onNavigate(dayjs())}
					className={cn("text-xs font-semibold text-foreground/80 uppercase", !isToday && "hover:text-foreground transition-colors")}
					title={isToday ? undefined : "Voltar para hoje"}
				>
					{dayLabel}
				</button>
				<button
					type="button"
					onClick={() => onNavigate(selectedDate.add(1, "day"))}
					className="flex h-6 w-6 items-center justify-center rounded-full text-foreground hover:bg-primary/10 transition-colors"
					aria-label="Próximo dia"
				>
					<ChevronRight className="w-4 h-4" />
				</button>
			</div>

			{isLoading ? <LoadingComponent /> : null}
			{isError ? <ErrorComponent msg={getErrorMessage(error)} /> : null}

			{!isLoading && !isError ? (
				followUps.length === 0 ? (
					<p className="text-xs text-muted-foreground">Nenhum retorno agendado para {dayLabel.toLowerCase()}.</p>
				) : (
					<div className="flex flex-col">
						{followUps.map((followUp) => (
							<div key={followUp.id} className="flex items-start gap-2.5 border-b border-border py-2.5 last:border-b-0 last:pb-0 first:pt-0">
								<span
									className={cn(
										"shrink-0 rounded-md bg-secondary px-2 py-1 text-[0.7rem] font-bold tabular-nums",
										followUp.atrasado && "bg-destructive/10 text-destructive",
									)}
								>
									{followUp.atrasado ? formatOverdue(followUp.dataInteracao) : dayjs(followUp.dataInteracao).format("HH:mm")}
								</span>
								<div className="flex min-w-0 flex-1 flex-col gap-0.5">
									<p className="text-sm font-semibold leading-tight">{followUp.cliente?.nome ?? followUp.titulo}</p>
									<p className="text-xs text-muted-foreground truncate">{followUp.descricao ?? followUp.titulo}</p>
								</div>
								<div className="flex shrink-0 items-center gap-0.5">
									<Button
										variant="ghost"
										size="icon"
										className="h-7 w-7 text-green-600 hover:text-green-700"
										aria-label="Marcar como realizado"
										disabled={resolvePending}
										onClick={() => resolve({ id: followUp.id, resolution: "REALIZADA", descricao: null })}
									>
										<Check className="h-4 w-4" />
									</Button>
									<Button
										variant="ghost"
										size="icon"
										className="h-7 w-7 text-muted-foreground"
										aria-label="Cancelar follow-up"
										disabled={resolvePending}
										onClick={() => resolve({ id: followUp.id, resolution: "CANCELADA", descricao: null })}
									>
										<X className="h-4 w-4" />
									</Button>
								</div>
							</div>
						))}
					</div>
				)
			) : null}
		</div>
	);
}

function formatOverdue(date: Date | string | null) {
	if (!date) return "Atrasado";
	return `Atrasado ${dayjs(date).format("DD/MM")}`;
}

// ---------------------------------------------------------------------------
// Calendário mensal (view secundária): grid manual com pontos por status
// ---------------------------------------------------------------------------
type AgendaCalendarProps = {
	calendarMonth: Dayjs;
	onMonthChange: (next: Dayjs) => void;
	days: Record<string, { id: string; titulo: string; status: string }[]>;
	isLoading: boolean;
	isError: boolean;
	error: Error | null;
	onSelectDay: (date: Dayjs) => void;
	onCreate: (date: Dayjs) => void;
};

function AgendaCalendar({ calendarMonth, onMonthChange, days, isLoading, isError, error, onSelectDay, onCreate }: AgendaCalendarProps) {
	const today = dayjs();
	const isCurrentYear = calendarMonth.year() === today.year();
	const monthLabel = isCurrentYear ? calendarMonth.locale("pt-br").format("MMMM") : calendarMonth.locale("pt-br").format("MMMM [de] YYYY");

	const firstDayOfMonth = calendarMonth.day();
	const daysInMonth = calendarMonth.daysInMonth();
	const leadingBlanks = Array.from({ length: firstDayOfMonth });
	const dayCells = Array.from({ length: daysInMonth }, (_, i) => i + 1);

	return (
		<div className="flex flex-1 flex-col gap-2 min-h-0">
			{/* Navegação do mês */}
			<div className="flex items-center justify-between">
				<button
					type="button"
					onClick={() => onMonthChange(calendarMonth.subtract(1, "month"))}
					className="flex h-6 w-6 items-center justify-center rounded-full text-foreground hover:bg-primary/10 transition-colors"
					aria-label="Mês anterior"
				>
					<ChevronLeft className="w-4 h-4" />
				</button>
				<span className="text-xs font-semibold text-foreground/80 uppercase">{monthLabel}</span>
				<button
					type="button"
					onClick={() => onMonthChange(calendarMonth.add(1, "month"))}
					className="flex h-6 w-6 items-center justify-center rounded-full text-foreground hover:bg-primary/10 transition-colors"
					aria-label="Próximo mês"
				>
					<ChevronRight className="w-4 h-4" />
				</button>
			</div>

			{/* Cabeçalho dos dias da semana */}
			<div className="grid grid-cols-7 gap-0.5">
				{WEEKDAY_LABELS.map((label) => (
					<div key={label} className="text-center text-[10px] font-semibold uppercase text-foreground/40 pb-0.5">
						{label}
					</div>
				))}
			</div>

			{isLoading ? (
				<div className="flex flex-1 items-center justify-center py-8">
					<div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
				</div>
			) : null}
			{isError ? <ErrorComponent msg={getErrorMessage(error)} /> : null}

			{!isLoading && !isError ? (
				<div className="grid grid-cols-7 gap-0.5 flex-1 auto-rows-fr">
					{leadingBlanks.map((_, i) => (
						<div key={`blank-${i.toString()}`} />
					))}
					{dayCells.map((day) => {
						const date = calendarMonth.date(day);
						const dateKey = date.format("YYYY-MM-DD");
						const dayInteractions = days[dateKey] ?? [];
						const isToday = today.date() === day && today.month() === calendarMonth.month() && today.year() === calendarMonth.year();
						// Dias passados não são acionáveis para criação (o servidor rejeita PLANEJADA no passado).
						const canCreate = !date.isBefore(today, "day");
						const shown = dayInteractions.slice(0, MAX_DOTS);
						const overflow = dayInteractions.length - MAX_DOTS;
						return (
							<div
								key={day}
								role="button"
								tabIndex={0}
								onClick={() => onSelectDay(date)}
								onKeyDown={(event) => {
									if (event.key === "Enter" || event.key === " ") {
										event.preventDefault();
										onSelectDay(date);
									}
								}}
								aria-label={`Ver follow-ups do dia ${day}`}
								className={cn(
									"group relative flex w-full flex-col justify-between rounded-md border p-1 min-h-14 text-left cursor-pointer transition-colors",
									isToday ? "border-primary/50 bg-primary/12" : "border-primary/10 bg-transparent hover:bg-primary/5",
								)}
							>
								<div className="flex items-start justify-between gap-0.5">
									{canCreate ? (
										<button
											type="button"
											onClick={(event) => {
												event.preventDefault();
												event.stopPropagation();
												onCreate(date);
											}}
											className="inline-flex h-5 w-5 min-h-5 min-w-5 items-center justify-center rounded-full border border-border bg-card/90 text-foreground opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity hover:bg-primary hover:text-primary-foreground"
											aria-label={`Criar interação para o dia ${day}`}
											title="Criar interação"
										>
											<Plus className="h-3 w-3 min-h-3 min-w-3" />
										</button>
									) : (
										<span />
									)}
									<span
										className={cn(
											"text-xs font-semibold leading-none",
											isToday ? "flex items-center justify-center w-4 h-4 rounded-full bg-primary text-primary-foreground" : "text-foreground/60",
										)}
									>
										{day}
									</span>
								</div>
								{dayInteractions.length > 0 && (
									<div className="flex flex-wrap gap-0.5 mt-0.5">
										{shown.map((interaction) => (
											<span
												key={interaction.id}
												className={cn("inline-block w-3 h-3 rounded-full", getInteractionDotClass(interaction.status, date.toDate()))}
											/>
										))}
										{overflow > 0 && <span className="text-[8px] text-foreground/50 font-bold leading-none self-end">+{overflow}</span>}
									</div>
								)}
							</div>
						);
					})}
				</div>
			) : null}

			{/* Legenda */}
			<div className="flex items-center gap-3 pt-1 border-t border-primary/10">
				{[
					{ label: "PLANEJADA", className: "bg-orange-400" },
					{ label: "ATRASADA", className: "bg-red-500" },
					{ label: "REALIZADA", className: "bg-green-500" },
				].map(({ label, className }) => (
					<div key={label} className="flex items-center gap-1.5">
						<span className={cn("inline-block w-3 h-3 rounded-full", className)} />
						<span className="text-xs text-muted-foreground">{label}</span>
					</div>
				))}
			</div>
		</div>
	);
}
