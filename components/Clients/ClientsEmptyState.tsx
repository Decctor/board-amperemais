"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { TBulkClientImportRow } from "@/schemas/clients";
import axios from "axios";
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Loader2, Upload, Users, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

type ImportState = "idle" | "parsing" | "preview" | "uploading" | "success" | "error";

type ParsedClient = TBulkClientImportRow & { _rowIndex: number };

type ImportResult = {
	insertedCount: number;
	skippedCount: number;
	errors: Array<{ row: number; message: string }>;
};

// Column mapping from file headers to our schema
const COLUMN_MAPPING: Record<string, keyof TBulkClientImportRow> = {
	nome: "nome",
	name: "nome",
	cliente: "nome",
	telefone: "telefone",
	phone: "telefone",
	celular: "telefone",
	whatsapp: "telefone",
	email: "email",
	"e-mail": "email",
	"data de nascimento": "dataNascimento",
	"data nascimento": "dataNascimento",
	nascimento: "dataNascimento",
	aniversario: "dataNascimento",
	"aniversário": "dataNascimento",
	birthday: "dataNascimento",
	"canal de aquisicao": "canalAquisicao",
	"canal de aquisição": "canalAquisicao",
	"canal aquisicao": "canalAquisicao",
	canal: "canalAquisicao",
	origem: "canalAquisicao",
	cidade: "localizacaoCidade",
	city: "localizacaoCidade",
	estado: "localizacaoEstado",
	uf: "localizacaoEstado",
	state: "localizacaoEstado",
	bairro: "localizacaoBairro",
	neighborhood: "localizacaoBairro",
	cep: "localizacaoCep",
	"codigo postal": "localizacaoCep",
	zipcode: "localizacaoCep",
};

function normalizeHeader(header: string): string {
	return header
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.trim();
}

function parseExcelDate(value: unknown): string | null {
	if (!value) return null;

	// If it's a number (Excel serial date)
	if (typeof value === "number") {
		const date = XLSX.SSF.parse_date_code(value);
		if (date) {
			return new Date(date.y, date.m - 1, date.d).toISOString();
		}
	}

	// If it's already a string
	if (typeof value === "string") {
		// Try to parse DD/MM/YYYY format
		const brDateMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
		if (brDateMatch) {
			const [, day, month, year] = brDateMatch;
			return new Date(Number(year), Number(month) - 1, Number(day)).toISOString();
		}

		// Try ISO format or other parseable formats
		const date = new Date(value);
		if (!Number.isNaN(date.getTime())) {
			return date.toISOString();
		}
	}

	return null;
}

export default function ClientsEmptyState() {
	const router = useRouter();
	const [importState, setImportState] = useState<ImportState>("idle");
	const [parsedClients, setParsedClients] = useState<ParsedClient[]>([]);
	const [parseErrors, setParseErrors] = useState<string[]>([]);
	const [importResult, setImportResult] = useState<ImportResult | null>(null);
	const [uploadProgress, setUploadProgress] = useState(0);
	const [isDragging, setIsDragging] = useState(false);
	const [fileName, setFileName] = useState<string>("");

	const handleFileSelect = useCallback(async (file: File) => {
		const validTypes = [
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
			"application/vnd.ms-excel",
			"text/csv",
		];
		const validExtensions = [".xlsx", ".xls", ".csv"];

		const hasValidExtension = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));
		const hasValidType = validTypes.includes(file.type) || file.type === "";

		if (!hasValidExtension && !hasValidType) {
			toast.error("Formato de arquivo inválido. Use .xlsx, .xls ou .csv");
			return;
		}

		setFileName(file.name);
		setImportState("parsing");
		setParseErrors([]);

		try {
			const data = await file.arrayBuffer();
			const workbook = XLSX.read(data, { type: "array", cellDates: true });
			const sheetName = workbook.SheetNames[0];
			const worksheet = workbook.Sheets[sheetName];
			const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];

			if (jsonData.length < 2) {
				toast.error("Arquivo vazio ou sem dados válidos");
				setImportState("idle");
				return;
			}

			// Get headers from first row
			const headers = (jsonData[0] as string[]).map(normalizeHeader);
			const errors: string[] = [];

			// Map headers to our schema
			const columnIndexMap: Record<keyof TBulkClientImportRow, number> = {} as Record<keyof TBulkClientImportRow, number>;
			headers.forEach((header, index) => {
				const mappedKey = COLUMN_MAPPING[header];
				if (mappedKey) {
					columnIndexMap[mappedKey] = index;
				}
			});

			// Check if we have the required 'nome' column
			if (columnIndexMap.nome === undefined) {
				toast.error("Coluna 'NOME' não encontrada no arquivo. Verifique o modelo.");
				setImportState("idle");
				return;
			}

			// Parse data rows
			const clients: ParsedClient[] = [];
			for (let i = 1; i < jsonData.length; i++) {
				const row = jsonData[i] as unknown[];
				if (!row || row.length === 0) continue;

				const nome = row[columnIndexMap.nome];
				if (!nome || (typeof nome === "string" && nome.trim() === "")) {
					continue; // Skip empty rows
				}

				const client: ParsedClient = {
					_rowIndex: i + 1,
					nome: String(nome).trim(),
					telefone: columnIndexMap.telefone !== undefined ? String(row[columnIndexMap.telefone] ?? "").trim() || null : null,
					email: columnIndexMap.email !== undefined ? String(row[columnIndexMap.email] ?? "").trim() || null : null,
					dataNascimento: columnIndexMap.dataNascimento !== undefined ? parseExcelDate(row[columnIndexMap.dataNascimento]) : null,
					canalAquisicao: columnIndexMap.canalAquisicao !== undefined ? String(row[columnIndexMap.canalAquisicao] ?? "").trim() || null : null,
					localizacaoCidade: columnIndexMap.localizacaoCidade !== undefined ? String(row[columnIndexMap.localizacaoCidade] ?? "").trim() || null : null,
					localizacaoEstado: columnIndexMap.localizacaoEstado !== undefined ? String(row[columnIndexMap.localizacaoEstado] ?? "").trim() || null : null,
					localizacaoBairro: columnIndexMap.localizacaoBairro !== undefined ? String(row[columnIndexMap.localizacaoBairro] ?? "").trim() || null : null,
					localizacaoCep: columnIndexMap.localizacaoCep !== undefined ? String(row[columnIndexMap.localizacaoCep] ?? "").trim() || null : null,
				};

				clients.push(client);
			}

			if (clients.length === 0) {
				toast.error("Nenhum cliente válido encontrado no arquivo");
				setImportState("idle");
				return;
			}

			setParsedClients(clients);
			setParseErrors(errors);
			setImportState("preview");
		} catch (error) {
			console.error("Error parsing file:", error);
			toast.error("Erro ao processar o arquivo");
			setImportState("idle");
		}
	}, []);

	const handleDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(true);
	}, []);

	const handleDragLeave = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(false);
	}, []);

	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			e.stopPropagation();
			setIsDragging(false);

			const files = e.dataTransfer.files;
			if (files.length > 0) {
				handleFileSelect(files[0]);
			}
		},
		[handleFileSelect],
	);

	const handleFileInputChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const files = e.target.files;
			if (files && files.length > 0) {
				handleFileSelect(files[0]);
			}
		},
		[handleFileSelect],
	);

	const handleImport = useCallback(async () => {
		if (parsedClients.length === 0) return;

		setImportState("uploading");
		setUploadProgress(0);

		try {
			// Remove _rowIndex before sending to API
			const clientsToSend = parsedClients.map(({ _rowIndex, ...client }) => client);

			const response = await axios.post<{ data: ImportResult; message: string }>(
				"/api/clients/bulk",
				{ clients: clientsToSend },
				{
					onUploadProgress: (progressEvent) => {
						if (progressEvent.total) {
							const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
							setUploadProgress(progress);
						}
					},
				},
			);

			setImportResult(response.data.data);
			setImportState("success");
			toast.success(response.data.message);
		} catch (error) {
			console.error("Error importing clients:", error);
			setImportState("error");
			if (axios.isAxiosError(error) && error.response?.data?.error?.message) {
				toast.error(error.response.data.error.message);
			} else {
				toast.error("Erro ao importar clientes");
			}
		}
	}, [parsedClients]);

	const handleReset = useCallback(() => {
		setImportState("idle");
		setParsedClients([]);
		setParseErrors([]);
		setImportResult(null);
		setUploadProgress(0);
		setFileName("");
	}, []);

	const handleFinish = useCallback(() => {
		router.refresh();
	}, [router]);

	// Idle state - show empty state with drop zone
	if (importState === "idle") {
		return (
			<div className="w-full h-full flex flex-col items-center justify-center gap-6 py-12">
				<div className="flex flex-col items-center gap-3 text-center max-w-md">
					<div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
						<Users className="w-10 h-10 text-primary" />
					</div>
					<h1 className="text-2xl font-bold tracking-tight">Cadastre seu primeiro cliente</h1>
					<p className="text-muted-foreground">
						Importe sua base de clientes a partir de um arquivo Excel ou CSV para começar a usar a plataforma.
					</p>
				</div>

				<Card className="w-full max-w-lg">
					<CardHeader className="pb-3">
						<CardTitle className="text-lg flex items-center gap-2">
							<FileSpreadsheet className="w-5 h-5" />
							Importar Clientes
						</CardTitle>
						<CardDescription>
							Arraste e solte um arquivo .xlsx ou .csv com os dados dos seus clientes.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div
							onDragOver={handleDragOver}
							onDragLeave={handleDragLeave}
							onDrop={handleDrop}
							className={cn(
								"border-2 border-dashed rounded-xl p-8 transition-all cursor-pointer flex flex-col items-center gap-4",
								isDragging
									? "border-primary bg-primary/5"
									: "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
							)}
						>
							<div className={cn("w-14 h-14 rounded-full flex items-center justify-center transition-colors", isDragging ? "bg-primary/20" : "bg-muted")}>
								<Upload className={cn("w-7 h-7 transition-colors", isDragging ? "text-primary" : "text-muted-foreground")} />
							</div>
							<div className="text-center">
								<p className="font-medium">Arraste e solte seu arquivo aqui</p>
								<p className="text-sm text-muted-foreground mt-1">ou clique para selecionar</p>
							</div>
							<input
								type="file"
								accept=".xlsx,.xls,.csv"
								onChange={handleFileInputChange}
								className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
							/>
						</div>

						<div className="flex items-center justify-center">
							<Button variant="outline" size="sm" asChild className="gap-2">
								<a href="/bulk-insert-clients.xlsx" download>
									<Download className="w-4 h-4" />
									Baixar modelo de planilha
								</a>
							</Button>
						</div>

						<div className="bg-muted/50 rounded-lg p-4">
							<h4 className="text-sm font-medium mb-2">Colunas aceitas:</h4>
							<div className="flex flex-wrap gap-1.5">
								{["NOME*", "TELEFONE", "EMAIL", "DATA DE NASCIMENTO", "CANAL DE AQUISIÇÃO", "CIDADE", "ESTADO", "BAIRRO", "CEP"].map((col) => (
									<span key={col} className="text-xs bg-background px-2 py-1 rounded-md border">
										{col}
									</span>
								))}
							</div>
							<p className="text-xs text-muted-foreground mt-2">* Campo obrigatório</p>
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	// Parsing state
	if (importState === "parsing") {
		return (
			<div className="w-full h-full flex flex-col items-center justify-center gap-6 py-12">
				<div className="flex flex-col items-center gap-3">
					<Loader2 className="w-12 h-12 text-primary animate-spin" />
					<h2 className="text-xl font-bold">Processando arquivo...</h2>
					<p className="text-muted-foreground">{fileName}</p>
				</div>
			</div>
		);
	}

	// Preview state
	if (importState === "preview") {
		return (
			<div className="w-full h-full flex flex-col gap-6 py-6">
				<div className="flex items-center justify-between">
					<div>
						<h2 className="text-xl font-bold">Pré-visualização da importação</h2>
						<p className="text-muted-foreground">
							{parsedClients.length} cliente(s) encontrado(s) em {fileName}
						</p>
					</div>
					<div className="flex items-center gap-2">
						<Button variant="outline" onClick={handleReset}>
							<X className="w-4 h-4 mr-2" />
							Cancelar
						</Button>
						<Button onClick={handleImport}>
							<Upload className="w-4 h-4 mr-2" />
							Importar {parsedClients.length} cliente(s)
						</Button>
					</div>
				</div>

				{parseErrors.length > 0 && (
					<div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
						<div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-2">
							<AlertCircle className="w-4 h-4" />
							<span className="font-medium">{parseErrors.length} aviso(s)</span>
						</div>
						<ul className="text-sm text-amber-600/80 dark:text-amber-400/80 space-y-1">
							{parseErrors.slice(0, 5).map((error, i) => (
								<li key={i}>{error}</li>
							))}
							{parseErrors.length > 5 && <li>... e mais {parseErrors.length - 5} aviso(s)</li>}
						</ul>
					</div>
				)}

				<Card>
					<div className="overflow-x-auto max-h-[400px] overflow-y-auto">
						<table className="w-full text-sm">
							<thead className="bg-muted sticky top-0">
								<tr>
									<th className="text-left p-3 font-medium">Linha</th>
									<th className="text-left p-3 font-medium">Nome</th>
									<th className="text-left p-3 font-medium">Telefone</th>
									<th className="text-left p-3 font-medium">Email</th>
									<th className="text-left p-3 font-medium">Data Nasc.</th>
									<th className="text-left p-3 font-medium">Canal</th>
									<th className="text-left p-3 font-medium">Cidade/UF</th>
								</tr>
							</thead>
							<tbody>
								{parsedClients.slice(0, 50).map((client) => (
									<tr key={client._rowIndex} className="border-t border-border/50 hover:bg-muted/50">
										<td className="p-3 text-muted-foreground">{client._rowIndex}</td>
										<td className="p-3 font-medium">{client.nome}</td>
										<td className="p-3">{client.telefone || "-"}</td>
										<td className="p-3">{client.email || "-"}</td>
										<td className="p-3">
											{client.dataNascimento ? new Date(client.dataNascimento).toLocaleDateString("pt-BR") : "-"}
										</td>
										<td className="p-3">{client.canalAquisicao || "-"}</td>
										<td className="p-3">
											{client.localizacaoCidade || client.localizacaoEstado
												? `${client.localizacaoCidade || ""}${client.localizacaoCidade && client.localizacaoEstado ? "/" : ""}${client.localizacaoEstado || ""}`
												: "-"}
										</td>
									</tr>
								))}
							</tbody>
						</table>
						{parsedClients.length > 50 && (
							<div className="p-3 text-center text-sm text-muted-foreground bg-muted/50">
								... e mais {parsedClients.length - 50} cliente(s)
							</div>
						)}
					</div>
				</Card>
			</div>
		);
	}

	// Uploading state
	if (importState === "uploading") {
		return (
			<div className="w-full h-full flex flex-col items-center justify-center gap-6 py-12">
				<div className="flex flex-col items-center gap-4 w-full max-w-md">
					<Loader2 className="w-12 h-12 text-primary animate-spin" />
					<h2 className="text-xl font-bold">Importando clientes...</h2>
					<div className="w-full space-y-2">
						<Progress value={uploadProgress} className="h-2" />
						<p className="text-sm text-muted-foreground text-center">{uploadProgress}% concluído</p>
					</div>
				</div>
			</div>
		);
	}

	// Success state
	if (importState === "success" && importResult) {
		return (
			<div className="w-full h-full flex flex-col items-center justify-center gap-6 py-12">
				<div className="flex flex-col items-center gap-3 text-center max-w-md">
					<div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center">
						<CheckCircle2 className="w-10 h-10 text-green-500" />
					</div>
					<h2 className="text-2xl font-bold">Importação concluída!</h2>
					<div className="space-y-1">
						<p className="text-lg">
							<span className="font-bold text-green-600">{importResult.insertedCount}</span> cliente(s) importado(s)
						</p>
						{importResult.skippedCount > 0 && (
							<p className="text-sm text-muted-foreground">
								{importResult.skippedCount} registro(s) ignorado(s)
							</p>
						)}
					</div>
				</div>

				{importResult.errors.length > 0 && (
					<Card className="w-full max-w-lg">
						<CardHeader className="pb-2">
							<CardTitle className="text-sm flex items-center gap-2 text-amber-600">
								<AlertCircle className="w-4 h-4" />
								Registros ignorados
							</CardTitle>
						</CardHeader>
						<CardContent>
							<ul className="text-sm space-y-1 max-h-32 overflow-y-auto">
								{importResult.errors.slice(0, 10).map((error, i) => (
									<li key={i} className="text-muted-foreground">
										Linha {error.row}: {error.message}
									</li>
								))}
								{importResult.errors.length > 10 && (
									<li className="text-muted-foreground">... e mais {importResult.errors.length - 10} erro(s)</li>
								)}
							</ul>
						</CardContent>
					</Card>
				)}

				<div className="flex items-center gap-3">
					<Button variant="outline" onClick={handleReset}>
						Importar mais
					</Button>
					<Button onClick={handleFinish}>Ver clientes</Button>
				</div>
			</div>
		);
	}

	// Error state
	if (importState === "error") {
		return (
			<div className="w-full h-full flex flex-col items-center justify-center gap-6 py-12">
				<div className="flex flex-col items-center gap-3 text-center max-w-md">
					<div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center">
						<AlertCircle className="w-10 h-10 text-red-500" />
					</div>
					<h2 className="text-2xl font-bold">Erro na importação</h2>
					<p className="text-muted-foreground">
						Ocorreu um erro ao importar os clientes. Por favor, verifique o arquivo e tente novamente.
					</p>
				</div>
				<Button onClick={handleReset}>Tentar novamente</Button>
			</div>
		);
	}

	return null;
}
