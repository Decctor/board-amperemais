"use client";

import NumberInput from "@/components/Inputs/NumberInput";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import type { TUseInternalAccountingEntryState } from "@/state-hooks/use-internal-accounting-entry-state";
import { DollarSign } from "lucide-react";

type AccountingEntryValuesBlockProps = {
	entry: TUseInternalAccountingEntryState["state"]["entry"];
	updateEntry: TUseInternalAccountingEntryState["updateEntry"];
};

export default function AccountingEntryValuesBlock({ entry, updateEntry }: AccountingEntryValuesBlockProps) {
	return (
		<ResponsiveMenuSection title="VALORES" icon={<DollarSign className="h-4 w-4" />}>
			<NumberInput
				label="VALOR"
				value={entry.valor}
				handleChange={(value) => updateEntry({ valor: value })}
				placeholder="Preencha o valor realizado..."
				width="100%"
				required
			/>
			<NumberInput
				label="VALOR PREVISTO"
				value={entry.valorPrevisto}
				handleChange={(value) => updateEntry({ valorPrevisto: value > 0 ? value : null })}
				placeholder="Preencha o valor previsto..."
				width="100%"
			/>
		</ResponsiveMenuSection>
	);
}
