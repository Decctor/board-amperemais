import { sql } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";
import { formatPhoneAsBase } from "./formatting";

export function createSimplifiedSearchCondition(column: PgColumn, term: string) {
	const lowerTerm = term.toLowerCase();
	return sql`unaccent_immutable(lower(${column})) LIKE '%' || unaccent_immutable(${lowerTerm}) || '%'`;
}

export function createSimplifiedPhoneSearchCondition(column: PgColumn, term: string) {
	const phoneBase = formatPhoneAsBase(term);
	if (phoneBase) {
		return sql`(
            ${column} LIKE '%' || ${phoneBase} || '%'
            OR
            -- Caso o banco tenha guardado com máscara, tentamos o termo original
            ${column} LIKE '%' || ${term} || '%'
        )`;
	}
	return sql`${column} LIKE '%' || ${term} || '%'`;
}

export function createSimplifiedEmailSearchCondition(column: PgColumn, term: string) {
	return sql`lower(${column}) LIKE '%' || ${term.toLowerCase()} || '%'`;
}
