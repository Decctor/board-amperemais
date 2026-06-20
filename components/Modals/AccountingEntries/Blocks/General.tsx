"use client";

import DateInput from "@/components/Inputs/DateInput";
import TextInput from "@/components/Inputs/TextInput";
import TextareaInput from "@/components/Inputs/TextareaInput";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { formatDateForInputValue, formatDateOnInputChange } from "@/lib/formatting";
import type { TUseInternalAccountingEntryState } from "@/state-hooks/use-internal-accounting-entry-state";
import { BookOpen } from "lucide-react";

type AccountingEntryGeneralBlockProps = {
	entry: TUseInternalAccountingEntryState["state"]["entry"];
	updateEntry: TUseInternalAccountingEntryState["updateEntry"];
	titleEditable?: boolean;
	competenceEditable?: boolean;
	annotationsEditable?: boolean;
};

export default function AccountingEntryGeneralBlock({
	entry,
	updateEntry,
	titleEditable = true,
	competenceEditable = true,
	annotationsEditable = true,
}: AccountingEntryGeneralBlockProps) {
	return (
		<ResponsiveMenuSection title="INFORMAÇÕES GERAIS" icon={<BookOpen className="h-4 w-4" />}>
			<TextInput
				label="TÍTULO"
				placeholder="Preencha o título do lançamento contábil..."
				value={entry.titulo}
				handleChange={(value) => updateEntry({ titulo: value })}
				required
				editable={titleEditable}
			/>
			<DateInput
				label="DATA DE COMPETÊNCIA"
				value={formatDateForInputValue(entry.dataCompetencia)}
				handleChange={(value) => updateEntry({ dataCompetencia: formatDateOnInputChange(value, "date") ?? entry.dataCompetencia })}
				width="100%"
				required
				editable={competenceEditable}
			/>
			<TextareaInput
				label="ANOTAÇÕES"
				placeholder="Preencha observações úteis para o lançamento..."
				value={entry.anotacoes ?? ""}
				handleChange={(value) => updateEntry({ anotacoes: value })}
				editable={annotationsEditable}
			/>
		</ResponsiveMenuSection>
	);
}
