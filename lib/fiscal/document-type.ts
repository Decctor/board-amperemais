import type { TFiscalDocumentTypeEnum } from "@/schemas/enums";
import { findDefaultOperationProfileForType } from "./settings";
import { resolveAutoDocumentType, type TAutoDocumentTypeSignals } from "./sale-fiscal-signals";

export type { TAutoDocumentTypeSignals, TFiscalOperationProfileSignals } from "./sale-fiscal-signals";
export { resolveAutoDocumentType, resolveExpectedConsumerPresenceCandidates } from "./sale-fiscal-signals";

// Resolve o tipo considerando a configuracao da organizacao: se a NF-e for preferida mas nao houver
// operacao fiscal configurada para NF-e, cai para NFC-e (default seguro do varejo).
export async function resolveEmissionDocumentType({
	organizacaoId,
	operacaoPadraoNfeId,
	signals,
}: {
	organizacaoId: string;
	operacaoPadraoNfeId?: string | null;
	signals: TAutoDocumentTypeSignals;
}): Promise<Extract<TFiscalDocumentTypeEnum, "NFCE" | "NFE">> {
	const preferred = resolveAutoDocumentType(signals);
	if (preferred === "NFCE") return "NFCE";

	const nfeProfile = await findDefaultOperationProfileForType({
		organizacaoId,
		tipoDocumento: "NFE",
		profileId: operacaoPadraoNfeId ?? null,
	});
	return nfeProfile ? "NFE" : "NFCE";
}
