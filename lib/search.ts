import { sql } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

export function createSimplifiedSearchCondition(column: PgColumn, term: string) {
	const lowerTerm = term.toLowerCase();
	return sql`unaccent_immutable(lower(${column})) LIKE '%' || unaccent_immutable(${lowerTerm}) || '%'`;
}
