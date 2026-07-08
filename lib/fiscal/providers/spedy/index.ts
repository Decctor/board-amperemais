import type { IFiscalProvider } from "@/lib/fiscal/types";
import { syncSpedyCompany, syncSpedyCompanyCertificate } from "./company";
import { spedyDocumentMethods } from "./documents";

export class SpedyFiscalProvider implements IFiscalProvider {
	emitirDocumento = spedyDocumentMethods.emitirDocumento;
	consultarDocumento = spedyDocumentMethods.consultarDocumento;
	sincronizarDocumento = spedyDocumentMethods.sincronizarDocumento;
	cancelarDocumento = spedyDocumentMethods.cancelarDocumento;
	cartaCorrecaoDocumento = spedyDocumentMethods.cartaCorrecaoDocumento;
	inutilizarNumeracao = spedyDocumentMethods.inutilizarNumeracao;
	baixarXml = spedyDocumentMethods.baixarXml;
	baixarPdf = spedyDocumentMethods.baixarPdf;
	sincronizarEmpresa = syncSpedyCompany;
	sincronizarCertificadoEmpresa = syncSpedyCompanyCertificate;
}
