"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Database, Loader2 } from "lucide-react";

type BulkInsertUploadingStageProps = {
	uploadProgress: number;
};

export function BulkInsertUploadingStage({ uploadProgress }: BulkInsertUploadingStageProps) {
	return (
		<Card className="shadow-sm">
			<CardContent className="flex min-h-[420px] flex-col items-center justify-center gap-6 p-6 text-center">
				<div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-foreground">
					<div className="absolute inset-0 rounded-full bg-primary/20 blur-xl" />
					<Database className="relative h-8 w-8 animate-pulse" />
				</div>
				<div className="space-y-2">
					<p className="text-2xl font-semibold tracking-tight">Importando vendas</p>
					<p className="text-sm text-muted-foreground">Estamos enviando as linhas válidas e consolidando clientes, vendedores e parceiros relacionados.</p>
				</div>
				<div className="w-full max-w-xl space-y-3">
					<div className="h-3 overflow-hidden rounded-full bg-muted">
						<div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
					</div>
					<div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
						<Loader2 className="h-4 w-4 animate-spin" />
						<span>{uploadProgress}% concluído</span>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
