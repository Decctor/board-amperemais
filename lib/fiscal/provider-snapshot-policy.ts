import type { TFiscalDocumentLifecycleStatusEnum } from "@/schemas/enums";

type TSnapshotState = {
	statusInterno: TFiscalDocumentLifecycleStatusEnum;
	provedorProcessadoEm?: Date | null;
};

const IMMUTABLE_FINAL_STATUSES = new Set<TFiscalDocumentLifecycleStatusEnum>(["CANCELADO", "INUTILIZADO"]);

export function shouldApplyProviderSnapshot({
	current,
	incoming,
}: {
	current: TSnapshotState;
	incoming: TSnapshotState;
}): boolean {
	if (IMMUTABLE_FINAL_STATUSES.has(current.statusInterno)) {
		return incoming.statusInterno === current.statusInterno;
	}
	if (
		current.statusInterno === "AUTORIZADO" &&
		!["AUTORIZADO", "CANCELADO", "INUTILIZADO"].includes(incoming.statusInterno)
	) {
		return false;
	}
	if (
		current.provedorProcessadoEm &&
		incoming.provedorProcessadoEm &&
		incoming.provedorProcessadoEm < current.provedorProcessadoEm
	) {
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
