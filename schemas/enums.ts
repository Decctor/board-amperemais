import { z } from "zod";

export const SaleNatureEnum = z.enum(["SN08", "SN03", "SN11", "SN20", "SN04", "SN09", "SN02", "COND", "SN99", "SN01", "SN05"]);

export const CampaignTriggerTypeEnum = z.enum([
	"NOVA-COMPRA",
	"PRIMEIRA-COMPRA",
	"PERMANÊNCIA-SEGMENTAÇÃO",
	"ENTRADA-SEGMENTAÇÃO",
	"CASHBACK-ACUMULADO",
]);
export type TCampaignTriggerTypeEnum = z.infer<typeof CampaignTriggerTypeEnum>;
export const TimeDurationUnitsEnum = z.enum(["DIAS", "SEMANAS", "MESES", "ANOS"]);
export type TTimeDurationUnitsEnum = z.infer<typeof TimeDurationUnitsEnum>;
export const InteractionTypeEnum = z.enum(["ENVIO-MENSAGEM", "ENVIO-EMAIL", "LIGAÇÃO", "ATENDIMENTO"]);
export type TInteractionTypeEnum = z.infer<typeof InteractionTypeEnum>;
export const InteractionsCronJobTimeBlocksEnum = z.enum(["00:00", "03:00", "06:00", "09:00", "12:00", "15:00", "18:00", "21:00"]);
export type TInteractionsCronJobTimeBlocksEnum = z.infer<typeof InteractionsCronJobTimeBlocksEnum>;
export const WhatsappTemplateCategoryEnum = z.enum(["AUTENTICAÇÃO", "MARKETING", "UTILIDADE"]);
export type TWhatsappTemplateCategoryEnum = z.infer<typeof WhatsappTemplateCategoryEnum>;
export const WhatsappTemplateParametersTypeEnum = z.enum(["NOMEADO", "POSICIONAL"]);
export type TWhatsappTemplateParametersTypeEnum = z.infer<typeof WhatsappTemplateParametersTypeEnum>;
export const WhatsappTemplateStatusEnum = z.enum(["RASCUNHO", "PENDENTE", "APROVADO", "REJEITADO", "PAUSADO", "DESABILITADO"]);
export type TWhatsappTemplateStatusEnum = z.infer<typeof WhatsappTemplateStatusEnum>;
export const WhatsappTemplateQualityEnum = z.enum(["PENDENTE", "ALTA", "MEDIA", "BAIXA"]);
export type TWhatsappTemplateQualityEnum = z.infer<typeof WhatsappTemplateQualityEnum>;
export const CashbackProgramAccumulationTypeEnum = z.enum(["FIXO", "PERCENTUAL"]);
export type TCashbackProgramAccumulationTypeEnum = z.infer<typeof CashbackProgramAccumulationTypeEnum>;
export const CashbackProgramTransactionTypeEnum = z.enum(["ACÚMULO", "RESGATE", "EXPIRAÇÃO"]);
export type TCashbackProgramTransactionTypeEnum = z.infer<typeof CashbackProgramTransactionTypeEnum>;
export const CashbackProgramTransactionStatusEnum = z.enum(["ATIVO", "CONSUMIDO", "EXPIRADO"]);
export type TCashbackProgramTransactionStatusEnum = z.infer<typeof CashbackProgramTransactionStatusEnum>;
export const OrganizationIntegrationTypeEnum = z.enum(["ONLINE-SOFTWARE"]);
export type TOrganizationIntegrationTypeEnum = z.infer<typeof OrganizationIntegrationTypeEnum>;
export const ChatStatusEnum = z.enum(["ABERTA", "FECHADA"]);
export type TChatStatusEnum = z.infer<typeof ChatStatusEnum>;
export const ChatMessageContentTypeEnum = z.enum(["TEXTO", "IMAGEM", "VIDEO", "AUDIO", "DOCUMENTO"]);
export type TChatMessageContentTypeEnum = z.infer<typeof ChatMessageContentTypeEnum>;
export const ChatServiceStatusEnum = z.enum(["PENDENTE", "EM_ANDAMENTO", "CONCLUIDO"]);
export type TChatServiceStatusEnum = z.infer<typeof ChatServiceStatusEnum>;
export const ChatServiceResponsibleTypeEnum = z.enum(["USUÁRIO", "AI", "BUSINESS-APP", "CLIENTE"]);
export type TChatServiceResponsibleTypeEnum = z.infer<typeof ChatServiceResponsibleTypeEnum>;
export const ChatMessageAuthorTypeEnum = z.enum(["CLIENTE", "USUÁRIO", "AI", "BUSINESS-APP"]);
export type TChatMessageAuthorTypeEnum = z.infer<typeof ChatMessageAuthorTypeEnum>;
export const ChatMessageStatusEnum = z.enum(["CANCELADO", "ENVIADO", "RECEBIDO", "LIDO"]);
export type TChatMessageStatusEnum = z.infer<typeof ChatMessageStatusEnum>;
export const ChatMessageWhatsappStatusEnum = z.enum(["PENDENTE", "ENVIADO", "ENTREGUE", "FALHOU"]);
export type TChatMessageWhatsappStatusEnum = z.infer<typeof ChatMessageWhatsappStatusEnum>;
