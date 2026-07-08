import { z } from "zod";
import { CampaignFiltersSchema } from "./campaigns";

/**
 * Audiences (públicos) — definição de segmento agnóstica de plataforma. Reusa o mesmo schema de
 * filtros das campanhas (`CampaignFiltersSchema`), então a árvore AND/OR/NOT é idêntica.
 */
export const AudienceSchema = z.object({
	nome: z
		.string({ required_error: "Nome do público não informado.", invalid_type_error: "Tipo não válido para o nome do público." })
		.min(1, "Nome do público não informado."),
	descricao: z.string({ invalid_type_error: "Tipo não válido para a descrição do público." }).optional().nullable(),
	filtros: CampaignFiltersSchema.optional().nullable(),
	segmentacoes: z
		.array(z.string({ invalid_type_error: "Tipo não válido para a segmentação." }), { invalid_type_error: "Tipo não válido para as segmentações." })
		.default([]),
});
export type TAudience = z.infer<typeof AudienceSchema>;

export const CreateAudienceInputSchema = AudienceSchema;
export type TCreateAudienceInput = z.infer<typeof CreateAudienceInputSchema>;

export const UpdateAudienceInputSchema = AudienceSchema.extend({
	id: z.string({ required_error: "ID do público não informado.", invalid_type_error: "Tipo não válido para o ID do público." }),
});
export type TUpdateAudienceInput = z.infer<typeof UpdateAudienceInputSchema>;
