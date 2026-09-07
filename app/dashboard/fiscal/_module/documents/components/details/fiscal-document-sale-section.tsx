"use client";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Section } from "@/components/ui/section";
import type { TFiscalDocumentSaleSummaryView } from "@/lib/fiscal/document-details-view";
import { formatDateAsLocale, formatToCPForCNPJ, formatToMoney } from "@/lib/formatting";
import { appRoutes } from "@/lib/navigation/routes";
import { ExternalLink, ShoppingCart } from "lucide-react";
import Link from "next/link";

type FiscalDocumentSaleSectionProps = {
	sale: TFiscalDocumentSaleSummaryView;
};

/** A venda por tras do documento: cliente, itens do snapshot e o unico link para a venda. */
export function FiscalDocumentSaleSection({ sale }: FiscalDocumentSaleSectionProps) {
	const saleDate = sale.dataVenda ? formatDateAsLocale(sale.dataVenda, true) : null;
	return (
		<Section.Root>
			<Section.Header>
				<Section.Icon>
					<ShoppingCart />
				</Section.Icon>
				<Section.Title>Venda vinculada</Section.Title>
				{sale.vendaId ? (
					<Section.Actions>
						<Button variant="outline" size="sm" asChild className="rounded-xl font-bold">
							<Link href={appRoutes.sales.details(sale.vendaId)}>
								<ExternalLink />
								Abrir venda
							</Link>
						</Button>
					</Section.Actions>
				) : null}
			</Section.Header>
			<Section.Body>
				<div className="flex flex-col gap-3 px-3 py-4 sm:flex-row sm:items-start sm:justify-between">
					<div className="min-w-0">
						<p className="truncate text-sm font-bold">{sale.clienteNome ?? "Consumidor não identificado"}</p>
						<p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
							{sale.clienteCpfCnpj ? formatToCPForCNPJ(sale.clienteCpfCnpj) : "Sem CPF/CNPJ"}
							{saleDate ? ` · ${saleDate}` : ""}
						</p>
					</div>
					{sale.statusVenda || sale.canal ? (
						<div className="flex flex-wrap gap-1.5 sm:justify-end">
							{sale.statusVenda ? (
								<Chip.Root variant="outline" shape="pill">
									<Chip.Label caps weight="bold">
										{sale.statusVenda}
									</Chip.Label>
								</Chip.Root>
							) : null}
							{sale.canal ? (
								<Chip.Root variant="outline" shape="pill">
									<Chip.Label caps weight="bold">
										{sale.canal}
									</Chip.Label>
								</Chip.Root>
							) : null}
						</div>
					) : null}
				</div>
				{sale.itens.length > 0 ? (
					<>
						<div className="divide-y divide-border/70 border-t border-border px-3">
							{sale.itens.map((item) => (
								<div key={item.id} className="flex items-start justify-between gap-3 py-2.5">
									<div className="min-w-0">
										<p className="truncate text-sm font-semibold">{item.descricao}</p>
										<p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
											{item.quantidade} × {formatToMoney(item.valorUnitario)}
											{item.desconto > 0 ? ` · ${formatToMoney(item.desconto)} de desconto` : ""}
										</p>
									</div>
									<p className="shrink-0 text-sm font-bold tabular-nums">{formatToMoney(item.valorTotal)}</p>
								</div>
							))}
						</div>
						{sale.valorTotal != null ? (
							<div className="flex items-center justify-between border-t border-border bg-secondary/40 px-3 py-2.5">
								<span className="text-xs font-semibold text-muted-foreground">Total da venda</span>
								<span className="text-sm font-extrabold tabular-nums">{formatToMoney(sale.valorTotal)}</span>
							</div>
						) : null}
					</>
				) : (
					<p className="border-t border-border px-3 py-4 text-sm text-muted-foreground">Nenhum item no snapshot da venda.</p>
				)}
			</Section.Body>
		</Section.Root>
	);
}
