"use client";

import SelectInput from "@/components/Inputs/SelectInput";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { useAccountCharts } from "@/lib/queries/finances";
import type { TUseInternalAccountingEntryState } from "@/state-hooks/use-internal-accounting-entry-state";
import { ArrowRightLeft } from "lucide-react";
import { useMemo } from "react";

type AccountingEntryAccountsBlockProps = {
	entry: TUseInternalAccountingEntryState["state"]["entry"];
	updateEntry: TUseInternalAccountingEntryState["updateEntry"];
};

export default function AccountingEntryAccountsBlock({ entry, updateEntry }: AccountingEntryAccountsBlockProps) {
	const { data: accountCharts } = useAccountCharts({ initialFilters: {} });

	const options = useMemo(
		() =>
			accountCharts?.map((chart) => ({
				id: chart.id,
				value: chart.id,
				label: `${chart.codigo ? `${chart.codigo} - ` : ""}${chart.nome}`,
			})) ?? [],
		[accountCharts],
	);

	return (
		<ResponsiveMenuSection title="CONTAS CONTÁBEIS" icon={<ArrowRightLeft className="h-4 w-4" />}>
			<SelectInput
				label="CONTA DE DÉBITO"
				value={entry.idContaDebito}
				options={options}
				resetOptionLabel="NÃO DEFINIDA"
				onReset={() => updateEntry({ idContaDebito: "" })}
				handleChange={(value) => updateEntry({ idContaDebito: value })}
				width="100%"
				required
			/>
			<SelectInput
				label="CONTA DE CRÉDITO"
				value={entry.idContaCredito}
				options={options}
				resetOptionLabel="NÃO DEFINIDA"
				onReset={() => updateEntry({ idContaCredito: "" })}
				handleChange={(value) => updateEntry({ idContaCredito: value })}
				width="100%"
				required
			/>
		</ResponsiveMenuSection>
	);
}
