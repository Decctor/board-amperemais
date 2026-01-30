import z from "zod";
import { OrganizationIntegrationTypeEnum } from "./enums";

export const OrganizationIntegrationConfigSchema = z.discriminatedUnion("tipo", [
	z.object({
		tipo: z.literal("ONLINE-SOFTWARE"),
		token: z.string({ invalid_type_error: "Tipo não válido para o token da integração." }),
	}),
	z.object({
		tipo: z.literal("CARDAPIO-WEB"),
		merchantId: z.string({ invalid_type_error: "Tipo não válido para o ID do merchant." }),
		apiKey: z.string({ invalid_type_error: "Tipo não válido para a API Key." }),
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
	dadosViaIntegracoes: z.boolean({ invalid_type_error: "Tipo não válido para se os dados da organização foram via integrações." }).default(false),
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

	// Custom Colors
	corPrimaria: z
		.string({ invalid_type_error: "Tipo não válido para a cor primária." })
		.regex(/^#[0-9A-Fa-f]{6}$/, { message: "A cor primária deve estar no formato hexadecimal (ex: #FFB900)." })
		.optional()
		.nullable(),
	corPrimariaForeground: z
		.string({ invalid_type_error: "Tipo não válido para a cor de foreground primária." })
		.regex(/^#[0-9A-Fa-f]{6}$/, { message: "A cor de foreground primária deve estar no formato hexadecimal (ex: #000000)." })
		.optional()
		.nullable(),
	corSecundaria: z
		.string({ invalid_type_error: "Tipo não válido para a cor secundária." })
		.regex(/^#[0-9A-Fa-f]{6}$/, { message: "A cor secundária deve estar no formato hexadecimal (ex: #15599a)." })
		.optional()
		.nullable(),
	corSecundariaForeground: z
		.string({ invalid_type_error: "Tipo não válido para a cor de foreground secundária." })
		.regex(/^#[0-9A-Fa-f]{6}$/, { message: "A cor de foreground secundária deve estar no formato hexadecimal (ex: #FFFFFF)." })
		.optional()
		.nullable(),

	dataInsercao: z
		.string({ invalid_type_error: "Tipo não válido para a data de inserção da organização." })
		.datetime({ message: "Tipo não válido para a data de inserção da organização." })
		.default(new Date().toISOString())
		.transform((val) => new Date(val)),
});

export const OrganizationMemberPermissionsSchema = z.object({
	empresa: z.object({
		visualizar: z.boolean({
			required_error: "Permissão de visualização das configurações da empresa não informada.",
			invalid_type_error: "Tipo não válido para a permissão de visualização das configurações da empresa.",
		}),
		editar: z.boolean({
			required_error: "Permissão de edição das configurações da empresa não informada.",
			invalid_type_error: "Tipo não válido para a permissão de edição das configurações da empresa.",
		}),
	}),
	resultados: z.object({
		escopo: z
			.array(z.string({ required_error: "Escopo de resultados não informado.", invalid_type_error: "Tipo não válido para o escopo de resultados." }))
			.optional()
			.nullable(),
		visualizar: z.boolean({
			required_error: "Permissão de visualização de resultados não informada.",
			invalid_type_error: "Tipo não válido para a permissão de visualização de resultados.",
		}),
		// Goals
		criarMetas: z.boolean({
			required_error: "Permissão de criação de metas não informada.",
			invalid_type_error: "Tipo não válido para a permissão de criação de metas.",
		}),
		visualizarMetas: z.boolean({
			required_error: "Permissão de visualização de metas não informada.",
			invalid_type_error: "Tipo não válido para a permissão de visualização de metas.",
		}),
		editarMetas: z.boolean({
			required_error: "Permissão de edição de metas não informada.",
			invalid_type_error: "Tipo não válido para a permissão de edição de metas.",
		}),
		excluirMetas: z.boolean({
			required_error: "Permissão de exclusão de metas não informada.",
			invalid_type_error: "Tipo não válido para a permissão de exclusão de metas.",
		}),
	}),
	usuarios: z.object({
		visualizar: z.boolean({
			required_error: "Permissão de visualização de usuários não informada.",
			invalid_type_error: "Tipo não válido para a permissão de visualização de usuários.",
		}),
		criar: z.boolean({
			required_error: "Permissão de criação de usuários não informada.",
			invalid_type_error: "Tipo não válido para a permissão de criação de usuários.",
		}),
		editar: z.boolean({
			required_error: "Permissão de edição de usuários não informada.",
			invalid_type_error: "Tipo não válido para a permissão de edição de usuários.",
		}),
		excluir: z.boolean({
			required_error: "Permissão de exclusão de usuários não informada.",
			invalid_type_error: "Tipo não válido para a permissão de exclusão de usuários.",
		}),
	}),
	atendimentos: z.object({
		visualizar: z.boolean({
			required_error: "Permissão de visualização de atendimentos não informada.",
			invalid_type_error: "Tipo não válido para a permissão de visualização de atendimentos.",
		}),
		iniciar: z.boolean({
			required_error: "Permissão de início de atendimentos não informada.",
			invalid_type_error: "Tipo não válido para a permissão de início de atendimentos.",
		}),
		responder: z.boolean({
			required_error: "Permissão de resposta de atendimentos não informada.",
			invalid_type_error: "Tipo não válido para a permissão de resposta de atendimentos.",
		}),
		finalizar: z.boolean({
			required_error: "Permissão de finalização de atendimentos não informada.",
			invalid_type_error: "Tipo não válido para a permissão de finalização de atendimentos.",
		}),
		receberTransferencias: z
			.boolean({
				required_error: "Permissão de recebimento de transferências de atendimentos não informada.",
				invalid_type_error: "Tipo não válido para a permissão de recebimento de transferências de atendimentos.",
			})
			.optional()
			.nullable(),
	}),
});
export type TOrganizationMemberPermissions = z.infer<typeof OrganizationMemberPermissionsSchema>;

export const OrganizationMemberSchema = z.object({
	organizacaoId: z.string({ invalid_type_error: "Tipo não válido para o ID da organização." }),
	usuarioId: z.string({ invalid_type_error: "Tipo não válido para o ID do usuário." }),
	usuarioVendedorId: z.string({ invalid_type_error: "Tipo não válido para o ID do vendedor do usuário." }).optional().nullable(),
	permissoes: OrganizationMemberPermissionsSchema,
	dataInsercao: z
		.string({ invalid_type_error: "Tipo não válido para a data de inserção da organização." })
		.datetime({ message: "Tipo não válido para a data de inserção da organização." })
		.default(new Date().toISOString())
		.transform((val) => new Date(val)),
});

export const OrganizationMembershipInvitationSchema = z.object({
	organizacaoId: z.string({ invalid_type_error: "Tipo não válido para o ID da organização." }),
	nome: z.string({ invalid_type_error: "Tipo não válido para o nome da convite de membro da organização." }),
	email: z.string({ invalid_type_error: "Tipo não válido para o email da convite de membro da organização." }),
	permissoes: OrganizationMemberPermissionsSchema,
	autorId: z.string({ invalid_type_error: "Tipo não válido para o ID do autor da convite de membro da organização." }),
	dataEfetivacao: z
		.string({ invalid_type_error: "Tipo não válido para a data de efetivação da convite de membro da organização." })
		.optional()
		.nullable()
		.transform((val) => (val ? new Date(val) : null)),
	dataExpiracao: z
		.string({ invalid_type_error: "Tipo não válido para a data de expiração da convite de membro da organização." })
		.datetime({ message: "Tipo não válido para a data de expiração da convite de membro da organização." })
		.transform((val) => new Date(val)),
});
export type TOrganizationMembershipInvitation = z.infer<typeof OrganizationMembershipInvitationSchema>;

export const OrganizationMembershipInvitationStateSchema = z.object({
	invitation: OrganizationMembershipInvitationSchema.omit({ dataExpiracao: true, autorId: true, organizacaoId: true, dataEfetivacao: true }),
});
export type TOrganizationMembershipInvitationState = z.infer<typeof OrganizationMembershipInvitationStateSchema>;
