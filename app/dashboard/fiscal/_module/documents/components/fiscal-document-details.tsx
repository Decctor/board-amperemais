"use client";

import type { TGetFiscalDocumentsOutputById } from "@/app/api/fiscal/documents/route";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Metric } from "@/components/ui/metric";
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
import { isFiscalDocumentFailed, type TFiscalPermissions } from "../helpers/fiscal-document-action-state";
import { buildFiscalDocumentHeading } from "../helpers/fiscal-document-heading";
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

// Reexportado para a pagina, que monta o cabecalho a partir do mesmo documento.
export { buildFiscalDocumentHeading };

export function FiscalDocumentDetailsSkeleton() {
	return <LoadingComponent />;
}

export function FiscalDocumentDetailsError({ error, isFetching, retry }: { error: unknown; isFetching: boolean; retry: () => void }) {
	return (
		<Empty className="min-h-72 rounded-xl border border-border bg-card">
			<EmptyHeader>
				<EmptyMedia variant="icon" className="bg-destructive/10 text-destructive">
					<RefreshCw className={cn(isFetching && "animate-spin")} />
				</EmptyMedia>
				<EmptyTitle>Não foi possível carregar o documento</EmptyTitle>
				<EmptyDescription>{getErrorMessage(error)}</EmptyDescription>
			</EmptyHeader>
			<EmptyContent>
				<Button variant="outline" onClick={retry} disabled={isFetching}>
					<RefreshCw className={cn("size-4", isFetching && "animate-spin")} />
					Tentar novamente
				</Button>
			</EmptyContent>
		</Empty>
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
							<Empty className="rounded-xl border border-dashed border-border py-10">
								<EmptyHeader>
									<EmptyDescription>Venda, tributos e payload aparecem aqui depois da primeira tentativa de envio.</EmptyDescription>
								</EmptyHeader>
							</Empty>
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
		<section className="overflow-hidden rounded-xl bg-secondary/55">
			<div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 px-3 py-4 sm:gap-5">
				<div className="flex min-w-0 flex-col gap-2">
					<div className="flex flex-wrap items-center gap-1.5">
						<FiscalDocumentStatusBadge document={document} />
						{document.ambiente === "HOMOLOGACAO" ? (
							<StatBadge
								icon={<Globe className="h-4 min-h-4 w-4 min-w-4" />}
								value="HOMOLOGAÇÃO"
								tooltipContent="Documento emitido em ambiente de testes, sem valor fiscal."
								variant="warningSolid"
								valueClassName="normal-case tracking-normal"
							/>
						) : null}
						{document.presencaConsumidorDeclarada ? (
							<StatBadge
								icon={<AlertTriangle className="h-4 min-h-4 w-4 min-w-4" />}
								value="PRESENCIAL EXCEPCIONAL"
								tooltipContent="Venda com entrega declarada manualmente como operação presencial nesta tentativa."
								variant="warning"
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
					<Metric.Root align="end" className="shrink-0">
						<Metric.Label>{amountLabel}</Metric.Label>
						<Metric.Value size="lg">{formatToMoney(amount)}</Metric.Value>
					</Metric.Root>
				) : null}
			</div>
			<div className="border-t border-border/80 bg-card/70 px-3 py-3">
				<FiscalDocumentActionBar document={document} runner={runner} />
			</div>
		</section>
	);
}
