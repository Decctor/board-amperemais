"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TBulkSaleImportRow } from "@/state-hooks/use-bulk-create-sales";
import { AlertTriangle, CheckCircle2, Rows3, Sparkles } from "lucide-react";

type BulkInsertPreviewStageProps = {
	normalizedRows: TBulkSaleImportRow[];
	parseErrors: string[];
	onBack: () => void;
	onImport: () => void;
};

export function BulkInsertPreviewStage({ normalizedRows, parseErrors, onBack, onImport }: BulkInsertPreviewStageProps) {
	return (
		<div className="flex w-full flex-col gap-3">
			<div className="flex w-full flex-col gap-0.5">
				<div className="flex items-center gap-1.5">
					<div className={cn("flex items-center gap-1.5 rounded-xl bg-secondary px-3 py-1.5 text-[0.65rem] text-primary")}>
						<Sparkles className="h-4 w-4" />
						ETAPA 3
					</div>
					<h2 className="text-2xl font-semibold tracking-tight">Confira o que será importado</h2>
				</div>
				<p className="w-full text-sm text-muted-foreground">
					Aqui você valida o volume de linhas aproveitadas e enxerga uma amostra do dataset normalizado antes da gravação.
				</p>
			</div>

			<div className="grid gap-3 md:grid-cols-2">
				<MetricPanel
					icon={<CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />}
					title="LINHAS VÁLIDAS"
					value={normalizedRows.length}
					tone="success"
				/>
				<MetricPanel
					icon={<AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />}
					title="LINHAS COM ERRO"
					value={parseErrors.length}
					tone="warning"
				/>
			</div>

			{parseErrors.length > 0 ? (
				<div className="flex flex-col gap-3 rounded-lg border bg-amber-100 p-5">
					<div className="flex items-center gap-1.5">
						<div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-amber-600 text-amber-100">
							<AlertTriangle className="h-4 w-4" />
						</div>
						<p className="text-sm font-semibold text-amber-700">ERROS ENCONTRADOS DURANTE A NORMALIZAÇÃO</p>
					</div>
					<ul className="w-full text-sm text-amber-700/85">
						{parseErrors.slice(0, 20).map((error) => (
							<li key={error}>{error}</li>
						))}
						{parseErrors.length > 20 ? <li>... e mais {parseErrors.length - 20} erro(s).</li> : null}
					</ul>
				</div>
			) : null}

			<div className="flex w-full flex-col gap-3 rounded-xl border border-primary/20 bg-card px-3 py-4 shadow-2xs">
				<div className="flex items-center justify-between">
					<h3 className="text-xs font-medium uppercase tracking-tight">PRÉ-VISUALIZAÇÃO DAS PRIMEIRAS LINHAS VÁLIDAS</h3>
					<Rows3 className="h-4 w-4" />
				</div>
				<div className="overflow-hidden rounded-lg border border-border/60">
					<div className="max-h-[420px] overflow-auto">
						<table className="w-full text-left text-xs">
							<thead className="sticky top-0 z-10 border-b bg-brand text-brand-foreground backdrop-blur-sm">
								<tr>
									<th className="whitespace-nowrap px-4 py-3 font-semibold">LINHA</th>
									<th className="whitespace-nowrap px-4 py-3 font-semibold">CLIENTE</th>
									<th className="whitespace-nowrap px-4 py-3 font-semibold">CONTATO</th>
									<th className="whitespace-nowrap px-4 py-3 font-semibold">VALOR</th>
									<th className="whitespace-nowrap px-4 py-3 font-semibold">VENDEDOR</th>
									<th className="whitespace-nowrap px-4 py-3 font-semibold">DATA</th>
								</tr>
							</thead>
							<tbody className="divide-y">
								{normalizedRows.slice(0, 50).map((row) => (
									<tr key={row.rowIndex} className="hover:bg-muted/20">
										<td className="px-4 py-3">{row.rowIndex}</td>
										<td className="px-4 py-3 font-medium">{row.clienteNome}</td>
										<td className="px-4 py-3">{row.clienteTelefone || row.clienteCpfCnpj || "-"}</td>
										<td className="px-4 py-3 font-medium text-green-600 dark:text-green-400">
											{row.valorTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
										</td>
										<td className="px-4 py-3">{row.vendedorNome || "-"}</td>
										<td className="px-4 py-3">{new Date(row.dataVenda).toLocaleDateString("pt-BR")}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
					{normalizedRows.length > 50 ? (
						<div className="border-t px-4 py-3 text-xs text-muted-foreground">Mostrando apenas as primeiras 50 linhas válidas.</div>
					) : null}
				</div>
			</div>

			<div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
				<Button variant="ghost" onClick={onBack}>
					VOLTAR AO MAPEAMENTO
				</Button>
				<Button onClick={onImport}>IMPORTAR VENDAS</Button>
			</div>
		</div>
	);
}

function MetricPanel({ icon, title, value, tone }: { icon: React.ReactNode; title: string; value: number; tone: "success" | "warning" }) {
	return (
		<div className="bg-card border-primary/20 flex w-full flex-col gap-1 rounded-xl border px-3 py-4 shadow-2xs">
			<div className="flex items-center justify-between">
				<div className="flex flex-col">
					<h1 className="text-xs font-medium tracking-tight uppercase">{title}</h1>
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
			<div className="flex w-full flex-col gap-1">
				<div
					className={cn("text-2xl font-bold", {
						"text-green-600 dark:text-green-400": tone === "success",
						"text-amber-600 dark:text-amber-400": tone === "warning",
					})}
				>
					{value}
				</div>
			</div>
		</div>
	);
}
