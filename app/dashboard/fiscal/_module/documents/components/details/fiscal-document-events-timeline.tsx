"use client";

import type { TGetFiscalDocumentsOutputById } from "@/app/api/fiscal/documents/route";
import { formatDateAsLocale } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import type { TFiscalDocumentEventTypeEnum } from "@/schemas/enums";
import { DetailsEmptyLine, DetailsSection } from "./details-section";

const FISCAL_EVENT_TYPE_LABELS: Record<TFiscalDocumentEventTypeEnum, string> = {
	CRIADO: "Documento criado",
	ENVIO_SOLICITADO: "Envio solicitado",
	PROCESSAMENTO_INICIADO: "Processamento iniciado",
	AUTORIZADO: "Autorizado",
	REJEITADO: "Rejeitado",
	SINCRONIZADO: "Sincronizado",
	CANCELAMENTO_SOLICITADO: "Cancelamento solicitado",
	CANCELADO: "Cancelado",
	CARTA_CORRECAO: "Carta de correção",
	INUTILIZACAO: "Inutilização",
	CLASSIFICACAO_PRESENCA_EXCEPCIONAL: "Classificação presencial excepcional",
	ERRO: "Erro",
};

// Tom do ponto: so o que mudou o destino do documento ganha cor; o resto e neutro.
const FISCAL_EVENT_TONE_CLASSES: Partial<Record<TFiscalDocumentEventTypeEnum, string>> = {
	AUTORIZADO: "bg-success",
	REJEITADO: "bg-destructive",
	ERRO: "bg-destructive",
	CANCELADO: "bg-foreground",
	INUTILIZACAO: "bg-foreground",
	CLASSIFICACAO_PRESENCA_EXCEPCIONAL: "bg-brand",
};

type FiscalDocumentEventsTimelineProps = {
	events: TGetFiscalDocumentsOutputById["events"];
	className?: string;
};

/** Historico do documento como linha do tempo, do mais recente para o mais antigo (ordem da API). */
export function FiscalDocumentEventsTimeline({ events, className }: FiscalDocumentEventsTimelineProps) {
	return (
		<DetailsSection title="Histórico" count={events.length} className={className}>
			{events.length === 0 ? (
				<DetailsEmptyLine>Nenhum evento registrado.</DetailsEmptyLine>
			) : (
				<ol className="px-4 py-4 sm:px-5">
					{events.map((event, index) => {
						const tipo = event.tipo as TFiscalDocumentEventTypeEnum;
						const isLast = index === events.length - 1;
						return (
							<li key={event.id} className={cn("relative flex gap-3", !isLast && "pb-4")}>
								{!isLast ? <span aria-hidden className="absolute top-3.5 bottom-0 left-[5px] w-px bg-border" /> : null}
								<span
									className={cn("mt-1 size-[11px] shrink-0 rounded-full ring-2 ring-card", FISCAL_EVENT_TONE_CLASSES[tipo] ?? "bg-muted-foreground/50")}
								/>
								<div className="min-w-0 flex-1">
									<div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
										<p className="text-xs font-bold">{FISCAL_EVENT_TYPE_LABELS[tipo] ?? event.tipo}</p>
										<span className="text-[11px] tabular-nums text-muted-foreground">{formatDateAsLocale(event.dataInsercao, true)}</span>
									</div>
									{event.descricao ? <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{event.descricao}</p> : null}
									{event.autor?.nome ? <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">{event.autor.nome}</p> : null}
								</div>
							</li>
						);
					})}
				</ol>
			)}
		</DetailsSection>
	);
}
