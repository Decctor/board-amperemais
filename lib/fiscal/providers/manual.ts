import type {
	IFiscalProvider,
	TCancelDocumentInput,
	TFiscalCorrectionInput,
	TFiscalInutilizationInput,
	TProviderCompanyCertificateSyncInput,
	TProviderCompanyCertificateSyncResult,
	TProviderCompanySyncResult,
	TProviderCorrectionResult,
	TProviderDocumentDetails,
	TProviderInutilizationResult,
	TFiscalOrganization,
	TFiscalSaleContext,
} from "../types";
import type { TFiscalDocument } from "@/services/drizzle/schema";

export class ManualFiscalProvider implements IFiscalProvider {
	async emitirDocumento(_context: TFiscalSaleContext, documento: TFiscalDocument): Promise<TProviderDocumentDetails> {
		return {
			id: documento.id,
			status: "PENDENTE",
			statusInterno: "PRONTO_PARA_ENVIO",
			ambiente: documento.ambiente,
			chaveAcesso: documento.chaveAcesso,
			numero: documento.numero,
			serie: documento.serie,
			protocolo: documento.protocolo,
		};
	}

	async consultarDocumento(documento: TFiscalDocument): Promise<TProviderDocumentDetails> {
		return {
			id: documento.provedorDocumentoId ?? documento.id,
			status: documento.status,
			statusInterno: documento.statusInterno,
			ambiente: documento.ambiente,
			chaveAcesso: documento.chaveAcesso,
			numero: documento.numero,
			serie: documento.serie,
			protocolo: documento.protocolo,
		};
	}

	async sincronizarDocumento(documento: TFiscalDocument): Promise<TProviderDocumentDetails> {
		return this.consultarDocumento(documento);
	}

	async cancelarDocumento(_input: TCancelDocumentInput, documento: TFiscalDocument): Promise<TProviderDocumentDetails> {
		return {
			id: documento.provedorDocumentoId ?? documento.id,
			status: "CANCELADA",
			statusInterno: "CANCELADO",
			ambiente: documento.ambiente,
			chaveAcesso: documento.chaveAcesso,
			numero: documento.numero,
			serie: documento.serie,
			protocolo: documento.protocolo,
			dataCancelamento: new Date(),
		};
	}

	async cartaCorrecaoDocumento(input: TFiscalCorrectionInput): Promise<TProviderCorrectionResult> {
		return { sequenciaEvento: 1, protocolo: null, dataEvento: new Date(), mensagens: [`Carta de correcao registrada (manual): ${input.correcao}`] };
	}

	async inutilizarNumeracao(input: TFiscalInutilizationInput): Promise<TProviderInutilizationResult> {
		return { status: "INUTILIZADA", protocolo: null, dataEvento: new Date(), mensagens: [`Inutilizacao registrada (manual): ${input.justificativa}`] };
	}

	async baixarXml(): Promise<ArrayBuffer | null> {
		return null;
	}

	async baixarPdf(): Promise<ArrayBuffer | null> {
		return null;
	}

	async sincronizarEmpresa(organizacao: TFiscalOrganization): Promise<TProviderCompanySyncResult> {
		return {
			cpfCnpj: organizacao.fiscalConfiguracao?.cpfCnpj ?? organizacao.cnpj,
			sincronizado: true,
		};
	}

	async sincronizarCertificadoEmpresa(
		organizacao: TFiscalOrganization,
		_input: TProviderCompanyCertificateSyncInput,
	): Promise<TProviderCompanyCertificateSyncResult> {
		return {
			cpfCnpj: organizacao.fiscalConfiguracao?.cpfCnpj ?? organizacao.cnpj,
			sincronizado: true,
			certificado: {
				providerManaged: true,
				uploadedAt: new Date().toISOString(),
			},
		};
	}
}
