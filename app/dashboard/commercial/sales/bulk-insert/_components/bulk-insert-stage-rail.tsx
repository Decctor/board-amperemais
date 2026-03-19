"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TBulkCreateSalesImportState } from "@/state-hooks/use-bulk-create-sales";
import { CheckCircle2, Database, FileSpreadsheet, Map, ScanSearch, UploadCloud } from "lucide-react";
import Link from "next/link";
import { getBulkInsertCurrentStepIndex } from "./bulk-insert-helpers";

type BulkInsertStageRailProps = {
	importState: TBulkCreateSalesImportState;
	fileName: string;
	headersCount: number;
	rawRowsCount: number;
	normalizedRowsCount: number;
	parseErrorsCount: number;
	warningsCount: number;
};

const STEP_ITEMS = [
	{
		title: "Enviar planilha",
		description: "Selecione um arquivo `.xlsx`, `.xls` ou `.csv`.",
		icon: UploadCloud,
	},
	{
		title: "Mapear colunas",
		description: "Confirme como cada coluna será interpretada.",
		icon: Map,
	},
	{
		title: "Revisar linhas",
		description: "Veja a prévia e valide os dados encontrados.",
		icon: ScanSearch,
	},
	{
		title: "Importar vendas",
		description: "Persistir as linhas válidas no sistema.",
		icon: Database,
	},
];

export function BulkInsertStageRail({
	importState,
	fileName,
	headersCount,
	rawRowsCount,
	normalizedRowsCount,
	parseErrorsCount,
	warningsCount,
}: BulkInsertStageRailProps) {
	const currentStepIndex = getBulkInsertCurrentStepIndex(importState);

	return (
		<div className="flex flex-col gap-4 xl:sticky xl:top-4">
			<Card className="border-primary/15 bg-gradient-to-br from-card via-card to-primary/5 shadow-sm">
				<CardHeader className="pb-3">
					<CardTitle className="flex items-center gap-2 text-base">
						<FileSpreadsheet className="h-5 w-5 text-primary" />
						Fluxo de importação
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-3">
						{STEP_ITEMS.map((step, index) => {
							const Icon = step.icon;
							const isComplete = importState === "success" || currentStepIndex > index;
							const isCurrent = currentStepIndex === index && importState !== "success";

							return (
								<div key={step.title} className="flex items-start gap-3">
									<div
										className={[
											"mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors",
											isComplete
												? "border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400"
												: isCurrent
													? "border-primary/40 bg-primary/10 text-primary"
													: "border-border bg-muted text-muted-foreground",
										].join(" ")}
									>
										{isComplete ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
									</div>
									<div className="space-y-1">
										<p className="text-sm font-semibold">{step.title}</p>
										<p className="text-xs leading-relaxed text-muted-foreground">{step.description}</p>
									</div>
								</div>
							);
						})}
					</div>
				</CardContent>
			</Card>

			<Card className="shadow-sm">
				<CardHeader className="pb-3">
					<CardTitle className="text-base">Resumo atual</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3 text-sm">
					<div className="rounded-xl border bg-muted/30 p-3">
						<p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Arquivo</p>
						<p className="mt-2 break-all font-medium">{fileName || "Nenhum arquivo selecionado"}</p>
					</div>
					<div className="grid grid-cols-2 gap-3">
						<SummaryStat label="Colunas" value={headersCount} />
						<SummaryStat label="Linhas lidas" value={rawRowsCount} />
						<SummaryStat label="Linhas válidas" value={normalizedRowsCount} />
						<SummaryStat label="Erros/Avisos" value={parseErrorsCount + warningsCount} />
					</div>
				</CardContent>
			</Card>

			<Card className="shadow-sm">
				<CardHeader className="pb-3">
					<CardTitle className="text-base">Recursos rápidos</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<Button variant="outline" className="w-full justify-between" asChild>
						<Link href="/dashboard/commercial/sales">Voltar para vendas</Link>
					</Button>
					<Button className="w-full justify-between" asChild>
						<a href="/bulk-insert-sales.xlsx" download>
							Baixar planilha modelo
						</a>
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}

function SummaryStat({ label, value }: { label: string; value: number }) {
	return (
		<div className="rounded-xl border bg-card p-3">
			<p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
			<p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
		</div>
	);
}
