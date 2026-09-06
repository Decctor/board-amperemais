import { z } from "zod";
export const ACTIVE_IMPORT_STATES = ["AGUARDANDO", "EM_ANDAMENTO", "PAUSADO_LIMITE", "AGUARDANDO_RECONEXAO"] as const;
export const CreateImportJobInputSchema = z.object({
 integrationId: z.string({ required_error: "Integração não informada.", invalid_type_error: "Integração inválida." }).min(1),
 janelaDias: z.number({ required_error: "Janela não informada.", invalid_type_error: "Janela inválida." }).int().min(1).max(365).default(90),
});
export type TImportJobCounters = {
 listados: number; elegiveis: number; ignoradosPorSituacao: number; situacoesDesconhecidas: number;
 importados: number; atualizados: number; clientesCriados: number; requisicoes: number; rateLimits: number;
};
export const EMPTY_IMPORT_COUNTERS: TImportJobCounters = { listados: 0, elegiveis: 0, ignoradosPorSituacao: 0, situacoesDesconhecidas: 0, importados: 0, atualizados: 0, clientesCriados: 0, requisicoes: 0, rateLimits: 0 };
