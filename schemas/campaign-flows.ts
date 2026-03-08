import { z } from "zod";
import { FilterTreeSchema } from "./campaign-audiences";
import {
	AttributionModelEnum,
	CampaignFlowExecutionStatusEnum,
	CampaignFlowExecutionStepStatusEnum,
	CampaignFlowExecutionTypeEnum,
	CampaignFlowNodeTypeEnum,
	CampaignFlowStatusEnum,
	CampaignFlowTypeEnum,
	InteractionsCronJobTimeBlocksEnum,
	RecurrenceFrequencyEnum,
} from "./enums";

// ============================================================================
// CAMPAIGN FLOW
// ============================================================================

export const CampaignFlowSchema = z.object({
	titulo: z.string({
		required_error: "Título do fluxo não informado.",
		invalid_type_error: "Tipo não válido para o título do fluxo.",
	}),
	descricao: z
		.string({
			invalid_type_error: "Tipo não válido para a descrição do fluxo.",
		})
		.optional()
		.nullable(),
	status: CampaignFlowStatusEnum,
	tipo: CampaignFlowTypeEnum,

	// Recurrence config
	recorrenciaTipo: RecurrenceFrequencyEnum.optional().nullable(),
	recorrenciaIntervalo: z
		.number({
			invalid_type_error: "Tipo não válido para o intervalo de recorrência.",
		})
		.int("Intervalo de recorrência deve ser um número inteiro.")
		.positive("Intervalo de recorrência deve ser positivo.")
		.optional()
		.nullable()
		.default(1),
	recorrenciaDiasSemana: z.array(z.number().int().min(0).max(6)).optional().nullable(),
	recorrenciaDiasMes: z.array(z.number().int().min(1).max(31)).optional().nullable(),
	recorrenciaBlocoHorario: InteractionsCronJobTimeBlocksEnum.optional().nullable(),

	// One-time config
	unicaDataExecucao: z
		.string({
			invalid_type_error: "Tipo não válido para a data de execução única.",
		})
		.datetime({ message: "Data de execução única inválida." })
		.transform((val) => new Date(val))
		.optional()
		.nullable(),
	unicaExecutada: z.boolean().optional().default(false),

	// Attribution
	atribuicaoModelo: AttributionModelEnum.default("LAST_TOUCH"),
	atribuicaoJanelaDias: z
		.number({
			invalid_type_error: "Tipo não válido para a janela de atribuição.",
		})
		.int()
		.positive()
		.default(14),

	// Audience
	publicoId: z
		.string({
			invalid_type_error: "Tipo não válido para o ID do público.",
		})
		.optional()
		.nullable(),

	// Meta
	autorId: z.string({
		required_error: "ID do autor não informado.",
		invalid_type_error: "Tipo não válido para o ID do autor.",
	}),
	dataInsercao: z
		.string({
			invalid_type_error: "Tipo não válido para a data de inserção.",
		})
		.datetime()
		.transform((val) => new Date(val)),
});
export type TCampaignFlow = z.infer<typeof CampaignFlowSchema>;

// ============================================================================
// CAMPAIGN FLOW NODE
// ============================================================================

const NodeSubtypeTemporalUnitSchema = z.enum(["DIAS", "SEMANAS", "MESES", "ANOS"], {
	required_error: "Unidade de tempo não informada.",
	invalid_type_error: "Tipo não válido para a unidade de tempo.",
});

const NodeSubtypeTemporalUnitNoYearsSchema = z.enum(["DIAS", "SEMANAS", "MESES"], {
	required_error: "Unidade de tempo não informada.",
	invalid_type_error: "Tipo não válido para a unidade de tempo.",
});

const NodeDelayDurationUnitSchema = z.enum(["HORAS", "DIAS", "SEMANAS", "MESES"], {
	required_error: "Unidade de duração não informada.",
	invalid_type_error: "Tipo não válido para a unidade de duração.",
});

const WhatsappInteractionStatusSchema = z.enum(["ENTREGUE", "LIDO", "FALHOU"], {
	required_error: "Status esperado não informado.",
	invalid_type_error: "Tipo não válido para o status esperado.",
});

const ConditionOperatorSchema = z.enum(["IGUAL", "DIFERENTE", "MAIOR", "MENOR", "CONTEM"], {
	required_error: "Operador não informado.",
	invalid_type_error: "Tipo não válido para o operador.",
});

const DelayDateStringSchema = z
	.string({
		required_error: "Data do delay não informada.",
		invalid_type_error: "Tipo não válido para a data do delay.",
	})
	.refine(
		(val) =>
			/^\d{4}-\d{2}-\d{2}$/.test(val) ||
			!Number.isNaN(new Date(val).getTime()),
		"Data do delay inválida.",
	);

const TriggerNovaCompraConfigSchema = z.object({
	valorMinimo: z
		.number({
			invalid_type_error: "Tipo não válido para o valor mínimo da nova compra.",
		})
		.positive("Valor mínimo da nova compra deve ser positivo.")
		.optional(),
});

const TriggerPrimeiraCompraConfigSchema = z.object({});

const TriggerSegmentacaoConfigSchema = z.object({
	segmentos: z
		.array(
			z.string({
				required_error: "Segmento não informado.",
				invalid_type_error: "Tipo não válido para o segmento.",
			}),
		)
		.min(1, "Informe ao menos um segmento."),
});

const TriggerPermanenciaSegmentacaoConfigSchema = TriggerSegmentacaoConfigSchema.extend({
	tempoValor: z
		.number({
			required_error: "Tempo de permanência não informado.",
			invalid_type_error: "Tipo não válido para o tempo de permanência.",
		})
		.int("Tempo de permanência deve ser inteiro.")
		.positive("Tempo de permanência deve ser positivo."),
	tempoMedida: NodeSubtypeTemporalUnitNoYearsSchema,
});

const TriggerCashbackAcumuladoConfigSchema = z
	.object({
		valorMinimoNovo: z
			.number({
				invalid_type_error: "Tipo não válido para o valor mínimo do novo cashback.",
			})
			.positive("Valor mínimo do novo cashback deve ser positivo.")
			.optional(),
		valorMinimoTotal: z
			.number({
				invalid_type_error: "Tipo não válido para o valor mínimo do cashback total.",
			})
			.positive("Valor mínimo do cashback total deve ser positivo.")
			.optional(),
	})
	.superRefine((value, ctx) => {
		if (value.valorMinimoNovo == null && value.valorMinimoTotal == null) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Informe ao menos um valor mínimo para cashback acumulado.",
				path: [],
			});
		}
	});

const TriggerAntecedenciaConfigSchema = z.object({
	tempoAntecedenciaMedida: NodeSubtypeTemporalUnitSchema,
	tempoAntecedenciaValor: z
		.number({
			required_error: "Tempo de antecedência não informado.",
			invalid_type_error: "Tipo não válido para o tempo de antecedência.",
		})
		.int("Tempo de antecedência deve ser inteiro.")
		.positive("Tempo de antecedência deve ser positivo."),
});

const TriggerQuantidadeComprasConfigSchema = z.object({
	quantidade: z
		.number({
			required_error: "Quantidade total de compras não informada.",
			invalid_type_error: "Tipo não válido para a quantidade total de compras.",
		})
		.int("Quantidade total de compras deve ser inteiro.")
		.positive("Quantidade total de compras deve ser positiva."),
});

const TriggerValorComprasConfigSchema = z.object({
	valor: z
		.number({
			required_error: "Valor total de compras não informado.",
			invalid_type_error: "Tipo não válido para o valor total de compras.",
		})
		.positive("Valor total de compras deve ser positivo."),
});

const TriggerSemConfigSchema = z.object({});

const ActionWhatsappConfigSchema = z.object({
	whatsappTemplateId: z.string({
		required_error: "Template de WhatsApp não informado.",
		invalid_type_error: "Tipo não válido para o template de WhatsApp.",
	}),
	whatsappConexaoTelefoneId: z.string({
		required_error: "Telefone da conexão WhatsApp não informado.",
		invalid_type_error: "Tipo não válido para o telefone da conexão WhatsApp.",
	}),
});

const ActionCashbackConfigSchema = z
	.object({
		tipo: z.enum(["FIXO", "PERCENTUAL"], {
			required_error: "Tipo de cashback não informado.",
			invalid_type_error: "Tipo não válido para o tipo de cashback.",
		}),
		valor: z
			.number({
				required_error: "Valor do cashback não informado.",
				invalid_type_error: "Tipo não válido para o valor do cashback.",
			})
			.positive("Valor do cashback deve ser positivo."),
		expiracaoMedida: NodeSubtypeTemporalUnitNoYearsSchema.optional(),
		expiracaoValor: z
			.number({
				invalid_type_error: "Tipo não válido para o valor de expiração do cashback.",
			})
			.int("Valor de expiração do cashback deve ser inteiro.")
			.positive("Valor de expiração do cashback deve ser positivo.")
			.optional(),
	})
	.superRefine((value, ctx) => {
		const hasMedida = value.expiracaoMedida != null;
		const hasValor = value.expiracaoValor != null;
		if (hasMedida !== hasValor) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Expiração do cashback exige medida e valor juntos.",
				path: ["expiracaoMedida"],
			});
		}
	});

const ActionNotificacaoInternaConfigSchema = z.object({
	mensagem: z.string({
		required_error: "Mensagem da notificação interna não informada.",
		invalid_type_error: "Tipo não válido para a mensagem da notificação interna.",
	}),
	destinatarioIds: z.array(z.string()).optional(),
});

const DelayEsperarDuracaoConfigSchema = z.object({
	valor: z
		.number({
			required_error: "Valor do delay não informado.",
			invalid_type_error: "Tipo não válido para o valor do delay.",
		})
		.int("Valor do delay deve ser inteiro.")
		.positive("Valor do delay deve ser positivo."),
	medida: NodeDelayDurationUnitSchema,
});

const DelayEsperarAteHorarioConfigSchema = z.object({
	horario: z
		.string({
			required_error: "Horário do delay não informado.",
			invalid_type_error: "Tipo não válido para o horário do delay.",
		})
		.regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Horário inválido. Use HH:mm."),
	diaSemana: z
		.array(
			z
				.number({
					invalid_type_error: "Tipo não válido para o dia da semana.",
				})
				.int("Dia da semana deve ser inteiro.")
				.min(0, "Dia da semana mínimo é 0.")
				.max(6, "Dia da semana máximo é 6."),
		)
		.optional(),
});

const DelayEsperarAteDataConfigSchema = z.object({
	data: DelayDateStringSchema,
});

const ConditionVerificarAtributoConfigSchema = z.object({
	campo: z.string({
		required_error: "Campo da condição não informado.",
		invalid_type_error: "Tipo não válido para o campo da condição.",
	}),
	operador: ConditionOperatorSchema,
	valor: z.unknown(),
});

const ConditionVerificarCompraRecenteConfigSchema = z.object({
	diasAtras: z
		.number({
			required_error: "Quantidade de dias não informada.",
			invalid_type_error: "Tipo não válido para a quantidade de dias.",
		})
		.int("Quantidade de dias deve ser inteiro.")
		.positive("Quantidade de dias deve ser positiva."),
	valorMinimo: z
		.number({
			invalid_type_error: "Tipo não válido para o valor mínimo da compra recente.",
		})
		.positive("Valor mínimo da compra recente deve ser positivo.")
		.optional(),
});

const ConditionVerificarInteracaoAnteriorConfigSchema = z.object({
	statusEsperado: WhatsappInteractionStatusSchema,
});

const ConditionVerificarSegmentoRfmConfigSchema = z.object({
	segmentos: z
		.array(
			z.string({
				required_error: "Segmento não informado.",
				invalid_type_error: "Tipo não válido para o segmento.",
			}),
		)
		.min(1, "Informe ao menos um segmento."),
});

const ConditionVerificarCashbackSaldoConfigSchema = z.object({
	valorMinimo: z
		.number({
			required_error: "Valor mínimo de saldo de cashback não informado.",
			invalid_type_error: "Tipo não válido para o valor mínimo de saldo de cashback.",
		})
		.nonnegative("Valor mínimo de saldo de cashback não pode ser negativo."),
});

const FilterPorPublicoConfigSchema = z.object({
	publicoId: z.string({
		required_error: "ID do público não informado.",
		invalid_type_error: "Tipo não válido para o ID do público.",
	}),
});

const FilterInlineConfigSchema = z.object({
	filtros: FilterTreeSchema,
});

const CampaignFlowNodeMetaSchema = z.object({
	campanhaId: z.string({
		required_error: "ID da campanha não informado.",
		invalid_type_error: "Tipo não válido para o ID da campanha.",
	}),
	rotulo: z
		.string({
			invalid_type_error: "Tipo não válido para o rótulo do nó.",
		})
		.optional()
		.nullable(),
	configuracao: z.record(z.unknown(), {
		required_error: "Configuração do nó não informada.",
		invalid_type_error: "Tipo não válido para a configuração do nó.",
	}),
	posicaoX: z
		.number({
			invalid_type_error: "Tipo não válido para a posição X.",
		})
		.optional()
		.nullable(),
	posicaoY: z
		.number({
			invalid_type_error: "Tipo não válido para a posição Y.",
		})
		.optional()
		.nullable(),
	dataInsercao: z
		.string({
			invalid_type_error: "Tipo não válido para a data de inserção.",
		})
		.datetime()
		.transform((val) => new Date(val)),
});

const CampaignFlowNodeStateMetaSchema = CampaignFlowNodeMetaSchema.omit({
	campanhaId: true,
	dataInsercao: true,
});

function createCampaignFlowNodeVariantSchema<
	TTipo extends "GATILHO" | "ACAO" | "DELAY" | "CONDICAO" | "FILTRO",
	TSubtipo extends string,
	TConfiguracao extends z.ZodTypeAny,
>(tipo: TTipo, subtipo: TSubtipo, configuracaoSchema: TConfiguracao) {
	return CampaignFlowNodeMetaSchema.extend({
		tipo: z.literal(tipo),
		subtipo: z.literal(subtipo),
		configuracao: configuracaoSchema,
	});
}

function createCampaignFlowNodeStateVariantSchema<
	TTipo extends "GATILHO" | "ACAO" | "DELAY" | "CONDICAO" | "FILTRO",
	TSubtipo extends string,
	TConfiguracao extends z.ZodTypeAny,
>(tipo: TTipo, subtipo: TSubtipo, configuracaoSchema: TConfiguracao) {
	return CampaignFlowNodeStateMetaSchema.extend({
		tipo: z.literal(tipo),
		subtipo: z.literal(subtipo),
		configuracao: configuracaoSchema,
	});
}

const CampaignFlowNodeTriggerSchemaVariants = [
	createCampaignFlowNodeVariantSchema("GATILHO", "NOVA-COMPRA", TriggerNovaCompraConfigSchema),
	createCampaignFlowNodeVariantSchema("GATILHO", "PRIMEIRA-COMPRA", TriggerPrimeiraCompraConfigSchema),
	createCampaignFlowNodeVariantSchema("GATILHO", "ENTRADA-SEGMENTACAO", TriggerSegmentacaoConfigSchema),
	createCampaignFlowNodeVariantSchema("GATILHO", "PERMANENCIA-SEGMENTACAO", TriggerPermanenciaSegmentacaoConfigSchema),
	createCampaignFlowNodeVariantSchema("GATILHO", "CASHBACK-ACUMULADO", TriggerCashbackAcumuladoConfigSchema),
	createCampaignFlowNodeVariantSchema("GATILHO", "CASHBACK-EXPIRANDO", TriggerAntecedenciaConfigSchema),
	createCampaignFlowNodeVariantSchema("GATILHO", "ANIVERSARIO-CLIENTE", TriggerAntecedenciaConfigSchema),
	createCampaignFlowNodeVariantSchema("GATILHO", "ANIVERSARIO_CLIENTE", TriggerAntecedenciaConfigSchema),
	createCampaignFlowNodeVariantSchema("GATILHO", "QUANTIDADE-TOTAL-COMPRAS", TriggerQuantidadeComprasConfigSchema),
	createCampaignFlowNodeVariantSchema("GATILHO", "VALOR-TOTAL-COMPRAS", TriggerValorComprasConfigSchema),
	createCampaignFlowNodeVariantSchema("GATILHO", "INICIO-RECORRENTE", TriggerSemConfigSchema),
	createCampaignFlowNodeVariantSchema("GATILHO", "INICIO-UNICO", TriggerSemConfigSchema),
	createCampaignFlowNodeVariantSchema("GATILHO", "RECORRENTE", TriggerSemConfigSchema),
] as const;

const CampaignFlowNodeActionSchemaVariants = [
	createCampaignFlowNodeVariantSchema("ACAO", "ENVIAR-WHATSAPP", ActionWhatsappConfigSchema),
	createCampaignFlowNodeVariantSchema("ACAO", "GERAR-CASHBACK", ActionCashbackConfigSchema),
	createCampaignFlowNodeVariantSchema("ACAO", "NOTIFICACAO-INTERNA", ActionNotificacaoInternaConfigSchema),
] as const;

const CampaignFlowNodeDelaySchemaVariants = [
	createCampaignFlowNodeVariantSchema("DELAY", "ESPERAR-DURACAO", DelayEsperarDuracaoConfigSchema),
	createCampaignFlowNodeVariantSchema("DELAY", "ESPERAR-ATE-HORARIO", DelayEsperarAteHorarioConfigSchema),
	createCampaignFlowNodeVariantSchema("DELAY", "ESPERAR-ATE-DATA", DelayEsperarAteDataConfigSchema),
] as const;

const CampaignFlowNodeConditionSchemaVariants = [
	createCampaignFlowNodeVariantSchema("CONDICAO", "VERIFICAR-ATRIBUTO-CLIENTE", ConditionVerificarAtributoConfigSchema),
	createCampaignFlowNodeVariantSchema("CONDICAO", "VERIFICAR-COMPRA-RECENTE", ConditionVerificarCompraRecenteConfigSchema),
	createCampaignFlowNodeVariantSchema("CONDICAO", "VERIFICAR-INTERACAO-ANTERIOR", ConditionVerificarInteracaoAnteriorConfigSchema),
	createCampaignFlowNodeVariantSchema("CONDICAO", "VERIFICAR-SEGMENTO-RFM", ConditionVerificarSegmentoRfmConfigSchema),
	createCampaignFlowNodeVariantSchema("CONDICAO", "VERIFICAR-CASHBACK-SALDO", ConditionVerificarCashbackSaldoConfigSchema),
] as const;

const CampaignFlowNodeFilterSchemaVariants = [
	createCampaignFlowNodeVariantSchema("FILTRO", "FILTRAR-POR-PUBLICO", FilterPorPublicoConfigSchema),
	createCampaignFlowNodeVariantSchema("FILTRO", "FILTRAR-INLINE", FilterInlineConfigSchema),
] as const;

const CampaignFlowNodeStateTriggerSchemaVariants = [
	createCampaignFlowNodeStateVariantSchema("GATILHO", "NOVA-COMPRA", TriggerNovaCompraConfigSchema),
	createCampaignFlowNodeStateVariantSchema("GATILHO", "PRIMEIRA-COMPRA", TriggerPrimeiraCompraConfigSchema),
	createCampaignFlowNodeStateVariantSchema("GATILHO", "ENTRADA-SEGMENTACAO", TriggerSegmentacaoConfigSchema),
	createCampaignFlowNodeStateVariantSchema("GATILHO", "PERMANENCIA-SEGMENTACAO", TriggerPermanenciaSegmentacaoConfigSchema),
	createCampaignFlowNodeStateVariantSchema("GATILHO", "CASHBACK-ACUMULADO", TriggerCashbackAcumuladoConfigSchema),
	createCampaignFlowNodeStateVariantSchema("GATILHO", "CASHBACK-EXPIRANDO", TriggerAntecedenciaConfigSchema),
	createCampaignFlowNodeStateVariantSchema("GATILHO", "ANIVERSARIO-CLIENTE", TriggerAntecedenciaConfigSchema),
	createCampaignFlowNodeStateVariantSchema("GATILHO", "ANIVERSARIO_CLIENTE", TriggerAntecedenciaConfigSchema),
	createCampaignFlowNodeStateVariantSchema("GATILHO", "QUANTIDADE-TOTAL-COMPRAS", TriggerQuantidadeComprasConfigSchema),
	createCampaignFlowNodeStateVariantSchema("GATILHO", "VALOR-TOTAL-COMPRAS", TriggerValorComprasConfigSchema),
	createCampaignFlowNodeStateVariantSchema("GATILHO", "INICIO-RECORRENTE", TriggerSemConfigSchema),
	createCampaignFlowNodeStateVariantSchema("GATILHO", "INICIO-UNICO", TriggerSemConfigSchema),
	createCampaignFlowNodeStateVariantSchema("GATILHO", "RECORRENTE", TriggerSemConfigSchema),
] as const;

const CampaignFlowNodeStateActionSchemaVariants = [
	createCampaignFlowNodeStateVariantSchema("ACAO", "ENVIAR-WHATSAPP", ActionWhatsappConfigSchema),
	createCampaignFlowNodeStateVariantSchema("ACAO", "GERAR-CASHBACK", ActionCashbackConfigSchema),
	createCampaignFlowNodeStateVariantSchema("ACAO", "NOTIFICACAO-INTERNA", ActionNotificacaoInternaConfigSchema),
] as const;

const CampaignFlowNodeStateDelaySchemaVariants = [
	createCampaignFlowNodeStateVariantSchema("DELAY", "ESPERAR-DURACAO", DelayEsperarDuracaoConfigSchema),
	createCampaignFlowNodeStateVariantSchema("DELAY", "ESPERAR-ATE-HORARIO", DelayEsperarAteHorarioConfigSchema),
	createCampaignFlowNodeStateVariantSchema("DELAY", "ESPERAR-ATE-DATA", DelayEsperarAteDataConfigSchema),
] as const;

const CampaignFlowNodeStateConditionSchemaVariants = [
	createCampaignFlowNodeStateVariantSchema("CONDICAO", "VERIFICAR-ATRIBUTO-CLIENTE", ConditionVerificarAtributoConfigSchema),
	createCampaignFlowNodeStateVariantSchema("CONDICAO", "VERIFICAR-COMPRA-RECENTE", ConditionVerificarCompraRecenteConfigSchema),
	createCampaignFlowNodeStateVariantSchema("CONDICAO", "VERIFICAR-INTERACAO-ANTERIOR", ConditionVerificarInteracaoAnteriorConfigSchema),
	createCampaignFlowNodeStateVariantSchema("CONDICAO", "VERIFICAR-SEGMENTO-RFM", ConditionVerificarSegmentoRfmConfigSchema),
	createCampaignFlowNodeStateVariantSchema("CONDICAO", "VERIFICAR-CASHBACK-SALDO", ConditionVerificarCashbackSaldoConfigSchema),
] as const;

const CampaignFlowNodeStateFilterSchemaVariants = [
	createCampaignFlowNodeStateVariantSchema("FILTRO", "FILTRAR-POR-PUBLICO", FilterPorPublicoConfigSchema),
	createCampaignFlowNodeStateVariantSchema("FILTRO", "FILTRAR-INLINE", FilterInlineConfigSchema),
] as const;

export const CampaignFlowNodeTriggerConfigsSchema = z.union([
	...CampaignFlowNodeTriggerSchemaVariants,
]);

export const CampaignFlowNodeSchema = z.union([
	...CampaignFlowNodeTriggerSchemaVariants,
	...CampaignFlowNodeActionSchemaVariants,
	...CampaignFlowNodeDelaySchemaVariants,
	...CampaignFlowNodeConditionSchemaVariants,
	...CampaignFlowNodeFilterSchemaVariants,
]);

export const CampaignFlowNodeStateSchema = z.union([
	...CampaignFlowNodeStateTriggerSchemaVariants,
	...CampaignFlowNodeStateActionSchemaVariants,
	...CampaignFlowNodeStateDelaySchemaVariants,
	...CampaignFlowNodeStateConditionSchemaVariants,
	...CampaignFlowNodeStateFilterSchemaVariants,
]);
export type TCampaignFlowNode = z.infer<typeof CampaignFlowNodeSchema>;

// ============================================================================
// CAMPAIGN FLOW EDGE
// ============================================================================

export const CampaignFlowEdgeSchema = z.object({
	campanhaId: z.string({
		required_error: "ID da campanha não informado.",
		invalid_type_error: "Tipo não válido para o ID da campanha.",
	}),
	noOrigemId: z.string({
		required_error: "ID do nó de origem não informado.",
		invalid_type_error: "Tipo não válido para o ID do nó de origem.",
	}),
	noDestinoId: z.string({
		required_error: "ID do nó de destino não informado.",
		invalid_type_error: "Tipo não válido para o ID do nó de destino.",
	}),
	condicaoLabel: z
		.string({
			invalid_type_error: "Tipo não válido para o label da condição.",
		})
		.optional()
		.nullable(),
	ordem: z
		.number({
			invalid_type_error: "Tipo não válido para a ordem.",
		})
		.int()
		.default(0),
	dataInsercao: z
		.string({
			invalid_type_error: "Tipo não válido para a data de inserção.",
		})
		.datetime()
		.transform((val) => new Date(val)),
});
export type TCampaignFlowEdge = z.infer<typeof CampaignFlowEdgeSchema>;

// ============================================================================
// CAMPAIGN FLOW EXECUTION
// ============================================================================

export const CampaignFlowExecutionSchema = z.object({
	campanhaId: z.string({
		required_error: "ID da campanha não informado.",
		invalid_type_error: "Tipo não válido para o ID da campanha.",
	}),
	organizacaoId: z.string({
		required_error: "ID da organização não informado.",
		invalid_type_error: "Tipo não válido para o ID da organização.",
	}),
	tipo: CampaignFlowExecutionTypeEnum,
	clienteId: z.string().optional().nullable(),
	eventoTipo: z.string().optional().nullable(),
	eventoMetadados: z.record(z.unknown()).optional().nullable(),
	loteTotalClientes: z.number().int().optional().nullable(),
	loteClientesProcessados: z.number().int().default(0),
	status: CampaignFlowExecutionStatusEnum.default("PENDENTE"),
	dataInicio: z
		.string()
		.datetime()
		.transform((val) => new Date(val))
		.optional()
		.nullable(),
	dataConclusao: z
		.string()
		.datetime()
		.transform((val) => new Date(val))
		.optional()
		.nullable(),
	erro: z.string().optional().nullable(),
	vercelWorkflowRunId: z.string().optional().nullable(),
	dataInsercao: z
		.string({
			invalid_type_error: "Tipo não válido para a data de inserção.",
		})
		.datetime()
		.transform((val) => new Date(val)),
});
export type TCampaignFlowExecution = z.infer<typeof CampaignFlowExecutionSchema>;

// ============================================================================
// CAMPAIGN FLOW EXECUTION STEP
// ============================================================================

export const CampaignFlowExecutionStepSchema = z.object({
	execucaoId: z.string({
		required_error: "ID da execução não informado.",
		invalid_type_error: "Tipo não válido para o ID da execução.",
	}),
	noId: z.string({
		required_error: "ID do nó não informado.",
		invalid_type_error: "Tipo não válido para o ID do nó.",
	}),
	clienteId: z.string({
		required_error: "ID do cliente não informado.",
		invalid_type_error: "Tipo não válido para o ID do cliente.",
	}),
	status: CampaignFlowExecutionStepStatusEnum.default("PENDENTE"),
	resultado: z.record(z.unknown()).optional().nullable(),
	erro: z.string().optional().nullable(),
	delayAte: z
		.string()
		.datetime()
		.transform((val) => new Date(val))
		.optional()
		.nullable(),
	dataInicio: z
		.string()
		.datetime()
		.transform((val) => new Date(val))
		.optional()
		.nullable(),
	dataConclusao: z
		.string()
		.datetime()
		.transform((val) => new Date(val))
		.optional()
		.nullable(),
	dataInsercao: z
		.string({
			invalid_type_error: "Tipo não válido para a data de inserção.",
		})
		.datetime()
		.transform((val) => new Date(val)),
});
export type TCampaignFlowExecutionStep = z.infer<typeof CampaignFlowExecutionStepSchema>;

// ============================================================================
// STATE SCHEMAS (for API input / modal state)
// ============================================================================

export const CampaignFlowStateSchema = z.object({
	campaignFlow: CampaignFlowSchema.omit({ dataInsercao: true, autorId: true }),
	nos: z.array(
		CampaignFlowNodeStateSchema.and(
			z.object({
			id: z.string().optional(),
			deletar: z.boolean().optional(),
			}),
		),
	),
	arestas: z.array(
		CampaignFlowEdgeSchema.omit({ campanhaId: true, dataInsercao: true }).extend({
			id: z.string().optional(),
			deletar: z.boolean().optional(),
		}),
	),
});
export type TCampaignFlowState = z.infer<typeof CampaignFlowStateSchema>;
