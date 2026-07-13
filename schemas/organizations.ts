import z from "zod";
import { DefaultDataSourceEnum, DiscountLimitTypeEnum, OrganizationIntegrationTypeEnum, SalesSessionScopeEnum } from "./enums";
import { OrganizationFiscalConfigSchema } from "./fiscal";
import { PaymentEffectivenessTypeEnum } from "@/lib/payments/schemas";

export const OrganizationIntegrationConfigSchema = z.discriminatedUnion("tipo", [
	z.object({
		tipo: z.literal("ONLINE-SOFTWARE"),
		token: z.string({ invalid_type_error: "Tipo não válido para o token da integração." }),
		url: z.string({ invalid_type_error: "Tipo não válido para a URL da integração." }),
	}),
	z.object({
		tipo: z.literal("CARDAPIO-WEB"),
		merchantId: z.string({ invalid_type_error: "Tipo não válido para o ID do merchant." }),
		apiKey: z.string({ invalid_type_error: "Tipo não válido para a API Key." }),
	}),
	z.object({
		tipo: z.literal("NUVEM-SHOP"),
		storeId: z.number({ invalid_type_error: "Tipo não válido para o ID da loja Nuvem Shop." }),
		accessToken: z.string({ invalid_type_error: "Tipo não válido para o token de acesso da Nuvem Shop." }),
		tokenType: z.literal("bearer", { invalid_type_error: "Tipo não válido para o tipo do token da Nuvem Shop." }),
		scope: z.array(z.string({ invalid_type_error: "Tipo não válido para o escopo da Nuvem Shop." })),
	}),
	z.object({
		tipo: z.literal("IFOOD"),
		merchantIds: z.array(z.string({ invalid_type_error: "Tipo não válido para o ID da loja iFood." })).default([]),
		accessToken: z.string({ invalid_type_error: "Tipo não válido para o token de acesso do iFood." }),
		refreshToken: z.string({ invalid_type_error: "Tipo não válido para o token de renovação do iFood." }),
		tokenType: z.literal("bearer", { invalid_type_error: "Tipo não válido para o tipo do token do iFood." }),
		scope: z.array(z.string({ invalid_type_error: "Tipo não válido para o escopo do iFood." })),
		expiresAt: z
			.string({ invalid_type_error: "Tipo não válido para a expiração do token do iFood." })
			.datetime({ message: "Tipo não válido para a expiração do token do iFood." }),
		authorizedAt: z
			.string({ invalid_type_error: "Tipo não válido para a data de autorização do iFood." })
			.datetime({ message: "Tipo não válido para a data de autorização do iFood." })
			.optional()
			.nullable(),
	}),
	z.object({
		tipo: z.literal("BLING"),
		accessToken: z.string({ invalid_type_error: "Tipo não válido para o token de acesso do Bling." }),
		refreshToken: z.string({ invalid_type_error: "Tipo não válido para o token de renovação do Bling." }),
		tokenType: z.string({ invalid_type_error: "Tipo não válido para o tipo do token do Bling." }).default("Bearer"),
		scope: z.array(z.string({ invalid_type_error: "Tipo não válido para o escopo do Bling." })).default([]),
		expiresAt: z
			.string({ invalid_type_error: "Tipo não válido para a expiração do token do Bling." })
			.datetime({ message: "Tipo não válido para a expiração do token do Bling." }),
		connectedAt: z
			.string({ invalid_type_error: "Tipo não válido para a data de conexão do Bling." })
			.datetime({ message: "Tipo não válido para a data de conexão do Bling." }),
	}),
]);
export type TOrganizationIntegrationConfig = z.infer<typeof OrganizationIntegrationConfigSchema>;

export const OrganizationPaymentMethodDefaultsSchema = z.object({
	suportado: z.boolean({
		invalid_type_error: "Tipo não válido para se o método de pagamento é suportado.",
	}),
	contaFinanceiraPadraoId: z.string({ invalid_type_error: "Tipo não válido para a conta financeira padrão." }).nullable(),
	contaFinanceiraPadraoKey: z.string({ invalid_type_error: "Tipo não válido para a chave da conta financeira padrão." }).nullable(),
	efetivacaoTipoPadrao: PaymentEffectivenessTypeEnum,
	delayDiasPadrao: z.number({ invalid_type_error: "Tipo não válido para o delay padrão em dias." }).int().nullable(),
	parcelamento: z.object({
		permitido: z.boolean({
			invalid_type_error: "Tipo não válido para se o parcelamento é permitido.",
		}),
		minParcelas: z.number({ invalid_type_error: "Tipo não válido para o mínimo de parcelas." }).int(),
		maxParcelas: z.number({ invalid_type_error: "Tipo não válido para o máximo de parcelas." }).int().nullable(),
		intervaloMeses: z.number({ invalid_type_error: "Tipo não válido para o intervalo em meses." }).int().nullable(),
	}),
});
export type TOrganizationPaymentMethodDefaults = z.infer<typeof OrganizationPaymentMethodDefaultsSchema>;

export const OrganizationDefaultsSchema = z.object({
	contabilidade: z.object({
		lancamentosPadrao: z.object({
			vendas: z.object({
				debitoContaId: z.string({ invalid_type_error: "Tipo não válido para a conta de débito padrão de vendas." }).nullable(),
				debitoContaKey: z.string({ invalid_type_error: "Tipo não válido para a chave da conta de débito padrão de vendas." }).nullable(),
				creditoContaId: z.string({ invalid_type_error: "Tipo não válido para a conta de crédito padrão de vendas." }).nullable(),
				creditoContaKey: z.string({ invalid_type_error: "Tipo não válido para a chave da conta de crédito padrão de vendas." }).nullable(),
			}),
			compras: z.object({
				debitoContaId: z.string({ invalid_type_error: "Tipo não válido para a conta de débito padrão de compras." }).nullable(),
				debitoContaKey: z.string({ invalid_type_error: "Tipo não válido para a chave da conta de débito padrão de compras." }).nullable(),
				creditoContaId: z.string({ invalid_type_error: "Tipo não válido para a conta de crédito padrão de compras." }).nullable(),
				creditoContaKey: z.string({ invalid_type_error: "Tipo não válido para a chave da conta de crédito padrão de compras." }).nullable(),
			}),
			transferencias: z
				.object({
					debitoContaId: z.string({ invalid_type_error: "Tipo não válido para a conta de débito padrão de transferências." }).nullable(),
					debitoContaKey: z.string({ invalid_type_error: "Tipo não válido para a chave da conta de débito padrão de transferências." }).nullable(),
					creditoContaId: z.string({ invalid_type_error: "Tipo não válido para a conta de crédito padrão de transferências." }).nullable(),
					creditoContaKey: z.string({ invalid_type_error: "Tipo não válido para a chave da conta de crédito padrão de transferências." }).nullable(),
				})
				.default({
					debitoContaId: null,
					debitoContaKey: null,
					creditoContaId: null,
					creditoContaKey: null,
				}),
		}),
	}),
	pagamentos: z.object({
		metodos: z.object({
			DINHEIRO: OrganizationPaymentMethodDefaultsSchema,
			PIX: OrganizationPaymentMethodDefaultsSchema,
			CARTAO_DEBITO: OrganizationPaymentMethodDefaultsSchema,
			CARTAO_CREDITO: OrganizationPaymentMethodDefaultsSchema,
			BOLETO: OrganizationPaymentMethodDefaultsSchema,
			TRANSFERENCIA: OrganizationPaymentMethodDefaultsSchema,
			CASHBACK: OrganizationPaymentMethodDefaultsSchema,
			VALE: OrganizationPaymentMethodDefaultsSchema,
			A_DEFINIR: OrganizationPaymentMethodDefaultsSchema,
			FIADO_NOTA: OrganizationPaymentMethodDefaultsSchema,
			OUTRO: OrganizationPaymentMethodDefaultsSchema,
		}),
	}),
});
export type TOrganizationDefaults = z.infer<typeof OrganizationDefaultsSchema>;
export type TOrganizationAccountingDefaults = TOrganizationDefaults;

export const OrganizationConfigurationSchema = z.object({
	recursos: z.object({
		analytics: z.object({
			acesso: z.boolean({
				invalid_type_error: "Tipo não válido para o acesso aos recursos de análise de dados.",
			}),
		}),
		campanhas: z.object({
			acesso: z.boolean({
				invalid_type_error: "Tipo não válido para o acesso aos recursos de campanhas.",
			}),
			limiteAtivas: z.number({ invalid_type_error: "Tipo não válido para o limite de campanhas ativas." }).nullable(),
		}),
		programasCashback: z.object({
			acesso: z.boolean({
				invalid_type_error: "Tipo não válido para o acesso aos recursos de programas de cashback.",
			}),
		}),
		hubAtendimentos: z.object({
			acesso: z.boolean({
				invalid_type_error: "Tipo não válido para o acesso aos recursos de atendimentos via WhatsApp Hub.",
			}),
			limiteAtendentes: z
				.number({
					invalid_type_error: "Tipo não válido para o limite de atendentes (assentos) simultâneos.",
				})
				.nullable(),
		}),
		integracoes: z.object({
			acesso: z.boolean({
				invalid_type_error: "Tipo não válido para o acesso aos recursos de integrações.",
			}),
			limiteAtivas: z
				.number({
					invalid_type_error: "Tipo não válido para o limite de integrações ativas simultâneas.",
				})
				.nullable(),
		}),
		relatoriosWhatsapp: z.object({
			acesso: z.boolean({
				invalid_type_error: "Tipo não válido para o acesso aos recursos de relatórios via WhatsApp.",
			}),
		}),
		iaDicas: z.object({
			acesso: z.boolean({
				invalid_type_error: "Tipo não válido para o acesso aos recursos de dicas de IA.",
			}),
			limiteSemanal: z.number({ invalid_type_error: "Tipo não válido para o limite de dicas de IA por semana." }).nullable(),
		}),
		iaAtendimento: z.object({
			acesso: z.boolean({
				invalid_type_error: "Tipo não válido para o acesso aos recursos de atendimento via IA.",
			}),
			limiteCreditos: z
				.number({
					invalid_type_error: "Tipo não válido para o limite de créditos de IA por atendimento.",
				})
				.nullable(),
		}),
		erp: z
			.object({
				acesso: z.boolean({
					invalid_type_error: "Tipo não válido para o acesso aos recursos de ERP.",
				}),
			})
			.default({ acesso: false }),
	}),
	preferencias: z.object({
		rastreamentoEstoque: z.boolean({
			required_error: "Configuração global de rastreamento de estoque não informada.",
			invalid_type_error: "Tipo não válido para a configuração global de rastreamento de estoque.",
		}),
		limiteMensagensSemanaisViaCampanhas: z
			.number({
				invalid_type_error: "Tipo não válido para o limite semanal de mensagens enviadas via campanhas.",
			})
			.nullable()
			.optional()
			.default(null),
		relatoriosDestinatariosIds: z
			.array(z.string({ invalid_type_error: "Tipo não válido para o ID do destinatário de relatórios." }))
			.optional()
			.nullable(),
		sessoesVenda: z
			.object({
				habilitado: z.boolean({ invalid_type_error: "Tipo não válido para a habilitação de sessões de venda." }),
				obrigatorio: z.boolean({ invalid_type_error: "Tipo não válido para a obrigatoriedade de sessões de venda." }),
				escopo: SalesSessionScopeEnum,
				exigirFundoTroco: z.boolean({ invalid_type_error: "Tipo não válido para a exigência de fundo de troco." }),
				conferenciaCega: z.boolean({ invalid_type_error: "Tipo não válido para a conferência cega." }),
				bloquearFechamentoComPendenciaFiscal: z.boolean({
					invalid_type_error: "Tipo não válido para o bloqueio de fechamento com pendência fiscal.",
				}),
			})
			.default({
				habilitado: false,
				obrigatorio: false,
				escopo: "OPERADOR",
				exigirFundoTroco: false,
				conferenciaCega: false,
				bloquearFechamentoComPendenciaFiscal: false,
			}),
		carteirasClientes: z
			.object({
				habilitado: z.boolean({ invalid_type_error: "Tipo não válido para a habilitação do módulo de carteira de clientes." }),
			})
			.default({
				habilitado: false,
			}),
	}),
	defaults: OrganizationDefaultsSchema,
});
export type TOrganizationConfiguration = z.infer<typeof OrganizationConfigurationSchema>;

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
	tamanhoBaseClientes: z
		.number({
			invalid_type_error: "Tipo não válido para o tamanho da base de clientes da organização.",
		})
		.optional()
		.nullable(),
	plataformasUtilizadas: z
		.string({
			invalid_type_error: "Tipo não válido para as plataformas utilizadas da organização.",
		})
		.optional()
		.nullable(),
	origemLead: z.string({ invalid_type_error: "Tipo não válido para a origem dos leads da organização." }).optional().nullable(),

	assinaturaPlano: z.string({ invalid_type_error: "Tipo não válido para o plano de assinatura da organização." }).optional().nullable(),
	dadosViaERP: z
		.boolean({
			invalid_type_error: "Tipo não válido para se os dados da organização foram via ERP.",
		})
		.default(false),
	dadosViaPDI: z
		.boolean({
			invalid_type_error: "Tipo não válido para se os dados da organização foram via PDI.",
		})
		.default(false),
	dadosViaIntegracoes: z
		.boolean({
			invalid_type_error: "Tipo não válido para se os dados da organização foram via integrações.",
		})
		.default(false),
	origemDadosPadrao: DefaultDataSourceEnum.default("RECEPTOR").nullable(),
	// Integration
	integracaoTipo: OrganizationIntegrationTypeEnum.optional().nullable(),
	integracaoConfiguracao: OrganizationIntegrationConfigSchema.optional().nullable(),
	integracaoDataUltimaSincronizacao: z
		.string({
			invalid_type_error: "Tipo não válido para a data da última sincronização da integração.",
		})
		.datetime({ message: "Tipo não válido para a data da última sincronização da integração." })
		.optional()
		.nullable()
		.transform((val) => (val ? new Date(val) : null)),
	fiscalProvedor: z.enum(["MANUAL", "SPEDY"]).optional().nullable(),
	fiscalEmissaoAutomatica: z
		.boolean({
			invalid_type_error: "Tipo nao valido para a emissao automatica fiscal.",
		})
		.default(false),
	fiscalConfiguracao: OrganizationFiscalConfigSchema.optional().nullable(),

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
		.regex(/^#[0-9A-Fa-f]{6}$/, {
			message: "A cor primária deve estar no formato hexadecimal (ex: #FFB900).",
		})
		.optional()
		.nullable(),
	corPrimariaForeground: z
		.string({ invalid_type_error: "Tipo não válido para a cor de foreground primária." })
		.regex(/^#[0-9A-Fa-f]{6}$/, {
			message: "A cor de foreground primária deve estar no formato hexadecimal (ex: #000000).",
		})
		.optional()
		.nullable(),
	corSecundaria: z
		.string({ invalid_type_error: "Tipo não válido para a cor secundária." })
		.regex(/^#[0-9A-Fa-f]{6}$/, {
			message: "A cor secundária deve estar no formato hexadecimal (ex: #15599a).",
		})
		.optional()
		.nullable(),
	corSecundariaForeground: z
		.string({ invalid_type_error: "Tipo não válido para a cor de foreground secundária." })
		.regex(/^#[0-9A-Fa-f]{6}$/, {
			message: "A cor de foreground secundária deve estar no formato hexadecimal (ex: #FFFFFF).",
		})
		.optional()
		.nullable(),
	poiQrCodeKioskDataUrl: z.string({ invalid_type_error: "Tipo não válido para o QR Code kiosk da organização." }).optional().nullable(),
	poiQrCodeMobileDataUrl: z.string({ invalid_type_error: "Tipo não válido para o QR Code mobile da organização." }).optional().nullable(),
	poiConfirmacaoValorObrigatoria: z
		.boolean({
			required_error: "Configuração de confirmação do valor no POI não informada.",
			invalid_type_error: "Tipo não válido para a confirmação do valor no POI.",
		})
		.default(false),

	// Onboarding conclusion marker. Null = onboarding still in progress.
	dataOnboardingConclusao: z
		.string({ invalid_type_error: "Tipo não válido para a data de conclusão do onboarding." })
		.datetime({ message: "Tipo não válido para a data de conclusão do onboarding." })
		.optional()
		.nullable()
		.transform((val) => (val ? new Date(val) : null)),

	configuracao: OrganizationConfigurationSchema,
	autorId: z.string({ invalid_type_error: "Tipo não válido para o ID do autor da organização." }),
	dataInsercao: z
		.string({ invalid_type_error: "Tipo não válido para a data de inserção da organização." })
		.datetime({ message: "Tipo não válido para a data de inserção da organização." })
		.default(new Date().toISOString())
		.transform((val) => new Date(val)),
});
export type TOrganizationFiscalConfig = z.infer<typeof OrganizationFiscalConfigSchema>;

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
			.array(
				z.string({
					required_error: "Escopo de resultados não informado.",
					invalid_type_error: "Tipo não válido para o escopo de resultados.",
				}),
			)
			.optional()
			.nullable(),
		visualizar: z.boolean({
			required_error: "Permissão de visualização de resultados não informada.",
			invalid_type_error: "Tipo não válido para a permissão de visualização de resultados.",
		}),
		visualizarSensiveis: z.boolean({
			required_error: "Permissão de visualização de dados sensíveis não informada.",
			invalid_type_error: "Tipo não válido para a permissão de visualização de dados sensíveis.",
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
	vendas: z.object({
		visualizar: z.boolean({
			required_error: "Permissão de visualização de vendas não informada.",
			invalid_type_error: "Tipo não válido para a permissão de visualização de vendas.",
		}),
		criar: z.boolean({
			required_error: "Permissão de criação de vendas não informada.",
			invalid_type_error: "Tipo não válido para a permissão de criação de vendas.",
		}),
		editar: z.boolean({
			required_error: "Permissão de edição de vendas não informada.",
			invalid_type_error: "Tipo não válido para a permissão de edição de vendas.",
		}),
		excluir: z.boolean({
			required_error: "Permissão de exclusão de vendas não informada.",
			invalid_type_error: "Tipo não válido para a permissão de exclusão de vendas.",
		}),
		// Controle de descontos no PDV. Opcional para não quebrar membros existentes: ausência/null =
		// comportamento legado (desconto liberado sem teto; aprovar cai para empresa.editar). A semântica
		// de ausência é resolvida em lib/permissions/discounts.ts — não leia esta chave diretamente.
		descontos: z
			.object({
				aplicar: z.boolean({
					required_error: "Permissão de aplicação de descontos não informada.",
					invalid_type_error: "Tipo não válido para a permissão de aplicação de descontos.",
				}),
				limiteTipo: DiscountLimitTypeEnum.nullable(),
				limiteValor: z
					.number({ invalid_type_error: "Tipo não válido para o valor do limite de descontos." })
					.nonnegative({ message: "O valor do limite de descontos não pode ser negativo." })
					.nullable(),
				aprovar: z.boolean({
					required_error: "Permissão de aprovação de descontos não informada.",
					invalid_type_error: "Tipo não válido para a permissão de aprovação de descontos.",
				}),
			})
			.optional()
			.nullable(),
	}),
	compras: z.object({
		visualizar: z.boolean({
			required_error: "Permissão de visualização de compras não informada.",
			invalid_type_error: "Tipo não válido para a permissão de visualização de compras.",
		}),
		criar: z.boolean({
			required_error: "Permissão de criação de compras não informada.",
			invalid_type_error: "Tipo não válido para a permissão de criação de compras.",
		}),
		editar: z.boolean({
			required_error: "Permissão de edição de compras não informada.",
			invalid_type_error: "Tipo não válido para a permissão de edição de compras.",
		}),
		excluir: z.boolean({
			required_error: "Permissão de exclusão de compras não informada.",
			invalid_type_error: "Tipo não válido para a permissão de exclusão de compras.",
		}),
	}),
	fiscal: z.object({
		visualizar: z.boolean({
			required_error: "Permissão de visualização de documentos fiscais não informada.",
			invalid_type_error: "Tipo não válido para a permissão de visualização de documentos fiscais.",
		}),
		configurar: z.boolean({
			required_error: "Permissão de configuração de documentos fiscais não informada.",
			invalid_type_error: "Tipo não válido para a permissão de configuração de documentos fiscais.",
		}),
		emitir: z.boolean({
			required_error: "Permissão de emissão de documentos fiscais não informada.",
			invalid_type_error: "Tipo não válido para a permissão de emissão de documentos fiscais.",
		}),
		cancelar: z.boolean({
			required_error: "Permissão de cancelamento de documentos fiscais não informada.",
			invalid_type_error: "Tipo não válido para a permissão de cancelamento de documentos fiscais.",
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
	// Integrações de marketing/parceiros (Meta Ads, CAPI, audiences…). Opcional para não quebrar a
	// validação de membros já existentes cujo JSONB de permissões ainda não tem a chave; a ausência
	// é tratada como "sem permissão" na aplicação (com fallback para empresa.editar — ver rota).
	integracoes: z
		.object({
			visualizar: z.boolean({
				required_error: "Permissão de visualização de integrações não informada.",
				invalid_type_error: "Tipo não válido para a permissão de visualização de integrações.",
			}),
			gerenciar: z.boolean({
				required_error: "Permissão de gerenciamento de integrações não informada.",
				invalid_type_error: "Tipo não válido para a permissão de gerenciamento de integrações.",
			}),
		})
		.optional()
		.nullable(),
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
	nome: z.string({
		invalid_type_error: "Tipo não válido para o nome da convite de membro da organização.",
	}),
	email: z
		.string({
			invalid_type_error: "Tipo não válido para o email da convite de membro da organização.",
		})
		.email({
			message: "Email inválido para o convite.",
		}),
	vendedorAplicavel: z
		.boolean({
			invalid_type_error: "Tipo não válido para se o vendedor deve ser aplicado ao convite de membro da organização.",
		})
		.default(false),
	vendedorId: z
		.string({
			invalid_type_error: "Tipo não válido para o ID do vendedor do convite de membro da organização.",
		})
		.optional()
		.nullable(),
	permissoes: OrganizationMemberPermissionsSchema,
	autorId: z.string({
		invalid_type_error: "Tipo não válido para o ID do autor da convite de membro da organização.",
	}),
	dataEfetivacao: z
		.string({
			invalid_type_error: "Tipo não válido para a data de efetivação da convite de membro da organização.",
		})
		.optional()
		.nullable()
		.transform((val) => (val ? new Date(val) : null)),
	dataExpiracao: z
		.string({
			invalid_type_error: "Tipo não válido para a data de expiração da convite de membro da organização.",
		})
		.datetime({
			message: "Tipo não válido para a data de expiração da convite de membro da organização.",
		})
		.transform((val) => new Date(val)),
});
export type TOrganizationMembershipInvitation = z.infer<typeof OrganizationMembershipInvitationSchema>;

export const OrganizationMembershipInvitationStateSchema = z.object({
	invitation: OrganizationMembershipInvitationSchema.omit({
		dataExpiracao: true,
		autorId: true,
		organizacaoId: true,
		dataEfetivacao: true,
	}),
});
export type TOrganizationMembershipInvitationState = z.infer<typeof OrganizationMembershipInvitationStateSchema>;
