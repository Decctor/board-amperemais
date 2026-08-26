import type { TFiscalDocumentTypeEnum, TFiscalOperationConsumerPresenceEnum } from "@/schemas/enums";

export type TAutoDocumentTypeSignals = {
	canal?: string | null;
	entregaModalidade?: string | null;
	destinatarioCpfCnpj?: string | null;
};

export type TFiscalOperationProfileSignals = Pick<TAutoDocumentTypeSignals, "canal" | "entregaModalidade"> & {
	// O modelo do documento muda o indPres aceitavel para a mesma modalidade de entrega.
	tipoDocumento?: Extract<TFiscalDocumentTypeEnum, "NFCE" | "NFE"> | null;
};

// Deriva candidatos de presenca do consumidor (indPres) a partir da modalidade/canal da venda.
// A ordem do array define prioridade na busca do perfil fiscal compativel.
export function resolveExpectedConsumerPresenceCandidates({
	canal,
	entregaModalidade,
	tipoDocumento,
}: TFiscalOperationProfileSignals): TFiscalOperationConsumerPresenceEnum[] {
	const modalidade = (entregaModalidade ?? "PRESENCIAL").toUpperCase();
	const canalUpper = (canal ?? "").toUpperCase();

	switch (modalidade) {
		case "ENTREGA":
			// indPres=4 ("NFC-e em operacao com entrega a domicilio") e exclusivo do modelo 65 —
			// a SEFAZ rejeita NF-e que o use (rejeicao 794). Numa venda online com entrega, a NF-e
			// e operacao nao presencial pela internet (indPres=2). O ENTREGA_DOMICILIO segue como
			// fallback para nao quebrar a resolucao de quem so tem esse perfil cadastrado.
			return tipoDocumento === "NFE" ? ["INTERNET", "ENTREGA_DOMICILIO"] : ["ENTREGA_DOMICILIO"];
		case "COMANDA":
		case "PRESENCIAL":
			return ["OPERACAO_PRESENCIAL"];
		case "RETIRADA":
			return canalUpper === "SHOP" ? ["INTERNET", "OPERACAO_PRESENCIAL"] : ["OPERACAO_PRESENCIAL"];
		default:
			return ["OPERACAO_PRESENCIAL"];
	}
}

// Regra pura de selecao do tipo de documento na auto-emissao.
// B2B (destinatario com CNPJ), canal SHOP ou venda com entrega → NF-e; caso contrario → NFC-e.
export function resolveAutoDocumentType({
	canal,
	entregaModalidade,
	destinatarioCpfCnpj,
}: TAutoDocumentTypeSignals): Extract<TFiscalDocumentTypeEnum, "NFCE" | "NFE"> {
	const cpfCnpjDigits = (destinatarioCpfCnpj ?? "").replace(/\D/g, "");
	if (cpfCnpjDigits.length > 11) return "NFE";
	if ((canal ?? "").toUpperCase() === "SHOP") return "NFE";
	if ((entregaModalidade ?? "").toUpperCase() === "ENTREGA") return "NFE";
	return "NFCE";
}

export const FISCAL_CONSUMER_PRESENCE_LABELS: Record<TFiscalOperationConsumerPresenceEnum, string> = {
	NAO_SE_APLICA: "NAO SE APLICA",
	OPERACAO_PRESENCIAL: "PRESENCIAL",
	INTERNET: "INTERNET",
	TELEATENDIMENTO: "TELEATENDIMENTO",
	ENTREGA_DOMICILIO: "ENTREGA A DOMICILIO",
};

export function formatMissingOperationProfileMessage({
	tipoDocumento,
	candidates,
	entregaModalidade,
}: {
	tipoDocumento: Extract<TFiscalDocumentTypeEnum, "NFCE" | "NFE">;
	candidates: TFiscalOperationConsumerPresenceEnum[];
	entregaModalidade?: string | null;
}) {
	const presencas = candidates.map((candidate) => FISCAL_CONSUMER_PRESENCE_LABELS[candidate]).join(" ou ");
	return `Perfil fiscal ${tipoDocumento} com presença ${presencas} não configurado para modalidade ${(entregaModalidade ?? "PRESENCIAL").toUpperCase()}.`;
}
