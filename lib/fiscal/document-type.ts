import type { TFiscalDocumentTypeEnum } from "@/schemas/enums";
import { findDefaultOperationProfileForType } from "./settings";

export type TAutoDocumentTypeSignals = {
	canal?: string | null;
	entregaModalidade?: string | null;
	destinatarioCpfCnpj?: string | null;
};

// Regra pura de selecao do tipo de documento na auto-emissao.
// B2B (destinatario com CNPJ), canal SHOP ou venda com entrega → NF-e; caso contrario → NFC-e.
export function resolveAutoDocumentType({ canal, entregaModalidade, destinatarioCpfCnpj }: TAutoDocumentTypeSignals): Extract<TFiscalDocumentTypeEnum, "NFCE" | "NFE"> {
	const cpfCnpjDigits = (destinatarioCpfCnpj ?? "").replace(/\D/g, "");
	if (cpfCnpjDigits.length > 11) return "NFE";
	if ((canal ?? "").toUpperCase() === "SHOP") return "NFE";
	if ((entregaModalidade ?? "").toUpperCase() === "ENTREGA") return "NFE";
	return "NFCE";
}

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
