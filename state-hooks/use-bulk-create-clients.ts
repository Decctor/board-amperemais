import { useCallback, useState } from "react";
import { z } from "zod";

export const BulkClientCanonicalFieldSchema = z.enum([
	"nome",
	"cpfCnpj",
	"telefone",
	"email",
	"dataNascimento",
	"canalAquisicao",
	"localizacaoCidade",
	"localizacaoEstado",
	"localizacaoBairro",
	"localizacaoCep",
]);
export type TBulkClientCanonicalField = z.infer<typeof BulkClientCanonicalFieldSchema>;

export const BulkClientsMappingDefinitionSchema = z.object({
	field: BulkClientCanonicalFieldSchema,
	sourceColumn: z.string().nullable(),
	confidence: z.number().min(0).max(1).nullable(),
	reason: z.string().optional().nullable(),
});
export type TBulkClientsMappingDefinition = z.infer<typeof BulkClientsMappingDefinitionSchema>;

export const BulkClientsMapInputSchema = z.object({
	headers: z.array(z.string()).min(1, "Cabeçalhos da planilha não informados."),
	sampleRows: z.array(z.record(z.string(), z.unknown())).min(1, "Amostra da planilha não informada."),
});
export type TBulkClientsMapInput = z.infer<typeof BulkClientsMapInputSchema>;

export const BulkClientsMapOutputSchema = z.object({
	mappingDefinitions: z.array(BulkClientsMappingDefinitionSchema),
	warnings: z.array(z.string()),
});
export type TBulkClientsMapOutput = z.infer<typeof BulkClientsMapOutputSchema>;

export const BulkClientImportRowSchema = z.object({
	rowIndex: z.number().int().positive(),
	nome: z
		.string({
			required_error: "Nome do cliente é obrigatório.",
			invalid_type_error: "Nome do cliente deve ser um texto.",
		})
		.min(1, "Nome do cliente é obrigatório."),
	cpfCnpj: z.string({ invalid_type_error: "CPF/CNPJ deve ser um texto." }).optional().nullable(),
	telefone: z.string({ invalid_type_error: "Telefone deve ser um texto." }).optional().nullable(),
	email: z.string({ invalid_type_error: "Email deve ser um texto." }).email("Email inválido.").optional().nullable().or(z.literal("")),
	dataNascimento: z.date({ invalid_type_error: "Data de nascimento inválida." }).optional().nullable(),
	canalAquisicao: z.string({ invalid_type_error: "Canal de aquisição deve ser um texto." }).optional().nullable(),
	localizacaoCidade: z.string({ invalid_type_error: "Cidade deve ser um texto." }).optional().nullable(),
	localizacaoEstado: z.string({ invalid_type_error: "Estado deve ser um texto." }).optional().nullable(),
	localizacaoBairro: z.string({ invalid_type_error: "Bairro deve ser um texto." }).optional().nullable(),
	localizacaoCep: z.string({ invalid_type_error: "CEP deve ser um texto." }).optional().nullable(),
});
export type TBulkClientImportRow = z.infer<typeof BulkClientImportRowSchema>;

export const BulkCreateClientsInputSchema = z.object({
	clients: z.array(BulkClientImportRowSchema).min(1, "É necessário pelo menos 1 cliente para importar."),
});
export type TBulkCreateClientsInput = z.infer<typeof BulkCreateClientsInputSchema>;

export const BulkCreateClientsOutputSchema = z.object({
	data: z.object({
		insertedCount: z.number(),
		updatedCount: z.number(),
		skippedCount: z.number(),
		errors: z.array(
			z.object({
				row: z.number(),
				message: z.string(),
			}),
		),
	}),
	message: z.string(),
});
export type TBulkCreateClientsOutput = z.infer<typeof BulkCreateClientsOutputSchema>;

export type TBulkCreateClientsImportState = "idle" | "parsing" | "mapping" | "preview" | "uploading" | "success" | "error";

type TUseBulkCreateClientsStateParams = {
	initialState?: Partial<{
		importState: TBulkCreateClientsImportState;
		fileName: string;
		headers: string[];
		rawRows: Array<Record<string, unknown>>;
		mappingDefinitions: TBulkClientsMappingDefinition[];
		normalizedRows: TBulkClientImportRow[];
		warnings: string[];
		parseErrors: string[];
	}>;
};

export function useBulkCreateClientsState({ initialState }: TUseBulkCreateClientsStateParams = {}) {
	const [importState, setImportState] = useState<TBulkCreateClientsImportState>(initialState?.importState ?? "idle");
	const [fileName, setFileName] = useState(initialState?.fileName ?? "");
	const [headers, setHeaders] = useState<string[]>(initialState?.headers ?? []);
	const [rawRows, setRawRows] = useState<Array<Record<string, unknown>>>(initialState?.rawRows ?? []);
	const [mappingDefinitions, setMappingDefinitions] = useState<TBulkClientsMappingDefinition[]>(initialState?.mappingDefinitions ?? []);
	const [normalizedRows, setNormalizedRows] = useState<TBulkClientImportRow[]>(initialState?.normalizedRows ?? []);
	const [warnings, setWarnings] = useState<string[]>(initialState?.warnings ?? []);
	const [parseErrors, setParseErrors] = useState<string[]>(initialState?.parseErrors ?? []);

	const redefineState = useCallback((nextState: Partial<TUseBulkCreateClientsStateParams["initialState"]>) => {
		if (nextState?.importState) setImportState(nextState.importState);
		if (nextState?.fileName !== undefined) setFileName(nextState.fileName);
		if (nextState?.headers) setHeaders(nextState.headers);
		if (nextState?.rawRows) setRawRows(nextState.rawRows);
		if (nextState?.mappingDefinitions) setMappingDefinitions(nextState.mappingDefinitions);
		if (nextState?.normalizedRows) setNormalizedRows(nextState.normalizedRows as TBulkClientImportRow[]);
		if (nextState?.warnings) setWarnings(nextState.warnings);
		if (nextState?.parseErrors) setParseErrors(nextState.parseErrors);
	}, []);

	const resetState = useCallback(() => {
		setImportState("idle");
		setFileName("");
		setHeaders([]);
		setRawRows([]);
		setMappingDefinitions([]);
		setNormalizedRows([]);
		setWarnings([]);
		setParseErrors([]);
	}, []);

	return {
		importState,
		fileName,
		headers,
		rawRows,
		mappingDefinitions,
		normalizedRows,
		warnings,
		parseErrors,
		setImportState,
		setFileName,
		setHeaders,
		setRawRows,
		setMappingDefinitions,
		setNormalizedRows,
		setWarnings,
		setParseErrors,
		redefineState,
		resetState,
	};
}

export type TUseBulkCreateClientsState = ReturnType<typeof useBulkCreateClientsState>;
