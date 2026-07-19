import type { TFinancialOpenFinanceProviderEnum } from "@/schemas/enums";
import type { TFinancialOpenFinanceConnection } from "@/services/drizzle/schema";

/**
 * Contrato de agregador OpenFinance (Fase 4 — docs/bank-reconciliation-design.md §9).
 * Um provider real (Pluggy/Belvo) implementa esta interface e é registrado em PROVIDERS;
 * o restante do pipeline (sync → import OPEN_FINANCE → ingest → matching) não muda.
 */

export type TOpenFinanceProviderTransaction = {
	/** Identificador estável no agregador — chave de idempotência (idExterno). */
	idExterno: string;
	data: Date;
	descricao: string;
	/** Valor com sinal: positivo = entrada, negativo = saída. */
	valor: number;
	metadados?: Record<string, unknown> | null;
};

export type TOpenFinanceProvider = {
	key: TFinancialOpenFinanceProviderEnum;
	/** Busca transações da conta conectada desde `since` (inclusive). */
	fetchTransactions(args: { connection: TFinancialOpenFinanceConnection; since: Date }): Promise<{
		transacoes: TOpenFinanceProviderTransaction[];
		saldoAtual: number | null;
	}>;
};

/**
 * Provider MOCK: valida o pipeline ponta a ponta sem agregador contratado. Não retorna
 * transações — a troca por um provider real é registrar a implementação aqui.
 */
const mockProvider: TOpenFinanceProvider = {
	key: "MOCK",
	async fetchTransactions() {
		return { transacoes: [], saldoAtual: null };
	},
};

const PROVIDERS: Partial<Record<TFinancialOpenFinanceProviderEnum, TOpenFinanceProvider>> = {
	MOCK: mockProvider,
};

export function getOpenFinanceProvider(key: string): TOpenFinanceProvider | null {
	return PROVIDERS[key as TFinancialOpenFinanceProviderEnum] ?? null;
}
