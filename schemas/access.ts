import { z } from "zod";
import { AccessScopeEnum } from "./enums";

// Metadados não essenciais à autorização reportados pelo dispositivo no enrollment e no heartbeat.
// O que participar de constraint, join ou política deve virar coluna em access_principals (§9.2 do plano).
export const AccessPrincipalDeviceMetadataSchema = z.object({
	plataforma: z
		.string({ invalid_type_error: "Tipo não válido para a plataforma do dispositivo." })
		.optional()
		.nullable(),
	versaoApp: z
		.string({ invalid_type_error: "Tipo não válido para a versão do aplicativo." })
		.optional()
		.nullable(),
	versaoSo: z
		.string({ invalid_type_error: "Tipo não válido para a versão do sistema operacional." })
		.optional()
		.nullable(),
	fabricante: z
		.string({ invalid_type_error: "Tipo não válido para o fabricante do dispositivo." })
		.optional()
		.nullable(),
	modelo: z
		.string({ invalid_type_error: "Tipo não válido para o modelo do dispositivo." })
		.optional()
		.nullable(),
});
export type TAccessPrincipalDeviceMetadata = z.infer<typeof AccessPrincipalDeviceMetadataSchema>;

export const AccessScopesListSchema = z.array(AccessScopeEnum, {
	invalid_type_error: "Tipo não válido para a lista de scopes.",
});
export type TAccessScopesList = z.infer<typeof AccessScopesListSchema>;
