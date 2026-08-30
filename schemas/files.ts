import { z } from "zod";

/**
 * Metadados de arquivo, discriminados pelo TIPO do conteúdo (não pelo propósito do upload):
 * dois propósitos de imagem compartilham o mesmo shape. Novos tipos (DOCUMENTO, PLANILHA,
 * VIDEO…) entram como novos membros da union.
 */
export const ImageFileMetadataSchema = z.object({
	tipo: z.literal("IMAGEM"),
	largura: z
		.number({ required_error: "Largura da imagem não informada.", invalid_type_error: "Tipo não válido para a largura da imagem." })
		.int()
		.positive(),
	altura: z
		.number({ required_error: "Altura da imagem não informada.", invalid_type_error: "Tipo não válido para a altura da imagem." })
		.int()
		.positive(),
});
export const FileMetadataSchema = z.discriminatedUnion("tipo", [ImageFileMetadataSchema]);
export type TFileMetadata = z.infer<typeof FileMetadataSchema>;

/** Quem criou o upload, para auditoria — complementa o `criadoPorId` (usuário responsável). */
export const UploadContextSchema = z.object({
	origem: z.enum(["SESSAO_WEB", "AGENTE_MCP", "AGENTE_DESKTOP"], { invalid_type_error: "Tipo não válido para a origem do upload." }),
	principalId: z.string({ invalid_type_error: "Tipo não válido para o ID do principal." }).optional().nullable(),
	clientId: z.string({ invalid_type_error: "Tipo não válido para o ID do cliente de acesso." }).optional().nullable(),
});
export type TUploadContext = z.infer<typeof UploadContextSchema>;

/** Referência do que consumiu o upload — ex.: `{ messageTemplateId: "..." }`. */
export const UploadConsumptionSchema = z.record(z.string({ invalid_type_error: "Tipo não válido para o valor do consumo." }));
export type TUploadConsumption = z.infer<typeof UploadConsumptionSchema>;
