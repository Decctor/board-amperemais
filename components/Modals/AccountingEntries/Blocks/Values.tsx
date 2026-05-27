"use client";

import NumberInput from "@/components/Inputs/NumberInput";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import type { TUseInternalAccountingEntryState } from "@/state-hooks/use-internal-accounting-entry-state";
import { DollarSign } from "lucide-react";

type AccountingEntryValuesBlockProps = {
	entry: TUseInternalAccountingEntryState["state"]["entry"];
	updateEntry: TUseInternalAccountingEntryState["updateEntry"];
	editable?: boolean;
};

export default function AccountingEntryValuesBlock({ entry, updateEntry, editable = true }: AccountingEntryValuesBlockProps) {
	return (
		<ResponsiveMenuSection title="VALORES" icon={<DollarSign className="h-4 w-4" />}>
			<NumberInput
				label="VALOR"
				value={entry.valor}
				handleChange={(value) => updateEntry({ valor: value })}
				placeholder="Preencha o valor realizado..."
				width="100%"
				required
				editable={editable}
			/>
			<NumberInput
				label="VALOR PREVISTO"
				value={entry.valorPrevisto}
				handleChange={(value) => updateEntry({ valorPrevisto: value > 0 ? value : null })}
				placeholder="Preencha o valor previsto..."
				width="100%"
				editable={editable}
			/>
		</ResponsiveMenuSection>
	);
}
