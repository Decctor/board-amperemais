import { useCallback, useState } from "react";
import { z } from "zod";

export const BulkSaleCanonicalFieldSchema = z.enum([
	"clienteNome",
	"clienteTelefone",
	"clienteCpfCnpj",
	"valorTotal",
	"vendedorNome",
	"parceiroNomeOuIdentificador",
	"dataVenda",
]);
export type TBulkSaleCanonicalField = z.infer<typeof BulkSaleCanonicalFieldSchema>;

export const BulkSalesMappingDefinitionSchema = z.object({
	field: BulkSaleCanonicalFieldSchema,
	sourceColumn: z.string().nullable(),
	confidence: z.number().min(0).max(1).nullable(),
	reason: z.string().optional().nullable(),
});
export type TBulkSalesMappingDefinition = z.infer<typeof BulkSalesMappingDefinitionSchema>;

export const BulkSalesMapInputSchema = z.object({
	headers: z.array(z.string()).min(1, "Cabeçalhos da planilha não informados."),
	sampleRows: z.array(z.record(z.string(), z.unknown())).min(1, "Amostra da planilha não informada."),
});
export type TBulkSalesMapInput = z.infer<typeof BulkSalesMapInputSchema>;

export const BulkSalesMapOutputSchema = z.object({
	mappingDefinitions: z.array(BulkSalesMappingDefinitionSchema),
	warnings: z.array(z.string()),
});
export type TBulkSalesMapOutput = z.infer<typeof BulkSalesMapOutputSchema>;

export const BulkSaleImportRowSchema = z
	.object({
		rowIndex: z.number().int().positive(),
		clienteNome: z.string({ invalid_type_error: "Nome do cliente deve ser texto." }).min(1, "Nome do cliente é obrigatório."),
		clienteTelefone: z.string({ invalid_type_error: "Telefone do cliente deve ser texto." }).optional().nullable(),
		clienteCpfCnpj: z.string({ invalid_type_error: "CPF/CNPJ do cliente deve ser texto." }).optional().nullable(),
		valorTotal: z.number({ invalid_type_error: "Valor total deve ser numérico." }).positive("Valor total deve ser maior que zero."),
		vendedorNome: z.string({ invalid_type_error: "Nome do vendedor deve ser texto." }).optional().nullable(),
		parceiroNomeOuIdentificador: z.string({ invalid_type_error: "Nome/identificador do parceiro deve ser texto." }).optional().nullable(),
		dataVenda: z
			.string({
				required_error: "Data da venda não informada.",
				invalid_type_error: "Data da venda deve ser texto.",
			})
			.datetime({ message: "Data da venda inválida." }),
	})
	.superRefine((row, ctx) => {
		const hasPhone = !!row.clienteTelefone?.trim();
		const hasDoc = !!row.clienteCpfCnpj?.trim();
		if (!hasPhone && !hasDoc) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["clienteTelefone"],
				message: "Informe telefone ou CPF/CNPJ do cliente.",
			});
		}
	});
export type TBulkSaleImportRow = z.infer<typeof BulkSaleImportRowSchema>;

export const BulkCreateSalesInputSchema = z.object({
	sales: z.array(BulkSaleImportRowSchema).min(1, "É necessário ao menos 1 venda para importar."),
});
export type TBulkCreateSalesInput = z.infer<typeof BulkCreateSalesInputSchema>;

export const BulkCreateSalesOutputSchema = z.object({
	data: z.object({
		insertedCount: z.number(),
		skippedCount: z.number(),
		createdClientsCount: z.number(),
		createdSellersCount: z.number(),
		createdPartnersCount: z.number(),
		errors: z.array(
			z.object({
				row: z.number(),
				message: z.string(),
			}),
		),
	}),
	message: z.string(),
});
export type TBulkCreateSalesOutput = z.infer<typeof BulkCreateSalesOutputSchema>;

export type TBulkCreateSalesImportState = "idle" | "parsing" | "mapping" | "preview" | "uploading" | "success" | "error";

type TUseBulkCreateSalesStateParams = {
	initialState?: Partial<{
		importState: TBulkCreateSalesImportState;
		fileName: string;
		headers: string[];
		rawRows: Array<Record<string, unknown>>;
		mappingDefinitions: TBulkSalesMappingDefinition[];
		normalizedRows: TBulkSaleImportRow[];
		warnings: string[];
		parseErrors: string[];
	}>;
};

export function useBulkCreateSalesState({ initialState }: TUseBulkCreateSalesStateParams = {}) {
	const [importState, setImportState] = useState<TBulkCreateSalesImportState>(initialState?.importState ?? "idle");
	const [fileName, setFileName] = useState(initialState?.fileName ?? "");
	const [headers, setHeaders] = useState<string[]>(initialState?.headers ?? []);
	const [rawRows, setRawRows] = useState<Array<Record<string, unknown>>>(initialState?.rawRows ?? []);
	const [mappingDefinitions, setMappingDefinitions] = useState<TBulkSalesMappingDefinition[]>(initialState?.mappingDefinitions ?? []);
	const [normalizedRows, setNormalizedRows] = useState<TBulkSaleImportRow[]>(initialState?.normalizedRows ?? []);
	const [warnings, setWarnings] = useState<string[]>(initialState?.warnings ?? []);
	const [parseErrors, setParseErrors] = useState<string[]>(initialState?.parseErrors ?? []);

	const redefineState = useCallback(
		(nextState: Partial<TUseBulkCreateSalesStateParams["initialState"]>) => {
			if (nextState?.importState) setImportState(nextState.importState);
			if (nextState?.fileName !== undefined) setFileName(nextState.fileName);
			if (nextState?.headers) setHeaders(nextState.headers);
			if (nextState?.rawRows) setRawRows(nextState.rawRows);
			if (nextState?.mappingDefinitions) setMappingDefinitions(nextState.mappingDefinitions);
			if (nextState?.normalizedRows) setNormalizedRows(nextState.normalizedRows as TBulkSaleImportRow[]);
			if (nextState?.warnings) setWarnings(nextState.warnings);
			if (nextState?.parseErrors) setParseErrors(nextState.parseErrors);
		},
		[],
	);

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

export type TUseBulkCreateSalesState = ReturnType<typeof useBulkCreateSalesState>;
