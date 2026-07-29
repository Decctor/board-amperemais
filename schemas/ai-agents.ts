import z from "zod";
import { AiAgentRunGatilhoEnum, AiAgentRunStatusEnum, AiAgentStatusEnum, AiAgentToolCallStatusEnum, AiAgentToolNameEnum } from "./enums";

/**
 * Configuração do agente de IA de atendimento — um por organização.
 *
 * Os três blocos de configuração (`modeloConfig`, `capacidades`, e o snapshot gravado em cada
 * execução) vivem em JSONB. Por isso **todo campo tem `.default()`**, inclusive os objetos:
 * uma configuração persistida antes de um campo existir continua parseando via
 * `parseJsonbWithFallback` (`lib/ai/shared/json.ts`), em vez de derrubar a execução.
 */

// ============================================================================
// MODELO
// ============================================================================

export const DEFAULT_AI_AGENT_MODEL = "openai/gpt-5";

export const AiAgentModeloConfigSchema = z
	.object({
		modelo: z.string({ invalid_type_error: "Tipo não válido para o modelo do agente." }).default(DEFAULT_AI_AGENT_MODEL),
		temperatura: z
			.number({ invalid_type_error: "Tipo não válido para a temperatura do agente." })
			.min(0, "A temperatura mínima é 0.")
			.max(2, "A temperatura máxima é 2.")
			.optional(),
		maxTokensSaida: z
			.number({ invalid_type_error: "Tipo não válido para o limite de tokens de saída." })
			.int("O limite de tokens de saída deve ser inteiro.")
			.positive("O limite de tokens de saída deve ser positivo.")
			.optional(),
		topP: z
			.number({ invalid_type_error: "Tipo não válido para o top P do agente." })
			.min(0, "O top P mínimo é 0.")
			.max(1, "O top P máximo é 1.")
			.optional(),
	})
	.default({});
export type TAiAgentModeloConfig = z.infer<typeof AiAgentModeloConfigSchema>;

// ============================================================================
// CAPACIDADES (camada de permissão)
// ============================================================================
//
// `capacidades` é o que o runtime consulta para montar o toolset E o que cada execução de
// ferramenta revalida (`assertToolEnabled`). Desabilitar uma ferramenta aqui a remove do
// prompt e bloqueia sua execução, mesmo que o modelo tente chamá-la.

export const AiAgentFerramentaConfigSchema = z.object({
	habilitada: z.boolean({ invalid_type_error: "Tipo não válido para a habilitação da ferramenta." }).default(false),
});
export type TAiAgentFerramentaConfig = z.infer<typeof AiAgentFerramentaConfigSchema>;

export const AiAgentFerramentasConfigSchema = z
	.object({
		"clientes.consultar_compras": AiAgentFerramentaConfigSchema.optional(),
		"produtos.consultar": AiAgentFerramentaConfigSchema.optional(),
		"cashback.consultar": AiAgentFerramentaConfigSchema.optional(),
		"cupons.consultar": AiAgentFerramentaConfigSchema.optional(),
		"atendimento.transferir_para_humano": AiAgentFerramentaConfigSchema.optional(),
	})
	.default({});
export type TAiAgentFerramentasConfig = z.infer<typeof AiAgentFerramentasConfigSchema>;

export const AiAgentCapacidadesSchema = z
	.object({
		version: z.literal(1).default(1),
		ferramentas: AiAgentFerramentasConfigSchema,
		limites: z
			.object({
				// Vira `stopWhen: stepCountIs(...)` no loop do agente.
				maxChamadasFerramentasPorRun: z
					.number({ invalid_type_error: "Tipo não válido para o limite de chamadas de ferramentas." })
					.int("O limite de chamadas de ferramentas deve ser inteiro.")
					.min(1, "O limite mínimo de chamadas de ferramentas é 1.")
					.max(30, "O limite máximo de chamadas de ferramentas é 30.")
					.default(15),
				// Freio de custo por organização, checado em `prepareAgentExecution`.
				maxRunsDiarios: z
					.number({ invalid_type_error: "Tipo não válido para o limite diário de execuções." })
					.int("O limite diário de execuções deve ser inteiro.")
					.min(1, "O limite diário mínimo de execuções é 1.")
					.default(500),
			})
			.default({}),
		atendimento: z
			.object({
				// Debounce antes de responder: agrupa mensagens enviadas em sequência pelo cliente.
				atrasoRespostaMs: z
					.number({ invalid_type_error: "Tipo não válido para o atraso de resposta." })
					.int("O atraso de resposta deve ser inteiro.")
					.min(0, "O atraso de resposta mínimo é 0ms.")
					.max(60000, "O atraso de resposta máximo é 60000ms.")
					.default(5000),
			})
			.default({}),
	})
	.default({});
export type TAiAgentCapacidades = z.infer<typeof AiAgentCapacidadesSchema>;

// ============================================================================
// EXECUÇÃO (run)
// ============================================================================

export const AiAgentUsoSchema = z.object({
	tokensEntrada: z.number({ invalid_type_error: "Tipo não válido para os tokens de entrada." }).optional(),
	tokensSaida: z.number({ invalid_type_error: "Tipo não válido para os tokens de saída." }).optional(),
	tokensTotal: z.number({ invalid_type_error: "Tipo não válido para o total de tokens." }).optional(),
	modelo: z.string({ invalid_type_error: "Tipo não válido para o modelo utilizado." }).optional(),
});
export type TAiAgentUso = z.infer<typeof AiAgentUsoSchema>;

/**
 * Config que estava valendo no momento da execução. Substitui o versionamento: o agente é
 * editado direto, e cada run carrega consigo a configuração que o produziu.
 */
export const AiAgentConfigSnapshotSchema = z.object({
	instrucoes: z.string({ invalid_type_error: "Tipo não válido para as instruções." }),
	modeloConfig: AiAgentModeloConfigSchema,
	capacidades: AiAgentCapacidadesSchema,
	conhecimento: z.array(
		z.object({
			id: z.string({ invalid_type_error: "Tipo não válido para o ID do bloco de conhecimento." }),
			titulo: z.string({ invalid_type_error: "Tipo não válido para o título do bloco de conhecimento." }),
		}),
	),
});
export type TAiAgentConfigSnapshot = z.infer<typeof AiAgentConfigSnapshotSchema>;

/** Saída estruturada de um turno. `mensagem: null` = o agente decidiu não responder. */
export const AiAgentTurnOutputSchema = z.object({
	mensagem: z.string().nullable(),
	resumoAtendimento: z.string(),
});
export type TAiAgentTurnOutput = z.infer<typeof AiAgentTurnOutputSchema>;

// ============================================================================
// ENTIDADES
// ============================================================================

export const AiAgentSchema = z.object({
	organizacaoId: z.string({
		required_error: "ID da organização não informado.",
		invalid_type_error: "Tipo não válido para o ID da organização.",
	}),
	nome: z
		.string({ required_error: "Nome do agente não informado.", invalid_type_error: "Tipo não válido para o nome do agente." })
		.min(1, "O nome do agente não pode ser vazio.")
		.max(255, "O nome do agente deve ter no máximo 255 caracteres."),
	status: AiAgentStatusEnum,
	instrucoes: z
		.string({ required_error: "Instruções do agente não informadas.", invalid_type_error: "Tipo não válido para as instruções do agente." })
		.min(1, "As instruções do agente não podem ser vazias.")
		.max(20000, "As instruções do agente devem ter no máximo 20000 caracteres."),
	modeloConfig: AiAgentModeloConfigSchema,
	capacidades: AiAgentCapacidadesSchema,
	dataInsercao: z
		.string()
		.datetime()
		.transform((val) => new Date(val)),
});
export type TAiAgent = z.infer<typeof AiAgentSchema>;

export const AiAgentKnowledgeSchema = z.object({
	organizacaoId: z.string({
		required_error: "ID da organização não informado.",
		invalid_type_error: "Tipo não válido para o ID da organização.",
	}),
	agenteId: z.string({ required_error: "ID do agente não informado.", invalid_type_error: "Tipo não válido para o ID do agente." }),
	titulo: z
		.string({ required_error: "Título do bloco não informado.", invalid_type_error: "Tipo não válido para o título do bloco." })
		.min(1, "O título do bloco não pode ser vazio.")
		.max(120, "O título do bloco deve ter no máximo 120 caracteres."),
	conteudo: z
		.string({ required_error: "Conteúdo do bloco não informado.", invalid_type_error: "Tipo não válido para o conteúdo do bloco." })
		.min(1, "O conteúdo do bloco não pode ser vazio.")
		.max(8000, "O conteúdo do bloco deve ter no máximo 8000 caracteres."),
	ativo: z.boolean({ invalid_type_error: "Tipo não válido para a ativação do bloco." }),
	ordem: z.number({ invalid_type_error: "Tipo não válido para a ordem do bloco." }).int("A ordem do bloco deve ser inteira."),
	dataInsercao: z
		.string()
		.datetime()
		.transform((val) => new Date(val)),
});
export type TAiAgentKnowledge = z.infer<typeof AiAgentKnowledgeSchema>;

// ============================================================================
// INPUTS DE API
// ============================================================================

/** Campos editáveis do agente (o resto é derivado ou imutável). */
export const UpdateAiAgentSchema = AiAgentSchema.omit({ organizacaoId: true, dataInsercao: true });
export type TUpdateAiAgent = z.infer<typeof UpdateAiAgentSchema>;

/** Bloco de conhecimento vindo do cliente: `id` ausente = novo; `deletar` = remoção. */
export const UpdateAiAgentKnowledgeSchema = AiAgentKnowledgeSchema.omit({
	organizacaoId: true,
	agenteId: true,
	dataInsercao: true,
}).extend({
	id: z.string({ invalid_type_error: "Tipo não válido para o ID do bloco." }).optional(),
	deletar: z.boolean({ invalid_type_error: "Tipo não válido para a remoção do bloco." }).optional(),
});
export type TUpdateAiAgentKnowledge = z.infer<typeof UpdateAiAgentKnowledgeSchema>;

// Re-exports de conveniência para quem consome só este módulo.
export { AiAgentRunGatilhoEnum, AiAgentRunStatusEnum, AiAgentStatusEnum, AiAgentToolCallStatusEnum, AiAgentToolNameEnum };
