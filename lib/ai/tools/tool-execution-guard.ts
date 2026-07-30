import type { TAgentToolOutput } from "./types";

type TCacheEntry = {
	promise: Promise<TAgentToolOutput>;
	repeticoes: number;
};

export function createAgentToolExecutionGuard(maxCalls: number) {
	const cache = new Map<string, TCacheEntry>();
	let executedCalls = 0;

	return async function executeGuarded(key: string, execute: () => Promise<TAgentToolOutput>): Promise<TAgentToolOutput> {
		const cached = cache.get(key);
		if (cached) {
			cached.repeticoes += 1;
			if (cached.repeticoes >= 2) {
				return {
					success: false,
					message: "Essa consulta já foi repetida com os mesmos filtros. Use o resultado anterior, altere os filtros ou responda ao cliente.",
					result: { codigo: "CONSULTA_REPETIDA" },
				};
			}
			return cached.promise;
		}

		if (executedCalls >= maxCalls) {
			return {
				success: false,
				message: "O limite de chamadas de ferramentas desta execução foi atingido. Responda com os resultados já obtidos.",
				result: { codigo: "LIMITE_CHAMADAS_ATINGIDO" },
			};
		}

		executedCalls += 1;
		const entry: TCacheEntry = { promise: Promise.resolve().then(execute), repeticoes: 0 };
		cache.set(key, entry);
		return entry.promise;
	};
}
