import { sql } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";
import { formatPhoneAsBase, formatStringAsOnlyDigits } from "./formatting";

export function createSimplifiedSearchCondition(column: PgColumn, term: string) {
	const lowerTerm = term.toLowerCase();
	return sql`unaccent_immutable(lower(${column})) LIKE '%' || unaccent_immutable(${lowerTerm}) || '%'`;
}

/**
 * Tokeniza um termo de busca livre: separa por qualquer caractere que não seja letra ou número,
 * descarta tokens curtos demais para discriminar e limita a quantidade para o custo da consulta
 * não crescer com o tamanho da frase.
 */
export function extractSearchTokens(term: string, { minLength = 2, maxTokens = 5 }: { minLength?: number; maxTokens?: number } = {}) {
	return term
		.split(/[^\p{L}\p{N}]+/u)
		.map((token) => token.trim())
		.filter((token) => token.length >= minLength)
		.slice(0, maxTokens);
}

/** Igualdade tolerante a acento e caixa — para filtros categóricos digitados por humanos (ou LLMs). */
export function createSimplifiedEqualityCondition(column: PgColumn, term: string) {
	return sql`unaccent_immutable(lower(${column})) = unaccent_immutable(${term.toLowerCase().trim()})`;
}

/**
 * Similaridade trigram entre o termo completo e a coluna. Usada para ordenar resultados por
 * relevância: compõe em `WHERE` (`sql\`${expr} > 0.3\``) e em `ORDER BY` (`sql\`${expr} DESC\``).
 */
export function createSimilarityExpression(column: PgColumn, term: string) {
	return sql`similarity(unaccent_immutable(lower(${column})), unaccent_immutable(${term.toLowerCase()}))`;
}

/**
 * `word_similarity`: quão bem o termo casa com o melhor trecho da coluna. É a medida certa para
 * "você quis dizer": um termo curto com erro de digitação ("vhinho") pontua alto contra um nome
 * longo ("Vinho Tinto Seco 750ml"), onde a `similarity` clássica diluiria o score.
 */
export function createWordSimilarityExpression(column: PgColumn, term: string) {
	return sql`word_similarity(unaccent_immutable(${term.toLowerCase()}), unaccent_immutable(lower(${column})))`;
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

/**
 * Variante de ramo único de `createSimplifiedPhoneSearchCondition` para colunas que guardam apenas
 * dígitos (`clients.telefone_base`). Normaliza o termo do lado da aplicação em vez de emitir dois
 * `LIKE`: um `OR` interno obriga o planner a varrer o índice trigram duas vezes, e o segundo ramo
 * — o termo cru, com máscara — nunca casa contra uma coluna sem máscara.
 *
 * `formatPhoneAsBase` só resolve com o número completo (>= 10 dígitos); em digitação parcial
 * caímos nos dígitos crus, que é o prefixo correto de uma coluna já normalizada.
 */
export function createDigitsOnlyPhoneSearchCondition(column: PgColumn, term: string) {
	const phoneBase = formatPhoneAsBase(term);
	const searchTerm = phoneBase || formatStringAsOnlyDigits(term);
	return sql`${column} LIKE '%' || ${searchTerm} || '%'`;
}

/**
 * Busca por conteúdo em coluna cujo valor é gravado com máscara (`clients.cpf_cnpj` guarda
 * "123.456.789-01"). Reduz os dois lados a dígitos, para que o termo digitado case
 * independentemente da pontuação.
 *
 * A expressão precisa ser idêntica à do índice `idx_clients_cpf_cnpj_digits_trgm` (migration
 * 0064) — inclusive o `coalesce` — ou o planner não a reconhece e volta ao Seq Scan.
 */
export function createSimplifiedDigitsSearchCondition(column: PgColumn, term: string) {
	const digits = formatStringAsOnlyDigits(term);
	return sql`regexp_replace(coalesce(${column}, ''), '[^0-9]', '', 'g') LIKE '%' || ${digits} || '%'`;
}

export function createSimplifiedEmailSearchCondition(column: PgColumn, term: string) {
	return sql`lower(${column}) LIKE '%' || ${term.toLowerCase()} || '%'`;
}
