import type { TFiscalDocumentLifecycleStatusEnum } from "@/schemas/enums";

type TSnapshotState = {
	statusInterno: TFiscalDocumentLifecycleStatusEnum;
	provedorProcessadoEm?: Date | null;
};

const IMMUTABLE_FINAL_STATUSES = new Set<TFiscalDocumentLifecycleStatusEnum>(["CANCELADO", "INUTILIZADO"]);
const PROVIDER_TERMINAL_STATUSES = new Set<TFiscalDocumentLifecycleStatusEnum>(["AUTORIZADO", "CANCELADO", "INUTILIZADO"]);

export function shouldApplyProviderSnapshot({ current, incoming }: { current: TSnapshotState; incoming: TSnapshotState }): boolean {
	if (IMMUTABLE_FINAL_STATUSES.has(current.statusInterno)) {
		return incoming.statusInterno === current.statusInterno;
	}
	if (current.statusInterno === "AUTORIZADO" && !["AUTORIZADO", "CANCELADO", "INUTILIZADO"].includes(incoming.statusInterno)) {
		return false;
	}
	// O provedor pode devolver timestamps com precisao diferente entre webhook e GET (por exemplo,
	// 21:38:05.680 vs 21:38:05). Uma transicao valida para estado terminal deve prevalecer sobre
	// essa diferenca subsegundo; os guards acima continuam impedindo regressao de finalizados.
	if (PROVIDER_TERMINAL_STATUSES.has(incoming.statusInterno) && incoming.statusInterno !== current.statusInterno) {
		return true;
	}
	if (current.provedorProcessadoEm && incoming.provedorProcessadoEm && incoming.provedorProcessadoEm < current.provedorProcessadoEm) {
		return false;
	}
	return true;
}

export function shouldReplaceActionableRejection({
	currentCode,
	incomingCode,
	incomingMessages,
}: {
	currentCode?: string | null;
	incomingCode?: string | null;
	incomingMessages: string[];
}): boolean {
	const hasUsefulDetail = Boolean(incomingCode || incomingMessages.length);
	if (!hasUsefulDetail) return false;
	// 217 e uma resposta secundaria de consulta (nota nao consta na SEFAZ), nao a causa
	// original que o operador precisa corrigir.
	if (incomingCode === "217" && currentCode && currentCode !== "217") return false;
	return true;
}
