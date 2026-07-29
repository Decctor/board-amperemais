import type { z } from "zod";

/**
 * Parseia um JSONB de configuração tolerando shapes antigos: se a validação falhar, cai nos
 * defaults do schema em vez de derrubar a execução.
 *
 * É o que permite adicionar campos a `modeloConfig`/`capacidades` sem backfill — só funciona
 * porque todos os campos desses schemas têm `.default()` (ver `schemas/ai-agents.ts`).
 */
export function parseJsonbWithFallback<TSchema extends z.ZodTypeAny>(schema: TSchema, value: unknown): z.infer<TSchema> {
	const parsed = schema.safeParse(value);
	if (parsed.success) return parsed.data;
	return schema.parse(undefined);
}
