"use client";

import { Card, CardContent } from "@/components/ui/card";
import { FileSpreadsheet, Loader2 } from "lucide-react";

type BulkInsertParsingStageProps = {
	fileName: string;
};

export function BulkInsertParsingStage({ fileName }: BulkInsertParsingStageProps) {
	return (
		<Card className="shadow-sm">
			<CardContent className="flex min-h-[420px] flex-col items-center justify-center gap-6 p-6 text-center">
				<div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
					<div className="absolute inset-0 rounded-full bg-primary/20 blur-xl" />
					<Loader2 className="relative h-8 w-8 animate-spin" />
				</div>
				<div className="space-y-2">
					<p className="text-2xl font-semibold tracking-tight">Analisando a estrutura da planilha</p>
					<p className="text-sm text-muted-foreground">Estamos identificando cabeçalhos, lendo as linhas e sugerindo um mapeamento inicial.</p>
				</div>
				<div className="flex items-center gap-3 rounded-full border bg-muted/30 px-4 py-2 text-sm text-muted-foreground">
					<FileSpreadsheet className="h-4 w-4" />
					<span className="break-all">{fileName}</span>
				</div>
			</CardContent>
		</Card>
	);
}
