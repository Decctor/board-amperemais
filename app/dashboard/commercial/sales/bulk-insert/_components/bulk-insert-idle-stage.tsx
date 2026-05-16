"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowDownToLine, FileSpreadsheet, FileUp, Sparkles } from "lucide-react";

type BulkInsertIdleStageProps = {
	onFileSelect: (file: File) => void | Promise<void>;
};

export function BulkInsertIdleStage({ onFileSelect }: BulkInsertIdleStageProps) {
	return (
		<div className="w-full flex flex-col gap-3">
			<div className="w-full flex flex-col gap-0.5">
				<div className="flex items-center gap-1.5">
					<div className={cn("flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[0.65rem] bg-secondary text-foreground")}>
						<Sparkles className="h-4 w-4" />
						ETAPA 1
					</div>
					<h2 className="text-2xl font-semibold tracking-tight">Envie a planilha que será importada</h2>
				</div>
				<p className="w-full text-sm text-muted-foreground">
					O arquivo é lido localmente, a estrutura é analisada e o sistema sugere automaticamente o mapeamento das colunas para você revisar.
				</p>
			</div>
			<label className="group relative flex min-h-[320px] cursor-pointer flex-col items-center justify-center gap-5 rounded-3xl border-2 border-dashed border-border bg-background/70 px-6 py-10 text-center transition-colors hover:border-border/45 hover:bg-primary/[0.03]">
				<input
					type="file"
					accept=".xlsx,.xls,.csv"
					className="absolute inset-0 opacity-0"
					onChange={(event) => {
						const selectedFile = event.target.files?.[0];
						event.currentTarget.value = "";
						if (selectedFile) onFileSelect(selectedFile);
					}}
				/>
				<div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-foreground transition-transform duration-300 group-hover:scale-105">
					<FileUp className="h-9 w-9" />
				</div>
				<div className="space-y-2">
					<p className="text-xl font-semibold tracking-tight">Arraste sua planilha aqui ou clique para selecionar</p>
					<p className="text-sm text-muted-foreground">Formatos aceitos: `.xlsx`, `.xls` e `.csv`.</p>
				</div>
			</label>
			<div className="w-full rounded-lg border bg-muted/25 p-5">
				<div className="flex items-start gap-3">
					<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-foreground">
						<FileSpreadsheet className="h-5 w-5" />
					</div>
					<div className="w-full flex flex-col gap-0.5">
						<p className="text-sm font-semibold text-muted-foreground">ANTES DE ENVIAR</p>
						<ul className="text-sm text-muted-foreground">
							<li>Garanta que a primeira linha contenha os cabeçalhos da planilha.</li>
							<li>Preencha nome do cliente, valor total e data da venda.</li>
							<li>Informe ao menos telefone ou CPF/CNPJ para cada cliente.</li>
						</ul>
					</div>
				</div>
			</div>

			{/* <div className="rounded-2xl border bg-card p-5">
					<p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Modelo pronto</p>
					<p className="mt-2 text-sm leading-relaxed text-muted-foreground">
						Se quiser acelerar, use a planilha oficial com a estrutura que o fluxo já reconhece melhor.
					</p>
					<Button variant="outline" className="mt-4 w-full justify-between" asChild>
						<a href="/bulk-insert-sales.xlsx" download>
							Baixar modelo
							<ArrowDownToLine className="h-4 w-4" />
						</a>
					</Button>
				</div> */}
		</div>
	);
}
