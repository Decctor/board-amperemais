"use client";

import type { TImportPurchaseCompositionOutput } from "@/app/api/purchases/import-composition/route";
import SelectProductWithVariants from "@/components/Inputs/SelectProductWithVariants";
import { LoadingButton } from "@/components/loading-button";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { getErrorMessage } from "@/lib/errors";
import { formatDateAsLocale, formatToCNPJ, formatToMoney } from "@/lib/formatting";
import { importPurchaseComposition } from "@/lib/mutations/purchases";
import { createSupplier, createSupplierProductMappings } from "@/lib/mutations/suppliers";
import { cn } from "@/lib/utils";
import type { TUsePurchaseState } from "@/state-hooks/use-purchase-state";
import { ArrowRight, Building2, CircleAlert, CircleCheck, FileText, ImageIcon, Info, Loader2, Sparkles, Upload, X } from "lucide-react";
import { useMemo, useRef, useState, type DragEvent } from "react";
import { toast } from "sonner";
import { convertLineToProductUnit } from "@/lib/purchase/units";
import { createEmptyPurchaseItem, normalizeItemValues } from "../Items";

const ACCEPTED_MIME_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
const MAX_FILE_BASE64_LENGTH = 4_200_000;
const IMAGE_MAX_DIMENSION = 2000;

type TImportFornecedor = TImportPurchaseCompositionOutput["data"]["fornecedor"];
type TImportDocumento = TImportPurchaseCompositionOutput["data"]["documento"];
type TImportedLine = TImportPurchaseCompositionOutput["data"]["itens"][number];

type TReviewLine = TImportedLine & {
	incluir: boolean;
	/** Raw extracted values, frozen before user edits, persisted as externo* on the item. */
	extraidoQuantidade: number;
	extraidoValorUnitario: number;
	produtoVariante: { nome: string; codigo: string; imagemCapaUrl: string | null } | null;
	manualOverride: boolean;
	/** Quantas unidades internas cabem em 1 unidade da nota. Null quando as unidades batem. */
	fatorConversao: number | null;
};

/**
 * Campos do lançamento contábil que a leitura propõe. Campo vazio entra marcado; campo já
 * preenchido com valor diferente entra como conflito e DESMARCADO, para que a importação nunca
 * sobrescreva em silêncio o que o operador digitou.
 *
 * `valorPrevisto` (orçado) nunca é proposto: a nota é o valor efetivo, não a previsão, e preenchê-lo
 * a partir dela faria o orçado bater sempre com o realizado.
 */
type TAccountingProposalKey = "valor" | "dataCompetencia" | "titulo";

type TAccountingProposal = {
	key: TAccountingProposalKey;
	label: string;
	atual: string | null;
	proposto: string;
	conflito: boolean;
	patch: Partial<TUsePurchaseState["state"]["lancamentoContabil"]>;
};

type TFileEntry = {
	file: File;
	status: "PENDENTE" | "PROCESSANDO" | "CONCLUIDO" | "ERRO";
	itemCount: number | null;
	errorMessage: string | null;
};

type TPhase = "UPLOAD" | "PROCESSANDO" | "REVISAO";

const MATCH_BADGE: Record<TImportedLine["matchTipo"], { label: string; className: string }> = {
	MAPEADO: { label: "Mapeado", className: "border-blue-500/25 bg-blue-500/10 text-blue-700 dark:text-blue-300" },
	CODIGO: { label: "Código", className: "border-blue-500/25 bg-blue-500/10 text-blue-700 dark:text-blue-300" },
	SUGERIDO: { label: "Sugerido", className: "border-amber-500/35 bg-amber-500/15 text-amber-700 dark:text-amber-300" },
	NAO_MAPEADO: { label: "Não mapeado", className: "border-destructive/30 bg-destructive/10 text-destructive" },
};

function readFileAsBase64(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			const result = reader.result as string;
			resolve(result.slice(result.indexOf(",") + 1));
		};
		reader.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
		reader.readAsDataURL(file);
	});
}

async function downscaleImageToJpegBase64(file: File): Promise<string> {
	try {
		const bitmap = await createImageBitmap(file);
		const scale = Math.min(1, IMAGE_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
		const canvas = document.createElement("canvas");
		canvas.width = Math.round(bitmap.width * scale);
		canvas.height = Math.round(bitmap.height * scale);
		const context = canvas.getContext("2d");
		if (!context) throw new Error("Canvas indisponível.");
		context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
		bitmap.close();
		const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
		return dataUrl.slice(dataUrl.indexOf(",") + 1);
	} catch {
		// Downscale is an optimization; fall back to the original bytes.
		return readFileAsBase64(file);
	}
}

async function prepareFilePayload(file: File) {
	if (file.type === "application/pdf") {
		const dataBase64 = await readFileAsBase64(file);
		if (dataBase64.length > MAX_FILE_BASE64_LENGTH) throw new Error("Arquivo muito grande. O limite é de aproximadamente 3MB por arquivo.");
		return { dataBase64, mimeType: "application/pdf" as const, fileName: file.name };
	}
	const dataBase64 = await downscaleImageToJpegBase64(file);
	if (dataBase64.length > MAX_FILE_BASE64_LENGTH) throw new Error("Imagem muito grande mesmo após compressão. Tente uma foto menor.");
	const mimeType = file.type === "application/pdf" ? "application/pdf" : ("image/jpeg" as const);
	return { dataBase64, mimeType: mimeType as "image/jpeg", fileName: file.name };
}

function getLineTotal(line: TReviewLine) {
	// O fator de conversão não entra: ele redistribui quantidade e valor unitário entre as unidades,
	// preservando o total da linha impresso na nota.
	return line.quantidade * line.valorUnitario - (line.desconto ?? 0);
}

function isBlank(value: unknown) {
	if (value === null || value === undefined) return true;
	if (typeof value === "string") return value.trim().length === 0;
	if (typeof value === "number") return value === 0;
	return false;
}

function sameDay(a?: Date | null, b?: Date | null) {
	if (!a || !b) return false;
	return new Date(a).toISOString().slice(0, 10) === new Date(b).toISOString().slice(0, 10);
}

function buildAccountingProposals({
	documento,
	fornecedor,
	accountingEntry,
}: {
	documento: TImportDocumento;
	fornecedor: TImportFornecedor | null;
	accountingEntry: TUsePurchaseState["state"]["lancamentoContabil"];
}): TAccountingProposal[] {
	const proposals: TAccountingProposal[] = [];

	// O total do documento manda; sem total declarado, a soma das linhas lidas.
	const valorProposto = documento.valorTotal ?? documento.somaItens;
	if (valorProposto > 0) {
		const atual = accountingEntry.valor ?? 0;
		proposals.push({
			key: "valor",
			label: "Valor efetivo (a pagar)",
			atual: isBlank(atual) ? null : formatToMoney(atual),
			proposto: formatToMoney(valorProposto),
			conflito: !isBlank(atual) && Math.abs(atual - valorProposto) > 0.01,
			patch: { valor: valorProposto },
		});
	}

	if (documento.dataEmissao) {
		const emissao = new Date(documento.dataEmissao);
		const atual = accountingEntry.dataCompetencia ? new Date(accountingEntry.dataCompetencia) : null;
		proposals.push({
			key: "dataCompetencia",
			label: "Data de competência",
			atual: atual ? (formatDateAsLocale(atual) ?? null) : null,
			proposto: formatDateAsLocale(emissao) ?? "",
			// A competência nasce com a data de hoje, então quase toda importação é tecnicamente um
			// conflito. Só tratamos como tal se o operador tiver escolhido outra data que não hoje.
			conflito: !!atual && !sameDay(atual, emissao) && !sameDay(atual, new Date()),
			patch: { dataCompetencia: emissao },
		});
	}

	const fornecedorNome = fornecedor?.existente?.nome ?? fornecedor?.extraido?.nome ?? null;
	const tituloProposto = fornecedorNome
		? documento.numero
			? `Compra ${fornecedorNome} - Doc. ${documento.numero}`
			: `Compra ${fornecedorNome}`
		: documento.numero
			? `Compra - Doc. ${documento.numero}`
			: null;
	if (tituloProposto && isBlank(accountingEntry.titulo)) {
		proposals.push({
			key: "titulo",
			label: "Título do lançamento",
			atual: null,
			proposto: tituloProposto,
			conflito: false,
			patch: { titulo: tituloProposto },
		});
	}

	return proposals;
}

type ImportCompositionWithAIProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	addPurchaseItem: TUsePurchaseState["addPurchaseItem"];
	updatePurchase: TUsePurchaseState["updatePurchase"];
	/** Lançamento contábil da compra: é ele que carrega o valor efetivo lido do documento. */
	accountingEntry: TUsePurchaseState["state"]["lancamentoContabil"];
	updateAccountingEntry: TUsePurchaseState["updateAccountingEntry"];
	currentFornecedorId: string | null;
};

export default function ImportCompositionWithAI({
	open,
	onOpenChange,
	addPurchaseItem,
	updatePurchase,
	accountingEntry,
	updateAccountingEntry,
	currentFornecedorId,
}: ImportCompositionWithAIProps) {
	const [phase, setPhase] = useState<TPhase>("UPLOAD");
	const [fileEntries, setFileEntries] = useState<TFileEntry[]>([]);
	const [isDragging, setIsDragging] = useState(false);
	const [lines, setLines] = useState<TReviewLine[]>([]);
	const [fornecedor, setFornecedor] = useState<TImportFornecedor | null>(null);
	const [documento, setDocumento] = useState<TImportDocumento | null>(null);
	const [warnings, setWarnings] = useState<string[]>([]);
	const [rejectedProposals, setRejectedProposals] = useState<Set<TAccountingProposalKey>>(new Set());
	const [vincularFornecedor, setVincularFornecedor] = useState(true);
	const [isConfirming, setIsConfirming] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const includedLines = useMemo(() => lines.filter((line) => line.incluir && line.produto), [lines]);
	const unresolvedCount = useMemo(() => lines.filter((line) => !line.produto).length, [lines]);
	const pendingUnitCount = useMemo(
		() => lines.filter((line) => line.incluir && line.produto && line.divergenciaUnidade && !line.fatorConversao).length,
		[lines],
	);
	const includedTotal = useMemo(() => includedLines.reduce((acc, line) => acc + getLineTotal(line), 0), [includedLines]);
	const accountingProposals = useMemo(
		() => (documento ? buildAccountingProposals({ documento, fornecedor, accountingEntry }) : []),
		[documento, fornecedor, accountingEntry],
	);

	function resetAndClose(nextOpen: boolean) {
		onOpenChange(nextOpen);
		if (!nextOpen) {
			setPhase("UPLOAD");
			setFileEntries([]);
			setLines([]);
			setFornecedor(null);
			setDocumento(null);
			setWarnings([]);
			setRejectedProposals(new Set());
			setVincularFornecedor(true);
			setIsDragging(false);
		}
	}

	function addFiles(candidates: File[]) {
		const accepted: TFileEntry[] = [];
		for (const file of candidates) {
			if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
				toast.error(`"${file.name}" não é suportado. Envie um PDF ou uma imagem (PNG, JPG, WEBP).`);
				continue;
			}
			accepted.push({ file, status: "PENDENTE", itemCount: null, errorMessage: null });
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

	function updateLine(index: number, updates: Partial<TReviewLine>) {
		setLines((prev) => prev.map((line, lineIndex) => (lineIndex === index ? { ...line, ...updates } : line)));
	}

	async function handleExtract() {
		if (fileEntries.length === 0) return;
		setPhase("PROCESSANDO");

		const mergedLines: TReviewLine[] = [];
		const mergedWarnings: string[] = [];
		let mergedFornecedor: TImportFornecedor | null = null;
		let mergedDocumento: TImportDocumento | null = null;

		for (let index = 0; index < fileEntries.length; index++) {
			updateFileEntry(index, { status: "PROCESSANDO" });
			try {
				const payload = await prepareFilePayload(fileEntries[index].file);
				const result = await importPurchaseComposition({ file: payload });
				mergedLines.push(
					...result.data.itens.map((item) => ({
						...item,
						incluir: !!item.produto,
						extraidoQuantidade: item.quantidade,
						extraidoValorUnitario: item.valorUnitario,
						produtoVariante: null,
						manualOverride: false,
						fatorConversao: item.fatorConversaoSugerido,
					})),
				);
				mergedWarnings.push(...result.data.avisos);
				if (!mergedFornecedor && (result.data.fornecedor.existente || result.data.fornecedor.extraido)) mergedFornecedor = result.data.fornecedor;
				// O primeiro documento define o cabeçalho da compra; os seguintes só somam itens.
				if (!mergedDocumento) mergedDocumento = result.data.documento;
				updateFileEntry(index, { status: "CONCLUIDO", itemCount: result.data.itens.length });
			} catch (error) {
				updateFileEntry(index, { status: "ERRO", errorMessage: getErrorMessage(error) });
			}
		}

		if (mergedLines.length === 0) {
			toast.error("Nenhum item foi identificado nos arquivos enviados.");
			setPhase("UPLOAD");
			return;
		}

		setLines(mergedLines);
		setFornecedor(mergedFornecedor);
		setDocumento(mergedDocumento);
		setWarnings([...new Set(mergedWarnings)]);
		setRejectedProposals(
			mergedDocumento
				? new Set(
						buildAccountingProposals({ documento: mergedDocumento, fornecedor: mergedFornecedor, accountingEntry })
							.filter((proposal) => proposal.conflito)
							.map((proposal) => proposal.key),
					)
				: new Set(),
		);
		setPhase("REVISAO");
	}

	function toggleProposal(key: TAccountingProposalKey) {
		setRejectedProposals((previous) => {
			const next = new Set(previous);
			if (next.has(key)) next.delete(key);
			else next.add(key);
			return next;
		});
	}

	async function handleConfirm() {
		if (includedLines.length === 0) return;
		if (pendingUnitCount > 0) {
			toast.error(`Informe o fator de conversão dos ${pendingUnitCount} itens com unidade divergente antes de adicionar.`);
			return;
		}
		setIsConfirming(true);
		try {
			// 1. Supplier: link the existing one or create it now (idempotent by CNPJ on the server).
			let supplierId = fornecedor?.existente?.id ?? null;
			if (vincularFornecedor && fornecedor) {
				let supplierData = fornecedor.existente;
				if (!supplierData && fornecedor.extraido?.nome) {
					const created = await createSupplier({
						supplier: {
							nome: fornecedor.extraido.nome,
							cpfCnpj: fornecedor.extraido.cnpj,
							telefone: null,
							email: null,
							inscricaoEstadual: null,
						},
					});
					supplierId = created.data.insertedId;
					supplierData = created.data.supplier;
				}
				if (supplierId && supplierData) {
					updatePurchase({
						fornecedorId: supplierId,
						pedidoFornecedorNome: supplierData.nome,
						pedidoFornecedorCnpj: supplierData.cpfCnpj ? formatToCNPJ(supplierData.cpfCnpj) : null,
					});
				}
			}

			// 2. Inject reviewed lines into the purchase draft, already converted to the product unit.
			//    Os valores lidos da nota seguem gravados em externo*, independentemente do ajuste.
			for (const line of includedLines) {
				if (!line.produto) continue;
				const convertido = convertLineToProductUnit({
					quantidade: line.quantidade,
					valorUnitario: line.valorUnitario,
					fatorConversao: line.fatorConversao,
				});
				addPurchaseItem(
					normalizeItemValues({
						...createEmptyPurchaseItem(),
						produtoId: line.produto.id,
						produtoVarianteId: line.produtoVarianteId,
						snapshotProdutoDescricao: line.produtoVariante?.nome ?? line.produto.nome,
						snapshotProdutoCodigo: line.produtoVariante?.codigo ?? line.produto.codigo,
						produto: {
							nome: line.produto.nome,
							codigo: line.produto.codigo,
							unidade: line.produto.unidade ?? "UN",
							imagemCapaUrl: line.produto.imagemCapaUrl,
						},
						produtoVariante: line.produtoVariante ?? undefined,
						quantidade: convertido.quantidade,
						valorUnitarioBruto: convertido.valorUnitario,
						descontosTotal: line.desconto ?? 0,
						externoQtde: line.extraidoQuantidade,
						externoValor: line.extraidoValorUnitario,
						externoUnidade: line.unidade,
						externoFatorConversao: line.fatorConversao,
						anotacoes: `Importado via IA: ${line.descricao}`,
					}),
				);
			}

			// 3. Campos aceitos do lançamento contábil. `valorPrevisto` nunca entra: a nota é o valor
			//    efetivo, e preenchê-lo faria o orçado bater sempre com o realizado.
			const acceptedPatch = accountingProposals
				.filter((proposal) => !rejectedProposals.has(proposal.key))
				.reduce<Partial<TUsePurchaseState["state"]["lancamentoContabil"]>>((patch, proposal) => ({ ...patch, ...proposal.patch }), {});
			if (Object.keys(acceptedPatch).length > 0) updateAccountingEntry(acceptedPatch);

			// 4. Learning: persist confirmed de-paras so the next invoice of this supplier matches deterministically.
			const learnableLines = includedLines.filter(
				(line) => line.produto && line.matchTipo !== "MAPEADO" && (line.codigoFornecedor?.trim() || line.ean?.trim()),
			);
			if (supplierId && learnableLines.length > 0) {
				createSupplierProductMappings({
					fornecedorId: supplierId,
					mappings: learnableLines.map((line) => ({
						codigoFornecedor: line.codigoFornecedor,
						ean: line.ean,
						produtoId: line.produto!.id,
						produtoVarianteId: line.produtoVarianteId,
						unidadeExterna: line.unidade,
						fatorConversao: line.fatorConversao,
					})),
				}).catch((error) => toast.error(`Itens adicionados, mas houve um erro ao registrar os mapeamentos do fornecedor: ${getErrorMessage(error)}`));
			}

			toast.success(`${includedLines.length} ${includedLines.length === 1 ? "item adicionado" : "itens adicionados"} à composição da compra.`);
			resetAndClose(false);
		} catch (error) {
			toast.error(getErrorMessage(error));
		} finally {
			setIsConfirming(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={(nextOpen) => (isConfirming || phase === "PROCESSANDO" ? null : resetAndClose(nextOpen))}>
			<DialogContent data-dialog-container className="flex max-h-[85vh] w-full flex-col gap-3 overflow-hidden sm:max-w-3xl">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2 text-base">
						<Sparkles className="h-4 w-4 text-primary" />
						IMPORTAR ITENS COM IA
					</DialogTitle>
					<DialogDescription className="text-xs">
						{phase === "REVISAO"
							? "Revise os itens extraídos, resolva os não mapeados e adicione-os à composição da compra."
							: "Envie PDFs de nota fiscal ou fotos de cupom. A IA identifica os itens e tenta mapeá-los aos seus produtos."}
					</DialogDescription>
				</DialogHeader>

				{phase !== "REVISAO" ? (
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
								<p className="text-sm font-medium">Arraste os arquivos aqui ou clique para selecionar</p>
								<p className="text-xs text-muted-foreground">PDF de nota fiscal ou foto de cupom · PNG, JPG, WEBP · até 3MB por arquivo</p>
								<input
									ref={fileInputRef}
									type="file"
									multiple
									accept={ACCEPTED_MIME_TYPES.join(",")}
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
									<div key={`${entry.file.name}-${index}`} className="flex w-full items-center gap-2 border-t border-border px-3 py-2 first:border-t-0">
										{entry.file.type === "application/pdf" ? (
											<FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
										) : (
											<ImageIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
										)}
										<div className="flex min-w-0 flex-1 flex-col">
											<p className="truncate text-sm font-medium">{entry.file.name}</p>
											<p className="text-xs text-muted-foreground">
												{entry.status === "ERRO" ? (
													<span className="text-destructive">{entry.errorMessage}</span>
												) : entry.status === "CONCLUIDO" ? (
													`${entry.itemCount} ${entry.itemCount === 1 ? "item identificado" : "itens identificados"}`
												) : (
													`${(entry.file.size / 1024 / 1024).toFixed(2)} MB`
												)}
											</p>
										</div>
										{entry.status === "PROCESSANDO" ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" /> : null}
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
								))}
							</div>
						) : null}

						{phase === "PROCESSANDO" ? (
							<p className="text-center text-xs text-muted-foreground">Lendo os documentos com IA — isso pode levar alguns segundos por arquivo...</p>
						) : null}

						<div className="flex w-full items-center justify-end gap-2">
							<Button type="button" variant="ghost" size="sm" disabled={phase === "PROCESSANDO"} onClick={() => resetAndClose(false)}>
								CANCELAR
							</Button>
							<LoadingButton type="button" size="sm" loading={phase === "PROCESSANDO"} disabled={fileEntries.length === 0} onClick={handleExtract}>
								<Sparkles className="h-4 w-4" />
								EXTRAIR ITENS
							</LoadingButton>
						</div>
					</div>
				) : (
					<div className="flex min-h-0 flex-1 flex-col gap-3">
						<div className="flex w-full flex-col gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
							<div className="flex min-w-0 items-center gap-2">
								<Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
								{fornecedor?.existente ? (
									<div className="flex min-w-0 items-center gap-2">
										<p className="truncate text-sm font-medium">{fornecedor.existente.nome}</p>
										<span className="shrink-0 rounded-full border border-blue-500/25 bg-blue-500/10 px-2 py-0.5 text-[0.65rem] font-medium text-blue-700 dark:text-blue-300">
											FORNECEDOR EXISTENTE
										</span>
									</div>
								) : fornecedor?.extraido?.nome ? (
									<div className="flex min-w-0 items-center gap-2">
										<p className="truncate text-sm font-medium">{fornecedor.extraido.nome}</p>
										<span className="shrink-0 rounded-full border border-amber-500/35 bg-amber-500/15 px-2 py-0.5 text-[0.65rem] font-medium text-amber-700 dark:text-amber-300">
											SERÁ CRIADO
										</span>
									</div>
								) : (
									<p className="text-sm italic text-muted-foreground">Fornecedor não identificado no documento.</p>
								)}
							</div>
							{fornecedor?.existente || fornecedor?.extraido?.nome ? (
								<label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs font-medium text-foreground/80">
									<Switch checked={vincularFornecedor} onCheckedChange={setVincularFornecedor} />
									{currentFornecedorId ? "Substituir fornecedor da compra" : "Vincular à compra"}
								</label>
							) : null}
						</div>

						{warnings.length > 0 ? (
							<ul className="flex w-full flex-col gap-1">
								{warnings.map((warning) => (
									<li key={warning} className="flex items-start gap-1.5 rounded-md border border-border bg-muted/40 px-2.5 py-1.5">
										<Info className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
										<p className="text-[0.68rem] leading-relaxed text-muted-foreground">{warning}</p>
									</li>
								))}
							</ul>
						) : null}

						{accountingProposals.length > 0 ? (
							<section className="flex w-full flex-col overflow-hidden rounded-md border border-border">
								<header className="flex items-center justify-between gap-2 border-b border-border bg-muted/50 px-3 py-1.5">
									<h3 className="text-[0.68rem] font-medium uppercase text-muted-foreground">Lançamento contábil</h3>
									<span className="text-[0.65rem] text-muted-foreground">Desmarque o que não quiser aplicar</span>
								</header>
								<ul className="flex w-full flex-col">
									{accountingProposals.map((proposal) => {
										const aceito = !rejectedProposals.has(proposal.key);
										const inputId = `proposta-contabil-${proposal.key}`;
										return (
											<li
												key={proposal.key}
												className={cn(
													"flex w-full items-start gap-2.5 border-t border-border px-3 py-2 first:border-t-0",
													proposal.conflito && aceito && "bg-destructive/5",
													!aceito && "opacity-55",
												)}
											>
												<Checkbox id={inputId} checked={aceito} onCheckedChange={() => toggleProposal(proposal.key)} className="mt-0.5" />
												<div className="flex min-w-0 flex-1 flex-col gap-0.5">
													<label htmlFor={inputId} className="cursor-pointer text-xs font-medium leading-tight">
														{proposal.label}
													</label>
													<div className="flex min-w-0 flex-wrap items-center gap-1.5 text-[0.68rem]">
														{proposal.atual ? (
															<>
																<span className="truncate text-muted-foreground line-through">{proposal.atual}</span>
																<ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
															</>
														) : (
															<span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[0.6rem] text-muted-foreground">vazio</span>
														)}
														<span className={cn("min-w-0 break-words font-medium", proposal.conflito ? "text-destructive" : "text-foreground")}>
															{proposal.proposto}
														</span>
													</div>
												</div>
											</li>
										);
									})}
								</ul>
							</section>
						) : null}

						{unresolvedCount > 0 ? (
							<div className="flex w-full items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
								<CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
								<p className="leading-relaxed">
									{unresolvedCount} {unresolvedCount === 1 ? "item não foi mapeado" : "itens não foram mapeados"} a produtos. Selecione o produto
									correspondente para incluí-los — ou deixe desmarcado para ignorar.
								</p>
							</div>
						) : null}

						<div className="flex min-h-0 flex-1 flex-col overflow-y-auto rounded-md border border-border">
							{lines.map((line, index) => {
								const badge = MATCH_BADGE[line.produto ? line.matchTipo : "NAO_MAPEADO"];
								return (
									<div key={index} className={cn("flex w-full flex-col gap-2 border-t border-border p-3 first:border-t-0", !line.incluir && "opacity-60")}>
										<div className="flex w-full items-start gap-2.5">
											<Checkbox
												checked={line.incluir}
												disabled={!line.produto}
												onCheckedChange={(checked) => updateLine(index, { incluir: checked === true })}
												aria-label={`Incluir "${line.descricao}"`}
												className="mt-0.5"
											/>
											<div className="flex min-w-0 flex-1 flex-col gap-0.5">
												<p className="text-sm font-medium leading-tight">{line.descricao}</p>
												<p className="text-xs text-muted-foreground">
													{[
														line.codigoFornecedor ? `Cód. ${line.codigoFornecedor}` : null,
														line.ean ? `EAN ${line.ean}` : null,
														line.unidade ? `Un. ${line.unidade}` : null,
														`${line.extraidoQuantidade} × ${formatToMoney(line.extraidoValorUnitario)}`,
													]
														.filter(Boolean)
														.join(" · ")}
												</p>
											</div>
											<span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[0.65rem] font-medium", badge.className)}>{badge.label}</span>
										</div>
										<div className="flex w-full flex-col gap-1.5 pl-6 sm:flex-row sm:items-end">
											<div className="min-w-0 flex-1">
												<SelectProductWithVariants
													label="PRODUTO CORRESPONDENTE"
													showLabel={false}
													value={line.produto ? { productId: line.produto.id, productVariantId: line.produtoVarianteId } : null}
													selectedLabel={
														line.produto ? (line.produtoVariante ? `${line.produto.nome} - ${line.produtoVariante.nome}` : line.produto.nome) : undefined
													}
													resetOptionLabel="REMOVER PRODUTO"
													initialSearch=""
													handleChange={(value) => {
														if (!value?.product) return;
														updateLine(index, {
															produto: {
																id: value.product.id,
																nome: value.product.nome,
																codigo: value.product.codigo,
																unidade: value.product.unidade,
																imagemCapaUrl: value.product.imagemCapaUrl ?? null,
															},
															produtoVarianteId: value.productVariant?.id ?? null,
															produtoVariante: value.productVariant
																? {
																		nome: value.productVariant.nome,
																		codigo: value.productVariant.codigo ?? "",
																		imagemCapaUrl: value.productVariant.imagemCapaUrl ?? null,
																	}
																: null,
															manualOverride: true,
															incluir: true,
														});
													}}
													onReset={() => updateLine(index, { produto: null, produtoVarianteId: null, produtoVariante: null, incluir: false })}
													triggerProps={{ size: "sm", className: "h-8 w-full text-xs" }}
												/>
											</div>
											<div className="flex shrink-0 items-end gap-1.5">
												<div className="flex flex-col gap-0.5">
													<label className="text-[0.65rem] font-medium uppercase text-muted-foreground">Qtde</label>
													<Input
														type="number"
														min={0}
														step="any"
														value={line.quantidade}
														onChange={(event) => updateLine(index, { quantidade: Number(event.target.value) || 0 })}
														className="h-8 w-20 text-xs tabular-nums"
													/>
												</div>
												<div className="flex flex-col gap-0.5">
													<label className="text-[0.65rem] font-medium uppercase text-muted-foreground">Valor unit.</label>
													<Input
														type="number"
														min={0}
														step="any"
														value={line.valorUnitario}
														onChange={(event) => updateLine(index, { valorUnitario: Number(event.target.value) || 0 })}
														className="h-8 w-24 text-xs tabular-nums"
													/>
												</div>
												<div className="flex h-8 w-24 items-center justify-end rounded-md bg-muted/50 px-2">
													<span className="font-mono text-xs font-medium tabular-nums">{formatToMoney(getLineTotal(line))}</span>
												</div>
											</div>
										</div>

										{line.produto && line.divergenciaUnidade ? (
											<div className="ml-6 flex flex-col gap-1.5 rounded-md border border-destructive/25 bg-destructive/5 px-2.5 py-2 sm:flex-row sm:items-center sm:justify-between">
												<p className="text-[0.68rem] leading-relaxed text-destructive">
													A nota fatura em <strong>{line.unidade}</strong> e o produto é estocado em <strong>{line.produto.unidade ?? "UN"}</strong>. Informe
													quantas {line.produto.unidade ?? "UN"} cabem em 1 {line.unidade}.
												</p>
												<div className="flex shrink-0 items-end gap-1.5">
													<div className="flex flex-col gap-0.5">
														<label className="text-[0.65rem] font-medium uppercase text-muted-foreground">Fator</label>
														<Input
															type="number"
															min={0}
															step="any"
															value={line.fatorConversao ?? ""}
															placeholder="—"
															onChange={(event) => updateLine(index, { fatorConversao: Number(event.target.value) || null })}
															className="h-8 w-20 text-xs tabular-nums"
														/>
													</div>
													<div className="flex flex-col gap-0.5">
														<span className="text-[0.65rem] font-medium uppercase text-muted-foreground">Entra como</span>
														<span className="flex h-8 items-center font-mono text-xs font-medium tabular-nums">
															{line.fatorConversao && line.fatorConversao > 0
																? `${line.quantidade * line.fatorConversao} ${line.produto.unidade ?? "UN"} × ${formatToMoney(line.valorUnitario / line.fatorConversao)}`
																: "—"}
														</span>
													</div>
												</div>
											</div>
										) : null}
									</div>
								);
							})}
						</div>

						<div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
							<p className="text-xs text-muted-foreground">
								{includedLines.length} de {lines.length} {lines.length === 1 ? "item selecionado" : "itens selecionados"} · Total:{" "}
								<span className="font-medium text-foreground">{formatToMoney(includedTotal)}</span>
							</p>
							<div className="flex items-center justify-end gap-2">
								<Button type="button" variant="ghost" size="sm" disabled={isConfirming} onClick={() => setPhase("UPLOAD")}>
									VOLTAR
								</Button>
								<LoadingButton type="button" size="sm" loading={isConfirming} disabled={includedLines.length === 0} onClick={handleConfirm}>
									ADICIONAR {includedLines.length} {includedLines.length === 1 ? "ITEM" : "ITENS"}
								</LoadingButton>
							</div>
						</div>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
