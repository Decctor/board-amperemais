import type {
	TFiscalDocumentEnvironmentEnum,
	TFiscalDocumentLifecycleStatusEnum,
	TFiscalDocumentStatusEnum,
	TFiscalDocumentTypeEnum,
} from "@/schemas/enums";
import type { TOrganizationFiscalConfig } from "@/schemas/organizations";
import type {
	TOrganizationEntity,
	TFiscalDocument,
	TFiscalOperationProfileEntity,
	TFiscalSeriesEntity,
	TProductFiscalProfileEntity,
} from "@/services/drizzle/schema";
import type { TClientEntity } from "@/services/drizzle/schema/clients";
import type { TSaleEntity, TSaleItemEntity } from "@/services/drizzle/schema/sales";
import type { TFiscalTaxGroupWithRules } from "./engine";

export type TSaleForFiscal = TSaleEntity & {
	itens: TSaleItemEntity[];
	cliente?: TClientEntity | null;
	entregaLocalizacao?: {
		localizacaoCep: string | null;
		localizacaoEstado: string | null;
		localizacaoCidade: string | null;
		localizacaoBairro: string | null;
		localizacaoLogradouro: string | null;
		localizacaoNumero: string | null;
		localizacaoComplemento: string | null;
	} | null;
};

export type TFiscalOrganization = TOrganizationEntity & {
	fiscalConfiguracao: TOrganizationFiscalConfig | null;
};

export type TFiscalSaleContext = {
	venda: TSaleForFiscal;
	organizacao: TFiscalOrganization;
	serie: TFiscalSeriesEntity;
	operacao: TFiscalOperationProfileEntity;
	perfisProdutos: TProductFiscalProfileEntity[];
	gruposTributarios: TFiscalTaxGroupWithRules[];
	destinatarioSnapshot: Record<string, unknown> | null;
};

export type TEmitirDocumentoInput = {
	vendaId: string;
	tipo: Extract<TFiscalDocumentTypeEnum, "NFCE" | "NFE">;
	organizacaoId: string;
	lancamentoContabilId?: string | null;
	autorId?: string | null;
	origem: "AUTOMATICA" | "MANUAL";
};

export type TEmitirDocumentoResult = {
	documentoId: string;
	status: TFiscalDocumentStatusEnum;
	statusInterno: TFiscalDocumentLifecycleStatusEnum;
	chaveAcesso?: string | null;
	numero?: string | null;
	serie?: string | null;
	protocolo?: string | null;
};

export type TCancelDocumentInput = {
	organizationId: string;
	documentId: string;
	reason: string;
	authorId?: string | null;
};

export type TCancelDocumentResult = {
	documentoId: string;
	status: TFiscalDocumentStatusEnum;
	statusInterno: TFiscalDocumentLifecycleStatusEnum;
};

export type TSyncDocumentInput = {
	organizationId: string;
	documentId: string;
	authorId?: string | null;
};

export type TSyncDocumentResult = {
	documentoId: string;
	status: TFiscalDocumentStatusEnum;
	statusInterno: TFiscalDocumentLifecycleStatusEnum;
};

export type TDownloadFiscalAssetInput = {
	documento: TFiscalDocument;
	asset: "xml" | "pdf";
};

export type TProviderCompanySyncResult = {
	cpfCnpj: string;
	sincronizado: boolean;
};

export type TProviderCompanyCertificateSyncInput = {
	storagePath: string;
	password: string;
};

export type TProviderCompanyCertificateSyncResult = {
	cpfCnpj: string;
	sincronizado: boolean;
	certificado: {
		storagePath: string;
		serialNumber?: string | null;
		issuerName?: string | null;
		subjectName?: string | null;
		thumbprint?: string | null;
		validFrom?: string | null;
		validTo?: string | null;
		uploadedAt: string;
	};
};

export type TProviderDocumentDetails = {
	id: string;
	status: TFiscalDocumentStatusEnum;
	statusInterno: TFiscalDocumentLifecycleStatusEnum;
	ambiente: TFiscalDocumentEnvironmentEnum;
	chaveAcesso?: string | null;
	numero?: string | null;
	serie?: string | null;
	protocolo?: string | null;
	dataEmissao?: Date | null;
	dataAutorizacao?: Date | null;
	dataCancelamento?: Date | null;
	mensagens?: unknown[];
	provedorPayload?: Record<string, unknown> | null;
	provedorRetorno?: Record<string, unknown> | null;
};

export interface IFiscalProvider {
	emitirDocumento(context: TFiscalSaleContext, documento: TFiscalDocument): Promise<TProviderDocumentDetails>;
	consultarDocumento(documento: TFiscalDocument, organizacao: TFiscalOrganization): Promise<TProviderDocumentDetails>;
	sincronizarDocumento(documento: TFiscalDocument, organizacao: TFiscalOrganization): Promise<TProviderDocumentDetails>;
	cancelarDocumento(input: TCancelDocumentInput, documento: TFiscalDocument, organizacao: TFiscalOrganization): Promise<TProviderDocumentDetails>;
	baixarXml(documento: TFiscalDocument, organizacao: TFiscalOrganization): Promise<ArrayBuffer | null>;
	baixarPdf(documento: TFiscalDocument, organizacao: TFiscalOrganization): Promise<ArrayBuffer | null>;
	sincronizarEmpresa(organizacao: TFiscalOrganization): Promise<TProviderCompanySyncResult>;
	sincronizarCertificadoEmpresa(
		organizacao: TFiscalOrganization,
		input: TProviderCompanyCertificateSyncInput,
	): Promise<TProviderCompanyCertificateSyncResult>;
}
