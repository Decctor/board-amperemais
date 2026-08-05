"use client";

import { useMemo } from "react";
import type { TGetStatementTransactionsOutputDefault } from "@/app/api/finances/reconciliation/statement-transactions/route";
import { LoadingButton } from "@/components/loading-button";
import { Button } from "@/components/ui/button";
import { formatDateAsLocale, formatToMoney } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import { FinancialTransactionTypeOptions } from "@/utils/select-options";
import { Banknote, Check, CheckCircle2, Clock, EyeOff, Link2, ListFilter, Pencil, RotateCcw, Sparkles, X, Zap } from "lucide-react";

type TStatementLine = TGetStatementTransactionsOutputDefault["transactions"][number];
type TStatementLineMatch = TStatementLine["matches"][number];

const LINE_STATUS_BADGE: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
	PENDENTE: { label: "PENDENTE", className: "bg-blue-100 text-blue-700", icon: <Clock className="w-3 h-3" /> },
	CONCILIADA: { label: "CONCILIADA", className: "bg-green-100 text-green-700", icon: <CheckCircle2 className="w-3 h-3" /> },
	IGNORADA: { label: "IGNORADA", className: "bg-gray-100 text-gray-600", icon: <EyeOff className="w-3 h-3" /> },
};

const MATCH_TYPE_BADGE: Record<TStatementLineMatch["tipo"], { label: string; className: string; icon: React.ReactNode }> = {
	AUTOMATICO: { label: "AUTOMÁTICO", className: "bg-green-100 text-green-700", icon: <Zap className="w-3 h-3" /> },
	HEURISTICO: { label: "HEURÍSTICO", className: "bg-blue-100 text-blue-700", icon: <ListFilter className="w-3 h-3" /> },
	IA: { label: "IA", className: "bg-purple-100 text-purple-700", icon: <Sparkles className="w-3 h-3" /> },
	MANUAL: { label: "MANUAL", className: "bg-gray-100 text-gray-600", icon: <Pencil className="w-3 h-3" /> },
};

type StatementLineCardProps = {
	line: TStatementLine;
	onResolve: () => void;
	onConfirmMatch: (matchId: string) => void;
	confirmingMatchId: string | null;
	onRejectMatch: (matchId: string) => void;
	rejectingMatchId: string | null;
	onToggleIgnored: (ignorada: boolean) => void;
	togglingIgnored: boolean;
};
export function StatementLineCard({
	line,
	onResolve,
	onConfirmMatch,
	confirmingMatchId,
	onRejectMatch,
	rejectingMatchId,
	onToggleIgnored,
	togglingIgnored,
}: StatementLineCardProps) {
	const typeConfig = useMemo(() => FinancialTransactionTypeOptions.find((option) => option.value === line.tipo) ?? null, [line.tipo]);
	const statusBadge = LINE_STATUS_BADGE[line.status] ?? LINE_STATUS_BADGE.PENDENTE;
	const suggestedMatches = useMemo(() => line.matches.filter((match) => match.status === "SUGERIDO"), [line.matches]);
	const isPending = line.status === "PENDENTE";
	const isIgnored = line.status === "IGNORADA";

	return (
		<div className={cn("bg-card border-border flex w-full flex-col gap-2 rounded-xl border px-3 py-4 shadow-2xs", isIgnored && "opacity-70")}>
			<div className="flex w-full flex-col items-start justify-between gap-2 lg:flex-row lg:items-center">
				<div className="flex flex-wrap items-center gap-2">
					{typeConfig ? (
						<span className={cn("flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[0.65rem]", typeConfig.colors.background, typeConfig.colors.text)}>
							{typeConfig.icon}
							{typeConfig.label}
						</span>
					) : null}
					<h1 className="text-xs font-bold tracking-tight lg:text-sm">{line.descricao}</h1>
				</div>
				<div className="flex items-center gap-1.5">
					<span className={cn("flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[0.65rem]", statusBadge.className)}>
						{statusBadge.icon}
						{statusBadge.label}
					</span>
					<span className={cn("text-sm font-semibold", typeConfig?.colors.text)}>
						{line.tipo === "SAIDA" ? "-" : "+"}
						{formatToMoney(line.valor)}
					</span>
				</div>
			</div>

			<div className="flex flex-wrap items-center gap-3">
				<span className="text-xs font-medium tracking-tight uppercase text-muted-foreground">{formatDateAsLocale(line.dataTransacao)}</span>
			</div>

			{isPending && suggestedMatches.length > 0 ? (
				<div className="flex w-full flex-col gap-2">
					{suggestedMatches.map((match) => (
						<SuggestedMatchCard
							key={match.id}
							match={match}
							onConfirm={() => onConfirmMatch(match.id)}
							isConfirming={confirmingMatchId === match.id}
							onReject={() => onRejectMatch(match.id)}
							isRejecting={rejectingMatchId === match.id}
						/>
					))}
				</div>
			) : null}

			<div className="flex w-full flex-wrap items-center justify-end gap-1.5">
				{isPending ? (
					<>
						<Button type="button" size="sm" variant="ghost" onClick={onResolve} className="flex items-center gap-1.5">
							{suggestedMatches.length > 0 ? <Pencil className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
							{suggestedMatches.length > 0 ? "RESOLVER MANUALMENTE" : "CONCILIAR MANUALMENTE / CRIAR LANÇAMENTO"}
						</Button>
						<LoadingButton
							type="button"
							size="sm"
							variant="ghost"
							loading={togglingIgnored}
							onClick={() => onToggleIgnored(true)}
							className="flex items-center gap-1.5 text-muted-foreground"
						>
							<EyeOff className="h-4 w-4" />
							IGNORAR
						</LoadingButton>
					</>
				) : null}
				{isIgnored ? (
					<LoadingButton
						type="button"
						size="sm"
						variant="ghost"
						loading={togglingIgnored}
						onClick={() => onToggleIgnored(false)}
						className="flex items-center gap-1.5"
					>
						<RotateCcw className="h-4 w-4" />
						RESTAURAR
					</LoadingButton>
				) : null}
			</div>
		</div>
	);
}

type SuggestedMatchCardProps = {
	match: TStatementLineMatch;
	onConfirm: () => void;
	isConfirming: boolean;
	onReject: () => void;
	isRejecting: boolean;
};
function SuggestedMatchCard({ match, onConfirm, isConfirming, onReject, isRejecting }: SuggestedMatchCardProps) {
	const transaction = match.transacaoFinanceira;
	const matchTypeBadge = MATCH_TYPE_BADGE[match.tipo] ?? MATCH_TYPE_BADGE.MANUAL;
	const transactionTypeConfig = useMemo(
		() => FinancialTransactionTypeOptions.find((option) => option.value === transaction?.tipo) ?? null,
		[transaction?.tipo],
	);
	if (!transaction) return null;

	return (
		<div className="border-primary/25 bg-primary/5 flex w-full flex-col gap-1.5 rounded-lg border border-dashed px-3 py-2">
			<div className="flex w-full flex-col items-start justify-between gap-2 lg:flex-row lg:items-center">
				<div className="flex min-w-0 flex-wrap items-center gap-2">
					<Banknote className="h-4 w-4 shrink-0 text-primary" />
					<p className="truncate text-xs font-semibold tracking-tight">{transaction.titulo || "TRANSAÇÃO SEM TÍTULO"}</p>
					<span className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6rem] font-medium", matchTypeBadge.className)}>
						{matchTypeBadge.icon}
						{matchTypeBadge.label}
						{typeof match.confianca === "number" ? ` · ${Math.round(match.confianca * 100)}%` : null}
					</span>
				</div>
				<span className={cn("text-xs font-semibold", transactionTypeConfig?.colors.text)}>{formatToMoney(transaction.valor)}</span>
			</div>
			<div className="flex w-full flex-col items-start justify-between gap-1.5 lg:flex-row lg:items-center">
				<span className="text-[0.65rem] font-medium uppercase text-muted-foreground">
					{transaction.dataEfetivacao
						? `EFETIVADA: ${formatDateAsLocale(transaction.dataEfetivacao)}`
						: transaction.dataPrevisao
							? `PREVISÃO: ${formatDateAsLocale(transaction.dataPrevisao)} (será efetivada ao confirmar)`
							: "SEM DATA DEFINIDA"}
				</span>
				<div className="flex items-center gap-1.5">
					<LoadingButton
						type="button"
						size="sm"
						variant="ghost"
						loading={isRejecting}
						disabled={isConfirming}
						onClick={onReject}
						className="flex items-center gap-1.5 text-destructive hover:text-destructive"
					>
						<X className="h-4 w-4" />
						REJEITAR
					</LoadingButton>
					<LoadingButton type="button" size="sm" loading={isConfirming} disabled={isRejecting} onClick={onConfirm} className="flex items-center gap-1.5">
						<Check className="h-4 w-4" />
						CONFIRMAR
					</LoadingButton>
				</div>
			</div>
		</div>
	);
}
