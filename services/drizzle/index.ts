import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import { type PostgresJsQueryResultHKT, drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// O SUPABASE_DB_URL usa o Transaction Pooler (Supavisor, porta 6543), que não suporta prepared
// statements entre transações. Sem `prepare: false`, uma conexão pode reutilizar statements de
// outra sessão do pool e produzir leituras/escritas inconsistentes.
export const connection = postgres(process.env.SUPABASE_DB_URL as string, { prepare: false });

export const db = drizzle(connection, { schema });

export type DB = typeof db;
export type DBTransaction = PgTransaction<
	PostgresJsQueryResultHKT,
	typeof import("./schema/index"),
	ExtractTablesWithRelations<typeof import("./schema/index")>
>;
