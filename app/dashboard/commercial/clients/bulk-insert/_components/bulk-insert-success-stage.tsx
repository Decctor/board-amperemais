"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TBulkCreateClientsOutput } from "@/app/api/clients/bulk/route";
import { AlertTriangle, CheckCircle2, Sparkles, Users } from "lucide-react";

type BulkInsertSuccessStageProps = {
	result: TBulkCreateClientsOutput["data"];
	onRestart: () => void;
	onComplete: () => void;
};

export function BulkInsertSuccessStage({ result, onRestart, onComplete }: BulkInsertSuccessStageProps) {
	return (
		<div className="flex w-full flex-col gap-3">
			<div className="flex w-full flex-col gap-0.5">
				<div className="flex flex-wrap items-center gap-1.5">
					<div className={cn("flex items-center gap-1.5 rounded-xl bg-secondary px-3 py-1.5 text-[0.65rem] text-foreground")}>
						<Sparkles className="h-4 w-4" />
						CONCLUÍDO
					</div>
					<h2 className="text-2xl font-semibold tracking-tight">Importação concluída</h2>
				</div>
				<p className="w-full text-sm text-muted-foreground">
					Os clientes válidos foram gravados. Abaixo você confere os totais e eventuais ocorrências por linha.
				</p>
			</div>

			<div className="flex flex-col gap-3 rounded-lg border border-green-600/25 bg-green-200 p-5">
				<div className="flex items-start gap-3">
					<div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-green-600 text-green-100">
						<CheckCircle2 className="h-4 w-4" />
					</div>
					<div className="flex min-w-0 flex-col gap-1">
						<p className="text-sm font-semibold text-green-600">PROCESSAMENTO FINALIZADO</p>
						<p className="text-sm leading-relaxed text-green-600">
							<span className="font-semibold">{result.insertedCount}</span> cliente(s) importado(s),{" "}
							<span className="font-semibold">{result.updatedCount}</span> cliente(s) atualizado(s) e{" "}
							<span className="font-semibold">{result.skippedCount}</span> linha(s) ignorada(s) durante o processamento.
						</p>
					</div>
				</div>
			</div>

			<div className="grid gap-3 md:grid-cols-3">
				<ResultMetricPanel
					icon={<Users className="h-4 w-4 text-green-600 dark:text-green-400" />}
					title="Clientes importados"
					value={result.insertedCount}
					tone="success"
				/>
				<ResultMetricPanel
					icon={<Users className="h-4 w-4 text-green-600 dark:text-green-400" />}
					title="Clientes atualizados"
					value={result.updatedCount}
					tone="success"
				/>
				<ResultMetricPanel
					icon={<AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />}
					title="Linhas ignoradas"
					value={result.skippedCount}
					tone="warning"
				/>
			</div>

			{result.errors.length > 0 ? (
				<div className="flex flex-col gap-3 rounded-lg border bg-amber-100 p-5">
					<div className="flex items-center gap-1.5">
						<div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-amber-600 text-amber-100">
							<AlertTriangle className="h-4 w-4" />
						</div>
						<p className="text-sm font-semibold text-amber-700">OCORRÊNCIAS DURANTE A IMPORTAÇÃO FINAL</p>
					</div>
					<ul className="w-full list-outside list-disc space-y-2 pl-5 text-sm leading-relaxed text-amber-700 marker:text-amber-600">
						{result.errors.slice(0, 10).map((error) => (
							<li key={`${error.row}-${error.message}`} className="pl-1">
								Linha {error.row}: {error.message}
							</li>
						))}
						{result.errors.length > 10 ? <li className="pl-1">... e mais {result.errors.length - 10} ocorrência(s).</li> : null}
					</ul>
				</div>
			) : null}

			<div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
				<Button variant="ghost" onClick={onRestart}>
					NOVA IMPORTAÇÃO
				</Button>
				<Button onClick={onComplete}>VER CLIENTES</Button>
			</div>
		</div>
	);
}

function ResultMetricPanel({ icon, title, value, tone }: { icon: React.ReactNode; title: string; value: number; tone: "success" | "warning" }) {
	return (
		<div className="flex w-full flex-col gap-1 rounded-xl border border-border bg-card px-3 py-4 shadow-2xs">
			<div className="flex items-center justify-between">
				<div className="flex flex-col">
					<p className="text-xs font-medium uppercase tracking-tight">{title}</p>
				</div>
				<div
					className={cn("flex items-center gap-2", {
						"text-green-600 dark:text-green-400": tone === "success",
						"text-amber-600 dark:text-amber-400": tone === "warning",
					})}
				>
					{icon}
				</div>
			</div>
			<div
				className={cn("text-2xl font-bold", {
					"text-green-600 dark:text-green-400": tone === "success",
					"text-amber-600 dark:text-amber-400": tone === "warning",
				})}
			>
				{value}
			</div>
		</div>
	);
}
