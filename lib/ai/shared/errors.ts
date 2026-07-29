/**
 * Erros tipados do módulo de agentes. São discriminados por `name` (não `instanceof`), que
 * sobrevive a boundaries de bundle e serialização.
 */

/** Agente ausente, `PAUSADO`, ou com configuração inválida. */
export class AgentInactiveError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "AgentInactiveError";
	}
}

/** Freio de custo: a organização estourou `capacidades.limites.maxRunsDiarios`. */
export class AgentDailyRunLimitError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "AgentDailyRunLimitError";
	}
}

/** O modelo tentou uma ferramenta que as capacidades do agente não permitem. */
export class AgentToolNotEnabledError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "AgentToolNotEnabledError";
	}
}

/** Falha na execução de uma ferramenta. */
export class AgentToolExecutionError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "AgentToolExecutionError";
	}
}

export function isAgentError(error: unknown, name: string): boolean {
	return error instanceof Error && error.name === name;
}
