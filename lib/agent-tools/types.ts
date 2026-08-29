import type { TAccessScopeEnum } from "@/schemas/enums";
import z from "zod";

export const AgentMutationControlInputSchema = z.object({
	chaveIdempotencia: z
		.string({ required_error: "Chave de idempotência não informada.", invalid_type_error: "Tipo inválido para a chave de idempotência." })
		.trim()
		.min(8, "A chave de idempotência precisa ter ao menos 8 caracteres.")
		.max(200, "A chave de idempotência precisa ter no máximo 200 caracteres."),
});

/**
 * Modo do ator, derivado do **tipo do principal** na autenticação — nunca de um argumento da
 * ferramenta, nunca do prompt. É o que impede um agente em modo ORG de pedir dados de outra
 * organização: ele não tem como afirmar que é plataforma.
 */
export type TAgentActorMode = "ORG" | "PLATAFORMA";

export type TAgentActorContext = {
	mode: TAgentActorMode;
	principalId: string;
	credentialId: string;
	clientId: string;
	clientCode: string;
	/** Preenchido exatamente quando `mode === "ORG"`. Ver `resolveOrganizationScope`. */
	organizationId: string | null;
	/** Usuário configurado por um administrador para assumir `autorId` nas mutações MCP. */
	responsibleUserId: string | null;
	scopes: ReadonlySet<string>;
};

/**
 * Definição de uma ferramenta exposta via MCP.
 *
 * `scopes` e `modes` não são documentação: o registro filtra a lista de ferramentas por eles
 * antes de o modelo ver qualquer coisa. Uma ferramenta que o ator não pode chamar não aparece
 * em `tools/list` — modelos lidam bem com uma ferramenta ausente e mal com uma proibida
 * (repetem a chamada, reformulam, gastam turnos).
 */
export type TAgentToolDefinition<TInputSchema extends z.ZodTypeAny = z.ZodTypeAny> = {
	name: string;
	/** Rótulo curto para clientes que exibem as ferramentas ao usuário. */
	title: string;
	/**
	 * Descrição sensível ao modo: em PLATAFORMA ela precisa explicar o argumento
	 * `organizacaoId`, que em ORG sequer existe no schema.
	 */
	describe: (actor: TAgentActorContext) => string;
	/** Todos exigidos (E lógico), sempre por igualdade exata — sem wildcards. */
	scopes: TAccessScopeEnum[];
	modes: TAgentActorMode[];
	/** Oculta a ferramenta quando a conexão não tem atribuição humana configurada. */
	requiresResponsibleUser?: boolean;
	/** Marca side effects para clientes MCP e impede execução acidental no smoke test de leitura. */
	mutates?: boolean;
	/** A mutação atravessa o sistema (ativação/envio) e pode exigir aprovação. */
	externalEffect?: boolean;
	inputSchema: TInputSchema;
	execute: (input: z.infer<TInputSchema>, actor: TAgentActorContext) => Promise<unknown>;
};

/**
 * Definição com o tipo de input apagado — mesmo motivo de `lib/ai/tools/types.ts`: o registro
 * guarda ferramentas de schemas diferentes lado a lado e `execute` é contravariante no input.
 */
export type TAgentToolDefinitionErased = Omit<TAgentToolDefinition, "execute" | "inputSchema"> & {
	inputSchema: z.ZodTypeAny;
	execute: (input: never, actor: TAgentActorContext) => Promise<unknown>;
};

/**
 * Helper de identidade: existe só para o TypeScript inferir `z.infer<TInputSchema>` no
 * parâmetro do `execute` a partir do `inputSchema` declarado ao lado.
 */
export function defineAgentTool<TInputSchema extends z.ZodTypeAny>(
	definition: TAgentToolDefinition<TInputSchema>,
): TAgentToolDefinition<TInputSchema> {
	return definition;
}
