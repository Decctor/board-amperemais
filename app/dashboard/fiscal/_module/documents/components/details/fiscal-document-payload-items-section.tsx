"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { TFiscalDocumentPayloadItemView } from "@/lib/fiscal/document-details-view";
import { formatToMoney } from "@/lib/formatting";
import { DetailsSection } from "./details-section";

type FiscalDocumentPayloadItemsSectionProps = {
	items: TFiscalDocumentPayloadItemView[];
};

/** Itens como foram ao provedor (det do payload): o que a SEFAZ viu, com NCM, CFOP e CSOSN. */
export function FiscalDocumentPayloadItemsSection({ items }: FiscalDocumentPayloadItemsSectionProps) {
	return (
		<DetailsSection title="Itens da nota" count={items.length}>
			<div className="overflow-x-auto">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="w-10 pl-4 sm:pl-5">#</TableHead>
							<TableHead>Produto</TableHead>
							<TableHead>NCM</TableHead>
							<TableHead>CFOP</TableHead>
							<TableHead>CSOSN</TableHead>
							<TableHead className="text-right">Qtde</TableHead>
							<TableHead className="pr-4 text-right sm:pr-5">Total</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{items.map((item) => (
							<TableRow key={item.numero}>
								<TableCell className="pl-4 tabular-nums text-muted-foreground sm:pl-5">{item.numero}</TableCell>
								<TableCell className="max-w-[240px] truncate font-semibold">{item.descricao}</TableCell>
								<TableCell className="tabular-nums">{item.ncm ?? "—"}</TableCell>
								<TableCell className="tabular-nums">{item.cfop ?? "—"}</TableCell>
								<TableCell className="tabular-nums">{item.csosn ?? "—"}</TableCell>
								<TableCell className="text-right tabular-nums">{item.quantidade ?? "—"}</TableCell>
								<TableCell className="pr-4 text-right font-bold tabular-nums sm:pr-5">
									{item.valorTotal != null ? formatToMoney(item.valorTotal) : "—"}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</DetailsSection>
	);
}
