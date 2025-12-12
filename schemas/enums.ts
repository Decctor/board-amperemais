import { z } from "zod";

export const SaleNatureEnum = z.enum(["SN08", "SN03", "SN11", "SN20", "SN04", "SN09", "SN02", "COND", "SN99", "SN01", "SN05"]);

export const CampaignTriggerTypeEnum = z.enum(["NOVA-COMPRA", "PRIMEIRA-COMPRA", "PERMANÊNCIA-SEGMENTAÇÃO", "ENTRADA-SEGMENTAÇÃO"]);
export type TCampaignTriggerTypeEnum = z.infer<typeof CampaignTriggerTypeEnum>;
export const TimeDurationUnitsEnum = z.enum(["DIAS", "SEMANAS", "MESES", "ANOS"]);
export type TTimeDurationUnitsEnum = z.infer<typeof TimeDurationUnitsEnum>;
export const InteractionTypeEnum = z.enum(["ENVIO-MENSAGEM", "ENVIO-EMAIL", "LIGAÇÃO", "ATENDIMENTO"]);
export type TInteractionTypeEnum = z.infer<typeof InteractionTypeEnum>;
export const InteractionsCronJobTimeBlocksEnum = z.enum(["00:00", "03:00", "06:00", "09:00", "12:00", "15:00", "18:00", "21:00"]);
export type TInteractionsCronJobTimeBlocksEnum = z.infer<typeof InteractionsCronJobTimeBlocksEnum>;
