"use client";

import { Section } from "@/components/ui/section";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { TFiscalDocumentPayloadItemView } from "@/lib/fiscal/document-details-view";
import { formatToMoney } from "@/lib/formatting";
import { Boxes } from "lucide-react";

type FiscalDocumentPayloadItemsSectionProps = {
	items: TFiscalDocumentPayloadItemView[];
};

/** Itens como foram ao provedor (det do payload): o que a SEFAZ viu, com NCM, CFOP e CSOSN. */
export function FiscalDocumentPayloadItemsSection({ items }: FiscalDocumentPayloadItemsSectionProps) {
	return (
		<Section.Root>
			<Section.Header>
				<Section.Icon>
					<Boxes />
				</Section.Icon>
				<Section.Title>Itens da nota</Section.Title>
				<Section.Count>{items.length}</Section.Count>
			</Section.Header>
			<Section.Bleed>
				<div className="overflow-x-auto">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-10 pl-3">#</TableHead>
								<TableHead>Produto</TableHead>
								<TableHead>NCM</TableHead>
								<TableHead>CFOP</TableHead>
								<TableHead>CSOSN</TableHead>
								<TableHead className="text-right">Qtde</TableHead>
								<TableHead className="pr-3 text-right">Total</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{items.map((item) => (
								<TableRow key={item.numero}>
									<TableCell className="pl-3 tabular-nums text-muted-foreground">{item.numero}</TableCell>
									<TableCell className="max-w-[240px] truncate font-semibold">{item.descricao}</TableCell>
									<TableCell className="tabular-nums">{item.ncm ?? "—"}</TableCell>
									<TableCell className="tabular-nums">{item.cfop ?? "—"}</TableCell>
									<TableCell className="tabular-nums">{item.csosn ?? "—"}</TableCell>
									<TableCell className="text-right tabular-nums">{item.quantidade ?? "—"}</TableCell>
									<TableCell className="pr-3 text-right font-bold tabular-nums">{item.valorTotal != null ? formatToMoney(item.valorTotal) : "—"}</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			</Section.Bleed>
		</Section.Root>
	);
}
