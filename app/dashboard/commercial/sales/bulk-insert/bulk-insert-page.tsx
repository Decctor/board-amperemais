"use client";

import { getJSONFromExcelFile } from "@/lib/excel-utils";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { bulkCreateSales, suggestSalesSheetMapping } from "@/lib/mutations/sales";
import {
	BulkSaleImportRowSchema,
	type TBulkCreateSalesOutput,
	type TBulkSaleImportRow,
	useBulkCreateSalesState,
} from "@/state-hooks/use-bulk-create-sales";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { BulkInsertErrorStage } from "./_components/bulk-insert-error-stage";
import {
	FIELD_LABELS,
	REQUIRED_FIELDS,
	getDefaultMappings,
	loadBulkInsertMappingsFromStorage,
	normalizeCurrency,
	normalizeDateToISOString,
	saveBulkInsertMappingsToStorage,
} from "./_components/bulk-insert-helpers";
import { BulkInsertIdleStage } from "./_components/bulk-insert-idle-stage";
import { BulkInsertMappingStage } from "./_components/bulk-insert-mapping-stage";
import { BulkInsertParsingStage } from "./_components/bulk-insert-parsing-stage";
import { BulkInsertPreviewStage } from "./_components/bulk-insert-preview-stage";
import { BulkInsertSuccessStage } from "./_components/bulk-insert-success-stage";
import { BulkInsertUploadingStage } from "./_components/bulk-insert-uploading-stage";

type BulkInsertPageProps = {
	user: TAuthUserSession["user"];
	membership: TAuthUserSession["membership"];
};

type TMappingSource = "cache" | "ai" | "manual";

export default function BulkInsertPage(_: BulkInsertPageProps) {
	const router = useRouter();
	const [uploadProgress, setUploadProgress] = useState(0);
	const [importResult, setImportResult] = useState<TBulkCreateSalesOutput["data"] | null>(null);
	const [isRemapping, setIsRemapping] = useState(false);
	const [mappingSource, setMappingSource] = useState<TMappingSource | null>(null);

	const {
		importState,
		fileName,
		headers,
		rawRows,
		mappingDefinitions,
		normalizedRows,
		parseErrors,
		warnings,
		setImportState,
		setFileName,
		setHeaders,
		setRawRows,
		setMappingDefinitions,
		setNormalizedRows,
		setParseErrors,
		setWarnings,
		resetState,
	} = useBulkCreateSalesState();

	const resetImportFlow = useCallback(() => {
		resetState();
		setUploadProgress(0);
		setImportResult(null);
		setIsRemapping(false);
		setMappingSource(null);
	}, [resetState]);

	const normalizeRowsWithCurrentMapping = useCallback(() => {
		const mappingByField = new Map(mappingDefinitions.map((mapping) => [mapping.field, mapping.sourceColumn]));
		const nextRows: TBulkSaleImportRow[] = [];
		const nextErrors: string[] = [];

		for (let i = 0; i < rawRows.length; i++) {
			const rawRow = rawRows[i];
			const rowIndex = i + 2;
			const maybeRow = {
				rowIndex,
				clienteNome: String(rawRow[mappingByField.get("clienteNome") ?? ""] ?? "").trim(),
				clienteTelefone: String(rawRow[mappingByField.get("clienteTelefone") ?? ""] ?? "").trim() || null,
				clienteCpfCnpj: String(rawRow[mappingByField.get("clienteCpfCnpj") ?? ""] ?? "").trim() || null,
				valorTotal: normalizeCurrency(rawRow[mappingByField.get("valorTotal") ?? ""]),
				vendedorNome: String(rawRow[mappingByField.get("vendedorNome") ?? ""] ?? "").trim() || null,
				parceiroNomeOuIdentificador: String(rawRow[mappingByField.get("parceiroNomeOuIdentificador") ?? ""] ?? "").trim() || null,
				dataVenda: normalizeDateToISOString(rawRow[mappingByField.get("dataVenda") ?? ""]),
			};

			const validation = BulkSaleImportRowSchema.safeParse(maybeRow);
			if (!validation.success) {
				nextErrors.push(`Linha ${rowIndex}: ${validation.error.issues.map((issue) => issue.message).join(", ")}`);
				continue;
			}

			nextRows.push(validation.data);
		}

		setNormalizedRows(nextRows);
		setParseErrors(nextErrors);
		return { validRows: nextRows, errors: nextErrors };
	}, [mappingDefinitions, rawRows, setNormalizedRows, setParseErrors]);

	const runAutomaticMapping = useCallback(
		async ({ nextHeaders, sampleRows }: { nextHeaders: string[]; sampleRows: Array<Record<string, unknown>> }) => {
			const mapResult = await suggestSalesSheetMapping({
				headers: nextHeaders,
				sampleRows,
			});

			const nextMappings = mapResult.data.mappingDefinitions.length > 0 ? mapResult.data.mappingDefinitions : getDefaultMappings();

			setMappingDefinitions(nextMappings);
			setWarnings(mapResult.data.warnings);
			setMappingSource("ai");
			saveBulkInsertMappingsToStorage(nextHeaders, nextMappings);

			return nextMappings;
		},
		[setMappingDefinitions, setWarnings],
	);

	const handleFileSelect = useCallback(
		async (file: File) => {
			const validExtensions = [".xlsx", ".xls", ".csv"];
			const hasValidExtension = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));
			if (!hasValidExtension) {
				toast.error("Formato inválido. Envie .xlsx, .xls ou .csv.");
				return;
			}

			setImportState("parsing");
			setFileName(file.name);
			setParseErrors([]);
			setWarnings([]);
			setImportResult(null);
			setUploadProgress(0);
			setIsRemapping(false);
			setMappingSource(null);

			try {
				const data = (await getJSONFromExcelFile(file)) as Array<Record<string, unknown>>;
				if (!data.length) {
					toast.error("A planilha está vazia.");
					setImportState("idle");
					return;
				}

				const fileHeaders = Object.keys(data[0] ?? {});
				if (!fileHeaders.length) {
					toast.error("Não foi possível identificar o cabeçalho da planilha.");
					setImportState("idle");
					return;
				}

				setHeaders(fileHeaders);
				setRawRows(data);
				const cachedMappings = loadBulkInsertMappingsFromStorage(fileHeaders);
				if (cachedMappings) {
					setMappingDefinitions(cachedMappings);
					setWarnings([]);
					setMappingSource("cache");
					setImportState("mapping");
					toast.success("Mapeamento reutilizado do navegador.");
					return;
				}

				await runAutomaticMapping({
					nextHeaders: fileHeaders,
					sampleRows: data.slice(0, 30),
				});
				setImportState("mapping");
			} catch (error) {
				console.error("[BULK_INSERT_PAGE] Erro ao processar arquivo", error);
				toast.error("Erro ao processar planilha.");
				setImportState("idle");
			}
		},
		[runAutomaticMapping, setHeaders, setFileName, setImportState, setMappingDefinitions, setParseErrors, setRawRows, setWarnings],
	);

	const updateMappingDefinition = useCallback(
		(field: (typeof mappingDefinitions)[number]["field"], sourceColumn: string | null) => {
			setMappingSource("manual");
			setMappingDefinitions((prev) =>
				prev.map((item) =>
					item.field === field
						? {
								...item,
								sourceColumn,
							}
						: item,
				),
			);
		},
		[setMappingDefinitions],
	);

	const handleRemapWithAI = useCallback(async () => {
		if (!headers.length || !rawRows.length) return;

		try {
			setIsRemapping(true);
			await runAutomaticMapping({
				nextHeaders: headers,
				sampleRows: rawRows.slice(0, 30),
			});
			toast.success("Mapeamento recalculado com IA.");
		} catch (error) {
			console.error("[BULK_INSERT_PAGE] Erro ao remapear planilha", error);
			toast.error("Erro ao remapear planilha.");
		} finally {
			setIsRemapping(false);
		}
	}, [headers, rawRows, runAutomaticMapping]);

	const handleProceedToPreview = useCallback(() => {
		const requiredMissing = REQUIRED_FIELDS.filter((requiredField) => {
			const selected = mappingDefinitions.find((item) => item.field === requiredField)?.sourceColumn;
			return !selected;
		});

		if (requiredMissing.length > 0) {
			toast.error(`Mapeie os campos obrigatórios: ${requiredMissing.map((field) => FIELD_LABELS[field]).join(", ")}`);
			return;
		}

		const { validRows } = normalizeRowsWithCurrentMapping();
		if (!validRows.length) {
			toast.error("Nenhuma linha válida encontrada com o mapeamento atual.");
			return;
		}

		saveBulkInsertMappingsToStorage(headers, mappingDefinitions);
		setImportState("preview");
	}, [headers, mappingDefinitions, normalizeRowsWithCurrentMapping, setImportState]);

	const handleImportSales = useCallback(async () => {
		try {
			setImportState("uploading");
			const response = await bulkCreateSales({ sales: normalizedRows }, (progress) => setUploadProgress(progress));
			setImportResult(response.data);
			setImportState("success");
			toast.success(response.message);
		} catch (error) {
			console.error("[BULK_INSERT_PAGE] Erro ao importar vendas", error);
			setImportState("error");
			toast.error("Erro ao importar vendas.");
		}
	}, [normalizedRows, setImportState]);

	const renderStage = () => {
		switch (importState) {
			case "idle":
				return <BulkInsertIdleStage onFileSelect={handleFileSelect} />;
			case "parsing":
				return <BulkInsertParsingStage fileName={fileName} />;
			case "mapping":
				return (
					<BulkInsertMappingStage
						headers={headers}
						mappingDefinitions={mappingDefinitions}
						warnings={warnings}
						isRemapping={isRemapping}
						mappingSource={mappingSource}
						onUpdateMapping={updateMappingDefinition}
						onRemap={handleRemapWithAI}
						onReset={resetImportFlow}
						onContinue={handleProceedToPreview}
					/>
				);
			case "preview":
				return (
					<BulkInsertPreviewStage
						normalizedRows={normalizedRows}
						parseErrors={parseErrors}
						onBack={() => setImportState("mapping")}
						onImport={handleImportSales}
					/>
				);
			case "uploading":
				return <BulkInsertUploadingStage uploadProgress={uploadProgress} />;
			case "success":
				return importResult ? (
					<BulkInsertSuccessStage result={importResult} onRestart={resetImportFlow} onComplete={() => router.push("/dashboard/commercial/sales")} />
				) : null;
			case "error":
				return (
					<BulkInsertErrorStage
						canReturnToPreview={normalizedRows.length > 0}
						onReturnToPreview={() => setImportState("preview")}
						onReset={resetImportFlow}
					/>
				);
			default:
				return null;
		}
	};

	return (
		<div className="flex h-full w-full flex-col gap-4">
			<AnimatePresence mode="wait">
				<motion.div
					key={importState}
					initial={{ opacity: 0, y: 12 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: -12 }}
					transition={{ duration: 0.2 }}
				>
					{renderStage()}
				</motion.div>
			</AnimatePresence>
		</div>
	);
}
