"use client";

import type { TCreateStatementImportOutput } from "@/app/api/finances/reconciliation/imports/route";
import { LoadingButton } from "@/components/loading-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { getErrorMessage } from "@/lib/errors";
import { createStatementImport } from "@/lib/mutations/financial-reconciliation";
import { cn } from "@/lib/utils";
import { CircleAlert, CircleCheck, FileCheck2, FileText, Loader2, Upload, X } from "lucide-react";
import { useMemo, useRef, useState, type DragEvent } from "react";
import { toast } from "sonner";

const MAX_FILE_BYTES = 15 * 1024 * 1024;

const ACCEPTED_EXTENSIONS = [".ofx", ".qfx", ".csv", ".xls", ".xlsx", ".pdf", ".png", ".jpg", ".jpeg", ".webp"];

// Arquivos OFX normalmente chegam sem MIME type do navegador — inferimos pela extensão.
const EXTENSION_MIME_MAP: Record<string, string> = {
	ofx: "application/x-ofx",
	qfx: "application/x-ofx",
	csv: "text/csv",
	xls: "application/vnd.ms-excel",
	xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	pdf: "application/pdf",
	png: "image/png",
	jpg: "image/jpeg",
	jpeg: "image/jpeg",
	webp: "image/webp",
};

function getFileExtension(fileName: string) {
	const dotIndex = fileName.lastIndexOf(".");
	return dotIndex >= 0 ? fileName.slice(dotIndex).toLowerCase() : "";
}

function resolveMimeType(file: File) {
	if (file.type) return file.type;
	const extension = getFileExtension(file.name).replace(".", "");
	return EXTENSION_MIME_MAP[extension] ?? "application/octet-stream";
}

type TImportResult = TCreateStatementImportOutput["data"];

type TFileEntry = {
	file: File;
	status: "PENDENTE" | "ENVIANDO" | "PROCESSANDO" | "CONCLUIDO" | "ERRO";
	uploadProgress: number;
	resultado: TImportResult | null;
	errorMessage: string | null;
};

type TPhase = "UPLOAD" | "PROCESSANDO" | "RESUMO";

type NewStatementImportProps = {
	contaFinanceiraId: string;
	closeModal: () => void;
	callbacks?: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: (error: Error) => void;
		onSettled?: () => void;
	};
};

export default function NewStatementImport({ contaFinanceiraId, closeModal, callbacks }: NewStatementImportProps) {
	const [phase, setPhase] = useState<TPhase>("UPLOAD");
	const [fileEntries, setFileEntries] = useState<TFileEntry[]>([]);
	const [isDragging, setIsDragging] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const summary = useMemo(() => {
		const results = fileEntries.map((entry) => entry.resultado).filter((result): result is TImportResult => result !== null);
		return {
			arquivosProcessados: results.length,
			arquivosComErro: fileEntries.filter((entry) => entry.status === "ERRO").length,
			importadas: results.reduce((acc, result) => acc + result.importadas, 0),
			duplicadas: results.reduce((acc, result) => acc + result.duplicadas, 0),
			sugeridas: results.reduce((acc, result) => acc + result.sugeridas, 0),
			semCorrespondencia: results.reduce((acc, result) => acc + result.semCorrespondencia, 0),
			avisos: results.flatMap((result) => result.avisos),
		};
	}, [fileEntries]);

	function handleClose() {
		if (phase === "PROCESSANDO") return;
		closeModal();
	}

	function addFiles(candidates: File[]) {
		const accepted: TFileEntry[] = [];
		for (const file of candidates) {
			if (!ACCEPTED_EXTENSIONS.includes(getFileExtension(file.name))) {
				toast.error(`"${file.name}" não é suportado. Envie um arquivo OFX, CSV, XLS/XLSX, PDF ou imagem (PNG, JPG, WEBP).`);
				continue;
			}
			if (file.size > MAX_FILE_BYTES) {
				toast.error(`"${file.name}" excede o tamanho máximo de 15MB.`);
				continue;
			}
			accepted.push({ file, status: "PENDENTE", uploadProgress: 0, resultado: null, errorMessage: null });
		}
		if (accepted.length > 0) setFileEntries((prev) => [...prev, ...accepted]);
	}

	function handleDrop(event: DragEvent<HTMLLabelElement>) {
		event.preventDefault();
		setIsDragging(false);
		addFiles(Array.from(event.dataTransfer.files));
	}

	function updateFileEntry(index: number, updates: Partial<TFileEntry>) {
		setFileEntries((prev) => prev.map((entry, entryIndex) => (entryIndex === index ? { ...entry, ...updates } : entry)));
	}

	async function handleImport() {
		if (fileEntries.length === 0) return;
		setPhase("PROCESSANDO");
		callbacks?.onMutate?.();

		let sucessos = 0;
		let firstError: Error | null = null;

		// Sequencial de propósito: cada arquivo passa por upload privado + parse + matching no servidor.
		for (let index = 0; index < fileEntries.length; index++) {
			const entry = fileEntries[index];
			try {
				updateFileEntry(index, { status: "ENVIANDO", uploadProgress: 0 });
				updateFileEntry(index, { status: "PROCESSANDO", uploadProgress: 50 });
				const result = await createStatementImport({
					contaFinanceiraId,
					file: new File([entry.file], entry.file.name, { type: resolveMimeType(entry.file) }),
				});

				sucessos++;
				updateFileEntry(index, { status: "CONCLUIDO", uploadProgress: 100, resultado: result.data });
			} catch (error) {
				if (!firstError) firstError = error instanceof Error ? error : new Error(getErrorMessage(error));
				updateFileEntry(index, { status: "ERRO", errorMessage: getErrorMessage(error) });
			}
		}

		if (sucessos > 0) callbacks?.onSuccess?.();
		if (firstError) callbacks?.onError?.(firstError);
		callbacks?.onSettled?.();

		if (sucessos === 0) {
			toast.error("Nenhum extrato foi importado. Verifique os erros e tente novamente.");
			setPhase("UPLOAD");
			return;
		}
		setPhase("RESUMO");
	}

	return (
		<Dialog open onOpenChange={(nextOpen) => (nextOpen ? null : handleClose())}>
			<DialogContent data-dialog-container className="flex max-h-[85vh] w-full flex-col gap-3 overflow-hidden sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2 text-base">
						<FileCheck2 className="h-4 w-4 text-primary" />
						IMPORTAR EXTRATO BANCÁRIO
					</DialogTitle>
					<DialogDescription className="text-xs">
						{phase === "RESUMO"
							? "Importação concluída. Confira abaixo o resumo do processamento dos extratos."
							: "Envie o extrato da sua conta. OFX é o formato recomendado (exportado pelo seu banco) — também aceitamos CSV, XLS/XLSX, PDF e imagens."}
					</DialogDescription>
				</DialogHeader>

				{phase !== "RESUMO" ? (
					<div className="flex min-h-0 flex-col gap-3 overflow-y-auto">
						{phase === "UPLOAD" ? (
							<label
								onDragOver={(event) => {
									event.preventDefault();
									setIsDragging(true);
								}}
								onDragLeave={() => setIsDragging(false)}
								onDrop={handleDrop}
								className={cn(
									"flex w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md border border-dashed px-4 py-8 text-center transition-colors",
									isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/40",
								)}
							>
								<Upload className="h-6 w-6 text-muted-foreground" />
								<p className="text-sm font-medium">Arraste os extratos aqui ou clique para selecionar</p>
								<p className="text-xs text-muted-foreground">OFX (formato recomendado) · CSV, XLS/XLSX, PDF, PNG, JPG, WEBP · até 15MB por arquivo</p>
								<input
									ref={fileInputRef}
									type="file"
									multiple
									accept={ACCEPTED_EXTENSIONS.join(",")}
									className="hidden"
									onChange={(event) => {
										addFiles(Array.from(event.target.files ?? []));
										event.target.value = "";
									}}
								/>
							</label>
						) : null}

						{fileEntries.length > 0 ? (
							<div className="flex w-full flex-col overflow-hidden rounded-md border border-border">
								{fileEntries.map((entry, index) => (
									<div key={`${entry.file.name}-${index}`} className="flex w-full flex-col gap-1.5 border-t border-border px-3 py-2 first:border-t-0">
										<div className="flex w-full items-center gap-2">
											<FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
											<div className="flex min-w-0 flex-1 flex-col">
												<p className="truncate text-sm font-medium">{entry.file.name}</p>
												<p className="text-xs text-muted-foreground">
													{entry.status === "ERRO" ? (
														<span className="text-destructive">{entry.errorMessage}</span>
													) : entry.status === "CONCLUIDO" && entry.resultado ? (
														`${entry.resultado.importadas} importada(s) · ${entry.resultado.duplicadas} duplicada(s) · ${entry.resultado.sugeridas} sugestão(ões)`
													) : entry.status === "ENVIANDO" ? (
														`Enviando arquivo... ${entry.uploadProgress}%`
													) : entry.status === "PROCESSANDO" ? (
														"Processando extrato (leitura + sugestões de conciliação)..."
													) : (
														`${(entry.file.size / 1024 / 1024).toFixed(2)} MB`
													)}
												</p>
											</div>
											{entry.status === "ENVIANDO" || entry.status === "PROCESSANDO" ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" /> : null}
											{entry.status === "CONCLUIDO" ? <CircleCheck className="h-4 w-4 shrink-0 text-green-600" /> : null}
											{entry.status === "ERRO" ? <CircleAlert className="h-4 w-4 shrink-0 text-destructive" /> : null}
											{phase === "UPLOAD" ? (
												<button
													type="button"
													aria-label={`Remover ${entry.file.name}`}
													onClick={() => setFileEntries((prev) => prev.filter((_, entryIndex) => entryIndex !== index))}
													className="cursor-pointer rounded-sm p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
												>
													<X className="h-3.5 w-3.5" />
												</button>
											) : null}
										</div>
										{entry.status === "ENVIANDO" ? <Progress value={entry.uploadProgress} className="h-1.5" /> : null}
									</div>
								))}
							</div>
						) : null}

						{phase === "PROCESSANDO" ? (
							<p className="text-center text-xs text-muted-foreground">
								Importando os extratos — cada arquivo é lido e as sugestões de conciliação são geradas em seguida...
							</p>
						) : null}

						<div className="flex w-full items-center justify-end gap-2">
							<Button type="button" variant="ghost" size="sm" disabled={phase === "PROCESSANDO"} onClick={handleClose}>
								CANCELAR
							</Button>
							<LoadingButton type="button" size="sm" loading={phase === "PROCESSANDO"} disabled={fileEntries.length === 0} onClick={handleImport}>
								<Upload className="h-4 w-4" />
								IMPORTAR {fileEntries.length > 0 ? `${fileEntries.length} ${fileEntries.length === 1 ? "ARQUIVO" : "ARQUIVOS"}` : "EXTRATO"}
							</LoadingButton>
						</div>
					</div>
				) : (
					<div className="flex min-h-0 flex-col gap-3 overflow-y-auto">
						<div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4">
							<SummaryTile label="IMPORTADAS" value={summary.importadas} className="text-green-600" />
							<SummaryTile label="DUPLICADAS" value={summary.duplicadas} className="text-muted-foreground" />
							<SummaryTile label="SUGERIDAS" value={summary.sugeridas} className="text-blue-600" />
							<SummaryTile label="SEM CORRESPONDÊNCIA" value={summary.semCorrespondencia} className="text-amber-600" />
						</div>

						<div className="flex w-full flex-col overflow-hidden rounded-md border border-border">
							{fileEntries.map((entry, index) => (
								<div key={`${entry.file.name}-${index}`} className="flex w-full items-center gap-2 border-t border-border px-3 py-2 first:border-t-0">
									<FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
									<div className="flex min-w-0 flex-1 flex-col">
										<p className="truncate text-sm font-medium">{entry.file.name}</p>
										<p className="text-xs text-muted-foreground">
											{entry.status === "ERRO" ? (
												<span className="text-destructive">{entry.errorMessage}</span>
											) : entry.resultado ? (
												`${entry.resultado.importadas} importada(s) · ${entry.resultado.duplicadas} duplicada(s) · ${entry.resultado.sugeridas} sugestão(ões) · ${entry.resultado.semCorrespondencia} sem correspondência`
											) : null}
										</p>
									</div>
									{entry.status === "CONCLUIDO" ? <CircleCheck className="h-4 w-4 shrink-0 text-green-600" /> : null}
									{entry.status === "ERRO" ? <CircleAlert className="h-4 w-4 shrink-0 text-destructive" /> : null}
								</div>
							))}
						</div>

						{summary.avisos.length > 0 ? (
							<div className="flex w-full flex-col gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
								{summary.avisos.map((aviso, index) => (
									<div key={index} className="flex items-start gap-2">
										<CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
										<p className="leading-relaxed">{aviso}</p>
									</div>
								))}
							</div>
						) : null}

						<div className="flex w-full items-center justify-end gap-2">
							<Button type="button" size="sm" onClick={closeModal}>
								CONCLUIR
							</Button>
						</div>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}

type SummaryTileProps = {
	label: string;
	value: number;
	className?: string;
};
function SummaryTile({ label, value, className }: SummaryTileProps) {
	return (
		<div className="bg-card border-border flex w-full flex-col items-center gap-0.5 rounded-md border px-2 py-3">
			<span className={cn("text-lg font-bold tabular-nums", className)}>{value}</span>
			<span className="text-center text-[0.6rem] font-medium tracking-tight text-muted-foreground">{label}</span>
		</div>
	);
}
