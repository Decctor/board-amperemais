"use client";

import DateInput from "@/components/Inputs/DateInput";
import NumberInput from "@/components/Inputs/NumberInput";
import SelectInput from "@/components/Inputs/SelectInput";
import TextInput from "@/components/Inputs/TextInput";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDateAsLocale, formatDateForInputValue, formatDateOnInputChange, formatToMoney } from "@/lib/formatting";
import { useFinancesAccounts } from "@/lib/queries/finances";
import { cn } from "@/lib/utils";
import type { TAccountingEntryFinancialTransactionState, TUseInternalAccountingEntryState } from "@/state-hooks/use-internal-accounting-entry-state";
import { getDefaultAccountingEntryTransactionState } from "@/state-hooks/use-internal-accounting-entry-state";
import { FinancialAccountTypeOptions, FinancialTransactionTypeOptions, SalePaymentMethodsOptions } from "@/utils/select-options";
import dayjs from "dayjs";
import { AlertCircle, CalendarClock, CheckCircle2, Clock, Layers3, Pencil, Plus, Trash2, WalletCards } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type AccountingEntryFinancialTransactionsBlockProps = {
	entryTotalValue: number;
	entryFinancialTransactions: TUseInternalAccountingEntryState["state"]["entryFinancialTransactions"];
	addFinancialTransaction: TUseInternalAccountingEntryState["addFinancialTransaction"];
	updateFinancialTransaction: TUseInternalAccountingEntryState["updateFinancialTransaction"];
	removeFinancialTransaction: TUseInternalAccountingEntryState["removeFinancialTransaction"];
	redefineFinancialTransactions: TUseInternalAccountingEntryState["redefineFinancialTransactions"];
};

export default function AccountingEntryFinancialTransactionsBlock({
	entryTotalValue,
	entryFinancialTransactions,
	addFinancialTransaction,
	updateFinancialTransaction,
	removeFinancialTransaction,
	redefineFinancialTransactions,
}: AccountingEntryFinancialTransactionsBlockProps) {
	const [transactionMenuIsOpen, setTransactionMenuIsOpen] = useState(false);
	const [multiMenuIsOpen, setMultiMenuIsOpen] = useState(false);
	const [editingIndex, setEditingIndex] = useState<number | null>(null);

	const activeTransactions = entryFinancialTransactions.filter((transaction) => !transaction.deletar);
	const transactionsTotal = activeTransactions.reduce((acc, transaction) => acc + (transaction.valor || 0), 0);
	const totalMatches = activeTransactions.length === 0 || Math.abs(transactionsTotal - entryTotalValue) <= 0.02;

	return (
		<ResponsiveMenuSection title="TRANSAÇÕES FINANCEIRAS" icon={<WalletCards className="h-4 w-4" />}>
			<div className="flex flex-col gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
				<div className="flex flex-col items-center justify-between gap-2">
					<div className="text-xs text-muted-foreground">
						SOMA: <strong className={cn(totalMatches ? "text-emerald-700" : "text-amber-700")}>{formatToMoney(transactionsTotal)}</strong> / LANÇAMENTO:{" "}
						<strong>{formatToMoney(entryTotalValue)}</strong>
					</div>
					<div className="flex items-center gap-1.5">
						<Button type="button" size="sm" variant="secondary" className="gap-1.5" onClick={() => setMultiMenuIsOpen(true)}>
							<Layers3 className="h-4 w-4" />
							MÚLTIPLAS
						</Button>
						<Button type="button" size="sm" className="gap-1.5" onClick={() => setTransactionMenuIsOpen(true)}>
							<Plus className="h-4 w-4" />
							ADICIONAR
						</Button>
					</div>
				</div>
				{!totalMatches ? <p className="text-xs text-amber-700">A soma das transações precisa bater o valor do lançamento.</p> : null}
			</div>

			<div className="flex flex-col gap-2">
				{activeTransactions.length > 0 ? (
					entryFinancialTransactions.map((transaction, index) =>
						transaction.deletar ? null : (
							<TransactionCard
								key={transaction.id ?? `${index}-${transaction.titulo}`}
								transaction={transaction}
								onEditClick={() => setEditingIndex(index)}
								onRemoveClick={() => removeFinancialTransaction(index)}
							/>
						),
					)
				) : (
					<p className="rounded-md border border-dashed border-border py-4 text-center text-xs text-muted-foreground">
						Nenhuma transação financeira adicionada.
					</p>
				)}
			</div>

			{transactionMenuIsOpen ? (
				<FinancialTransactionDraftMenu
					closeMenu={() => setTransactionMenuIsOpen(false)}
					commitFinancialTransaction={(transaction) => {
						addFinancialTransaction(transaction);
						setTransactionMenuIsOpen(false);
					}}
				/>
			) : null}

			{editingIndex !== null ? (
				<FinancialTransactionDraftMenu
					initialTransaction={entryFinancialTransactions[editingIndex]}
					closeMenu={() => setEditingIndex(null)}
					commitFinancialTransaction={(transaction) => {
						updateFinancialTransaction({ index: editingIndex, changes: transaction });
						setEditingIndex(null);
					}}
				/>
			) : null}

			{multiMenuIsOpen ? (
				<AddMultiFinancialTransactionsMenu
					entryTotalValue={entryTotalValue}
					closeMenu={() => setMultiMenuIsOpen(false)}
					onCommit={(transactions) => {
						redefineFinancialTransactions([...entryFinancialTransactions, ...transactions]);
						setMultiMenuIsOpen(false);
					}}
				/>
			) : null}
		</ResponsiveMenuSection>
	);
}

type TransactionCardProps = {
	transaction: TAccountingEntryFinancialTransactionState;
	onEditClick: () => void;
	onRemoveClick: () => void;
};

function TransactionCard({ transaction, onEditClick, onRemoveClick }: TransactionCardProps) {
	const typeConfig = useMemo(() => FinancialTransactionTypeOptions.find((o) => o.value === transaction.tipo) ?? null, [transaction.tipo]);
	const paymentMethodConfig = useMemo(() => SalePaymentMethodsOptions.find((o) => o.value === transaction.metodo) ?? null, [transaction.metodo]);
	const isEffective = !!transaction.dataEfetivacao;
	const isOverdue = !isEffective && new Date(transaction.dataPrevisao) < new Date();
	const statusConfig = isEffective
		? { label: "EFETIVADA", className: "bg-emerald-100 text-emerald-700", icon: <CheckCircle2 className="h-3.5 w-3.5" /> }
		: isOverdue
			? { label: "EM ATRASO", className: "bg-red-100 text-red-700", icon: <AlertCircle className="h-3.5 w-3.5" /> }
			: { label: "PENDENTE", className: "bg-blue-100 text-blue-700", icon: <Clock className="h-3.5 w-3.5" /> };

	return (
		<div className="flex flex-col gap-2 rounded-md border border-border bg-card px-3 py-3 shadow-xs">
			<div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
				<div className="min-w-0 space-y-1">
					<div className="flex flex-wrap items-center gap-1.5">
						{typeConfig ? (
							<span
								className={cn("inline-flex items-center gap-1 rounded-md px-2 py-1 text-[0.65rem]", typeConfig.colors.background, typeConfig.colors.text)}
							>
								{typeConfig.icon}
								{typeConfig.label}
							</span>
						) : null}
						<span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-1 text-[0.65rem]", statusConfig.className)}>
							{statusConfig.icon}
							{statusConfig.label}
						</span>
					</div>
					<h3 className="truncate text-sm font-semibold">{transaction.titulo || "Título não definido"}</h3>
				</div>
				<span className="text-sm font-bold">{formatToMoney(transaction.valor)}</span>
			</div>

			<div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
				<span>{paymentMethodConfig?.label ?? transaction.metodo}</span>
				<span>Previsão: {formatDateAsLocale(transaction.dataPrevisao)}</span>
				{transaction.dataEfetivacao ? <span>Efetivada: {formatDateAsLocale(transaction.dataEfetivacao)}</span> : null}
				{transaction.totalParcelas ? (
					<span>
						Parcela {transaction.parcela}/{transaction.totalParcelas}
					</span>
				) : null}
			</div>

			<div className="flex justify-end gap-1.5">
				<Button type="button" variant="ghost" size="sm" className="gap-1.5" onClick={onEditClick}>
					<Pencil className="h-4 w-4" />
					EDITAR
				</Button>
				<Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={onRemoveClick} aria-label="Remover transação">
					<Trash2 className="h-4 w-4" />
				</Button>
			</div>
		</div>
	);
}

type FinancialTransactionDraftMenuProps = {
	initialTransaction?: TAccountingEntryFinancialTransactionState;
	commitFinancialTransaction: (transaction: TAccountingEntryFinancialTransactionState) => void;
	closeMenu: () => void;
};

function FinancialTransactionDraftMenu({ initialTransaction, commitFinancialTransaction, closeMenu }: FinancialTransactionDraftMenuProps) {
	const { data: financialAccountsData } = useFinancesAccounts({ initialFilters: { activeOnly: true, stats: false } });
	const financialAccounts = financialAccountsData?.accounts ?? [];
	const [transaction, setTransaction] = useState<TAccountingEntryFinancialTransactionState>(
		getDefaultAccountingEntryTransactionState(initialTransaction),
	);

	const financialAccountOptions = useMemo(
		() =>
			financialAccounts.map((account) => {
				const typeConfig = FinancialAccountTypeOptions.find((option) => option.value === account.tipo);
				return {
					id: account.id,
					value: account.id,
					label: account.nome,
					startContent: typeConfig?.icon,
				};
			}),
		[financialAccounts],
	);

	return (
		<ResponsiveMenu
			menuTitle={initialTransaction ? "EDITAR TRANSAÇÃO" : "NOVA TRANSAÇÃO"}
			menuDescription="Preencha os dados da transação financeira vinculada ao lançamento."
			menuActionButtonText={initialTransaction ? "SALVAR TRANSAÇÃO" : "ADICIONAR TRANSAÇÃO"}
			menuCancelButtonText="CANCELAR"
			actionFunction={() => commitFinancialTransaction(transaction)}
			actionIsLoading={false}
			stateIsLoading={false}
			closeMenu={closeMenu}
			dialogVariant="md"
			drawerVariant="lg"
		>
			<TextInput
				label="TÍTULO"
				placeholder="Preencha o título da transação..."
				value={transaction.titulo}
				handleChange={(value) => setTransaction((prev) => ({ ...prev, titulo: value }))}
				width="100%"
				required
			/>
			<SelectInput
				label="TIPO"
				value={transaction.tipo}
				options={FinancialTransactionTypeOptions.map((option) => ({
					id: option.id,
					value: option.value,
					label: option.label,
					startContent: option.icon,
				}))}
				resetOptionLabel="NÃO DEFINIDO"
				onReset={() => setTransaction((prev) => ({ ...prev, tipo: "ENTRADA" }))}
				handleChange={(value) => setTransaction((prev) => ({ ...prev, tipo: value as typeof prev.tipo }))}
				width="100%"
			/>
			<NumberInput
				label="VALOR"
				value={transaction.valor}
				handleChange={(value) => setTransaction((prev) => ({ ...prev, valor: value }))}
				placeholder="Preencha o valor da transação..."
				width="100%"
			/>
			<SelectInput
				label="MÉTODO"
				value={transaction.metodo}
				options={SalePaymentMethodsOptions.map((option) => ({
					id: option.id,
					value: option.value,
					label: option.label,
					startContent: option.icon,
				}))}
				resetOptionLabel="A DEFINIR"
				onReset={() => setTransaction((prev) => ({ ...prev, metodo: "A_DEFINIR" }))}
				handleChange={(value) => setTransaction((prev) => ({ ...prev, metodo: value as typeof prev.metodo }))}
				width="100%"
			/>
			<DateInput
				label="DATA DE PREVISÃO"
				value={formatDateForInputValue(transaction.dataPrevisao)}
				handleChange={(value) => setTransaction((prev) => ({ ...prev, dataPrevisao: formatDateOnInputChange(value, "date") ?? prev.dataPrevisao }))}
				width="100%"
			/>
			<DateInput
				label="DATA DE EFETIVAÇÃO"
				value={formatDateForInputValue(transaction.dataEfetivacao)}
				handleChange={(value) => setTransaction((prev) => ({ ...prev, dataEfetivacao: formatDateOnInputChange(value, "date") }))}
				width="100%"
			/>
			<SelectInput
				label="CONTA FINANCEIRA"
				value={transaction.contaFinanceiraId}
				options={financialAccountOptions}
				resetOptionLabel="NÃO DEFINIDA"
				onReset={() => setTransaction((prev) => ({ ...prev, contaFinanceiraId: null }))}
				handleChange={(value) => setTransaction((prev) => ({ ...prev, contaFinanceiraId: value }))}
				width="100%"
			/>
			<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
				<NumberInput
					label="PARCELA"
					value={transaction.parcela}
					handleChange={(value) => setTransaction((prev) => ({ ...prev, parcela: value > 0 ? value : null }))}
					placeholder="Nº da parcela..."
					width="100%"
				/>
				<NumberInput
					label="TOTAL DE PARCELAS"
					value={transaction.totalParcelas}
					handleChange={(value) => setTransaction((prev) => ({ ...prev, totalParcelas: value > 0 ? value : null }))}
					placeholder="Total de parcelas..."
					width="100%"
				/>
			</div>
		</ResponsiveMenu>
	);
}

type AddMultiFinancialTransactionsMenuProps = {
	entryTotalValue: number;
	onCommit: (transactions: TAccountingEntryFinancialTransactionState[]) => void;
	closeMenu: () => void;
};

function distributeTotalEqually(total: number, count: number) {
	const cents = Math.round(total * 100);
	const base = Math.floor(cents / count);
	const remainder = cents - base * count;
	return Array.from({ length: count }, (_, index) => (base + (index < remainder ? 1 : 0)) / 100);
}

function AddMultiFinancialTransactionsMenu({ entryTotalValue, onCommit, closeMenu }: AddMultiFinancialTransactionsMenuProps) {
	const [installmentCount, setInstallmentCount] = useState(2);
	const [firstDate, setFirstDate] = useState<Date>(new Date());
	const [dayInterval, setDayInterval] = useState(30);
	const [transactionType, setTransactionType] = useState<TAccountingEntryFinancialTransactionState["tipo"]>("ENTRADA");
	const [paymentMethod, setPaymentMethod] = useState<TAccountingEntryFinancialTransactionState["metodo"]>("A_DEFINIR");
	const [drafts, setDrafts] = useState<TAccountingEntryFinancialTransactionState[]>([]);

	function generateDrafts() {
		if (entryTotalValue <= 0) {
			toast.error("Defina o valor do lançamento antes de gerar transações.");
			return;
		}
		const count = Math.min(24, Math.max(2, Math.round(installmentCount || 2)));
		const amounts = distributeTotalEqually(entryTotalValue, count);
		setDrafts(
			amounts.map((amount, index) =>
				getDefaultAccountingEntryTransactionState({
					titulo: `Parcela ${index + 1}/${count}`,
					tipo: transactionType,
					valor: amount,
					metodo: paymentMethod,
					dataPrevisao: dayjs(firstDate)
						.add(index * dayInterval, "day")
						.toDate(),
					parcela: index + 1,
					totalParcelas: count,
				}),
			),
		);
	}

	const draftsTotal = drafts.reduce((acc, transaction) => acc + transaction.valor, 0);

	return (
		<ResponsiveMenu
			menuTitle="MÚLTIPLAS TRANSAÇÕES"
			menuDescription="Gere parcelas a partir do valor do lançamento e ajuste os itens antes de adicionar."
			menuActionButtonText="ADICIONAR TODAS"
			menuCancelButtonText="CANCELAR"
			actionFunction={() => {
				if (drafts.length === 0) {
					toast.error("Gere as transações antes de adicionar.");
					return;
				}
				onCommit(drafts);
			}}
			actionIsLoading={false}
			stateIsLoading={false}
			closeMenu={closeMenu}
		>
			<ResponsiveMenuSection title="CONFIGURAÇÃO" icon={<CalendarClock className="h-4 w-4" />}>
				<p className="text-xs text-muted-foreground">Base: {formatToMoney(entryTotalValue)}</p>
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
					<label className="flex flex-col gap-1 text-sm font-medium text-foreground/80">
						PARCELAS
						<Input type="number" min={2} max={24} value={installmentCount} onChange={(event) => setInstallmentCount(Number(event.target.value) || 2)} />
					</label>
					<NumberInput
						label="INTERVALO ENTRE PARCELAS"
						value={dayInterval}
						handleChange={(value) => setDayInterval(Math.max(0, Math.round(value || 0)))}
						placeholder="Intervalo em dias..."
						width="100%"
					/>
				</div>
				<DateInput
					label="PRIMEIRO VENCIMENTO"
					value={formatDateForInputValue(firstDate)}
					handleChange={(value) => setFirstDate(formatDateOnInputChange(value, "date") ?? firstDate)}
					width="100%"
				/>
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
					<SelectInput
						label="TIPO PADRÃO"
						value={transactionType}
						options={FinancialTransactionTypeOptions.map((option) => ({
							id: option.id,
							value: option.value,
							label: option.label,
							startContent: option.icon,
						}))}
						resetOptionLabel="ENTRADA"
						onReset={() => setTransactionType("ENTRADA")}
						handleChange={(value) => setTransactionType(value as typeof transactionType)}
						width="100%"
					/>
					<SelectInput
						label="MÉTODO PADRÃO"
						value={paymentMethod}
						options={SalePaymentMethodsOptions.map((option) => ({ id: option.id, value: option.value, label: option.label, startContent: option.icon }))}
						resetOptionLabel="A DEFINIR"
						onReset={() => setPaymentMethod("A_DEFINIR")}
						handleChange={(value) => setPaymentMethod(value as typeof paymentMethod)}
						width="100%"
					/>
				</div>
				<Button type="button" onClick={generateDrafts}>
					GERAR TRANSAÇÕES
				</Button>
			</ResponsiveMenuSection>

			<ResponsiveMenuSection title="PRÉVIA" icon={<Layers3 className="h-4 w-4" />}>
				<p className="text-xs text-muted-foreground">
					SOMA GERADA: <strong>{formatToMoney(draftsTotal)}</strong>
				</p>
				<div className="flex max-h-[40vh] flex-col gap-2 overflow-auto pr-1">
					{drafts.length > 0 ? (
						drafts.map((draft, index) => (
							<div
								key={`${draft.titulo}-${index}`}
								className="grid grid-cols-1 gap-2 rounded-md border border-border px-2 py-2 sm:grid-cols-[1fr_120px_40px]"
							>
								<Input
									value={draft.titulo}
									onChange={(event) =>
										setDrafts((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, titulo: event.target.value } : item)))
									}
								/>
								<Input
									type="number"
									step="0.01"
									value={draft.valor}
									onChange={(event) =>
										setDrafts((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, valor: Number(event.target.value) || 0 } : item)))
									}
								/>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="text-destructive"
									onClick={() => setDrafts((prev) => prev.filter((_, itemIndex) => itemIndex !== index))}
									aria-label="Remover parcela"
								>
									<Trash2 className="h-4 w-4" />
								</Button>
							</div>
						))
					) : (
						<p className="rounded-md border border-dashed border-border py-4 text-center text-xs text-muted-foreground">Nenhuma transação gerada.</p>
					)}
				</div>
			</ResponsiveMenuSection>
		</ResponsiveMenu>
	);
}
