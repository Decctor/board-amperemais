import z from "zod";
import { OrganizationIntegrationTypeEnum } from "./enums";

export const OrganizationIntegrationConfigSchema = z.discriminatedUnion("tipo", [
	z.object({
		tipo: z.literal("ONLINE-SOFTWARE"),
		token: z.string({ invalid_type_error: "Tipo não válido para o token da integração." }),
	}),
]);
export type TOrganizationIntegrationConfig = z.infer<typeof OrganizationIntegrationConfigSchema>;
export const OrganizationSchema = z.object({
	nome: z.string({
		required_error: "Nome da organização não informado.",
		invalid_type_error: "Tipo não válido para o nome da organização.",
	}),
	cnpj: z.string({
		required_error: "CNPJ da organização não informado.",
		invalid_type_error: "Tipo não válido para o CNPJ da organização.",
	}),
	logoUrl: z.string({ invalid_type_error: "Tipo não válido para a url do logo da organização." }).optional().nullable(),
	telefone: z.string({ invalid_type_error: "Tipo não válido para o telefone da organização." }).optional().nullable(),
	email: z.string({ invalid_type_error: "Tipo não válido para o email da organização." }).optional().nullable(),

	// Location
	localizacaoCep: z.string({ invalid_type_error: "Tipo não válido para o CEP da organização." }).optional().nullable(),
	localizacaoEstado: z.string({ invalid_type_error: "Tipo não válido para o estado da organização." }).optional().nullable(),
	localizacaoCidade: z.string({ invalid_type_error: "Tipo não válido para a cidade da organização." }).optional().nullable(),
	localizacaoBairro: z.string({ invalid_type_error: "Tipo não válido para o bairro da organização." }).optional().nullable(),
	localizacaoLogradouro: z.string({ invalid_type_error: "Tipo não válido para o logradouro da organização." }).optional().nullable(),
	localizacaoNumero: z.string({ invalid_type_error: "Tipo não válido para o número da organização." }).optional().nullable(),
	localizacaoComplemento: z.string({ invalid_type_error: "Tipo não válido para o complemento da organização." }).optional().nullable(),

	// Onboarding + Marketing + Commercial Data (for us)
	atuacaoNicho: z.string({ invalid_type_error: "Tipo não válido para o nicho de atuação da organização." }).optional().nullable(),
	atuacaoCanais: z.string({ invalid_type_error: "Tipo não válido para os canais de atuação da organização." }).optional().nullable(),
	tamanhoBaseClientes: z.number({ invalid_type_error: "Tipo não válido para o tamanho da base de clientes da organização." }).optional().nullable(),
	plataformasUtilizadas: z.string({ invalid_type_error: "Tipo não válido para as plataformas utilizadas da organização." }).optional().nullable(),
	origemLead: z.string({ invalid_type_error: "Tipo não válido para a origem dos leads da organização." }).optional().nullable(),

	assinaturaPlano: z.string({ invalid_type_error: "Tipo não válido para o plano de assinatura da organização." }).optional().nullable(),
	dadosViaERP: z.boolean({ invalid_type_error: "Tipo não válido para se os dados da organização foram via ERP." }).default(false),
	dadosViaPDI: z.boolean({ invalid_type_error: "Tipo não válido para se os dados da organização foram via PDI." }).default(false),
	dadosViaIntegraoes: z.boolean({ invalid_type_error: "Tipo não válido para se os dados da organização foram via integrações." }).default(false),
	// Integration
	integracaoTipo: OrganizationIntegrationTypeEnum.optional().nullable(),
	integracaoConfiguracao: OrganizationIntegrationConfigSchema.optional().nullable(),
	integracaoDataUltimaSincronizacao: z
		.date({ invalid_type_error: "Tipo não válido para a data da última sincronização da integração." })
		.optional()
		.nullable(),

	// Others
	periodoTesteInicio: z
		.string({ invalid_type_error: "Tipo não válido para a data de início do período de teste." })
		.datetime({ message: "Tipo não válido para a data de início do período de teste." })
		.optional()
		.nullable()
		.transform((val) => (val ? new Date(val) : null)),
	periodoTesteFim: z
		.string({ invalid_type_error: "Tipo não válido para a data de fim do período de teste." })
		.datetime({ message: "Tipo não válido para a data de fim do período de teste." })
		.optional()
		.nullable()
		.transform((val) => (val ? new Date(val) : null)),
	dataInsercao: z
		.string({ invalid_type_error: "Tipo não válido para a data de inserção da organização." })
		.datetime({ message: "Tipo não válido para a data de inserção da organização." })
		.default(new Date().toISOString())
		.transform((val) => new Date(val)),
});
