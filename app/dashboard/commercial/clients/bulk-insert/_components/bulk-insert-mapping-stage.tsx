"use client";

import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDecimalPlaces } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import { BulkClientCanonicalFieldSchema, type TBulkClientsMappingDefinition } from "@/state-hooks/use-bulk-create-clients";
import { AlertTriangle, Check, CheckCircle2, ChevronDown, LoaderCircle, Sparkles, Table, X } from "lucide-react";
import { FIELD_LABELS, REQUIRED_FIELDS } from "./bulk-insert-helpers";

type BulkInsertMappingStageProps = {
	headers: string[];
	mappingDefinitions: TBulkClientsMappingDefinition[];
	warnings: string[];
	isRemapping: boolean;
	mappingSource: "cache" | "ai" | "manual" | null;
	onUpdateMapping: (field: (typeof BulkClientCanonicalFieldSchema.options)[number], sourceColumn: string | null) => void;
	onRemap: () => void;
	onReset: () => void;
	onContinue: () => void;
};

export function BulkInsertMappingStage({
	headers,
	mappingDefinitions,
	warnings,
	isRemapping,
	mappingSource,
	onUpdateMapping,
	onRemap,
	onReset,
	onContinue,
}: BulkInsertMappingStageProps) {
	return (
		<div className="w-full flex flex-col gap-3">
			<div className="w-full flex flex-col gap-0.5">
				<div className="flex items-center gap-1.5">
					<div className={cn("flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[0.65rem] bg-secondary text-foreground")}>
						<Sparkles className="h-4 w-4" />
						ETAPA 2
					</div>
					<h2 className="text-2xl font-semibold tracking-tight">Revise o mapeamento sugerido</h2>
				</div>
				<p className="w-full text-sm text-muted-foreground">
					Cada campo do sistema precisa apontar para uma coluna da sua planilha. Os obrigatórios devem ser preenchidos antes da prévia.
				</p>
				{mappingSource === "cache" ? (
					<p className="w-full text-xs text-muted-foreground">Reaproveitamos um mapeamento salvo neste navegador para essa mesma estrutura de planilha.</p>
				) : null}
			</div>
			<div className="w-full flex flex-col-reverse md:flex-row gap-3">
				<div className="w-full md:w-2/3 bg-card border-border flex w-full flex-col gap-3 rounded-xl border px-3 py-4 shadow-2xs">
					<div className="flex items-center justify-between">
						<h1 className="text-xs font-medium tracking-tight uppercase">MAPEAMENTO DOS CAMPOS</h1>
						<div className="flex items-center gap-2">
							<Button variant="ghost" size="sm" className="gap-2" onClick={onRemap} disabled={isRemapping}>
								{isRemapping ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
								{isRemapping ? "REMAPEANDO..." : "REMAPEAR COM IA"}
							</Button>
							<Table className="w-4 h-4" />
						</div>
					</div>
					<div className="w-full flex flex-col gap-3">
						{BulkClientCanonicalFieldSchema.options.map((field) => {
							const currentMapping = mappingDefinitions.find((item) => item.field === field);
							const isRequired = REQUIRED_FIELDS.includes(field);
							const isMapped = !!currentMapping?.sourceColumn;
							const confidence = currentMapping?.confidence ?? 0;

							return (
								<div key={field} className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
									<div className="flex items-center gap-1.5 shrink-0">
										<TooltipProvider>
											<Tooltip>
												<TooltipTrigger asChild>
													<div
														className={cn("flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[0.65rem] bg-secondary text-foreground", {
															"bg-green-200 text-green-600": isMapped,
															"bg-red-200 text-red-600": isRequired && !isMapped,
															"bg-yellow-200 text-yellow-600": !isRequired && !isMapped,
														})}
													>
														{isMapped ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
													</div>
												</TooltipTrigger>
												<TooltipContent>
													{isMapped
														? `O campo foi mapeado com sucesso com ${formatDecimalPlaces(confidence * 100, 2)}% de confiança`
														: "O campo não foi encontrado na planilha"}
												</TooltipContent>
											</Tooltip>
										</TooltipProvider>
										<p className="text-xs font-bold tracking-tight lg:text-sm">{FIELD_LABELS[field]}</p>
									</div>

									<div className="hidden lg:flex flex-1 items-center min-w-0">
										<div
											className={cn("h-[2px] flex-1 bg-gradient-to-r", {
												"from-green-400 to-green-300": isMapped,
												"from-red-300 to-red-200": isRequired && !isMapped,
												"from-yellow-300 to-yellow-200": !isRequired && !isMapped,
											})}
										/>
										<svg className="h-2.5 w-2.5 shrink-0 -ml-px" viewBox="0 0 10 10" fill="none">
											<path
												d="M1 5L9 5M9 5L5 1M9 5L5 9"
												className={cn("stroke-[2]", {
													"stroke-green-300": isMapped,
													"stroke-red-200": isRequired && !isMapped,
													"stroke-yellow-200": !isRequired && !isMapped,
												})}
												strokeLinecap="round"
												strokeLinejoin="round"
											/>
										</svg>
									</div>

									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button variant="ghost" size="sm" className="gap-1 uppercase shrink-0">
												{currentMapping?.sourceColumn ?? "NÃO MAPEADO"}
												<ChevronDown className="w-4 h-4" />
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent>
											<DropdownMenuLabel>COLUNA</DropdownMenuLabel>
											<DropdownMenuSeparator />
											{headers.map((header) => (
												<DropdownMenuItem key={header} onClick={() => onUpdateMapping(field, header)}>
													<div className="flex items-center gap-2 w-full justify-between">
														<div className="flex items-center gap-2">{header}</div>
														{header === currentMapping?.sourceColumn ? <Check className="w-4 h-4" /> : null}
													</div>
												</DropdownMenuItem>
											))}
										</DropdownMenuContent>
									</DropdownMenu>
								</div>
							);
						})}
					</div>
				</div>
				{warnings.length > 0 ? (
					<div className="flex w-full flex-col gap-3 rounded-lg border bg-amber-100 p-5 md:w-1/3">
						<div className="flex items-center gap-1.5">
							<div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-amber-600 text-amber-100">
								<AlertTriangle className="h-4 w-4" />
							</div>
							<p className="text-sm font-semibold text-amber-700">AVISOS DO RECONHECIMENTO AUTOMÁTICO</p>
						</div>

						<ul className="w-full list-outside list-disc space-y-2 pl-5 text-sm leading-relaxed text-amber-700 marker:text-amber-600">
							{warnings.map((warning, idx) => (
								<li key={`${warning}-${idx.toString()}`} className="pl-1">
									{warning}
								</li>
							))}
						</ul>
					</div>
				) : (
					<div className="flex w-full flex-col gap-3 rounded-lg border border-green-600/25 bg-green-200 p-5 md:w-1/3">
						<div className="flex items-start gap-3">
							<div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-green-600 text-green-100">
								<CheckCircle2 className="h-4 w-4" />
							</div>
							<div className="flex min-w-0 flex-col gap-1">
								<p className="text-sm font-semibold text-green-600">TUDO CERTO COM OS CAMPOS</p>
								<p className="text-sm leading-relaxed text-green-600">
									O reconhecimento automático não encontrou nenhum ponto de atenção. Pode seguir para a pré-visualização com tranquilidade.
								</p>
							</div>
						</div>
					</div>
				)}
			</div>

			<div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
				<Button variant="ghost" onClick={onReset}>
					ESCOLHER OUTRO ARQUIVO
				</Button>
				<Button onClick={onContinue}>REVISAR LINHAS</Button>
			</div>
		</div>
	);
}
