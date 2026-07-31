import { Button } from "@/components/ui/button";
import { Loader2, Save, Undo2 } from "lucide-react";

type SettingsSectionActionsProps = {
	onReset: () => void;
	onSave: () => void;
	isSaving: boolean;
};

/** Salvar e restaurar de uma seção só, sobre os campos que ela realmente possui. */
export default function SettingsSectionActions({ onReset, onSave, isSaving }: SettingsSectionActionsProps) {
	return (
		<div className="flex items-center justify-end gap-2">
			<Button variant="ghost" size="sm" className="flex items-center gap-2" onClick={onReset} disabled={isSaving}>
				<Undo2 className="h-4 w-4" />
				RESTAURAR
			</Button>
			<Button size="sm" className="flex items-center gap-2" onClick={onSave} disabled={isSaving}>
				{isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
				SALVAR
			</Button>
		</div>
	);
}
