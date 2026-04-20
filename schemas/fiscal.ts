import { z } from "zod";
import {
	FiscalClientTaxIndicatorEnum,
	FiscalDocumentEnvironmentEnum,
	FiscalDocumentEventTypeEnum,
	FiscalDocumentLifecycleStatusEnum,
	FiscalDocumentStatusEnum,
	FiscalDocumentTypeEnum,
	FiscalOperationConsumerPresenceEnum,
	FiscalOperationFinalityEnum,
	FiscalProductOriginEnum,
} from "./enums";

export const FiscalAddressSchema = z.object({
	logradouro: z.string({
		required_error: "Logradouro fiscal nao informado.",
		invalid_type_error: "Tipo nao valido para o logradouro fiscal.",
	}),
	numero: z.string({
		required_error: "Numero fiscal nao informado.",
		invalid_type_error: "Tipo nao valido para o numero fiscal.",
	}),
	complemento: z.string({ invalid_type_error: "Tipo nao valido para o complemento fiscal." }).optional().nullable(),
	bairro: z.string({
		required_error: "Bairro fiscal nao informado.",
		invalid_type_error: "Tipo nao valido para o bairro fiscal.",
	}),
	codigoMunicipio: z.string({
		required_error: "Codigo do municipio fiscal nao informado.",
		invalid_type_error: "Tipo nao valido para o codigo do municipio fiscal.",
	}),
	cidade: z.string({
		required_error: "Cidade fiscal nao informada.",
		invalid_type_error: "Tipo nao valido para a cidade fiscal.",
	}),
	uf: z.string({
		required_error: "UF fiscal nao informada.",
		invalid_type_error: "Tipo nao valido para a UF fiscal.",
	}),
	cep: z.string({
		required_error: "CEP fiscal nao informado.",
		invalid_type_error: "Tipo nao valido para o CEP fiscal.",
	}),
	codigoPais: z.string({ invalid_type_error: "Tipo nao valido para o codigo do pais fiscal." }).default("1058"),
	pais: z.string({ invalid_type_error: "Tipo nao valido para o pais fiscal." }).default("BRASIL"),
});
export type TFiscalAddress = z.infer<typeof FiscalAddressSchema>;

export const FiscalCertificateMetadataSchema = z.object({
	serialNumber: z.string({ invalid_type_error: "Tipo nao valido para o serial do certificado." }).optional().nullable(),
	issuerName: z.string({ invalid_type_error: "Tipo nao valido para a emissora do certificado." }).optional().nullable(),
	subjectName: z.string({ invalid_type_error: "Tipo nao valido para o assunto do certificado." }).optional().nullable(),
	thumbprint: z.string({ invalid_type_error: "Tipo nao valido para o thumbprint do certificado." }).optional().nullable(),
	validFrom: z
		.string({ invalid_type_error: "Tipo nao valido para a validade inicial do certificado." })
		.datetime({ message: "Tipo nao valido para a validade inicial do certificado." })
		.optional()
		.nullable(),
	validTo: z
		.string({ invalid_type_error: "Tipo nao valido para a validade final do certificado." })
		.datetime({ message: "Tipo nao valido para a validade final do certificado." })
		.optional()
		.nullable(),
	uploadedAt: z
		.string({ invalid_type_error: "Tipo nao valido para a data de upload do certificado." })
		.datetime({ message: "Tipo nao valido para a data de upload do certificado." })
		.optional()
		.nullable(),
});
export type TFiscalCertificateMetadata = z.infer<typeof FiscalCertificateMetadataSchema>;

export const NuvemFiscalApiConfigSchema = z.object({
	baseUrl: z.string({ invalid_type_error: "Tipo nao valido para a URL base da Nuvem Fiscal." }).default("https://api.nuvemfiscal.com.br"),
	apiToken: z.string({ invalid_type_error: "Tipo nao valido para o token da Nuvem Fiscal." }).optional().nullable(),
});
export type TNuvemFiscalApiConfig = z.infer<typeof NuvemFiscalApiConfigSchema>;

export const OrganizationFiscalConfigSchema = z.object({
	ambiente: FiscalDocumentEnvironmentEnum.default("HOMOLOGACAO"),
	regimeTributario: z
		.number({
			required_error: "Regime tributario nao informado.",
			invalid_type_error: "Tipo nao valido para o regime tributario.",
		})
		.int()
		.min(1)
		.max(4),
	emailFiscal: z.string({ invalid_type_error: "Tipo nao valido para o email fiscal." }).email("Email fiscal invalido.").optional().nullable(),
	telefoneFiscal: z.string({ invalid_type_error: "Tipo nao valido para o telefone fiscal." }).optional().nullable(),
	nomeRazaoSocial: z.string({
		required_error: "Razao social fiscal nao informada.",
		invalid_type_error: "Tipo nao valido para a razao social fiscal.",
	}),
	nomeFantasia: z.string({ invalid_type_error: "Tipo nao valido para o nome fantasia fiscal." }).optional().nullable(),
	cpfCnpj: z.string({
		required_error: "CPF/CNPJ fiscal nao informado.",
		invalid_type_error: "Tipo nao valido para o CPF/CNPJ fiscal.",
	}),
	inscricaoEstadual: z.string({ invalid_type_error: "Tipo nao valido para a inscricao estadual." }).optional().nullable(),
	inscricaoMunicipal: z.string({ invalid_type_error: "Tipo nao valido para a inscricao municipal." }).optional().nullable(),
	cnae: z.string({ invalid_type_error: "Tipo nao valido para o CNAE fiscal." }).optional().nullable(),
	endereco: FiscalAddressSchema,
	nuvemFiscal: z
		.object({
			api: NuvemFiscalApiConfigSchema.default({ baseUrl: "https://api.nuvemfiscal.com.br" }),
			certificado: FiscalCertificateMetadataSchema.default({}),
			nfce: z.object({
				idCsc: z.number({ invalid_type_error: "Tipo nao valido para o ID CSC da NFC-e." }).int().optional().nullable(),
				csc: z.string({ invalid_type_error: "Tipo nao valido para o CSC da NFC-e." }).optional().nullable(),
			}),
			nfe: z.object({}).default({}),
		})
		.default({
			// api: { baseUrl: "https://api.nuvemfiscal.com.br" },
			api: { baseUrl: "https://api.sandbox.nuvemfiscal.com.br" },
			certificado: {},
			nfce: {},
			nfe: {},
		}),
	operacaoPadraoPorTipo: z
		.object({
			NFCE: z.string({ invalid_type_error: "Tipo nao valido para a operacao padrao da NFC-e." }).optional().nullable(),
			NFE: z.string({ invalid_type_error: "Tipo nao valido para a operacao padrao da NF-e." }).optional().nullable(),
		})
		.default({ NFCE: null, NFE: null }),
});
export type TOrganizationFiscalConfig = z.infer<typeof OrganizationFiscalConfigSchema>;

export const FiscalSeriesSchema = z.object({
	organizacaoId: z.string({
		required_error: "ID da organizacao nao informado.",
		invalid_type_error: "Tipo nao valido para o ID da organizacao.",
	}),
	tipoDocumento: FiscalDocumentTypeEnum,
	ambiente: FiscalDocumentEnvironmentEnum.default("HOMOLOGACAO"),
	serie: z.string({
		required_error: "Serie fiscal nao informada.",
		invalid_type_error: "Tipo nao valido para a serie fiscal.",
	}),
	proximoNumero: z.number({
		required_error: "Proximo numero fiscal nao informado.",
		invalid_type_error: "Tipo nao valido para o proximo numero fiscal.",
	}),
	ativo: z.boolean({ invalid_type_error: "Tipo nao valido para o status da serie fiscal." }).default(true),
	dataInsercao: z
		.string({ invalid_type_error: "Tipo nao valido para a data de insercao da serie fiscal." })
		.datetime({ message: "Tipo nao valido para a data de insercao da serie fiscal." })
		.default(new Date().toISOString())
		.transform((val) => new Date(val)),
});
export type TFiscalSeries = z.infer<typeof FiscalSeriesSchema>;

export const FiscalOperationProfileSchema = z.object({
	organizacaoId: z.string({
		required_error: "ID da organizacao nao informado.",
		invalid_type_error: "Tipo nao valido para o ID da organizacao.",
	}),
	nome: z.string({
		required_error: "Nome da operacao fiscal nao informado.",
		invalid_type_error: "Tipo nao valido para o nome da operacao fiscal.",
	}),
	descricao: z.string({ invalid_type_error: "Tipo nao valido para a descricao da operacao fiscal." }).optional().nullable(),
	tipoDocumento: FiscalDocumentTypeEnum,
	finalidade: FiscalOperationFinalityEnum.default("NORMAL"),
	presencaConsumidor: FiscalOperationConsumerPresenceEnum.default("OPERACAO_PRESENCIAL"),
	consumidorFinal: z.boolean({ invalid_type_error: "Tipo nao valido para consumidor final." }).default(true),
	cfopPadrao: z.string({
		required_error: "CFOP padrao nao informado.",
		invalid_type_error: "Tipo nao valido para o CFOP padrao.",
	}),
	naturezaOperacao: z.string({
		required_error: "Natureza da operacao nao informada.",
		invalid_type_error: "Tipo nao valido para a natureza da operacao.",
	}),
	seriePadraoId: z.string({ invalid_type_error: "Tipo nao valido para o ID da serie padrao." }).optional().nullable(),
	ativo: z.boolean({ invalid_type_error: "Tipo nao valido para o status da operacao fiscal." }).default(true),
	dataInsercao: z
		.string({ invalid_type_error: "Tipo nao valido para a data de insercao da operacao fiscal." })
		.datetime({ message: "Tipo nao valido para a data de insercao da operacao fiscal." })
		.default(new Date().toISOString())
		.transform((val) => new Date(val)),
});
export type TFiscalOperationProfile = z.infer<typeof FiscalOperationProfileSchema>;

export const ProductFiscalProfileSchema = z.object({
	organizacaoId: z.string({
		required_error: "ID da organizacao nao informado.",
		invalid_type_error: "Tipo nao valido para o ID da organizacao.",
	}),
	produtoId: z.string({
		required_error: "ID do produto nao informado.",
		invalid_type_error: "Tipo nao valido para o ID do produto.",
	}),
	produtoVarianteId: z.string({ invalid_type_error: "Tipo nao valido para o ID da variante do produto." }).optional().nullable(),
	origemMercadoria: FiscalProductOriginEnum.default("NACIONAL"),
	ncm: z.string({
		required_error: "NCM fiscal nao informado.",
		invalid_type_error: "Tipo nao valido para o NCM fiscal.",
	}),
	cest: z.string({ invalid_type_error: "Tipo nao valido para o CEST fiscal." }).optional().nullable(),
	cfopPadrao: z.string({ invalid_type_error: "Tipo nao valido para o CFOP padrao do produto." }).optional().nullable(),
	unidadeComercial: z.string({ invalid_type_error: "Tipo nao valido para a unidade comercial." }).default("UN"),
	codigoBeneficioFiscal: z.string({ invalid_type_error: "Tipo nao valido para o codigo de beneficio fiscal." }).optional().nullable(),
	ativo: z.boolean({ invalid_type_error: "Tipo nao valido para o status do perfil fiscal do produto." }).default(true),
	dataInsercao: z
		.string({ invalid_type_error: "Tipo nao valido para a data de insercao do perfil fiscal." })
		.datetime({ message: "Tipo nao valido para a data de insercao do perfil fiscal." })
		.default(new Date().toISOString())
		.transform((val) => new Date(val)),
});
export type TProductFiscalProfile = z.infer<typeof ProductFiscalProfileSchema>;

export const FiscalDocumentSchema = z.object({
	organizacaoId: z.string({
		required_error: "ID da organizacao nao informado.",
		invalid_type_error: "Tipo nao valido para o ID da organizacao.",
	}),
	vendaId: z.string({ invalid_type_error: "Tipo nao valido para o ID da venda." }).optional().nullable(),
	compraId: z.string({ invalid_type_error: "Tipo nao valido para o ID da compra." }).optional().nullable(),
	lancamentoContabilId: z.string({ invalid_type_error: "Tipo nao valido para o ID do lancamento contabil." }).optional().nullable(),
	tipo: FiscalDocumentTypeEnum,
	status: FiscalDocumentStatusEnum.default("PENDENTE"),
	statusInterno: FiscalDocumentLifecycleStatusEnum.default("RASCUNHO"),
	ambiente: FiscalDocumentEnvironmentEnum.default("HOMOLOGACAO"),
	referencia: z.string({
		required_error: "Referencia fiscal nao informada.",
		invalid_type_error: "Tipo nao valido para a referencia fiscal.",
	}),
	provedor: z.string({ invalid_type_error: "Tipo nao valido para o provedor fiscal." }).optional().nullable(),
	provedorDocumentoId: z.string({ invalid_type_error: "Tipo nao valido para o ID externo do documento fiscal." }).optional().nullable(),
	provedorStatus: z.string({ invalid_type_error: "Tipo nao valido para o status externo do documento fiscal." }).optional().nullable(),
	chaveAcesso: z.string({ invalid_type_error: "Tipo nao valido para a chave de acesso." }).optional().nullable(),
	numero: z.string({ invalid_type_error: "Tipo nao valido para o numero do documento." }).optional().nullable(),
	serie: z.string({ invalid_type_error: "Tipo nao valido para a serie do documento." }).optional().nullable(),
	protocolo: z.string({ invalid_type_error: "Tipo nao valido para o protocolo do documento." }).optional().nullable(),
	mensagens: z.array(z.unknown(), { invalid_type_error: "Tipo nao valido para as mensagens fiscais." }).default([]),
	snapshotOrigemVenda: z.record(z.any()).optional().nullable(),
	provedorPayload: z.record(z.any()).optional().nullable(),
	provedorRetorno: z.record(z.any()).optional().nullable(),
	xmlStoragePath: z.string({ invalid_type_error: "Tipo nao valido para o path do XML." }).optional().nullable(),
	pdfStoragePath: z.string({ invalid_type_error: "Tipo nao valido para o path do PDF." }).optional().nullable(),
	tentativasEnvio: z.number({ invalid_type_error: "Tipo nao valido para o numero de tentativas de envio." }).default(0),
	dataUltimaSincronizacao: z
		.string({ invalid_type_error: "Tipo nao valido para a ultima sincronizacao." })
		.datetime({ message: "Tipo nao valido para a ultima sincronizacao." })
		.optional()
		.nullable()
		.transform((val) => (val ? new Date(val) : null)),
	dataAutorizacao: z
		.string({ invalid_type_error: "Tipo nao valido para a data de autorizacao." })
		.datetime({ message: "Tipo nao valido para a data de autorizacao." })
		.optional()
		.nullable()
		.transform((val) => (val ? new Date(val) : null)),
	dataCancelamento: z
		.string({ invalid_type_error: "Tipo nao valido para a data de cancelamento." })
		.datetime({ message: "Tipo nao valido para a data de cancelamento." })
		.optional()
		.nullable()
		.transform((val) => (val ? new Date(val) : null)),
	dataEmissao: z
		.string({ invalid_type_error: "Tipo nao valido para a data de emissao." })
		.datetime({ message: "Tipo nao valido para a data de emissao." })
		.optional()
		.nullable()
		.transform((val) => (val ? new Date(val) : null)),
	dataInsercao: z
		.string({ invalid_type_error: "Tipo nao valido para a data de insercao do documento fiscal." })
		.datetime({ message: "Tipo nao valido para a data de insercao do documento fiscal." })
		.default(new Date().toISOString())
		.transform((val) => new Date(val)),
});
export type TFiscalDocument = z.infer<typeof FiscalDocumentSchema>;

export const FiscalDocumentEventSchema = z.object({
	documentoFiscalId: z.string({
		required_error: "ID do documento fiscal nao informado.",
		invalid_type_error: "Tipo nao valido para o ID do documento fiscal.",
	}),
	tipo: FiscalDocumentEventTypeEnum,
	descricao: z.string({ invalid_type_error: "Tipo nao valido para a descricao do evento fiscal." }).optional().nullable(),
	payload: z.record(z.any()).optional().nullable(),
	autorId: z.string({ invalid_type_error: "Tipo nao valido para o ID do autor do evento fiscal." }).optional().nullable(),
	dataInsercao: z
		.string({ invalid_type_error: "Tipo nao valido para a data de insercao do evento fiscal." })
		.datetime({ message: "Tipo nao valido para a data de insercao do evento fiscal." })
		.default(new Date().toISOString())
		.transform((val) => new Date(val)),
});
export type TFiscalDocumentEvent = z.infer<typeof FiscalDocumentEventSchema>;

export const FiscalClientProfileSchema = z.object({
	inscricaoEstadual: z.string({ invalid_type_error: "Tipo nao valido para a inscricao estadual do cliente." }).optional().nullable(),
	indicadorInscricaoEstadual: FiscalClientTaxIndicatorEnum.default("NAO_CONTRIBUINTE"),
	suframa: z.string({ invalid_type_error: "Tipo nao valido para a SUFRAMA do cliente." }).optional().nullable(),
});
export type TFiscalClientProfile = z.infer<typeof FiscalClientProfileSchema>;
