import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type { PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";
import type * as schema from "@/services/drizzle/schema";

export type TransactionClient = PgTransaction<PostgresJsQueryResultHKT, typeof schema, ExtractTablesWithRelations<typeof schema>>;

// Métodos que têm dinheiro físico na gaveta e exigem contagem no fechamento.
// Os demais métodos são resumo de movimento/recebível (sem contagem física).
export function isCashDrawerMethod(metodo: string): boolean {
	return metodo === "DINHEIRO";
}
