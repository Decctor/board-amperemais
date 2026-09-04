"use client";

import { DELIVERY_MODE_META } from "@/app/dashboard/sales/_components/fulfillment/config";
import { formatDecimalPlaces, formatToMoney } from "@/lib/formatting";
import type { TSalesResults } from "@/lib/sales/results";
import { buildSalesHistoryHref, type TSalesHistoryUrlState } from "@/lib/sales/history-url-state";
import { cn } from "@/lib/utils";
import { CircleHelp, Truck } from "lucide-react";
import Link from "next/link";

type DeliveryModesBlockProps = {
	porModalidade: TSalesResults["porModalidade"];
	canViewSensitive: boolean;
	/** Recorte do relatório (período, vendedores, status) que cada cartão carrega para o histórico. */
	historyFilters: Partial<TSalesHistoryUrlState>;
};

export function DeliveryModesBlock({ porModalidade, canViewSensitive, historyFilters }: DeliveryModesBlockProps) {
	const { linhas, faturamentoTotal } = porModalidade;

	return (
		<section className="bg-card border-border flex w-full flex-col gap-3 rounded-xl border px-3 py-4 shadow-2xs">
			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-2">
					<div className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-200 p-1 text-orange-600">
						<Truck className="h-4 w-4 min-h-4 min-w-4" />
					</div>
					<h1 className="text-xs font-medium leading-none tracking-tight">RESULTADO POR MODALIDADE</h1>
				</div>
				<span className="text-sm font-medium tabular-nums">{formatToMoney(faturamentoTotal)}</span>
			</div>

			{linhas.length === 0 ? (
				<span className="text-xs text-muted-foreground">Nenhuma venda no período.</span>
			) : (
				<div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
					{linhas.map((linha) => {
						// Venda sem modalidade (importada de fonte externa) não tem meta; cai no rótulo neutro.
						const meta = linha.modalidade ? DELIVERY_MODE_META[linha.modalidade] : undefined;
						const Icon = meta?.icon ?? CircleHelp;
						const cardClassName = "border-border flex flex-col gap-2 rounded-lg border px-3 py-2";
						// Venda sem modalidade não tem como ser filtrada no histórico; o cartão fica estático.
						return linha.modalidade ? (
							<Link
								key={linha.modalidade}
								href={buildSalesHistoryHref({ ...historyFilters, deliveryModes: [linha.modalidade] })}
								title="Ver as vendas desta modalidade no histórico"
								className={cn(cardClassName, "transition-colors hover:bg-muted/60")}
							>
								<DeliveryModeCardContent linha={linha} meta={meta} Icon={Icon} canViewSensitive={canViewSensitive} />
							</Link>
						) : (
							<div key="sem-modalidade" className={cardClassName}>
								<DeliveryModeCardContent linha={linha} meta={meta} Icon={Icon} canViewSensitive={canViewSensitive} />
							</div>
						);
					})}
				</div>
			)}
		</section>
	);
}

type DeliveryModeCardContentProps = {
	linha: TSalesResults["porModalidade"]["linhas"][number];
	meta: { label: string } | undefined;
	Icon: React.ComponentType<{ className?: string }>;
	canViewSensitive: boolean;
};

function DeliveryModeCardContent({ linha, meta, Icon, canViewSensitive }: DeliveryModeCardContentProps) {
	return (
		<>
			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-1.5">
					<Icon className="h-3.5 w-3.5 min-h-3.5 min-w-3.5 text-muted-foreground" />
					<span className="text-xs font-semibold">{meta?.label ?? "Não informada"}</span>
				</div>
				<span className="text-[11px] text-muted-foreground tabular-nums">{formatDecimalPlaces(linha.participacaoPercentual, 1, 1)}%</span>
			</div>

			<span className="text-lg font-bold leading-none tabular-nums">{formatToMoney(linha.faturamento)}</span>

			<div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
				<div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, linha.participacaoPercentual))}%` }} />
			</div>

			<div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground tabular-nums">
				<span>
					{linha.qtdeVendas} {linha.qtdeVendas === 1 ? "venda" : "vendas"}
				</span>
				<span>ticket {linha.ticketMedio === null ? "—" : formatToMoney(linha.ticketMedio)}</span>
				<span>{formatDecimalPlaces(linha.qtdeItens, 0, 0)} itens</span>
				{canViewSensitive && linha.margemBruta !== null ? (
					<span className={cn({ "text-red-600 dark:text-red-400": linha.margemBruta < 0 })}>margem {formatToMoney(linha.margemBruta)}</span>
				) : null}
				{linha.canceladas.qtde > 0 ? (
					<span className="text-destructive">
						{linha.canceladas.qtde} cancelada{linha.canceladas.qtde === 1 ? "" : "s"} · {formatToMoney(linha.canceladas.valor)}
					</span>
				) : null}
			</div>
		</>
	);
}
