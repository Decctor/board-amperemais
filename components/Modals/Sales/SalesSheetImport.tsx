"use client";

import ResponsiveMenuV2 from "@/components/Utils/ResponsiveMenuV2";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getFixedDateFromExcel, getJSONFromExcelFile } from "@/lib/excel-utils";
import { bulkCreateSales, suggestSalesSheetMapping } from "@/lib/mutations/sales";
import {
	BulkSaleCanonicalFieldSchema,
	BulkSaleImportRowSchema,
	type TBulkCreateSalesOutput,
	type TBulkSaleImportRow,
	type TBulkSalesMappingDefinition,
	useBulkCreateSalesState,
} from "@/state-hooks/use-bulk-create-sales";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, AlertTriangle, ArrowDownToLine, ArrowRight, CheckCircle2, Database, FileSpreadsheet, FileUp, Loader2, TableProperties, Upload, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

type SalesSheetImportProps = {
	closeModal: () => void;
};

const FIELD_LABELS: Record<(typeof BulkSaleCanonicalFieldSchema.options)[number], string> = {
	clienteNome: "NOME DO CLIENTE",
	clienteTelefone: "TELEFONE DO CLIENTE",
	clienteCpfCnpj: "CPF/CNPJ DO CLIENTE",
	valorTotal: "VALOR TOTAL",
	vendedorNome: "NOME DO VENDEDOR",
	parceiroNomeOuIdentificador: "NOME/IDENTIFICADOR DO PARCEIRO",
	dataVenda: "DATA DA VENDA",
};

const REQUIRED_FIELDS: Array<(typeof BulkSaleCanonicalFieldSchema.options)[number]> = ["clienteNome", "valorTotal", "dataVenda"];

function normalizeDateToISOString(value: unknown) {
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

function normalizeCurrency(value: unknown) {
	if (typeof value === "number") return value;
	const normalized = String(value ?? "")
		.trim()
		.replace(/\./g, "")
		.replace(",", ".")
		.replace(/[^\d.-]/g, "");
	const parsed = Number(normalized);
	return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function getDefaultMappings(): TBulkSalesMappingDefinition[] {
	return BulkSaleCanonicalFieldSchema.options.map((field) => ({
		field,
		sourceColumn: null,
		confidence: null,
		reason: null,
	}));
}

export default function SalesSheetImport({ closeModal }: SalesSheetImportProps) {
	const router = useRouter();
	const [uploadProgress, setUploadProgress] = useState(0);
	const [importResult, setImportResult] = useState<TBulkCreateSalesOutput["data"] | null>(null);

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
	console.log("DATA", {
		headers,
		rawRows,
		mappingDefinitions,
		normalizedRows,
		parseErrors,
		warnings,
	});
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

				const mapResult = await suggestSalesSheetMapping({
					headers: fileHeaders,
					sampleRows: data.slice(0, 30),
				});

				setMappingDefinitions(mapResult.data.mappingDefinitions.length > 0 ? mapResult.data.mappingDefinitions : getDefaultMappings());
				setWarnings(mapResult.data.warnings);
				setImportState("mapping");
			} catch (error) {
				console.error("[SALES_SHEET_IMPORT] Erro ao processar arquivo", error);
				toast.error("Erro ao processar planilha.");
				setImportState("idle");
			}
		},
		[setImportState, setFileName, setParseErrors, setWarnings, setHeaders, setRawRows, setMappingDefinitions],
	);

	const updateMappingDefinition = useCallback(
		(field: (typeof BulkSaleCanonicalFieldSchema.options)[number], sourceColumn: string | null) => {
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

	const handleMainAction = useCallback(async () => {
		if (importState === "idle" || importState === "parsing") return;

		if (importState === "mapping") {
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
			setImportState("preview");
			return;
		}

		if (importState === "preview") {
			try {
				setImportState("uploading");
				const response = await bulkCreateSales({ sales: normalizedRows }, (progress) => setUploadProgress(progress));
				setImportResult(response.data);
				setImportState("success");
				toast.success(response.message);
				return;
			} catch (error) {
				console.error("[SALES_SHEET_IMPORT] Erro ao importar vendas", error);
				setImportState("error");
				toast.error("Erro ao importar vendas.");
				return;
			}
		}

		if (importState === "error") {
			resetState();
		}
	}, [importState, mappingDefinitions, normalizeRowsWithCurrentMapping, normalizedRows, resetState, setImportState]);

	const menuActionButtonText = useMemo(() => {
		switch (importState) {
			case "mapping":
				return "REVISAR LINHAS";
			case "preview":
				return "IMPORTAR VENDAS";
			case "uploading":
				return "IMPORTANDO...";
			case "error":
				return "REINICIAR";
			default:
				return "AVANÇAR";
		}
	}, [importState]);

	const successContent = useMemo(() => {
		if (importState !== "success" || !importResult) return null;
		return (
			<motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md mx-auto text-center space-y-6 py-6">
				<div className="mx-auto w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center relative">
					<div className="absolute inset-0 rounded-full bg-green-500/20 animate-ping opacity-20" />
					<CheckCircle2 className="w-10 h-10 text-green-500" />
				</div>
				<div className="space-y-2">
					<h2 className="text-3xl font-bold tracking-tight">Sucesso!</h2>
					<p className="text-muted-foreground font-medium">
						{importResult.insertedCount} venda(s) importada(s) e {importResult.skippedCount} ignorada(s).
					</p>
				</div>
				
				<div className="grid grid-cols-3 gap-3 text-sm">
					<Card className="bg-card hover:bg-muted/30 transition-colors border-0 ring-1 ring-border shadow-sm">
						<CardContent className="p-4 flex flex-col items-center justify-center gap-1">
							<p className="text-2xl font-bold text-primary">{importResult.createdClientsCount}</p>
							<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Clientes</p>
						</CardContent>
					</Card>
					<Card className="bg-card hover:bg-muted/30 transition-colors border-0 ring-1 ring-border shadow-sm">
						<CardContent className="p-4 flex flex-col items-center justify-center gap-1">
							<p className="text-2xl font-bold text-primary">{importResult.createdSellersCount}</p>
							<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vendedores</p>
						</CardContent>
					</Card>
					<Card className="bg-card hover:bg-muted/30 transition-colors border-0 ring-1 ring-border shadow-sm">
						<CardContent className="p-4 flex flex-col items-center justify-center gap-1">
							<p className="text-2xl font-bold text-primary">{importResult.createdPartnersCount}</p>
							<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Parceiros</p>
						</CardContent>
					</Card>
				</div>
				<div className="flex gap-3 justify-center pt-4">
					<Button
						variant="outline"
						className="flex-1"
						onClick={() => {
							resetState();
							setImportResult(null);
						}}
					>
						NOVA IMPORTAÇÃO
					</Button>
					<Button
						className="flex-1"
						onClick={() => {
							router.refresh();
							closeModal();
						}}
					>
						CONCLUIR
					</Button>
				</div>
			</motion.div>
		);
	}, [closeModal, importResult, importState, resetState, router]);

	return (
		<ResponsiveMenuV2
			menuTitle="IMPORTAÇÃO DE VENDAS"
			menuDescription="Envie sua planilha, revise o mapeamento sugerido e importe suas vendas."
			menuActionButtonText={menuActionButtonText}
			menuCancelButtonText="CANCELAR"
			actionFunction={handleMainAction}
			actionIsLoading={importState === "parsing" || importState === "uploading"}
			stateIsLoading={false}
			stateError={null}
			closeMenu={closeModal}
			dialogVariant="lg"
			drawerVariant="lg"
			successContent={successContent}
		>
			<AnimatePresence mode="wait">
				{importState === "idle" && (
					<motion.div key="idle" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
						<Card className="overflow-hidden border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors bg-muted/30 hover:bg-muted/50">
							<CardContent className="p-0">
								<label className="relative cursor-pointer flex flex-col gap-4 items-center justify-center p-12 text-center group">
									<input
										type="file"
										accept=".xlsx,.xls,.csv"
										className="absolute inset-0 opacity-0 cursor-pointer"
										onChange={(event) => {
											const selectedFile = event.target.files?.[0];
											if (selectedFile) handleFileSelect(selectedFile);
										}}
									/>
									<div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
										<FileUp className="w-8 h-8 text-primary" />
									</div>
									<div className="space-y-1">
										<p className="text-lg font-semibold tracking-tight">Arraste a planilha aqui ou clique para selecionar</p>
										<p className="text-sm text-muted-foreground font-medium">Formatos suportados: .xlsx, .xls, .csv</p>
									</div>
								</label>
							</CardContent>
						</Card>

						<div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 rounded-xl border bg-card shadow-sm">
							<div className="flex items-center gap-3">
								<div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
									<TableProperties className="w-5 h-5 text-blue-600 dark:text-blue-400" />
								</div>
								<div>
									<p className="font-semibold text-sm">Precisa de um modelo?</p>
									<p className="text-muted-foreground text-xs font-medium">Baixe nossa planilha com a estrutura correta.</p>
								</div>
							</div>
							<Button variant="outline" size="sm" asChild className="gap-2 shrink-0">
								<a href="/bulk-insert-sales.xlsx" download>
									<ArrowDownToLine className="w-4 h-4" />
									Baixar modelo
								</a>
							</Button>
						</div>
					</motion.div>
				)}

				{importState === "parsing" && (
					<motion.div key="parsing" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="h-48 flex flex-col items-center justify-center gap-4">
						<div className="relative">
							<div className="absolute inset-0 rounded-full blur-md bg-primary/20 animate-pulse" />
							<div className="relative w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
								<Loader2 className="w-6 h-6 animate-spin text-primary" />
							</div>
						</div>
						<div className="text-center space-y-1">
							<p className="font-semibold text-lg">Analisando estrutura...</p>
							<p className="text-sm text-muted-foreground font-medium">{fileName}</p>
						</div>
					</motion.div>
				)}

				{importState === "mapping" && (
					<motion.div key="mapping" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
						{warnings.length > 0 && (
							<div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 shadow-sm">
								<div className="flex items-center gap-2 mb-3 text-amber-600 dark:text-amber-400">
									<AlertTriangle className="w-5 h-5" />
									<p className="font-semibold">Avisos do mapeamento</p>
								</div>
								<ul className="space-y-1.5 text-sm text-amber-700 dark:text-amber-300">
									{warnings.map((warning, idx) => (
										<li key={`${warning}-${idx.toString()}`} className="flex items-start gap-2">
											<span className="mt-1.5 w-1 h-1 rounded-full bg-amber-500/50 shrink-0" />
											<span>{warning}</span>
										</li>
									))}
								</ul>
							</div>
						)}
						<div className="bg-muted/30 border rounded-xl overflow-hidden shadow-sm">
							<div className="bg-card px-4 py-3 border-b flex items-center gap-2">
								<Zap className="w-4 h-4 text-primary" />
								<p className="font-semibold text-sm">Vincule as colunas da sua planilha</p>
							</div>
							<div className="p-2 space-y-1">
								{BulkSaleCanonicalFieldSchema.options.map((field) => {
									const currentMapping = mappingDefinitions.find((item) => item.field === field);
									const isRequired = REQUIRED_FIELDS.includes(field);
									const isMapped = !!currentMapping?.sourceColumn;
									
									return (
										<div 
											key={field} 
											className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border transition-colors ${
												isRequired && !isMapped ? "bg-red-500/5 border-red-500/20" : "bg-card border-transparent hover:border-border"
											}`}
										>
											<div className="flex items-center gap-2">
												<div className={`w-1.5 h-1.5 rounded-full ${isMapped ? "bg-green-500" : isRequired ? "bg-red-500" : "bg-muted-foreground/30"}`} />
												<p className="text-sm font-semibold">{FIELD_LABELS[field]}</p>
												{isRequired && <span className="text-[10px] uppercase font-bold tracking-wider text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded">Obrigatório</span>}
											</div>
											<div className="flex items-center gap-3 sm:w-1/2">
												<ArrowRight className="w-4 h-4 text-muted-foreground hidden sm:block shrink-0" />
												<select
													className={`h-10 w-full rounded-md border bg-background px-3 text-sm font-medium focus:ring-2 focus:ring-primary focus:border-primary transition-shadow outline-none ${
														isMapped ? "border-primary/30" : "border-input"
													}`}
													value={currentMapping?.sourceColumn ?? ""}
													onChange={(event) => updateMappingDefinition(field, event.target.value || null)}
												>
													<option value="">Não mapear</option>
													{headers.map((header) => (
														<option key={header} value={header}>
															{header}
														</option>
													))}
												</select>
											</div>
										</div>
									);
								})}
							</div>
						</div>
					</motion.div>
				)}

				{importState === "preview" && (
					<motion.div key="preview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
						<div className="grid grid-cols-2 gap-4">
							<div className="border rounded-xl p-4 bg-card shadow-sm flex items-center gap-4">
								<div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
									<CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
								</div>
								<div>
									<p className="text-2xl font-bold">{normalizedRows.length}</p>
									<p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Linhas Válidas</p>
								</div>
							</div>
							<div className="border rounded-xl p-4 bg-card shadow-sm flex items-center gap-4">
								<div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${parseErrors.length > 0 ? "bg-amber-500/10" : "bg-muted"}`}>
									<AlertTriangle className={`w-5 h-5 ${parseErrors.length > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`} />
								</div>
								<div>
									<p className="text-2xl font-bold">{parseErrors.length}</p>
									<p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Com Erro</p>
								</div>
							</div>
						</div>

						{parseErrors.length > 0 && (
							<div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 max-h-40 overflow-auto custom-scrollbar">
								<p className="font-semibold text-sm text-amber-700 dark:text-amber-400 mb-2">Erros encontrados:</p>
								<ul className="space-y-1.5 text-xs text-amber-700/80 dark:text-amber-400/80">
									{parseErrors.slice(0, 20).map((error) => (
										<li key={error} className="flex items-start gap-2">
											<span className="mt-1 w-1 h-1 rounded-full bg-amber-500/50 shrink-0" />
											<span className="leading-relaxed">{error}</span>
										</li>
									))}
									{parseErrors.length > 20 && (
										<li className="text-amber-600 font-medium italic mt-2">... e mais {parseErrors.length - 20} erros.</li>
									)}
								</ul>
							</div>
						)}

						<div className="bg-card border rounded-xl overflow-hidden shadow-sm">
							<div className="px-4 py-3 border-b bg-muted/30">
								<p className="font-semibold text-sm">Pré-visualização dos dados</p>
							</div>
							<div className="overflow-auto max-h-[320px] custom-scrollbar">
								<table className="w-full text-xs text-left">
									<thead className="bg-muted/50 sticky top-0 backdrop-blur-sm z-10 border-b">
										<tr>
											<th className="p-3 font-semibold text-muted-foreground whitespace-nowrap">Linha</th>
											<th className="p-3 font-semibold text-muted-foreground whitespace-nowrap">Cliente</th>
											<th className="p-3 font-semibold text-muted-foreground whitespace-nowrap">Contato</th>
											<th className="p-3 font-semibold text-muted-foreground whitespace-nowrap">Valor</th>
											<th className="p-3 font-semibold text-muted-foreground whitespace-nowrap">Vendedor</th>
											<th className="p-3 font-semibold text-muted-foreground whitespace-nowrap">Data</th>
										</tr>
									</thead>
									<tbody className="divide-y relative">
										{normalizedRows.slice(0, 50).map((row) => (
											<tr key={row.rowIndex} className="hover:bg-muted/30 transition-colors">
												<td className="p-3 text-muted-foreground font-medium">{row.rowIndex}</td>
												<td className="p-3 font-medium">{row.clienteNome}</td>
												<td className="p-3 opacity-90">{row.clienteTelefone || row.clienteCpfCnpj || "-"}</td>
												<td className="p-3 font-medium text-green-600 dark:text-green-400">{row.valorTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
												<td className="p-3 opacity-90">{row.vendedorNome || "-"}</td>
												<td className="p-3 opacity-90">{new Date(row.dataVenda).toLocaleDateString("pt-BR")}</td>
											</tr>
										))}
									</tbody>
								</table>
								{normalizedRows.length > 50 && (
									<div className="text-center p-3 border-t bg-muted/10 text-xs text-muted-foreground font-medium">
										Mostrando as primeiras 50 linhas...
									</div>
								)}
							</div>
						</div>
					</motion.div>
				)}

				{importState === "uploading" && (
					<motion.div key="uploading" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="h-48 flex flex-col items-center justify-center gap-4">
						<div className="relative">
							<div className="absolute inset-0 rounded-full blur-md bg-primary/20 animate-pulse" />
							<div className="relative w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
								<Database className="w-6 h-6 animate-bounce text-primary" />
							</div>
						</div>
						<div className="text-center space-y-2 w-full max-w-xs">
							<p className="font-semibold text-lg">Importando vendas...</p>
							<div className="w-full bg-muted rounded-full h-2 overflow-hidden shadow-inner">
								<div className="bg-primary h-full transition-all duration-300 rounded-full" style={{ width: `${uploadProgress}%` }} />
							</div>
							<p className="text-sm text-muted-foreground font-medium">{uploadProgress}% concluído</p>
						</div>
					</motion.div>
				)}

				{importState === "error" && (
					<motion.div key="error" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="h-48 flex flex-col items-center justify-center gap-4">
						<div className="relative">
							<div className="absolute inset-0 rounded-full blur-md bg-red-500/20 animate-pulse" />
							<div className="relative w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
								<AlertCircle className="w-6 h-6 text-red-500" />
							</div>
						</div>
						<div className="text-center space-y-1">
							<p className="font-semibold text-lg text-red-600 dark:text-red-400">Falha ao importar vendas</p>
							<p className="text-sm text-muted-foreground font-medium w-full max-w-sm">Verifique o arquivo e tente novamente. Certifique-se de que os dados estão no formato correto.</p>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</ResponsiveMenuV2>
	);
}
