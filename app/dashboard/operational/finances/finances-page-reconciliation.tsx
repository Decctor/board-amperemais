"use client";

import { useMemo, useState } from "react";
import type { TGetStatementTransactionsOutputDefault } from "@/app/api/finances/reconciliation/statement-transactions/route";
import ControlStatementTransaction from "@/components/Modals/Finances/Reconciliation/ControlStatementTransaction";
import NewStatementImport from "@/components/Modals/Finances/Reconciliation/NewStatementImport";
import SelectInput from "@/components/Inputs/SelectInput";
import ErrorComponent from "@/components/Layouts/ErrorComponent";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import { LoadingButton } from "@/components/loading-button";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { InteractiveFilter } from "@/components/ui/interactive-filter";
import GeneralPaginationComponent from "@/components/Utils/Pagination";
import { getErrorMessage } from "@/lib/errors";
import { formatDateAsLocale, formatToMoney } from "@/lib/formatting";
import {
	rejectReconciliationMatch,
	rematchStatementLines,
	syncReconciliation,
	updateStatementTransaction,
} from "@/lib/mutations/financial-reconciliation";
import { useFinancesAccounts } from "@/lib/queries/finances";
import { useStatementTransactions } from "@/lib/queries/financial-reconciliation";
import { cn } from "@/lib/utils";
import { FinancialAccountTypeOptions, FinancialTransactionTypeOptions } from "@/utils/select-options";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
	Banknote,
	Check,
	CheckCheck,
	CheckCircle2,
	Clock,
	EyeOff,
	FileCheck2,
	Landmark,
	Link2,
	ListFilter,
	Pencil,
	RefreshCcw,
	RotateCcw,
	Sparkles,
	Upload,
	X,
	Zap,
} from "lucide-react";
import { toast } from "sonner";

type TStatementLine = TGetStatementTransactionsOutputDefault["transactions"][number];
type TStatementLineMatch = TStatementLine["matches"][number];

const LINE_STATUS_OPTIONS = [
	{ id: "PENDENTE", value: "PENDENTE", label: "PENDENTE", icon: <Clock className="w-4 h-4 text-blue-600" /> },
	{ id: "CONCILIADA", value: "CONCILIADA", label: "CONCILIADA", icon: <CheckCircle2 className="w-4 h-4 text-green-600" /> },
	{ id: "IGNORADA", value: "IGNORADA", label: "IGNORADA", icon: <EyeOff className="w-4 h-4 text-gray-600" /> },
];

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

export default function FinancesReconciliationView() {
	const queryClient = useQueryClient();
	const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
	const [isImportingStatement, setIsImportingStatement] = useState(false);
	const [resolvingLineId, setResolvingLineId] = useState<string | null>(null);

	const { data: accountsData } = useFinancesAccounts({ initialFilters: { stats: false } });
	const accountOptions = useMemo(() => {
		const accounts = accountsData?.accounts ?? [];
		// Contas bancárias e carteiras digitais primeiro — são as que recebem extratos.
		const priority: Record<string, number> = { BANCO: 0, CARTEIRA_DIGITAL: 1, CAIXA: 2 };
		return [...accounts]
			.sort((a, b) => (priority[a.tipo] ?? 3) - (priority[b.tipo] ?? 3) || a.nome.localeCompare(b.nome))
			.map((account) => {
				const typeConfig = FinancialAccountTypeOptions.find((option) => option.value === account.tipo) ?? null;
				return {
					id: account.id,
					value: account.id,
					label: `${account.nome}${typeConfig ? ` (${typeConfig.label})` : ""}`,
					startContent: typeConfig?.icon,
				};
			});
	}, [accountsData?.accounts]);

	const { data, isLoading, isError, isSuccess, error, params, updateParams } = useStatementTransactions({
		contaFinanceiraId: selectedAccountId ?? "",
	});

	const transactions = data?.transactions ?? [];
	const transactionsMatched = data?.transactionsMatched ?? 0;
	const totalPages = data?.totalPages ?? 0;
	const statusCounts = data?.statusCounts ?? { pendentes: 0, conciliadas: 0, ignoradas: 0 };

	const selectedStatusesLabel = useMemo(
		() => params.statuses.map((status) => LINE_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status).join(", "),
		[params.statuses],
	);

	// Sugestões visíveis com confiança máxima (1.0) — passíveis de confirmação em lote.
	const exactSuggestionMatchIds = useMemo(
		() =>
			transactions
				.filter((line) => line.status === "PENDENTE")
				.flatMap((line) => line.matches.filter((match) => match.status === "SUGERIDO" && match.confianca === 1).map((match) => match.id)),
		[transactions],
	);

	function invalidateReconciliationQueries() {
		void queryClient.invalidateQueries({ queryKey: ["reconciliation-statement-transactions"] });
		void queryClient.invalidateQueries({ queryKey: ["reconciliation-statement-transaction-by-id"] });
		void queryClient.invalidateQueries({ queryKey: ["reconciliation-statement-imports"] });
		void queryClient.invalidateQueries({ queryKey: ["finances-financial-transactions"] });
	}

	const { mutate: mutateRematch, isPending: isRematchPending } = useMutation({
		mutationKey: ["rematch-statement-lines"],
		mutationFn: rematchStatementLines,
		onSuccess: (data) => {
			toast.success(data.message);
			invalidateReconciliationQueries();
		},
		onError: (err) => toast.error(getErrorMessage(err)),
	});

	const {
		mutate: mutateSync,
		isPending: isSyncPending,
		variables: syncVariables,
	} = useMutation({
		mutationKey: ["sync-reconciliation"],
		mutationFn: syncReconciliation,
		onSuccess: (data) => {
			if (data.data.erros.length > 0) data.data.erros.forEach((erro) => toast.error(erro));
			else toast.success(data.message);
			invalidateReconciliationQueries();
		},
		onError: (err) => toast.error(getErrorMessage(err)),
	});

	const {
		mutate: mutateRejectMatch,
		isPending: isRejectPending,
		variables: rejectVariables,
	} = useMutation({
		mutationKey: ["reject-reconciliation-match"],
		mutationFn: rejectReconciliationMatch,
		onSuccess: (data) => {
			toast.success(data.message);
			invalidateReconciliationQueries();
		},
		onError: (err) => toast.error(getErrorMessage(err)),
	});

	const {
		mutate: mutateIgnoreLine,
		isPending: isIgnorePending,
		variables: ignoreVariables,
	} = useMutation({
		mutationKey: ["update-statement-transaction"],
		mutationFn: updateStatementTransaction,
		onSuccess: (data) => {
			toast.success(data.message);
			invalidateReconciliationQueries();
		},
		onError: (err) => toast.error(getErrorMessage(err)),
	});

	if (!selectedAccountId) {
		return (
			<div className="flex w-full flex-col gap-3">
				<div className="w-full max-w-md">
					<SelectInput
						label="CONTA FINANCEIRA"
						value={selectedAccountId}
						options={accountOptions}
						resetOptionLabel="NENHUMA CONTA SELECIONADA"
						onReset={() => setSelectedAccountId(null)}
						handleChange={(value) => setSelectedAccountId(value)}
					/>
				</div>
				<Empty>
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<Landmark />
						</EmptyMedia>
						<EmptyTitle>Selecione uma conta financeira</EmptyTitle>
						<EmptyDescription>
							Escolha acima a conta bancária ou carteira digital cujo extrato você deseja conciliar. Depois, importe o extrato (OFX é o formato recomendado)
							e confirme as sugestões de conciliação.
						</EmptyDescription>
					</EmptyHeader>
					<EmptyContent />
				</Empty>
			</div>
		);
	}

	return (
		<div className="flex w-full flex-col gap-3">
			<div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
				<div className="w-full max-w-md">
					<SelectInput
						label="CONTA FINANCEIRA"
						value={selectedAccountId}
						options={accountOptions}
						resetOptionLabel="NENHUMA CONTA SELECIONADA"
						onReset={() => setSelectedAccountId(null)}
						handleChange={(value) => {
							setSelectedAccountId(value);
							updateParams({ page: 1 });
						}}
					/>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<LoadingButton
						type="button"
						variant="outline"
						loading={isRematchPending}
						onClick={() => mutateRematch({ contaFinanceiraId: selectedAccountId })}
						className="flex items-center gap-1.5"
					>
						<RefreshCcw className="h-4 w-4" />
						REPROCESSAR SUGESTÕES
					</LoadingButton>
					<Button type="button" onClick={() => setIsImportingStatement(true)} className="flex items-center gap-1.5">
						<Upload className="h-4 w-4" />
						IMPORTAR EXTRATO
					</Button>
				</div>
			</div>

			<div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-3">
				<StatusCountCard label="PENDENTES" count={statusCounts.pendentes} icon={<Clock className="h-4 w-4 text-blue-600" />} />
				<StatusCountCard label="CONCILIADAS" count={statusCounts.conciliadas} icon={<CheckCircle2 className="h-4 w-4 text-green-600" />} />
				<StatusCountCard label="IGNORADAS" count={statusCounts.ignoradas} icon={<EyeOff className="h-4 w-4 text-gray-500" />} />
			</div>

			<div className="flex flex-col gap-2 sm:flex-row">
				<Input
					value={params.search}
					placeholder="Pesquisar linha do extrato..."
					onChange={(e) => updateParams({ search: e.target.value, page: 1 })}
					className="grow rounded-xl"
				/>
				<LoadingButton
					type="button"
					variant="outline"
					loading={isSyncPending && (syncVariables?.confirmarMatchIds?.length ?? 0) > 1}
					disabled={exactSuggestionMatchIds.length === 0}
					onClick={() => mutateSync({ confirmarMatchIds: exactSuggestionMatchIds, criarLancamentos: [], ignorarLinhaIds: [] })}
					className="flex shrink-0 items-center gap-1.5"
				>
					<CheckCheck className="h-4 w-4" />
					CONFIRMAR SUGESTÕES EXATAS ({exactSuggestionMatchIds.length})
				</LoadingButton>
			</div>

			<div className="flex flex-col gap-3 justify-end lg:flex-row lg:items-end">
				<InteractiveFilter.Root className="w-fit">
					<InteractiveFilter.Trigger>
						<InteractiveFilter.Icon>
							<ListFilter className="h-4 w-4 min-h-4 min-w-4" />
							<InteractiveFilter.Label>STATUS</InteractiveFilter.Label>
						</InteractiveFilter.Icon>
						<InteractiveFilter.Value>
							{selectedStatusesLabel.length > 0 ? <strong>{selectedStatusesLabel}</strong> : <span>NENHUM</span>}
						</InteractiveFilter.Value>
						<InteractiveFilter.Clear onClear={() => updateParams({ statuses: [], page: 1 })} />
					</InteractiveFilter.Trigger>
					<InteractiveFilter.Content className="w-72 p-0">
						<InteractiveFilter.MultiContent
							options={LINE_STATUS_OPTIONS.map((option) => ({
								...option,
								startContent: option.icon,
							}))}
							value={params.statuses}
							onChange={(nextStatuses) => updateParams({ statuses: nextStatuses, page: 1 })}
							onClear={() => updateParams({ statuses: [], page: 1 })}
							isCleared={params.statuses.length === 0}
							searchPlaceholder="Buscar status..."
							emptyLabel="Nenhum status encontrado."
							clearLabel="N/A"
						/>
					</InteractiveFilter.Content>
				</InteractiveFilter.Root>
			</div>

			<GeneralPaginationComponent
				activePage={params.page}
				queryLoading={isLoading}
				selectPage={(page) => updateParams({ page })}
				totalPages={totalPages}
				itemsMatchedText={`${transactionsMatched} ${transactionsMatched === 1 ? "linha encontrada" : "linhas encontradas"}.`}
				itemsShowingText={`Mostrando ${transactions.length} ${transactions.length === 1 ? "linha" : "linhas"}.`}
			/>

			{isLoading ? <LoadingComponent /> : null}
			{isError ? <ErrorComponent msg={getErrorMessage(error)} /> : null}
			{isSuccess ? (
				transactions.length > 0 ? (
					transactions.map((line) => (
						<StatementLineCard
							key={line.id}
							line={line}
							onResolve={() => setResolvingLineId(line.id)}
							onConfirmMatch={(matchId) => mutateSync({ confirmarMatchIds: [matchId], criarLancamentos: [], ignorarLinhaIds: [] })}
							confirmingMatchId={isSyncPending && syncVariables?.confirmarMatchIds?.length === 1 ? syncVariables.confirmarMatchIds[0] : null}
							onRejectMatch={(matchId) => mutateRejectMatch({ matchId })}
							rejectingMatchId={isRejectPending ? (rejectVariables?.matchId ?? null) : null}
							onToggleIgnored={(ignorada) => mutateIgnoreLine({ linhaId: line.id, ignorada })}
							togglingIgnored={isIgnorePending && ignoreVariables?.linhaId === line.id}
						/>
					))
				) : (
					<Empty>
						<EmptyHeader>
							<EmptyMedia variant="icon">
								<FileCheck2 />
							</EmptyMedia>
							<EmptyTitle>Nenhuma linha de extrato encontrada</EmptyTitle>
							<EmptyDescription>
								Importe um extrato bancário para começar a conciliação. O formato recomendado é OFX — também aceitamos CSV, XLS/XLSX, PDF e imagens.
							</EmptyDescription>
						</EmptyHeader>
						<EmptyContent>
							<Button type="button" onClick={() => setIsImportingStatement(true)} className="flex items-center gap-1.5">
								<Upload className="h-4 w-4" />
								IMPORTAR EXTRATO
							</Button>
						</EmptyContent>
					</Empty>
				)
			) : null}

			{isImportingStatement ? (
				<NewStatementImport
					contaFinanceiraId={selectedAccountId}
					closeModal={() => setIsImportingStatement(false)}
					callbacks={{ onSuccess: invalidateReconciliationQueries }}
				/>
			) : null}
			{resolvingLineId ? (
				<ControlStatementTransaction
					linhaId={resolvingLineId}
					closeModal={() => setResolvingLineId(null)}
					callbacks={{ onSuccess: invalidateReconciliationQueries }}
				/>
			) : null}
		</div>
	);
}

type StatusCountCardProps = {
	label: string;
	count: number;
	icon: React.ReactNode;
	className?: string;
};
function StatusCountCard({ label, count, icon, className }: StatusCountCardProps) {
	return (
		<div className={cn("bg-card flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-3 shadow-2xs", className)}>
			<div className="flex items-center gap-2">
				{icon}
				<span className="text-xs font-medium tracking-tight text-muted-foreground">{label}</span>
			</div>
			<span className="text-lg font-bold tabular-nums">{count}</span>
		</div>
	);
}

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
function StatementLineCard({
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
