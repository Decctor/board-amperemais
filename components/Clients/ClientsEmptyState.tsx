"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getFixedDateFromExcel, getJSONFromExcelFile } from "@/lib/excel-utils";
import { formatToPhone } from "@/lib/formatting";
import { bulkCreateClients } from "@/lib/mutations/clients";
import { cn } from "@/lib/utils";
import type { TBulkClientImportRow } from "@/schemas/clients";
import axios from "axios";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, CloudUpload, FileSpreadsheet, FileText, Loader2, Sparkles, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import z from "zod";

// --- Types ---

type ImportState = "idle" | "parsing" | "preview" | "uploading" | "success" | "error";

type ParsedClient = TBulkClientImportRow & { _rowIndex: number };

type ImportResult = {
	insertedCount: number;
	skippedCount: number;
	errors: Array<{ row: number; message: string }>;
};

// --- Schema ---

const ClientsImportSchema = z.object({
	NOME: z.string({
		required_error: "Nome não informado.",
		invalid_type_error: "Tipo não válido para o nome.",
	}),
	TELEFONE: z
		.string({
			required_error: "Telefone não informado.",
			invalid_type_error: "Tipo não válido para o telefone.",
		})
		.transform((v) => formatToPhone(v)),
	EMAIL: z
		.string({
			required_error: "Email não informado.",
			invalid_type_error: "Tipo não válido para o email.",
		})
		.optional()
		.nullable(),
	"DATA DE NASCIMENTO": z
		.string({
			required_error: "Data de nascimento não informada.",
			invalid_type_error: "Tipo não válido para a data de nascimento.",
		})
		.optional()
		.nullable(),
	CEP: z
		.string({
			required_error: "CEP não informado.",
			invalid_type_error: "Tipo não válido para o CEP.",
		})
		.optional()
		.nullable(),
	CIDADE: z
		.string({
			required_error: "Cidade não informada.",
			invalid_type_error: "Tipo não válido para a cidade.",
		})
		.optional()
		.nullable(),
	ESTADO: z
		.string({
			required_error: "Estado não informado.",
			invalid_type_error: "Tipo não válido para o estado.",
		})
		.optional()
		.nullable(),
	BAIRRO: z
		.string({
			required_error: "Bairro não informado.",
			invalid_type_error: "Tipo não válido para o bairro.",
		})
		.optional()
		.nullable(),
	LOGRADOURO: z
		.string({
			required_error: "Logradouro não informado.",
			invalid_type_error: "Tipo não válido para o logradouro.",
		})
		.optional()
		.nullable(),
	"NUMERO DA RESIDENCIA": z
		.string({
			required_error: "Número não informado.",
			invalid_type_error: "Tipo não válido para o número.",
		})
		.optional()
		.nullable(),
});

// --- Component ---

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
		const validTypes = ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-excel", "text/csv"];
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
			// Small artificial delay for better UX (so the user sees the parsing state)
			await new Promise((resolve) => setTimeout(resolve, 800));

			const jsonData = await getJSONFromExcelFile(file);

			if (jsonData.length === 0) {
				toast.error("Arquivo vazio ou sem dados válidos");
				setImportState("idle");
				return;
			}

			// Validate rows using ClientsImportSchema and map to TBulkClientImportRow format
			const clients: ParsedClient[] = [];
			const errors: string[] = [];

			// Check if required columns exist by checking the first row
			const firstRow = jsonData[0] as Record<string, unknown>;
			const hasNomeColumn = "NOME" in firstRow;

			if (!hasNomeColumn) {
				toast.error("Coluna 'NOME' não encontrada no arquivo. Verifique o modelo.");
				setImportState("idle");
				return;
			}

			for (let i = 0; i < jsonData.length; i++) {
				const row = jsonData[i] as Record<string, unknown>;
				const rowIndex = i + 2; // +2 because row 1 is header, and we want 1-based indexing

				// Skip empty rows (no NOME value)
				if (!row.NOME || (typeof row.NOME === "string" && row.NOME.trim() === "")) {
					continue;
				}

				// Normalize values: convert Excel serial dates to strings, and numbers to strings for validation
				const normalizedRow = {
					...row,
					NOME: row.NOME != null ? String(row.NOME) : undefined,
					TELEFONE: row.TELEFONE != null ? String(row.TELEFONE) : undefined,
					EMAIL: row.EMAIL != null ? String(row.EMAIL) : undefined,
					CEP: row.CEP != null ? String(row.CEP) : undefined,
					CIDADE: row.CIDADE != null ? String(row.CIDADE) : undefined,
					ESTADO: row.ESTADO != null ? String(row.ESTADO) : undefined,
					BAIRRO: row.BAIRRO != null ? String(row.BAIRRO) : undefined,
					LOGRADOURO: row.LOGRADOURO != null ? String(row.LOGRADOURO) : undefined,
					"NUMERO DA RESIDENCIA": row["NUMERO DA RESIDENCIA"] != null ? String(row["NUMERO DA RESIDENCIA"]) : undefined,
					"DATA DE NASCIMENTO":
						typeof row["DATA DE NASCIMENTO"] === "number"
							? getFixedDateFromExcel(row["DATA DE NASCIMENTO"]).toISOString()
							: row["DATA DE NASCIMENTO"] != null
								? String(row["DATA DE NASCIMENTO"])
								: undefined,
				};

				// Validate row using ClientsImportSchema
				const validationResult = ClientsImportSchema.safeParse(normalizedRow);

				if (!validationResult.success) {
					const errorMessages = validationResult.error.errors.map((e) => e.message).join(", ");
					errors.push(`Linha ${rowIndex}: ${errorMessages}`);
					continue;
				}

				const validatedRow = validationResult.data;

				// Parse date from validated string
				let dataNascimento: Date | null = null;
				if (validatedRow["DATA DE NASCIMENTO"]) {
					const parsedDate = new Date(validatedRow["DATA DE NASCIMENTO"]);
					dataNascimento = Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
				}

				// Map from schema format (UPPERCASE) to TBulkClientImportRow format (lowercase)
				const client: ParsedClient = {
					_rowIndex: rowIndex,
					nome: validatedRow.NOME,
					telefone: validatedRow.TELEFONE?.replace(/\D/g, "") || null,
					email: validatedRow.EMAIL || null,
					dataNascimento,
					canalAquisicao: null,
					localizacaoCidade: validatedRow.CIDADE || null,
					localizacaoEstado: validatedRow.ESTADO || null,
					localizacaoBairro: validatedRow.BAIRRO || null,
					localizacaoCep: validatedRow.CEP || null,
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

			const response = await bulkCreateClients({ clients: clientsToSend }, (progress) => setUploadProgress(progress));

			setImportResult(response.data);
			setImportState("success");
			toast.success(response.message);
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

	// --- Render Helpers ---

	const fadeInUp = {
		initial: { opacity: 0, y: 10 },
		animate: { opacity: 1, y: 0 },
		exit: { opacity: 0, y: -10 },
		transition: { duration: 0.3 },
	};

	if (importState === "idle") {
		return (
			<motion.div
				className="w-full min-h-[600px] flex flex-col items-center justify-center p-8 bg-linear-to-b from-transparent to-muted/20 rounded-2xl border border-dashed border-muted-foreground/10"
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				exit={{ opacity: 0 }}
			>
				<div className="w-full max-w-2xl flex flex-col items-center gap-8">
					{/* Header Section */}
					<div className="text-center space-y-4">
						<motion.div
							initial={{ scale: 0.9, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							transition={{ type: "spring", duration: 0.6 }}
							className="relative w-24 h-24 mx-auto mb-6"
						>
							<div className="absolute inset-0 bg-brand rounded-full blur animate-pulse" />
							<div className="relative w-full h-full bg-linear-to-br from-brand/10 to-brand/5 rounded-full flex items-center justify-center border border-brand/20 shadow-lg shadow-brand/5 ring-4 ring-background">
								<Sparkles className="w-10 h-10 text-black" />
							</div>
						</motion.div>

						<h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-linear-to-br from-foreground to-muted-foreground bg-clip-text text-transparent">
							Comece sua jornada
						</h1>
						<p className="text-lg text-muted-foreground max-w-[480px] mx-auto leading-relaxed">
							Importe sua base de clientes para desbloquear todo o potencial da plataforma. É rápido, fácil e seguro.
						</p>
					</div>

					{/* Import Card */}
					<motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="w-full">
						<Card className="overflow-hidden border-muted/60 shadow-xl shadow-muted/10 bg-background/60 backdrop-blur-sm">
							<CardContent className="p-0">
								<div
									onDragOver={handleDragOver}
									onDragLeave={handleDragLeave}
									onDrop={handleDrop}
									className={cn(
										"relative group flex flex-col items-center justify-center gap-4 py-16 px-8 transition-all duration-300 cursor-pointer",
										isDragging ? "bg-primary/5 scale-[0.99]" : "hover:bg-muted/30",
									)}
								>
									<input
										type="file"
										accept=".xlsx,.xls,.csv"
										onChange={handleFileInputChange}
										className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
									/>

									<div
										className={cn(
											"w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-sm",
											isDragging ? "bg-primary/20 scale-110 rotate-3" : "bg-muted group-hover:scale-110 group-hover:-rotate-3 group-hover:bg-primary/10",
										)}
									>
										<CloudUpload
											className={cn("w-10 h-10 transition-colors", isDragging ? "text-primary" : "text-muted-foreground group-hover:text-primary")}
										/>
									</div>

									<div className="text-center space-y-1 z-10">
										<p className="text-xl font-medium text-foreground">Arraste seu arquivo aqui</p>
										<p className="text-sm text-muted-foreground">Ou clique para selecionar do seu computador</p>
									</div>

									<div className="flex gap-2 mt-4">
										<span className="text-xs font-mono bg-muted px-2 py-1 rounded text-muted-foreground border">.XLSX</span>
										<span className="text-xs font-mono bg-muted px-2 py-1 rounded text-muted-foreground border">.CSV</span>
									</div>
								</div>
							</CardContent>

							{/* Bottom helpers */}
							<div className="bg-muted/30 p-4 border-t border-muted/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
								<div className="flex gap-6">
									<div className="flex items-center gap-1.5">
										<CheckCircle2 className="w-3.5 h-3.5 text-primary" />
										<span>Validação automática</span>
									</div>
									<div className="flex items-center gap-1.5">
										<CheckCircle2 className="w-3.5 h-3.5 text-primary" />
										<span>Até 10k registros</span>
									</div>
								</div>

								<Button variant="link" size="sm" asChild className="h-auto p-0 text-primary underline-offset-4 hover:text-primary/80">
									<a href="/bulk-insert-clients.xlsx" download>
										<FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />
										Baixar modelo de planilha
									</a>
								</Button>
							</div>
						</Card>
					</motion.div>
				</div>
			</motion.div>
		);
	}

	return (
		<div className="w-full h-full flex flex-col items-center justify-center p-8">
			<AnimatePresence mode="wait">
				{importState === "parsing" && (
					<motion.div key="parsing" {...fadeInUp} className="flex flex-col items-center gap-6">
						<div className="relative">
							<div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
							<div className="relative bg-background p-4 rounded-full shadow-lg border border-muted ring-4 ring-muted/20">
								<Loader2 className="w-10 h-10 text-primary animate-spin" />
							</div>
						</div>
						<div className="text-center space-y-1">
							<h2 className="text-2xl font-bold tracking-tight">Analisando arquivo</h2>
							<p className="text-muted-foreground font-mono text-sm bg-muted/50 px-3 py-1 rounded-full">{fileName}</p>
						</div>
					</motion.div>
				)}

				{importState === "preview" && (
					<motion.div key="preview" {...fadeInUp} className="w-full max-w-4xl flex flex-col gap-6">
						<div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
							<div className="space-y-1">
								<h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
									<FileText className="w-6 h-6 text-primary" />
									REVISÃO DA IMPORTAÇÃO
								</h2>
								<div className="flex items-center gap-2 text-muted-foreground text-sm">
									<span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">{parsedClients.length} clientes</span>
									encontrados em <span className="font-medium text-foreground">{fileName}</span>
								</div>
							</div>
							<div className="flex items-center gap-3 w-full md:w-auto">
								<Button variant="ghost" onClick={handleReset} className="flex-1 md:flex-none">
									CANCELAR
								</Button>
								<Button onClick={handleImport} className="flex-1 md:flex-none gap-2 shadow-lg shadow-primary/20">
									<Upload className="w-4 h-4" />
									CONFIRMAR IMPORTAÇÃO
								</Button>
							</div>
						</div>

						{parseErrors.length > 0 && (
							<motion.div
								initial={{ opacity: 0, height: 0 }}
								animate={{ opacity: 1, height: "auto" }}
								className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3 items-start"
							>
								<AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
								<div className="space-y-1">
									<p className="font-medium text-amber-900 dark:text-amber-500">Foram encontrados {parseErrors.length} problemas</p>
									<p className="text-sm text-amber-800/80 dark:text-amber-400/80">
										Algumas linhas contém erros e não serão importadas. Você pode continuar assim mesmo ou corrigir a planilha.
									</p>
									<div className="mt-3 max-h-32 overflow-y-auto text-xs font-mono space-y-1 bg-amber-500/5 p-2 rounded">
										{parseErrors.map((err, i) => (
											<div key={i.toString()} className="text-amber-700 dark:text-amber-400">
												• {err}
											</div>
										))}
									</div>
								</div>
							</motion.div>
						)}

						<Card className="overflow-hidden border-muted shadow-sm">
							<div className="overflow-x-auto max-h-[500px]">
								<table className="w-full text-sm">
									<thead className="bg-muted/50 sticky top-0 backdrop-blur-sm z-10">
										<tr>
											<th className="text-left p-4 font-medium text-muted-foreground w-16">#</th>
											<th className="text-left p-4 font-medium text-muted-foreground">Nome</th>
											<th className="text-left p-4 font-medium text-muted-foreground">Telefone/Email</th>
											<th className="text-left p-4 font-medium text-muted-foreground">Localização</th>
											<th className="text-left p-4 font-medium text-muted-foreground">Data Nasc.</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-muted/50">
										{parsedClients.slice(0, 100).map((client) => (
											<tr key={client._rowIndex} className="group hover:bg-muted/30 transition-colors">
												<td className="p-4 text-muted-foreground font-mono text-xs">{client._rowIndex}</td>
												<td className="p-4 font-medium text-foreground">{client.nome}</td>
												<td className="p-4">
													<div className="flex flex-col">
														<span>{client.telefone || "-"}</span>
														<span className="text-xs text-muted-foreground">{client.email}</span>
													</div>
												</td>
												<td className="p-4 text-muted-foreground">
													{client.localizacaoCidade || client.localizacaoEstado ? `${client.localizacaoCidade || ""}/${client.localizacaoEstado || ""}` : "-"}
												</td>
												<td className="p-4 text-muted-foreground">{client.dataNascimento ? new Date(client.dataNascimento).toLocaleDateString("pt-BR") : "-"}</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
							{parsedClients.length > 100 && (
								<div className="p-3 text-center text-xs text-muted-foreground bg-muted/30 border-t">E mais {parsedClients.length - 100} clientes...</div>
							)}
						</Card>
					</motion.div>
				)}

				{importState === "uploading" && (
					<motion.div key="uploading" {...fadeInUp} className="flex flex-col items-center gap-8 max-w-md w-full">
						<div className="relative w-24 h-24">
							<svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
								<title>Progresso do upload</title>
								<circle className="text-muted stroke-current" strokeWidth="8" fill="transparent" r="40" cx="50" cy="50" />
								<circle
									className="text-primary stroke-current transition-all duration-300 ease-in-out"
									strokeWidth="8"
									strokeLinecap="round"
									fill="transparent"
									r="40"
									cx="50"
									cy="50"
									style={{
										strokeDasharray: 251.2,
										strokeDashoffset: 251.2 - (251.2 * uploadProgress) / 100,
									}}
								/>
							</svg>
							<div className="absolute inset-0 flex items-center justify-center font-bold text-xl text-primary">{uploadProgress}%</div>
						</div>

						<div className="text-center space-y-2 w-full">
							<h2 className="text-2xl font-bold tracking-tight">Importando dados...</h2>
							<p className="text-muted-foreground">Isso pode levar alguns segundos. Por favor, não feche a página.</p>
						</div>
					</motion.div>
				)}

				{importState === "success" && importResult && (
					<motion.div key="success" {...fadeInUp} className="flex flex-col items-center gap-6 max-w-md text-center">
						<motion.div
							initial={{ scale: 0 }}
							animate={{ scale: 1 }}
							transition={{ type: "spring", stiffness: 200, damping: 10 }}
							className="w-24 h-24 rounded-full bg-green-500/10 flex items-center justify-center mb-2 ring-8 ring-green-500/5"
						>
							<CheckCircle2 className="w-12 h-12 text-green-500" />
						</motion.div>

						<div className="space-y-4">
							<h2 className="text-3xl font-bold tracking-tight text-foreground">Sucesso!</h2>
							<div className="bg-card border rounded-2xl p-6 shadow-sm space-y-4">
								<div className="flex flex-col gap-1">
									<span className="text-4xl font-bold text-green-600 dark:text-green-500">{importResult.insertedCount}</span>
									<span className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Clientes Importados</span>
								</div>

								{importResult.skippedCount > 0 && (
									<div className="pt-4 border-t border-dashed">
										<p className="text-sm text-muted-foreground">
											<span className="font-medium text-foreground">{importResult.skippedCount}</span> registros foram ignorados
										</p>
									</div>
								)}
							</div>
						</div>

						<div className="flex flex-col w-full gap-3 mt-4">
							<Button size="lg" onClick={handleFinish} className="w-full shadow-lg shadow-primary/20">
								Visualizar Clientes
							</Button>
							<Button variant="ghost" onClick={handleReset} className="w-full">
								Importar outro arquivo
							</Button>
						</div>

						{importResult.errors.length > 0 && (
							<div className="w-full mt-4 text-left">
								<button
									type="button"
									className="text-xs text-muted-foreground underline hover:text-foreground w-full text-center mb-2"
									onClick={() => console.log(importResult.errors)}
								>
									Ver detalhes dos erros ({importResult.errors.length})
								</button>
							</div>
						)}
					</motion.div>
				)}

				{importState === "error" && (
					<motion.div key="error" {...fadeInUp} className="flex flex-col items-center gap-6 max-w-md text-center">
						<div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center ring-8 ring-red-500/5">
							<X className="w-10 h-10 text-red-500" />
						</div>
						<div className="space-y-2">
							<h2 className="text-2xl font-bold text-foreground">Falha na importação</h2>
							<p className="text-muted-foreground">
								Ocorreu um erro inesperado ao processar seu arquivo. Verifique se o formato está correto e tente novamente.
							</p>
						</div>
						<div className="flex gap-3 mt-4">
							<Button variant="outline" onClick={handleReset}>
								Cancelar
							</Button>
							<Button onClick={handleReset} className="gap-2">
								<Upload className="w-4 h-4" />
								Tentar novamente
							</Button>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
