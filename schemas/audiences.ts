import { z } from "zod";
import { CampaignFiltersSchema, type TCampaignFiltersTree } from "./campaigns";

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

/**
 * Editable state shape for the audience create/control modals. `filtros` and `segmentacoes`
 * are split out of the base entity so the modal blocks can own them independently; the filter
 * tree reuses the same AND/OR/NOT structure as the campaigns.
 */
export const AudienceStateSchema = z.object({
	audience: AudienceSchema.omit({ filtros: true, segmentacoes: true }),
	segmentacoes: z.array(z.string({ invalid_type_error: "Tipo não válido para a segmentação." })).default([]),
	filtros: CampaignFiltersSchema.optional().nullable(),
});
export type TAudienceState = Omit<z.infer<typeof AudienceStateSchema>, "filtros"> & {
	// Override with the explicit recursive tree type so state helpers stay type-safe.
	// The Zod schema still validates the runtime shape identically.
	filtros: TCampaignFiltersTree;
};
