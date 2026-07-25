"use client";

import SelectInput from "@/components/Inputs/SelectInput";
import DeleteRowButton from "@/components/Spreadsheet/DeleteRowButton";
import EditableDateCell from "@/components/Spreadsheet/EditableDateCell";
import EditableNumberCell from "@/components/Spreadsheet/EditableNumberCell";
import EditableTextCell from "@/components/Spreadsheet/EditableTextCell";
import MobileEditableField from "@/components/Spreadsheet/MobileEditableField";
import { Badge } from "@/components/ui/badge";
import { ACCOUNTING_ENTRY_BALANCE_TOLERANCE, getActiveTransactionsTotal } from "@/lib/finances/accounting-entry-balance";
import { formatToMoney } from "@/lib/formatting";
import { useFinancesAccounts } from "@/lib/queries/finances";
import { SPREADSHEET_TABLE_ATTR, type SpreadsheetGridBounds } from "@/lib/spreadsheet-navigation";
import { cn } from "@/lib/utils";
import type { TPurchaseAccountingEntryTransaction, TUsePurchaseState } from "@/state-hooks/use-purchase-state";
import { FinancialTransactionTypeOptions, SalePaymentMethodsOptions } from "@/utils/select-options";
import { ArrowDown, ArrowUp, BadgeDollarSign, CheckCircle2, CircleAlert, Plus } from "lucide-react";
import { useMemo, useState } from "react";

const TRANSACTION_GRID_COL = {
	TITLE: 0,
	METHOD: 1,
	ACCOUNT: 2,
	FORECAST: 3,
	VALUE: 4,
} as const;

const TRANSACTION_GRID_COL_COUNT = 5;

const CELL_TRIGGER_CLASSNAME =
	"h-8 justify-between rounded-md border-transparent bg-transparent px-2 text-xs font-medium shadow-none hover:border-border hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/40";

const PAYMENT_METHOD_OPTIONS = SalePaymentMethodsOptions.map((option) => ({
	id: option.id,
	value: option.value,
	label: option.label,
	startContent: option.icon,
}));

type TAccountOption = { id: string; value: string; label: string };

type PurchaseTransactionsTableProps = {
	entryValue: number;
	competenceDate: Date;
	transactions: TUsePurchaseState["state"]["lancamentoContabil"]["transacoes"];
	addTransaction: TUsePurchaseState["addAccountingEntryTransaction"];
	updateTransaction: TUsePurchaseState["updateAccountingEntryTransaction"];
	removeTransaction: TUsePurchaseState["removeAccountingEntryTransaction"];
};

/**
 * Tabela inline das transações financeiras que quitam o lançamento contábil da compra.
 * Segue o mesmo padrão da tabela de itens: células editáveis com navegação por teclado e uma
 * linha rascunho que se auto-confirma quando os campos mínimos estão preenchidos.
 */
export default function PurchaseTransactionsTable({
	entryValue,
	competenceDate,
	transactions,
	addTransaction,
	updateTransaction,
	removeTransaction,
}: PurchaseTransactionsTableProps) {
	const { data: financialAccountsData } = useFinancesAccounts({ initialFilters: { activeOnly: true, stats: false } });
	const accountOptions: TAccountOption[] = useMemo(
		() => (financialAccountsData?.accounts ?? []).map((account) => ({ id: account.id, value: account.id, label: account.nome })),
		[financialAccountsData],
	);

	const visibleTransactions = useMemo(
		() => transactions.map((transaction, index) => ({ transaction, index })).filter(({ transaction }) => !transaction.deletar),
		[transactions],
	);
	const transactionsTotal = getActiveTransactionsTotal(transactions);
	const missingTotal = entryValue - transactionsTotal;
	const hasTransactions = visibleTransactions.length > 0;
	const isBalanced = !hasTransactions || Math.abs(missingTotal) <= ACCOUNTING_ENTRY_BALANCE_TOLERANCE;
	const hasExceededTotal = hasTransactions && missingTotal < -ACCOUNTING_ENTRY_BALANCE_TOLERANCE;
	const progressValue = entryValue > 0 ? Math.min(100, Math.max(0, (transactionsTotal / entryValue) * 100)) : 0;

	const gridBounds: SpreadsheetGridBounds = useMemo(
		() => ({
			rowCount: visibleTransactions.length + 1,
			colCount: TRANSACTION_GRID_COL_COUNT,
		}),
		[visibleTransactions.length],
	);

	return (
		<div className="flex w-full flex-col gap-2">
			<div className="flex w-full flex-col gap-3 rounded-md border border-border bg-muted/30 p-3">
				<div className="flex w-full flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
					<div className="flex min-w-0 flex-col gap-1">
						<div className="flex flex-wrap items-center gap-2">
							<p className="text-sm font-semibold tracking-tight text-foreground">Cobertura financeira</p>
							<Badge
								variant={isBalanced ? "secondary" : hasExceededTotal ? "destructive" : "outline"}
								className={cn("flex h-fit items-center gap-1.5 rounded-md py-1", {
									"bg-green-500/10 text-green-700 dark:text-green-400": isBalanced,
								})}
							>
								{isBalanced ? <CheckCircle2 className="h-4 min-h-4 w-4 min-w-4" /> : <CircleAlert className="h-4 min-h-4 w-4 min-w-4" />}
								{isBalanced ? "BALANCEADO" : hasExceededTotal ? "EXCEDENTE" : "PENDENTE"}
							</Badge>
						</div>
						<p className="text-xs font-medium text-muted-foreground">
							{formatToMoney(transactionsTotal)} de {formatToMoney(entryValue)} em {visibleTransactions.length} transações
						</p>
					</div>
					<p
						className={cn("shrink-0 text-xs font-semibold tabular-nums", {
							"text-green-700 dark:text-green-400": isBalanced,
							"text-red-700 dark:text-red-400": hasExceededTotal,
							"text-muted-foreground": !isBalanced && !hasExceededTotal,
						})}
					>
						{isBalanced ? "SEM DIFERENÇA" : hasExceededTotal ? `${formatToMoney(Math.abs(missingTotal))} ACIMA` : `FALTAM ${formatToMoney(missingTotal)}`}
					</p>
				</div>
				<div className="h-2 w-full overflow-hidden rounded-full bg-background ring-1 ring-border/70">
					<div
						className={cn("h-full rounded-full transition-all", {
							"bg-green-600": isBalanced && hasTransactions,
							"bg-red-600": hasExceededTotal,
							"bg-primary": !isBalanced && !hasExceededTotal,
						})}
						style={{ width: `${progressValue}%` }}
					/>
				</div>
			</div>

			<div {...{ [SPREADSHEET_TABLE_ATTR]: "true" }} className="flex w-full flex-col overflow-hidden rounded-md border border-border bg-background">
				<div className="hidden min-h-9 w-full items-center border-b border-border bg-muted/60 px-2 py-1.5 text-[0.68rem] font-medium uppercase text-muted-foreground lg:flex">
					<p className="w-[24%] px-2 text-start">Título</p>
					<p className="w-[10%] px-2 text-center">Tipo</p>
					<p className="w-[17%] px-2 text-center">Método</p>
					<p className="w-[17%] px-2 text-center">Conta financeira</p>
					<p className="w-[13%] px-2 text-center">Previsão</p>
					<p className="w-[14%] px-2 text-center">Valor</p>
					<p className="w-[5%] px-2 text-center">Ações</p>
				</div>

				<div className="flex w-full flex-col bg-background">
					{visibleTransactions.map(({ transaction, index }, rowIndex) => (
						<PurchaseTransactionTableRow
							key={transaction.id ?? `nova-${index}`}
							transaction={transaction}
							accountOptions={accountOptions}
							gridRow={rowIndex}
							gridBounds={gridBounds}
							handleUpdate={(item) => updateTransaction({ index, item })}
							handleRemove={() => removeTransaction({ index })}
						/>
					))}
					<DraftPurchaseTransactionRow
						accountOptions={accountOptions}
						suggestedValue={missingTotal > 0 ? missingTotal : 0}
						competenceDate={competenceDate}
						gridRow={visibleTransactions.length}
						gridBounds={gridBounds}
						addTransaction={addTransaction}
					/>
					{hasTransactions ? (
						<div className="flex w-full items-center justify-center border-t border-border px-2 py-2">
							<div className="flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium tabular-nums text-foreground/80">
								<BadgeDollarSign size={15} />
								<p>Total das transações: {formatToMoney(transactionsTotal)}</p>
							</div>
						</div>
					) : (
						<div className="flex w-full items-center justify-center border-t border-border px-3 py-3">
							<p className="text-center text-xs font-medium tracking-tight text-muted-foreground">
								Preencha o título na linha em branco para programar o pagamento da compra.
							</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

type PurchaseTransactionTableRowProps = {
	transaction: TPurchaseAccountingEntryTransaction;
	accountOptions: TAccountOption[];
	gridRow: number;
	gridBounds: SpreadsheetGridBounds;
	handleUpdate: (item: Partial<TPurchaseAccountingEntryTransaction>) => void;
	handleRemove: () => void;
};

function PurchaseTransactionTableRow({
	transaction,
	accountOptions,
	gridRow,
	gridBounds,
	handleUpdate,
	handleRemove,
}: PurchaseTransactionTableRowProps) {
	return (
		<div className="border-t border-border first:border-t-0">
			<div className="hidden min-h-11 w-full items-center px-2 py-1 text-xs transition-colors hover:bg-muted/40 lg:flex">
				<div className="w-[24%] px-1">
					<EditableTextCell
						value={transaction.titulo}
						ariaLabel="Editar título da transação"
						gridRow={gridRow}
						gridCol={TRANSACTION_GRID_COL.TITLE}
						gridBounds={gridBounds}
						emptyDisplay="Sem título"
						onCommit={(titulo) => handleUpdate({ titulo })}
					/>
				</div>
				<div className="flex w-[10%] justify-center px-1">
					<TransactionTypeCell transaction={transaction} handleUpdate={handleUpdate} />
				</div>
				<div className="w-[17%] px-1">
					<TransactionMethodCell transaction={transaction} handleUpdate={handleUpdate} />
				</div>
				<div className="w-[17%] px-1">
					<TransactionAccountCell transaction={transaction} accountOptions={accountOptions} handleUpdate={handleUpdate} />
				</div>
				<div className="w-[13%] px-1">
					<EditableDateCell
						value={transaction.dataPrevisao}
						ariaLabel="Editar previsão da transação"
						gridRow={gridRow}
						gridCol={TRANSACTION_GRID_COL.FORECAST}
						gridBounds={gridBounds}
						onCommit={(dataPrevisao) => {
							if (dataPrevisao) handleUpdate({ dataPrevisao });
						}}
					/>
				</div>
				<div className="w-[14%] px-1">
					<EditableNumberCell
						value={transaction.valor}
						ariaLabel="Editar valor da transação"
						min={0}
						gridRow={gridRow}
						gridCol={TRANSACTION_GRID_COL.VALUE}
						gridBounds={gridBounds}
						format={(value) => (value > 0 ? formatToMoney(value) : "-")}
						onCommit={(valor) => handleUpdate({ valor })}
					/>
				</div>
				<div className="flex w-[5%] justify-center px-1">
					<DeleteRowButton onRemove={handleRemove} ariaLabel="Remover transação financeira da compra" />
				</div>
			</div>

			<div className="flex w-full flex-col gap-2 p-2 lg:hidden">
				<div className="flex w-full items-start justify-between gap-2">
					<div className="min-w-0 flex-1">
						<EditableTextCell
							value={transaction.titulo}
							ariaLabel="Editar título da transação"
							emptyDisplay="Sem título"
							onCommit={(titulo) => handleUpdate({ titulo })}
						/>
					</div>
					<DeleteRowButton onRemove={handleRemove} ariaLabel="Remover transação financeira da compra" />
				</div>
				<div className="grid w-full grid-cols-2 gap-2">
					<MobileEditableField label="Tipo">
						<TransactionTypeCell transaction={transaction} handleUpdate={handleUpdate} />
					</MobileEditableField>
					<MobileEditableField label="Valor">
						<EditableNumberCell
							value={transaction.valor}
							ariaLabel="Editar valor da transação"
							min={0}
							format={(value) => (value > 0 ? formatToMoney(value) : "-")}
							onCommit={(valor) => handleUpdate({ valor })}
						/>
					</MobileEditableField>
					<MobileEditableField label="Método">
						<TransactionMethodCell transaction={transaction} handleUpdate={handleUpdate} />
					</MobileEditableField>
					<MobileEditableField label="Previsão">
						<EditableDateCell
							value={transaction.dataPrevisao}
							ariaLabel="Editar previsão da transação"
							onCommit={(dataPrevisao) => {
								if (dataPrevisao) handleUpdate({ dataPrevisao });
							}}
						/>
					</MobileEditableField>
				</div>
				<MobileEditableField label="Conta financeira">
					<TransactionAccountCell transaction={transaction} accountOptions={accountOptions} handleUpdate={handleUpdate} />
				</MobileEditableField>
			</div>
		</div>
	);
}

function DraftPurchaseTransactionRow({
	accountOptions,
	suggestedValue,
	competenceDate,
	gridRow,
	gridBounds,
	addTransaction,
}: {
	accountOptions: TAccountOption[];
	suggestedValue: number;
	competenceDate: Date;
	gridRow: number;
	gridBounds: SpreadsheetGridBounds;
	addTransaction: (transaction: TPurchaseAccountingEntryTransaction) => void;
}) {
	const [draft, setDraft] = useState<TPurchaseAccountingEntryTransaction>(() => createEmptyPurchaseTransaction(competenceDate));

	// A linha rascunho se auto-confirma assim que tiver título e valor positivo, sem botão de adicionar.
	// Quando o valor não foi informado, assume-se o que falta para fechar o lançamento.
	function updateDraft(item: Partial<TPurchaseAccountingEntryTransaction>) {
		const nextDraft = { ...draft, ...item };
		const effectiveValue = nextDraft.valor > 0 ? nextDraft.valor : suggestedValue;

		if (nextDraft.titulo.trim() && effectiveValue > 0) {
			addTransaction({ ...nextDraft, valor: effectiveValue });
			setDraft(createEmptyPurchaseTransaction(competenceDate));
			return;
		}

		setDraft(nextDraft);
	}

	return (
		<div className="border-t border-dashed border-border bg-muted/20">
			<div className="hidden min-h-11 w-full items-center px-2 py-1 text-xs transition-colors hover:bg-muted/40 lg:flex">
				<div className="flex w-[24%] items-center gap-1 px-1">
					<Plus className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
					<div className="min-w-0 flex-1">
						<EditableTextCell
							value={draft.titulo}
							ariaLabel="Editar título da nova transação"
							gridRow={gridRow}
							gridCol={TRANSACTION_GRID_COL.TITLE}
							gridBounds={gridBounds}
							emptyDisplay="NOVA TRANSAÇÃO"
							onCommit={(titulo) => updateDraft({ titulo })}
						/>
					</div>
				</div>
				<div className="flex w-[10%] justify-center px-1">
					<TransactionTypeCell transaction={draft} handleUpdate={updateDraft} />
				</div>
				<div className="w-[17%] px-1">
					<TransactionMethodCell transaction={draft} handleUpdate={updateDraft} />
				</div>
				<div className="w-[17%] px-1">
					<TransactionAccountCell transaction={draft} accountOptions={accountOptions} handleUpdate={updateDraft} />
				</div>
				<div className="w-[13%] px-1">
					<EditableDateCell
						value={draft.dataPrevisao}
						ariaLabel="Editar previsão da nova transação"
						gridRow={gridRow}
						gridCol={TRANSACTION_GRID_COL.FORECAST}
						gridBounds={gridBounds}
						onCommit={(dataPrevisao) => {
							if (dataPrevisao) updateDraft({ dataPrevisao });
						}}
					/>
				</div>
				<div className="w-[14%] px-1">
					<EditableNumberCell
						value={draft.valor}
						ariaLabel="Editar valor da nova transação"
						min={0}
						gridRow={gridRow}
						gridCol={TRANSACTION_GRID_COL.VALUE}
						gridBounds={gridBounds}
						format={(value) => (value > 0 ? formatToMoney(value) : suggestedValue > 0 ? formatToMoney(suggestedValue) : "-")}
						onCommit={(valor) => updateDraft({ valor })}
					/>
				</div>
				<div className="w-[5%]" />
			</div>

			<div className="flex w-full flex-col gap-2 p-2 lg:hidden">
				<div className="flex w-full items-start gap-2">
					<Plus className="mt-2 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
					<div className="min-w-0 flex-1">
						<EditableTextCell
							value={draft.titulo}
							ariaLabel="Editar título da nova transação"
							emptyDisplay="Nova transação"
							onCommit={(titulo) => updateDraft({ titulo })}
						/>
					</div>
				</div>
				<div className="grid w-full grid-cols-2 gap-2">
					<MobileEditableField label="Tipo">
						<TransactionTypeCell transaction={draft} handleUpdate={updateDraft} />
					</MobileEditableField>
					<MobileEditableField label="Valor">
						<EditableNumberCell
							value={draft.valor}
							ariaLabel="Editar valor da nova transação"
							min={0}
							format={(value) => (value > 0 ? formatToMoney(value) : suggestedValue > 0 ? formatToMoney(suggestedValue) : "-")}
							onCommit={(valor) => updateDraft({ valor })}
						/>
					</MobileEditableField>
					<MobileEditableField label="Método">
						<TransactionMethodCell transaction={draft} handleUpdate={updateDraft} />
					</MobileEditableField>
					<MobileEditableField label="Previsão">
						<EditableDateCell
							value={draft.dataPrevisao}
							ariaLabel="Editar previsão da nova transação"
							onCommit={(dataPrevisao) => {
								if (dataPrevisao) updateDraft({ dataPrevisao });
							}}
						/>
					</MobileEditableField>
				</div>
			</div>
		</div>
	);
}

type CellProps = {
	transaction: TPurchaseAccountingEntryTransaction;
	handleUpdate: (item: Partial<TPurchaseAccountingEntryTransaction>) => void;
};

function TransactionTypeCell({ transaction, handleUpdate }: CellProps) {
	const isInbound = transaction.tipo === "ENTRADA";
	const option = FinancialTransactionTypeOptions.find((item) => item.value === transaction.tipo);

	return (
		<button
			type="button"
			aria-label={`Alternar tipo da transação, atualmente ${option?.label ?? transaction.tipo}`}
			onClick={() => handleUpdate({ tipo: isInbound ? "SAIDA" : "ENTRADA" })}
			className={cn(
				"flex h-8 w-full items-center justify-center gap-1 rounded-md border text-[0.65rem] font-semibold transition-colors",
				isInbound
					? "border-green-500/40 bg-green-500/10 text-green-700 hover:bg-green-500/20 dark:text-green-400"
					: "border-red-500/40 bg-red-500/10 text-red-700 hover:bg-red-500/20 dark:text-red-400",
			)}
		>
			{isInbound ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
			{option?.label ?? transaction.tipo}
		</button>
	);
}

function TransactionMethodCell({ transaction, handleUpdate }: CellProps) {
	return (
		<SelectInput
			label="Método da transação"
			showLabel={false}
			resetOptionLabel="A DEFINIR"
			options={PAYMENT_METHOD_OPTIONS}
			value={transaction.metodo}
			holderClassName={CELL_TRIGGER_CLASSNAME}
			handleChange={(metodo) => handleUpdate({ metodo: metodo as TPurchaseAccountingEntryTransaction["metodo"] })}
			onReset={() => handleUpdate({ metodo: "A_DEFINIR" })}
		/>
	);
}

function TransactionAccountCell({ transaction, accountOptions, handleUpdate }: CellProps & { accountOptions: TAccountOption[] }) {
	return (
		<SelectInput
			label="Conta financeira da transação"
			showLabel={false}
			resetOptionLabel="SEM CONTA"
			options={accountOptions}
			value={transaction.contaFinanceiraId || ""}
			holderClassName={CELL_TRIGGER_CLASSNAME}
			handleChange={(contaFinanceiraId) => handleUpdate({ contaFinanceiraId })}
			onReset={() => handleUpdate({ contaFinanceiraId: null })}
		/>
	);
}

function createEmptyPurchaseTransaction(competenceDate: Date): TPurchaseAccountingEntryTransaction {
	return {
		contaFinanceiraId: null,
		titulo: "",
		// Uma compra gera pagamentos, então a saída é o padrão.
		tipo: "SAIDA",
		valor: 0,
		metodo: "A_DEFINIR",
		dataPrevisao: competenceDate,
		dataEfetivacao: null,
		parcela: null,
		totalParcelas: null,
	};
}
