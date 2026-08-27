import type z from "zod";

/**
 * Conversor Zod → JSON Schema para o subconjunto usado pelos `inputSchema` das ferramentas MCP.
 *
 * Existe para que o Zod continue sendo a fonte única da verdade: o mesmo schema valida a chamada
 * e descreve a ferramenta para o modelo. Manter os dois à mão divergiria na primeira alteração,
 * e um JSON Schema desatualizado leva o modelo a mandar argumentos que a validação recusa.
 *
 * É deliberadamente parcial. O contrato com quem escreve ferramenta está em
 * `lib/agent-tools/registry.ts`: `inputSchema` fica dentro deste subconjunto — objeto de campos
 * escalares, enums e arrays, com `.optional()`, `.nullable()`, `.default()` e `.describe()`.
 * Qualquer coisa fora disso vira `{}` (aceita tudo), então a validação do Zod segue correta mas o
 * modelo perde a dica. Se um dia precisar de união, `refine` com semântica ou objeto aninhado
 * profundo, troque este arquivo por `zod-to-json-schema` em vez de esticar o subconjunto.
 */
export type TJsonSchema = Record<string, unknown>;

type TZodDef = {
	typeName?: string;
	description?: string;
	innerType?: z.ZodTypeAny;
	schema?: z.ZodTypeAny;
	type?: z.ZodTypeAny;
	values?: string[];
	checks?: Array<{ kind: string; value?: number }>;
	shape?: () => Record<string, z.ZodTypeAny>;
};

function getDef(schema: z.ZodTypeAny): TZodDef {
	return (schema as unknown as { _def: TZodDef })._def ?? {};
}

/** Remove os invólucros que não mudam a forma do dado, só a obrigatoriedade ou o default. */
function unwrap(schema: z.ZodTypeAny): z.ZodTypeAny {
	const def = getDef(schema);
	switch (def.typeName) {
		case "ZodOptional":
		case "ZodNullable":
		case "ZodDefault":
		case "ZodCatch":
		case "ZodReadonly":
			return def.innerType ? unwrap(def.innerType) : schema;
		case "ZodEffects":
			return def.schema ? unwrap(def.schema) : schema;
		default:
			return schema;
	}
}

function isOptional(schema: z.ZodTypeAny): boolean {
	const def = getDef(schema);
	if (def.typeName === "ZodOptional" || def.typeName === "ZodDefault" || def.typeName === "ZodCatch") return true;
	// `.optional().nullable()` e `.nullable().optional()` precisam dar o mesmo resultado.
	if (def.typeName === "ZodNullable" || def.typeName === "ZodReadonly") return def.innerType ? isOptional(def.innerType) : false;
	if (def.typeName === "ZodEffects") return def.schema ? isOptional(def.schema) : false;
	return false;
}

/** A descrição pode estar em qualquer camada do invólucro; a mais externa vence. */
function findDescription(schema: z.ZodTypeAny): string | undefined {
	const def = getDef(schema);
	if (def.description) return def.description;
	if (def.innerType) return findDescription(def.innerType);
	if (def.schema) return findDescription(def.schema);
	return undefined;
}

function convertNumber(def: TZodDef): TJsonSchema {
	const schema: TJsonSchema = { type: "number" };
	for (const check of def.checks ?? []) {
		if (check.kind === "int") schema.type = "integer";
		if (check.kind === "min" && typeof check.value === "number") schema.minimum = check.value;
		if (check.kind === "max" && typeof check.value === "number") schema.maximum = check.value;
	}
	return schema;
}

export function zodToJsonSchema(schema: z.ZodTypeAny): TJsonSchema {
	const description = findDescription(schema);
	const inner = unwrap(schema);
	const def = getDef(inner);

	let converted: TJsonSchema;
	switch (def.typeName) {
		case "ZodString":
			converted = { type: "string" };
			break;
		case "ZodNumber":
			converted = convertNumber(def);
			break;
		case "ZodBoolean":
			converted = { type: "boolean" };
			break;
		case "ZodDate":
			converted = { type: "string", format: "date-time" };
			break;
		case "ZodEnum":
			converted = { type: "string", enum: def.values ?? [] };
			break;
		case "ZodLiteral":
			converted = { const: (def as { value?: unknown }).value };
			break;
		case "ZodArray":
			converted = { type: "array", items: def.type ? zodToJsonSchema(def.type) : {} };
			break;
		case "ZodObject": {
			const shape = def.shape?.() ?? {};
			const properties: Record<string, TJsonSchema> = {};
			const required: string[] = [];
			for (const [key, value] of Object.entries(shape)) {
				properties[key] = zodToJsonSchema(value);
				if (!isOptional(value)) required.push(key);
			}
			converted = { type: "object", properties, additionalProperties: false };
			if (required.length > 0) converted.required = required;
			break;
		}
		default:
			// Fora do subconjunto: aceita qualquer coisa aqui e deixa o Zod recusar na validação.
			converted = {};
	}

	return description ? { ...converted, description } : converted;
}

/**
 * O `inputSchema` de uma ferramenta MCP precisa ser um JSON Schema de objeto, mesmo quando a
 * ferramenta não recebe argumento nenhum.
 */
export function toolInputJsonSchema(schema: z.ZodTypeAny): TJsonSchema {
	const converted = zodToJsonSchema(schema);
	if (converted.type === "object") return converted;
	return { type: "object", properties: {}, additionalProperties: false };
}
