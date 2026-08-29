import assert from "node:assert/strict";
import test from "node:test";
import z from "zod";
import { toolInputJsonSchema, zodToJsonSchema } from "./json-schema";

test("objeto separa obrigatórios de opcionais", () => {
	const schema = z.object({
		obrigatorio: z.string(),
		opcional: z.string().optional(),
		anulavel: z.string().optional().nullable(),
	});
	const json = zodToJsonSchema(schema);

	assert.equal(json.type, "object");
	assert.deepEqual(json.required, ["obrigatorio"]);
	assert.equal(json.additionalProperties, false);
});

test("ordem de optional/nullable não muda a obrigatoriedade", () => {
	// `.optional().nullable()` e `.nullable().optional()` aparecem misturados nas ferramentas;
	// se um deles virasse obrigatório, o modelo passaria a mandar `null` explícito à toa.
	const a = zodToJsonSchema(z.object({ campo: z.string().optional().nullable() }));
	const b = zodToJsonSchema(z.object({ campo: z.string().nullable().optional() }));
	assert.equal(a.required, undefined);
	assert.equal(b.required, undefined);
});

test("número inteiro com limites vira integer com minimum e maximum", () => {
	const json = zodToJsonSchema(z.number().int().positive().max(50));
	assert.equal(json.type, "integer");
	assert.equal(json.minimum, 0);
	assert.equal(json.maximum, 50);
});

test("enum vira string com a lista de valores", () => {
	const json = zodToJsonSchema(z.enum(["NOVA-COMPRA", "PRIMEIRA-COMPRA"]));
	assert.equal(json.type, "string");
	assert.deepEqual(json.enum, ["NOVA-COMPRA", "PRIMEIRA-COMPRA"]);
});

test("array carrega o schema dos itens", () => {
	const json = zodToJsonSchema(z.array(z.string()));
	assert.equal(json.type, "array");
	assert.deepEqual(json.items, { type: "string" });
});

test("objeto aninhado opcional preserva a forma interna", () => {
	const json = zodToJsonSchema(z.object({ periodo: z.object({ inicio: z.string().optional() }).optional().nullable() }));
	const periodo = (json.properties as Record<string, Record<string, unknown>>).periodo;
	assert.equal(periodo.type, "object");
	assert.equal(json.required, undefined);
});

test("describe sobrevive aos invólucros de optional e nullable", () => {
	const json = zodToJsonSchema(z.string().describe("Termo de busca").optional().nullable());
	assert.equal(json.description, "Termo de busca");
	assert.equal(json.type, "string");
});

test("tipo fora do subconjunto vira schema permissivo em vez de quebrar", () => {
	// A validação continua no Zod; o que se perde é só a dica para o modelo.
	const json = zodToJsonSchema(z.union([z.string(), z.number()]));
	assert.deepEqual(json, {});
});

test("toolInputJsonSchema sempre devolve um objeto, mesmo para schema não-objeto", () => {
	// O protocolo exige que `inputSchema` de ferramenta seja um JSON Schema de objeto.
	assert.equal(toolInputJsonSchema(z.string()).type, "object");
	assert.equal(toolInputJsonSchema(z.object({ a: z.string() })).type, "object");
});
