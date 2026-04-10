import { CampaignCreationSuggestionSchema, CampaignUpdateSuggestionSchema } from "@/lib/ai-agent/marketing/schemas";
import { z } from "zod";

export const AIHintSubjectSchema = z.enum(["campaigns"]);
export type TAIHintSubject = z.infer<typeof AIHintSubjectSchema>;

export const AIHintStatusSchema = z.enum(["active", "dismissed", "expired"]);
export type TAIHintStatus = z.infer<typeof AIHintStatusSchema>;

export const AIHintFeedbackTypeSchema = z.enum(["like", "dislike"]);
export type TAIHintFeedbackType = z.infer<typeof AIHintFeedbackTypeSchema>;

const AIHintBaseSchema = z.object({
	titulo: z.string().max(100),
	descricao: z.string().max(500),
	acaoSugerida: z.string().max(200).optional().nullable(),
	urlAcao: z.string().optional().nullable(),
});

export const AIHintCampaignCreationSuggestionSchema = AIHintBaseSchema.extend({
	tipo: z.literal("campaign-creation-suggestion"),
	dados: z.object({
		resumoExecutivo: z.string(),
		criterios: z.array(z.string()),
		sugestao: CampaignCreationSuggestionSchema,
	}),
});

export const AIHintCampaignUpdatesSuggestionSchema = AIHintBaseSchema.extend({
	tipo: z.literal("campaign-updates-suggestion"),
	dados: z.object({
		resumoExecutivo: z.string(),
		criterios: z.array(z.string()),
		sugestao: CampaignUpdateSuggestionSchema,
	}),
});

export const AIHintContentSchema = z.discriminatedUnion("tipo", [AIHintCampaignCreationSuggestionSchema, AIHintCampaignUpdatesSuggestionSchema]);
export type TAIHintContent = z.infer<typeof AIHintContentSchema>;
export type TAIHintType = TAIHintContent["tipo"];

export const AIHintSchema = z.object({
	id: z.string(),
	organizacaoId: z.string(),
	assunto: AIHintSubjectSchema,
	tipo: z.string(),
	conteudo: AIHintContentSchema,
	modeloUtilizado: z.string().nullable(),
	tokensUtilizados: z.number().nullable(),
	relevancia: z.number().min(0).max(1).nullable(),
	status: AIHintStatusSchema,
	aprovadaPor: z.string().nullable(),
	dataAprovacao: z.date().nullable(),
	descartadaPor: z.string().nullable(),
	dataDescarte: z.date().nullable(),
	dataExpiracao: z.date().nullable(),
	dataInsercao: z.date(),
});
export type TAIHint = z.infer<typeof AIHintSchema>;

export const GenerateHintsInputSchema = z.object({
	assunto: AIHintSubjectSchema,
	contextoAdicional: z.string().optional(),
});
export type TGenerateHintsInput = z.infer<typeof GenerateHintsInputSchema>;

export const DismissHintInputSchema = z.object({
	id: z.string(),
});
export type TDismissHintInput = z.infer<typeof DismissHintInputSchema>;

export const ApproveHintInputSchema = z.object({
	id: z.string(),
});
export type TApproveHintInput = z.infer<typeof ApproveHintInputSchema>;

export const HintFeedbackInputSchema = z.object({
	id: z.string(),
	tipo: AIHintFeedbackTypeSchema,
	comentario: z.string().optional(),
});
export type THintFeedbackInput = z.infer<typeof HintFeedbackInputSchema>;

export const GetHintsOutputSchema = z.object({
	data: z.array(AIHintSchema),
});
export type TGetHintsOutput = z.infer<typeof GetHintsOutputSchema>;

export const GenerateHintsOutputSchema = z.object({
	data: z.object({
		hints: z.array(z.object({ id: z.string(), tipo: z.string() })),
		tokensUsados: z.number(),
		limiteAtingido: z.boolean(),
	}),
	message: z.string(),
});
export type TGenerateHintsOutput = z.infer<typeof GenerateHintsOutputSchema>;

export const ApproveHintOutputSchema = z.object({
	data: z.object({
		hintId: z.string(),
		operation: z.enum(["campaign-created", "campaign-updated"]),
		campaignId: z.string(),
		whatsappTemplateId: z.string(),
		templateOperation: z.literal("created"),
	}),
	message: z.string(),
});
export type TApproveHintOutput = z.infer<typeof ApproveHintOutputSchema>;
