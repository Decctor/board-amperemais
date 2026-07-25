import DateInput from "@/components/Inputs/DateInput";
import NumberInput from "@/components/Inputs/NumberInput";
import TextareaInput from "@/components/Inputs/TextareaInput";
import TextInput from "@/components/Inputs/TextInput";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { formatDateForInputValue, formatDateOnInputChange } from "@/lib/formatting";
import type { TUsePurchaseState } from "@/state-hooks/use-purchase-state";
import { FileText } from "lucide-react";
import PurchaseTransactionsTable from "./Utils/PurchaseTransactionsTable";

type PurchaseAccountingEntryBlockProps = {
	accountingEntry: TUsePurchaseState["state"]["lancamentoContabil"];
	updateAccountingEntry: TUsePurchaseState["updateAccountingEntry"];
	addAccountingEntryTransaction: TUsePurchaseState["addAccountingEntryTransaction"];
	updateAccountingEntryTransaction: TUsePurchaseState["updateAccountingEntryTransaction"];
	removeAccountingEntryTransaction: TUsePurchaseState["removeAccountingEntryTransaction"];
};

export default function PurchaseAccountingEntryBlock({
	accountingEntry,
	updateAccountingEntry,
	addAccountingEntryTransaction,
	updateAccountingEntryTransaction,
	removeAccountingEntryTransaction,
}: PurchaseAccountingEntryBlockProps) {
	return (
		<ResponsiveMenuSection title="INFORMAÇÕES DA CONTABILIDADE" icon={<FileText className="h-4 min-h-4 w-4 min-w-4" />}>
			<div className="flex w-full flex-col items-center gap-2 lg:flex-row">
				<div className="w-full lg:w-1/2">
					<TextInput
						label="TÍTULO DO LANÇAMENTO CONTÁBIL"
						placeholder="Preencha o título do lançamento contábil..."
						value={accountingEntry.titulo}
						handleChange={(value) => updateAccountingEntry({ titulo: value })}
					/>
				</div>
				<div className="w-full lg:w-1/2">
					<DateInput
						label="DATA DE COMPETÊNCIA"
						value={formatDateForInputValue(accountingEntry.dataCompetencia)}
						handleChange={(value) =>
							updateAccountingEntry({ dataCompetencia: (formatDateOnInputChange(value, "date") as Date) || accountingEntry.dataCompetencia })
						}
					/>
				</div>
			</div>
			<TextareaInput
				label="ANOTAÇÕES DO LANÇAMENTO CONTÁBIL"
				placeholder="Preencha as anotações do lançamento contábil..."
				value={accountingEntry.anotacoes ?? ""}
				handleChange={(value) => updateAccountingEntry({ anotacoes: value })}
			/>
			<div className="flex w-full flex-col items-center gap-2 lg:flex-row">
				<div className="w-full lg:w-1/2">
					<NumberInput
						label="VALOR PREVISTO"
						placeholder="Preencha o valor previsto para o lançamento contábil..."
						value={accountingEntry.valorPrevisto ?? 0}
						handleChange={(value) => updateAccountingEntry({ valorPrevisto: value })}
					/>
				</div>
				<div className="w-full lg:w-1/2">
					<NumberInput
						label="VALOR EFETIVO"
						placeholder="Preencha o valor efetivo para o lançamento contábil..."
						value={accountingEntry.valor}
						handleChange={(value) => updateAccountingEntry({ valor: value })}
					/>
				</div>
			</div>
			<div className="flex w-full flex-col gap-1.5">
				<p className="text-start text-sm font-medium tracking-tight text-foreground/80">TRANSAÇÕES FINANCEIRAS</p>
				<PurchaseTransactionsTable
					entryValue={accountingEntry.valor}
					competenceDate={accountingEntry.dataCompetencia}
					transactions={accountingEntry.transacoes}
					addTransaction={addAccountingEntryTransaction}
					updateTransaction={updateAccountingEntryTransaction}
					removeTransaction={removeAccountingEntryTransaction}
				/>
			</div>
		</ResponsiveMenuSection>
	);
}
