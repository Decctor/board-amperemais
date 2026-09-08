import { useCallback, useState } from "react";
import { parseNumberInputText, sanitizeNumberInputText } from "@/lib/number-input";

export function useInternalSalesSessionCloseState() {
	const [state, setState] = useState({ contagem: "", observacoes: "", confirmarDiferenca: false });
	const updateCount = useCallback((value: string) => {
		setState((prev) => ({ ...prev, contagem: sanitizeNumberInputText(value), confirmarDiferenca: false }));
	}, []);
	const updateNotes = useCallback((observacoes: string) => setState((prev) => ({ ...prev, observacoes })), []);
	const confirmDifference = useCallback(() => setState((prev) => ({ ...prev, confirmarDiferenca: true })), []);
	const valorInformado = parseNumberInputText(state.contagem);
	return { state, valorInformado, updateCount, updateNotes, confirmDifference };
}
