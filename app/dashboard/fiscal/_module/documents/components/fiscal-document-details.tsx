"use client";

import type { TGetFiscalDocumentsOutputById } from "@/app/api/fiscal/documents/route";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatBadge } from "@/components/ui/stat-badge";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getErrorMessage } from "@/lib/errors";
import {
	buildFiscalDocumentSaleSummary,
	extractPayloadItems,
	extractTaxTotalsFromPayload,
	parseFiscalDocumentProviderPayload,
	parseFiscalDocumentProviderResponse,
	type TFiscalDocumentSaleSummaryView,
	type TFiscalDocumentTaxTotalsView,
} from "@/lib/fiscal/document-details-view";
import { formatDateAsLocale, formatToMoney } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import { AlertTriangle, Globe, RefreshCw } from "lucide-react";
import { useMemo } from "react";
import { formatFiscalDocumentTypeLabel, isFiscalDocumentFailed, type TFiscalPermissions } from "../helpers/fiscal-document-action-state";
import { useFiscalDocumentActionRunner, type TFiscalDocumentActionRunner } from "../helpers/use-fiscal-document-action-runner";
import { FiscalDocumentEventsTimeline } from "./details/fiscal-document-events-timeline";
import { FiscalDocumentExceptionalPresenceNotice } from "./details/fiscal-document-exceptional-presence-notice";
import { FiscalDocumentIdentificationPanel } from "./details/fiscal-document-identification-panel";
import { FiscalDocumentPayloadItemsSection } from "./details/fiscal-document-payload-items-section";
import { FiscalDocumentProviderPayloadSection } from "./details/fiscal-document-provider-payload-section";
import { FiscalDocumentSaleSection } from "./details/fiscal-document-sale-section";
import { FiscalDocumentTaxTotalsSection } from "./details/fiscal-document-tax-totals-section";
import { FiscalDocumentActionBar } from "./fiscal-document-action-bar";
import { FiscalDocumentNextSteps } from "./fiscal-document-next-steps";
import { FiscalDocumentStatusBadge } from "./fiscal-document-status-badge";

export type TFiscalDocumentDetails = TGetFiscalDocumentsOutputById["document"];

function describeDocumentMoment(document: TFiscalDocumentDetails) {
	const at = (label: string, date: Date | string | null | undefined) => {
		const formatted = date ? formatDateAsLocale(date, true) : null;
		return formatted ? `${label} em ${formatted}` : null;
	};
	switch (document.statusInterno) {
		case "AUTORIZADO":
			return at("Autorizada", document.dataAutorizacao) ?? at("Emitida", document.dataEmissao);
		case "CANCELADO":
		case "CANCELAMENTO_PENDENTE":
			return at("Cancelada", document.dataCancelamento) ?? at("Autorizada", document.dataAutorizacao);
		case "INUTILIZADO":
			return at("Numeração inutilizada", document.dataCancelamento) ?? at("Criada", document.dataInsercao);
		default:
			return at("Criada", document.dataInsercao);
	}
}

/**
 * Titulo e descricao da pagina: o documento se apresenta pelo numero, e a descricao diz serie,
 * ambiente e o momento que define o estado atual. Nada disso se repete no corpo.
 */
export function buildFiscalDocumentHeading(document: TFiscalDocumentDetails) {
	const typeLabel = formatFiscalDocumentTypeLabel(document.tipo);
	const title = document.numero ? `${typeLabel} nº ${document.numero}` : `${typeLabel} sem número`;
	const parts: string[] = [];
	if (document.serie) parts.push(`Série ${document.serie}`);
	parts.push(document.ambiente === "HOMOLOGACAO" ? "Homologação" : "Produção");
	const moment = describeDocumentMoment(document);
	if (moment) parts.push(moment);
	return { title, description: parts.join(" · ") };
}

export function FiscalDocumentDetailsSkeleton() {
	return (
		<div className="flex flex-col gap-4" aria-label="Carregando documento fiscal">
			<Skeleton className="h-32 rounded-2xl" />
			<Skeleton className="h-20 rounded-2xl" />
			<div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
				<Skeleton className="h-72 rounded-2xl" />
				<Skeleton className="h-72 rounded-2xl" />
			</div>
		</div>
	);
}

export function FiscalDocumentDetailsError({ error, isFetching, retry }: { error: unknown; isFetching: boolean; retry: () => void }) {
	return (
		<div className="flex min-h-72 flex-col items-center justify-center gap-4 rounded-2xl border border-border bg-card px-6 text-center">
			<div className="flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
				<RefreshCw className={cn("size-5", isFetching && "animate-spin")} />
			</div>
			<div className="space-y-1">
				<p className="text-base font-extrabold">Não foi possível carregar o documento</p>
				<p className="max-w-sm text-sm text-muted-foreground">{getErrorMessage(error)}</p>
			</div>
			<Button variant="outline" size="lg" onClick={retry} disabled={isFetching}>
				<RefreshCw className={cn("size-4", isFetching && "animate-spin")} />
				Tentar novamente
			</Button>
		</div>
	);
}

type FiscalDocumentDetailsProps = {
	document: TFiscalDocumentDetails;
	events: TGetFiscalDocumentsOutputById["events"];
	permissions: TFiscalPermissions;
	exceptionalPresenceEnabled: boolean;
	onChanged: () => void;
};

/**
 * Corpo do detalhe de um documento fiscal. Selo de status, valor e acoes no topo; "o que fazer
 * agora" logo abaixo; depois a venda, tributos e payload na coluna principal, com a identificacao
 * (chave de acesso, protocolo) e o historico ao lado no desktop.
 */
export function FiscalDocumentDetails({ document, events, permissions, exceptionalPresenceEnabled, onChanged }: FiscalDocumentDetailsProps) {
	const runner = useFiscalDocumentActionRunner({ document, permissions, exceptionalPresenceEnabled, onChanged });
	const providerPayload = useMemo(() => parseFiscalDocumentProviderPayload(document.provedorPayload), [document.provedorPayload]);
	const providerResponse = useMemo(() => parseFiscalDocumentProviderResponse(document.provedorRetorno), [document.provedorRetorno]);
	const taxTotals = useMemo(() => extractTaxTotalsFromPayload(providerPayload), [providerPayload]);
	const payloadItems = useMemo(() => extractPayloadItems(providerPayload), [providerPayload]);
	const saleSummary = useMemo(
		() =>
			buildFiscalDocumentSaleSummary({
				vendaId: document.vendaId,
				snapshotOrigemVenda: document.snapshotOrigemVenda,
				venda: document.venda ?? null,
			}),
		[document.snapshotOrigemVenda, document.venda, document.vendaId],
	);
	const messages = useMemo(
		() =>
			Array.isArray(document.mensagens) ? document.mensagens.map((message) => (typeof message === "string" ? message : JSON.stringify(message))) : [],
		[document.mensagens],
	);
	const hasProviderData = providerPayload != null || providerResponse != null || messages.length > 0;
	const mainIsEmpty = !saleSummary && !taxTotals && payloadItems.length === 0 && !hasProviderData;

	return (
		<TooltipProvider>
			<div className="flex flex-col gap-4">
				<FiscalDocumentSummary document={document} runner={runner} sale={saleSummary} taxTotals={taxTotals} />
				<FiscalDocumentNextSteps document={document} runner={runner} permissions={permissions} onChanged={onChanged} />
				{document.presencaConsumidorDeclarada ? <FiscalDocumentExceptionalPresenceNotice document={document} /> : null}
				{/* Ordem no DOM = ordem no celular: identificacao antes da venda, historico por ultimo. No desktop a coluna principal ocupa as duas linhas. */}
				<div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
					<FiscalDocumentIdentificationPanel document={document} className="lg:col-start-2 lg:row-start-1" />
					<div className="flex min-w-0 flex-col gap-4 lg:col-start-1 lg:row-span-2 lg:row-start-1">
						{saleSummary ? <FiscalDocumentSaleSection sale={saleSummary} /> : null}
						{taxTotals ? <FiscalDocumentTaxTotalsSection totals={taxTotals} /> : null}
						{payloadItems.length > 0 ? <FiscalDocumentPayloadItemsSection items={payloadItems} /> : null}
						{hasProviderData ? <FiscalDocumentProviderPayloadSection payload={providerPayload} response={providerResponse} messages={messages} /> : null}
						{mainIsEmpty ? (
							<p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
								Venda, tributos e payload aparecem aqui depois da primeira tentativa de envio.
							</p>
						) : null}
					</div>
					<FiscalDocumentEventsTimeline events={events} className="lg:col-start-2 lg:row-start-2" />
				</div>
				{runner.modals}
			</div>
		</TooltipProvider>
	);
}

type FiscalDocumentSummaryProps = {
	document: TFiscalDocumentDetails;
	runner: TFiscalDocumentActionRunner;
	sale: TFiscalDocumentSaleSummaryView | null;
	taxTotals: TFiscalDocumentTaxTotalsView | null;
};

// Estado e valor de relance, acoes logo abaixo. O numero da nota ja esta no titulo da pagina.
function FiscalDocumentSummary({ document, runner, sale, taxTotals }: FiscalDocumentSummaryProps) {
	const amount = taxTotals?.vNF ?? sale?.valorTotal ?? null;
	const amountLabel = taxTotals?.vNF != null ? "Valor da nota" : "Valor da venda";
	const saleDate = sale?.dataVenda ? formatDateAsLocale(sale.dataVenda, true) : null;
	const showRejection = isFiscalDocumentFailed(document.statusInterno) && !!document.codigoRejeicao;

	return (
		<section className="overflow-hidden rounded-2xl bg-secondary/55">
			<div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 px-4 py-4 sm:gap-5 sm:px-5">
				<div className="flex min-w-0 flex-col gap-2">
					<div className="flex flex-wrap items-center gap-1.5">
						<FiscalDocumentStatusBadge document={document} />
						{document.ambiente === "HOMOLOGACAO" ? (
							<StatBadge
								icon={<Globe className="h-4 min-h-4 w-4 min-w-4" />}
								value="HOMOLOGAÇÃO"
								tooltipContent="Documento emitido em ambiente de testes, sem valor fiscal."
								className="bg-amber-500 text-white dark:bg-amber-600"
								valueClassName="normal-case tracking-normal"
							/>
						) : null}
						{document.presencaConsumidorDeclarada ? (
							<StatBadge
								icon={<AlertTriangle className="h-4 min-h-4 w-4 min-w-4" />}
								value="PRESENCIAL EXCEPCIONAL"
								tooltipContent="Venda com entrega declarada manualmente como operação presencial nesta tentativa."
								className="bg-amber-600 text-white dark:bg-amber-700"
								valueClassName="normal-case tracking-normal"
							/>
						) : null}
					</div>
					{showRejection ? <p className="text-xs font-bold text-destructive">Rejeição SEFAZ {document.codigoRejeicao}</p> : null}
					{sale ? (
						<p className="truncate text-sm">
							<span className="font-semibold">{sale.clienteNome ?? "Consumidor não identificado"}</span>
							{saleDate ? <span className="text-muted-foreground"> · {saleDate}</span> : null}
						</p>
					) : null}
				</div>
				{amount != null ? (
					<div className="shrink-0 text-right">
						<p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-muted-foreground">{amountLabel}</p>
						<p className="mt-0.5 text-2xl font-extrabold tracking-tight tabular-nums">{formatToMoney(amount)}</p>
					</div>
				) : null}
			</div>
			<div className="border-t border-border/80 bg-card/70 px-4 py-3 sm:px-5">
				<FiscalDocumentActionBar document={document} runner={runner} />
			</div>
		</section>
	);
}
