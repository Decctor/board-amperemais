"use client";

import type { TFiscalDocumentTaxTotalsView } from "@/lib/fiscal/document-details-view";
import { formatToMoney } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import { DetailsSection } from "./details-section";

function money(value: number | null) {
	return value != null ? formatToMoney(value) : "—";
}

function TaxRow({ label, value }: { label: string; value: number | null }) {
	return (
		<div className="flex items-baseline justify-between gap-3 py-2">
			<dt className="text-xs font-semibold text-muted-foreground">{label}</dt>
			<dd className={cn("text-sm font-bold tabular-nums", value == null && "text-muted-foreground")}>{money(value)}</dd>
		</div>
	);
}

type FiscalDocumentTaxTotalsSectionProps = {
	totals: TFiscalDocumentTaxTotalsView;
};

/**
 * Totais do grupo ICMSTot do payload. Duas colunas de linhas rotulo/valor no desktop, uma no
 * celular; o valor da nota fecha o bloco como a linha que importa.
 */
export function FiscalDocumentTaxTotalsSection({ totals }: FiscalDocumentTaxTotalsSectionProps) {
	return (
		<DetailsSection title="Tributos">
			<div className="grid px-4 sm:grid-cols-2 sm:gap-x-8 sm:px-5">
				<dl className="divide-y divide-border/70">
					<TaxRow label="Produtos" value={totals.vProd} />
					<TaxRow label="Desconto" value={totals.vDesc} />
					<TaxRow label="Base de cálculo ICMS" value={totals.vBC} />
					<TaxRow label="ICMS" value={totals.vICMS} />
				</dl>
				<dl className="divide-y divide-border/70 border-t border-border/70 sm:border-t-0">
					<TaxRow label="ICMS-ST" value={totals.vST} />
					<TaxRow label="FCP" value={totals.vFCP} />
					<TaxRow label="PIS" value={totals.vPIS} />
					<TaxRow label="COFINS" value={totals.vCOFINS} />
				</dl>
			</div>
			<dl className="border-t border-border">
				<div className="flex items-baseline justify-between gap-3 px-4 py-2 sm:px-5">
					<dt className="text-xs text-muted-foreground">Tributos aproximados (Lei 12.741)</dt>
					<dd className="text-xs font-semibold tabular-nums text-muted-foreground">{money(totals.vTotTrib)}</dd>
				</div>
				<div className="flex items-baseline justify-between gap-3 border-t border-border bg-secondary/40 px-4 py-3 sm:px-5">
					<dt className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-muted-foreground">Valor da nota</dt>
					<dd className="text-lg font-extrabold tabular-nums">{money(totals.vNF)}</dd>
				</div>
			</dl>
		</DetailsSection>
	);
}
