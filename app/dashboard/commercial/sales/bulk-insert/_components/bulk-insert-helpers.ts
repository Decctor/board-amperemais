import { getFixedDateFromExcel } from "@/lib/excel-utils";
import {
	BulkSaleCanonicalFieldSchema,
	BulkSalesMappingDefinitionSchema,
	type TBulkCreateSalesImportState,
	type TBulkSalesMappingDefinition,
} from "@/state-hooks/use-bulk-create-sales";
import { z } from "zod";

export const FIELD_LABELS: Record<(typeof BulkSaleCanonicalFieldSchema.options)[number], string> = {
	clienteNome: "NOME DO CLIENTE",
	clienteTelefone: "TELEFONE DO CLIENTE",
	clienteCpfCnpj: "CPF/CNPJ DO CLIENTE",
	valorTotal: "VALOR TOTAL",
	vendedorNome: "NOME DO VENDEDOR",
	parceiroNomeOuIdentificador: "NOME/IDENTIFICADOR DO PARCEIRO",
	dataVenda: "DATA DA VENDA",
};

export const REQUIRED_FIELDS: Array<(typeof BulkSaleCanonicalFieldSchema.options)[number]> = ["clienteNome", "valorTotal", "dataVenda"];

const BULK_INSERT_MAPPINGS_STORAGE_KEY = "recompracrm:sales-bulk-insert:mappings:v1";

const BulkInsertStoredMappingSchema = z.object({
	mappingDefinitions: z.array(BulkSalesMappingDefinitionSchema),
	updatedAt: z.number(),
});

const BulkInsertMappingsStorageSchema = z.record(BulkInsertStoredMappingSchema);

export function normalizeDateToISOString(value: unknown) {
	if (value == null) return "";
	if (typeof value === "number") return getFixedDateFromExcel(value).toISOString();
	if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();

	const strValue = String(value).trim();
	if (!strValue) return "";

	const brDateMatch = strValue.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
	if (brDateMatch) {
		const [, dd, mm, yyyy] = brDateMatch;
		const parsed = new Date(`${yyyy}-${mm}-${dd}T12:00:00.000Z`);
		return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
	}

	const parsed = new Date(strValue);
	return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
}

export function normalizeCurrency(value: unknown) {
	if (typeof value === "number") return value;
	const normalized = String(value ?? "")
		.trim()
		.replace(/\./g, "")
		.replace(",", ".")
		.replace(/[^\d.-]/g, "");
	const parsed = Number(normalized);
	return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export function getDefaultMappings(): TBulkSalesMappingDefinition[] {
	return BulkSaleCanonicalFieldSchema.options.map((field) => ({
		field,
		sourceColumn: null,
		confidence: null,
		reason: null,
	}));
}

export function getBulkInsertHeadersSignature(headers: string[]) {
	return headers.map((header) => header.trim().toLocaleLowerCase().replace(/\s+/g, " ")).join("||");
}

export function normalizeBulkInsertMappings(mappingDefinitions: TBulkSalesMappingDefinition[]): TBulkSalesMappingDefinition[] {
	const mappingByField = new Map(mappingDefinitions.map((mapping) => [mapping.field, mapping]));

	return BulkSaleCanonicalFieldSchema.options.map((field) => {
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

export function saveBulkInsertMappingsToStorage(headers: string[], mappingDefinitions: TBulkSalesMappingDefinition[]) {
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

export function getBulkInsertCurrentStepIndex(importState: TBulkCreateSalesImportState) {
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
