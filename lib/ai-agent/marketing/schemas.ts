import { CampaignSchema } from "@/schemas/campaigns";
import {
	AttributionModelEnum,
	CampaignExecutionDelayDirectionEnum,
	CampaignTriggerTypeEnum,
	CashbackProgramAccumulationTypeEnum,
	InteractionsCronJobTimeBlocksEnum,
	RecurrenceFrequencyEnum,
	TimeDurationUnitsEnum,
} from "@/schemas/enums";
import z from "zod";

export const MarketingAgentStatusSchema = z.enum([
	"analysis-only",
	"campaign-creation-suggestion",
	"campaign-updates-suggestion",
	"needs-user-input",
]);
export type TMarketingAgentStatus = z.infer<typeof MarketingAgentStatusSchema>;

export const MarketingAgentIntentSchema = z.enum([
	"analyze-org",
	"analyze-campaign",
	"create-campaign",
	"update-campaign",
	"unknown",
]);
export type TMarketingAgentIntent = z.infer<typeof MarketingAgentIntentSchema>;

export const MarketingAgentInputSchema = z.object({
	organizacaoId: z.string({
		required_error: "ID da organização não informado.",
		invalid_type_error: "Tipo inválido para o ID da organização.",
	}),
	traceId: z
		.string({
			invalid_type_error: "Tipo inválido para o trace ID.",
		})
		.optional()
		.nullable(),
	brief: z.string({
		required_error: "Briefing não informado.",
		invalid_type_error: "Tipo inválido para o briefing.",
	}),
	campaignId: z
		.string({
			invalid_type_error: "Tipo inválido para o ID da campanha.",
		})
		.optional()
		.nullable(),
	periodStart: z
		.date({
			invalid_type_error: "Tipo inválido para a data inicial.",
		})
		.optional()
		.nullable(),
	periodEnd: z
		.date({
			invalid_type_error: "Tipo inválido para a data final.",
		})
		.optional()
		.nullable(),
	debug: z
		.boolean({
			invalid_type_error: "Tipo inválido para debug.",
		})
		.optional()
		.default(false),
	persistSuggestion: z
		.boolean({
			invalid_type_error: "Tipo inválido para persistência da sugestão.",
		})
		.optional()
		.default(false),
	requireActionableSuggestion: z
		.boolean({
			invalid_type_error: "Tipo inválido para a exigência de sugestão acionável.",
		})
		.optional()
		.default(false),
});
export type TMarketingAgentInput = z.infer<typeof MarketingAgentInputSchema>;

const CampaignBaseSuggestionConfigSchema = CampaignSchema.omit({
	autorId: true,
	dataInsercao: true,
	whatsappTemplateId: true,
}).extend({
	gatilhoTipo: CampaignTriggerTypeEnum,
	execucaoAgendadaMedida: TimeDurationUnitsEnum,
	execucaoAgendadaDirecao: CampaignExecutionDelayDirectionEnum,
	execucaoAgendadaBloco: InteractionsCronJobTimeBlocksEnum,
	limiteEnviosSemanais: CampaignSchema.shape.limiteEnviosSemanais.describe(
		"Volume total de mensagens individuais que a campanha pode enviar por semana. Nao representa quantidade de clientes, execucoes ou recorrencias.",
	),
	recorrenciaTipo: RecurrenceFrequencyEnum.optional().nullable(),
	frequenciaIntervaloMedida: TimeDurationUnitsEnum.optional().nullable(),
	atribuicaoModelo: AttributionModelEnum,
	cashbackGeracaoTipo: CashbackProgramAccumulationTypeEnum.optional().nullable(),
	cashbackGeracaoExpiracaoMedida: TimeDurationUnitsEnum.optional().nullable(),
});

export const CampaignCreationSuggestionSchema = CampaignBaseSuggestionConfigSchema.extend({
	segmentations: z.array(
		z.string({
			required_error: "Segmentação não informada.",
			invalid_type_error: "Tipo inválido para segmentação.",
		}),
	),
	whatsappTemplateText: z.string({
		required_error: "Texto do template não informado.",
		invalid_type_error: "Tipo inválido para o texto do template.",
	}).describe(
		"Somente o corpo da mensagem sugerida, sem prefixos como 'Corpo:' e sem incluir ou alterar cabecalho, rodape, botoes ou midia.",
	),
	justificativa: z.string({
		required_error: "Justificativa não informada.",
		invalid_type_error: "Tipo inválido para justificativa.",
	}),
	objetivoEsperado: z
		.string({
			invalid_type_error: "Tipo inválido para o objetivo esperado.",
		})
		.optional()
		.nullable(),
});
export type TCampaignCreationSuggestion = z.infer<typeof CampaignCreationSuggestionSchema>;

export const CampaignUpdateProposedChangesSchema = CampaignBaseSuggestionConfigSchema.partial().refine(
	(value) => Object.keys(value).length > 0,
	{
		message: "Informe ao menos uma alteração proposta para a campanha.",
	},
);
export type TCampaignUpdateProposedChanges = z.infer<typeof CampaignUpdateProposedChangesSchema>;

export const CampaignCurrentSummarySchema = z.object({
	id: z.string(),
	titulo: z.string(),
	descricao: z.string().nullable(),
	gatilhoTipo: CampaignTriggerTypeEnum,
	ativo: z.boolean(),
	segmentations: z.array(z.string()),
	whatsappConexaoTelefoneId: z.string().nullable(),
	whatsappTemplateText: z.string().nullable(),
});
export type TCampaignCurrentSummary = z.infer<typeof CampaignCurrentSummarySchema>;

export const CampaignCurrentConfigSchema = CampaignSchema.omit({
	autorId: true,
	dataInsercao: true,
	whatsappTemplateId: true,
});
export type TCampaignCurrentConfig = z.infer<typeof CampaignCurrentConfigSchema>;

export const CampaignUpdateSuggestionSchema = z.object({
	campaignId: z.string({
		required_error: "ID da campanha não informado.",
		invalid_type_error: "Tipo inválido para o ID da campanha.",
	}),
	campaignTitle: z.string({
		required_error: "Título da campanha não informado.",
		invalid_type_error: "Tipo inválido para o título da campanha.",
	}),
	currentSummary: CampaignCurrentSummarySchema,
	currentConfig: CampaignCurrentConfigSchema.optional().nullable(),
	proposedChanges: CampaignUpdateProposedChangesSchema,
	segmentations: z.array(
		z.string({
			required_error: "Segmentação não informada.",
			invalid_type_error: "Tipo inválido para segmentação.",
		}),
	),
	whatsappTemplateText: z.string({
		required_error: "Texto do template não informado.",
		invalid_type_error: "Tipo inválido para o texto do template.",
	}).describe(
		"Somente o corpo da mensagem sugerida para a atualizacao. Preserve cabecalho, rodape, botoes e outras estruturas existentes.",
	),
	justificativa: z.string({
		required_error: "Justificativa não informada.",
		invalid_type_error: "Tipo inválido para justificativa.",
	}),
	impactoEsperado: z
		.string({
			invalid_type_error: "Tipo inválido para o impacto esperado.",
		})
		.optional()
		.nullable(),
});
export type TCampaignUpdateSuggestion = z.infer<typeof CampaignUpdateSuggestionSchema>;

export const MarketingSuggestionSchema = z.discriminatedUnion("tipo", [
	z.object({
		tipo: z.literal("campaign-creation-suggestion"),
		payload: CampaignCreationSuggestionSchema,
	}),
	z.object({
		tipo: z.literal("campaign-updates-suggestion"),
		payload: CampaignUpdateSuggestionSchema,
	}),
]);
export type TMarketingSuggestion = z.infer<typeof MarketingSuggestionSchema>;

export const MarketingAgentGeneratedOutputSchema = z.object({
	status: MarketingAgentStatusSchema,
	message: z.string(),
	inferredIntent: MarketingAgentIntentSchema,
	insights: z.array(z.string()),
	missingInformation: z.array(z.string()),
	suggestion: MarketingSuggestionSchema.nullable(),
});
export type TMarketingAgentGeneratedOutput = z.infer<typeof MarketingAgentGeneratedOutputSchema>;

export const MarketingAgentProviderSuggestionTypeSchema = z
	.enum(["campaign-creation-suggestion", "campaign-updates-suggestion"])
	.nullable();

export const MarketingAgentProviderOutputSchema = z.object({
	status: MarketingAgentStatusSchema,
	message: z.string(),
	inferredIntent: MarketingAgentIntentSchema,
	insights: z.array(z.string()),
	missingInformation: z.array(z.string()),
	suggestionType: MarketingAgentProviderSuggestionTypeSchema,
	suggestionJson: z.string().nullable(),
});
export type TMarketingAgentProviderOutput = z.infer<typeof MarketingAgentProviderOutputSchema>;

export const MarketingAgentMetadataSchema = z.object({
	model: z.string(),
	steps: z.number(),
	tokensUsed: z.number(),
	toolsUsed: z.array(z.string()),
});
export type TMarketingAgentMetadata = z.infer<typeof MarketingAgentMetadataSchema>;
