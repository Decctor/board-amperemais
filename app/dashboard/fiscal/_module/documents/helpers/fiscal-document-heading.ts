import type { TGetFiscalDocumentsOutputById } from "@/app/api/fiscal/documents/route";
import { formatDateAsLocale } from "@/lib/formatting";
import { formatFiscalDocumentTypeLabel } from "./fiscal-document-action-state";

type TFiscalDocumentHeadingSource = TGetFiscalDocumentsOutputById["document"];

function describeDocumentMoment(document: TFiscalDocumentHeadingSource) {
	const at = (label: string, date: Date | string | null | undefined) => {
		const formatted = date ? formatDateAsLocale(date, true) : null;
		return formatted ? `${label} em ${formatted}` : null;
	};
	switch (document.statusInterno) {
		case "AUTORIZADO":
			return at("Autorizada", document.dataAutorizacao) ?? at("Emitida", document.dataEmissao);
		case "CANCELADO":
		case "CANCELAMENTO_PENDENTE":
			return at("Cancelada", document.dataCancelamento) ?? at("Autorizada", document.dataAutorizacao);
		case "INUTILIZADO":
			return at("Numeração inutilizada", document.dataCancelamento) ?? at("Criada", document.dataInsercao);
		default:
			return at("Criada", document.dataInsercao);
	}
}

/**
 * Titulo e descricao da pagina: o documento se apresenta pelo numero, e a descricao diz serie,
 * ambiente e o momento que define o estado atual. Nada disso se repete no corpo.
 */
export function buildFiscalDocumentHeading(document: TFiscalDocumentHeadingSource) {
	const typeLabel = formatFiscalDocumentTypeLabel(document.tipo);
	const title = document.numero ? `${typeLabel} nº ${document.numero}` : `${typeLabel} sem número`;
	const parts: string[] = [];
	if (document.serie) parts.push(`Série ${document.serie}`);
	parts.push(document.ambiente === "HOMOLOGACAO" ? "Homologação" : "Produção");
	const moment = describeDocumentMoment(document);
	if (moment) parts.push(moment);
	return { title, description: parts.join(" · ") };
}
