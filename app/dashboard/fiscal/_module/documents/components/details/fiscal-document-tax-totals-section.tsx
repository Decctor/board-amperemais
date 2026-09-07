"use client";

import { DataList } from "@/components/ui/data-list";
import { Section } from "@/components/ui/section";
import type { TFiscalDocumentTaxTotalsView } from "@/lib/fiscal/document-details-view";
import { formatToMoney } from "@/lib/formatting";
import { Percent } from "lucide-react";

function money(value: number | null) {
	return value != null ? formatToMoney(value) : null;
}

function TaxRow({ label, value }: { label: string; value: number | null }) {
	return (
		<DataList.Item>
			<DataList.Label>{label}</DataList.Label>
			<DataList.Value className="text-sm">{money(value)}</DataList.Value>
		</DataList.Item>
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
		<Section.Root>
			<Section.Header>
				<Section.Icon>
					<Percent />
				</Section.Icon>
				<Section.Title>Tributos</Section.Title>
			</Section.Header>
			<Section.Bleed>
				<div className="grid px-3 sm:grid-cols-2 sm:gap-x-8">
					<DataList.Root className="divide-y divide-border/70">
						<TaxRow label="Produtos" value={totals.vProd} />
						<TaxRow label="Desconto" value={totals.vDesc} />
						<TaxRow label="Base de cálculo ICMS" value={totals.vBC} />
						<TaxRow label="ICMS" value={totals.vICMS} />
					</DataList.Root>
					<DataList.Root className="divide-y divide-border/70 border-t border-border/70 sm:border-t-0">
						<TaxRow label="ICMS-ST" value={totals.vST} />
						<TaxRow label="FCP" value={totals.vFCP} />
						<TaxRow label="PIS" value={totals.vPIS} />
						<TaxRow label="COFINS" value={totals.vCOFINS} />
					</DataList.Root>
				</div>
				<DataList.Root className="border-t border-border">
					<DataList.Item className="px-3">
						<DataList.Label className="font-normal">Tributos aproximados (Lei 12.741)</DataList.Label>
						<DataList.Value className="font-semibold text-muted-foreground">{money(totals.vTotTrib)}</DataList.Value>
					</DataList.Item>
					<DataList.Item className="items-baseline border-t border-border bg-secondary/40 px-3 py-3">
						<DataList.Label className="text-label">Valor da nota</DataList.Label>
						<DataList.Value className="text-lg font-extrabold">{money(totals.vNF)}</DataList.Value>
					</DataList.Item>
				</DataList.Root>
			</Section.Bleed>
		</Section.Root>
	);
}
