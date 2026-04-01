import type { IFiscalProvider } from "@/lib/fiscal/types";
import { syncNuvemFiscalCompany } from "./company";
import { nuvemFiscalDocumentMethods } from "./documents";

export class NuvemFiscalProvider implements IFiscalProvider {
	emitirDocumento = nuvemFiscalDocumentMethods.emitirDocumento;
	consultarDocumento = nuvemFiscalDocumentMethods.consultarDocumento;
	sincronizarDocumento = nuvemFiscalDocumentMethods.sincronizarDocumento;
	cancelarDocumento = nuvemFiscalDocumentMethods.cancelarDocumento;
	baixarXml = nuvemFiscalDocumentMethods.baixarXml;
	baixarPdf = nuvemFiscalDocumentMethods.baixarPdf;
	sincronizarEmpresa = syncNuvemFiscalCompany;
}
