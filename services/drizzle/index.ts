import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import { type PostgresJsQueryResultHKT, drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export const connection = postgres(process.env.SUPABASE_DB_URL as string, {
	max_lifetime: 10, // Remove this line if you're deploying to Docker / VPS
	// idle_timeout: 20, // Uncomment this line if you're deploying to Docker / VPS
});

export const db = drizzle(connection, { schema });

export type DB = typeof db;
export type DBTransaction = PgTransaction<
	PostgresJsQueryResultHKT,
	typeof import("./schema/index"),
	ExtractTablesWithRelations<typeof import("./schema/index")>
>;
