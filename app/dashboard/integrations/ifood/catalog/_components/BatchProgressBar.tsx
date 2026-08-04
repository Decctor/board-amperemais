"use client";

import { Button } from "@/components/ui/button";
import type { TIfoodBatchWatch } from "@/state-hooks/use-ifood-catalog-editor";
import { CheckCircle2, Clock, Loader2, TriangleAlert, X } from "lucide-react";

type BatchProgressBarProps = {
	watch: TIfoodBatchWatch | null;
	onDismiss: () => void;
};

/**
 * Estado do lote depois do envio. Existe porque o iFood processa em segundo plano: o `PATCH`
 * responde na hora com um `batchId`, e só a consulta posterior diz se cada linha foi aplicada.
 * Sem isso a UI diria "enviado" e o lojista descobriria a falha pelo cardápio errado.
 */
export function BatchProgressBar({ watch, onDismiss }: BatchProgressBarProps) {
	if (!watch) return null;

	const temFalhas = watch.falhas.length > 0;

	const { Icone, iconeClassName, titulo, detalhe, containerClassName } = watch.emAndamento
		? {
				Icone: Loader2,
				iconeClassName: "animate-spin text-primary",
				titulo: "Aplicando no iFood…",
				detalhe: `${watch.concluidos} de ${watch.total} lote(s) concluído(s).`,
				containerClassName: "border-border bg-muted/30",
			}
		: watch.expirou
			? {
					Icone: Clock,
					iconeClassName: "text-amber-600",
					titulo: "O iFood ainda está processando",
					detalhe: "Passou do nosso tempo de espera. As alterações devem aparecer em instantes — atualize a página para conferir.",
					containerClassName: "border-amber-500/40 bg-amber-500/10",
				}
			: temFalhas
				? {
						Icone: TriangleAlert,
						iconeClassName: "text-destructive",
						titulo: `${watch.falhas.length} ite${watch.falhas.length === 1 ? "m não foi atualizado" : "ns não foram atualizados"}`,
						detalhe: "O restante do lote foi aplicado normalmente.",
						containerClassName: "border-destructive/40 bg-destructive/10",
					}
				: {
						Icone: CheckCircle2,
						iconeClassName: "text-success",
						titulo: "Alterações aplicadas no iFood",
						detalhe: "Pode levar alguns segundos para aparecer no app.",
						containerClassName: "border-success/40 bg-success/10",
					};

	return (
		<div className={`flex w-full flex-col gap-2 rounded-lg border px-3 py-2.5 ${containerClassName}`}>
			<div className="flex w-full items-start justify-between gap-2">
				<div className="flex min-w-0 items-start gap-2">
					<Icone className={`mt-0.5 h-4 w-4 shrink-0 ${iconeClassName}`} aria-hidden />
					<div className="flex min-w-0 flex-col gap-0.5">
						<p className="text-sm font-medium text-foreground">{titulo}</p>
						<p className="text-xs text-muted-foreground">{detalhe}</p>
					</div>
				</div>
				{watch.emAndamento ? null : (
					<Button variant="ghost" size="icon-sm" onClick={onDismiss} aria-label="Fechar aviso do lote">
						<X className="h-4 w-4" />
					</Button>
				)}
			</div>

			{temFalhas ? (
				<ul className="flex flex-col gap-1 border-t border-destructive/20 pt-2">
					{watch.falhas.map((falha, indice) => (
						<li key={falha.recurso ?? indice} className="text-xs text-foreground">
							<span className="font-medium">{falha.recurso ?? "Item sem código"}</span>
							{falha.mensagem ? <span className="text-muted-foreground"> — {falha.mensagem}</span> : null}
						</li>
					))}
				</ul>
			) : null}
		</div>
	);
}
