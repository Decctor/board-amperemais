import { getFixedDateFromExcel } from "@/lib/excel-utils";
import {
	BulkClientCanonicalFieldSchema,
	BulkClientsMappingDefinitionSchema,
	type TBulkClientsMappingDefinition,
	type TBulkCreateClientsImportState,
} from "@/state-hooks/use-bulk-create-clients";
import { z } from "zod";

export const FIELD_LABELS: Record<(typeof BulkClientCanonicalFieldSchema.options)[number], string> = {
	nome: "NOME",
	cpfCnpj: "CPF/CNPJ",
	telefone: "TELEFONE",
	email: "EMAIL",
	dataNascimento: "DATA DE NASCIMENTO",
	canalAquisicao: "CANAL DE AQUISIÇÃO",
	localizacaoCidade: "CIDADE",
	localizacaoEstado: "ESTADO",
	localizacaoBairro: "BAIRRO",
	localizacaoCep: "CEP",
};

export const REQUIRED_FIELDS: Array<(typeof BulkClientCanonicalFieldSchema.options)[number]> = ["nome"];

const BULK_INSERT_MAPPINGS_STORAGE_KEY = "recompracrm:clients-bulk-insert:mappings:v1";

const BulkInsertStoredMappingSchema = z.object({
	mappingDefinitions: z.array(BulkClientsMappingDefinitionSchema),
	updatedAt: z.number(),
});

const BulkInsertMappingsStorageSchema = z.record(BulkInsertStoredMappingSchema);

function forceUTCMidday(date: Date) {
	return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12, 0, 0, 0));
}

export function normalizeDateToDate(value: unknown) {
	if (value == null) return null;
	if (value instanceof Date && !Number.isNaN(value.getTime())) return forceUTCMidday(value);
	if (typeof value === "number") {
		const dateFromExcel = getFixedDateFromExcel(value);
		return Number.isNaN(dateFromExcel.getTime()) ? null : forceUTCMidday(dateFromExcel);
	}

	const strValue = String(value).trim();
	if (!strValue) return null;

	const brDateMatch = strValue.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
	if (brDateMatch) {
		const [, dd, mm, yyyy] = brDateMatch;
		const parsed = new Date(`${yyyy}-${mm}-${dd}T12:00:00.000Z`);
		return Number.isNaN(parsed.getTime()) ? null : parsed;
	}

	const isoDateOnlyMatch = strValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
	if (isoDateOnlyMatch) {
		const [, yyyy, mm, dd] = isoDateOnlyMatch;
		const parsed = new Date(`${yyyy}-${mm}-${dd}T12:00:00.000Z`);
		return Number.isNaN(parsed.getTime()) ? null : parsed;
	}

	const parsed = new Date(strValue);
	return Number.isNaN(parsed.getTime()) ? null : forceUTCMidday(parsed);
}

export function getDefaultMappings(): TBulkClientsMappingDefinition[] {
	return BulkClientCanonicalFieldSchema.options.map((field) => ({
		field,
		sourceColumn: null,
		confidence: null,
		reason: null,
	}));
}

export function getBulkInsertHeadersSignature(headers: string[]) {
	return headers.map((header) => header.trim().toLocaleLowerCase().replace(/\s+/g, " ")).join("||");
}

export function normalizeBulkInsertMappings(mappingDefinitions: TBulkClientsMappingDefinition[]): TBulkClientsMappingDefinition[] {
	const mappingByField = new Map(mappingDefinitions.map((mapping) => [mapping.field, mapping]));

	return BulkClientCanonicalFieldSchema.options.map((field) => {
		const mapping = mappingByField.get(field);

		return {
			field,
			sourceColumn: mapping?.sourceColumn ?? null,
			confidence: mapping?.confidence ?? null,
			reason: mapping?.reason ?? null,
		};
	});
}

export function loadBulkInsertMappingsFromStorage(headers: string[]) {
	if (typeof window === "undefined") return null;

	const storedValue = window.localStorage.getItem(BULK_INSERT_MAPPINGS_STORAGE_KEY);
	if (!storedValue) return null;

	try {
		const parsed = BulkInsertMappingsStorageSchema.safeParse(JSON.parse(storedValue));
		if (!parsed.success) return null;

		const signature = getBulkInsertHeadersSignature(headers);
		const cachedMapping = parsed.data[signature];
		if (!cachedMapping) return null;

		return normalizeBulkInsertMappings(cachedMapping.mappingDefinitions);
	} catch {
		return null;
	}
}

export function saveBulkInsertMappingsToStorage(headers: string[], mappingDefinitions: TBulkClientsMappingDefinition[]) {
	if (typeof window === "undefined") return;

	const signature = getBulkInsertHeadersSignature(headers);
	const nextCacheEntry = {
		mappingDefinitions: normalizeBulkInsertMappings(mappingDefinitions),
		updatedAt: Date.now(),
	};

	let currentCache: Record<string, z.infer<typeof BulkInsertStoredMappingSchema>> = {};

	try {
		const storedValue = window.localStorage.getItem(BULK_INSERT_MAPPINGS_STORAGE_KEY);
		const parsed = storedValue ? BulkInsertMappingsStorageSchema.safeParse(JSON.parse(storedValue)) : null;
		currentCache = parsed?.success ? parsed.data : {};
	} catch {
		currentCache = {};
	}

	window.localStorage.setItem(
		BULK_INSERT_MAPPINGS_STORAGE_KEY,
		JSON.stringify({
			...currentCache,
			[signature]: nextCacheEntry,
		}),
	);
}

export function getBulkInsertCurrentStepIndex(importState: TBulkCreateClientsImportState) {
	switch (importState) {
		case "idle":
		case "parsing":
			return 0;
		case "mapping":
			return 1;
		case "preview":
			return 2;
		case "uploading":
		case "success":
		case "error":
			return 3;
		default:
			return 0;
	}
}
