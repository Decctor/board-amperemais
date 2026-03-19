"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

type BulkInsertErrorStageProps = {
	canReturnToPreview: boolean;
	onReturnToPreview: () => void;
	onReset: () => void;
};

export function BulkInsertErrorStage({ canReturnToPreview, onReturnToPreview, onReset }: BulkInsertErrorStageProps) {
	return (
		<Card className="border-red-500/20 bg-gradient-to-br from-card via-card to-red-500/[0.04] shadow-sm">
			<CardContent className="flex min-h-[420px] flex-col items-center justify-center gap-6 p-6 text-center">
				<div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10 text-red-500">
					<AlertCircle className="h-9 w-9" />
				</div>
				<div className="space-y-2">
					<h2 className="text-2xl font-semibold tracking-tight text-red-600 dark:text-red-400">Falha ao importar clientes</h2>
					<p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
						Algo deu errado durante o envio final. Você pode voltar para a revisão e tentar novamente ou reiniciar todo o fluxo com outro arquivo.
					</p>
				</div>
				<div className="flex flex-col gap-3 sm:flex-row">
					{canReturnToPreview ? (
						<Button variant="outline" onClick={onReturnToPreview}>
							Voltar para revisão
						</Button>
					) : null}
					<Button onClick={onReset}>Reiniciar importação</Button>
				</div>
			</CardContent>
		</Card>
	);
}
