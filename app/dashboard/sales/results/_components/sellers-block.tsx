"use client";

import type { TSalesResults } from "@/lib/sales/results";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDecimalPlaces, formatToMoney } from "@/lib/formatting";
import { buildSalesHistoryHref, type TSalesHistoryUrlState } from "@/lib/sales/history-url-state";
import { cn } from "@/lib/utils";
import { UsersRound } from "lucide-react";
import Link from "next/link";

type SellersBlockProps = {
	porVendedor: TSalesResults["porVendedor"];
	canViewSensitive: boolean;
	/** Recorte do relatório (período, status) que cada vendedor leva ao histórico. */
	historyFilters: Partial<TSalesHistoryUrlState>;
};

export function SellersBlock({ porVendedor, canViewSensitive, historyFilters }: SellersBlockProps) {
	return (
		<section className="bg-card border-border flex w-full flex-col gap-3 rounded-xl border px-3 py-4 shadow-2xs">
			<div className="flex items-center gap-2">
				<div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-200 p-1 text-blue-600">
					<UsersRound className="h-4 w-4 min-h-4 min-w-4" />
				</div>
				<h1 className="text-xs font-medium leading-none tracking-tight">RESULTADO POR VENDEDOR</h1>
			</div>

			<div className="w-full overflow-x-auto">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Vendedor</TableHead>
							<TableHead className="text-right">Vendas</TableHead>
							<TableHead className="text-right">Faturamento</TableHead>
							<TableHead className="text-right">Ticket médio</TableHead>
							<TableHead className="text-right">Itens</TableHead>
							<TableHead className="text-right">Descontos</TableHead>
							<TableHead className="text-right">Canceladas</TableHead>
							{canViewSensitive ? <TableHead className="text-right">Margem bruta</TableHead> : null}
							<TableHead className="text-right">Meta</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{porVendedor.map((linha) => (
							<TableRow key={linha.vendedorId ?? "sem-vendedor"}>
								<TableCell className="font-medium">
									{linha.vendedorId ? (
										<Link
											href={buildSalesHistoryHref({ ...historyFilters, sellersIds: [linha.vendedorId] })}
											title="Ver as vendas deste vendedor no histórico"
											className="underline-offset-2 hover:underline"
										>
											{linha.vendedorNome}
										</Link>
									) : (
										// Venda sem vendedor não tem como ser filtrada no histórico.
										linha.vendedorNome
									)}
								</TableCell>
								<TableCell className="text-right tabular-nums">{linha.qtdeVendas}</TableCell>
								<TableCell className="text-right font-medium tabular-nums">{formatToMoney(linha.faturamento)}</TableCell>
								<TableCell className="text-right tabular-nums">{linha.ticketMedio === null ? "—" : formatToMoney(linha.ticketMedio)}</TableCell>
								<TableCell className="text-right tabular-nums">{formatDecimalPlaces(linha.qtdeItens, 0, 0)}</TableCell>
								<TableCell className="text-right tabular-nums text-muted-foreground">{formatToMoney(linha.descontos)}</TableCell>
								<TableCell className="text-right tabular-nums">
									{linha.canceladas.qtde > 0 ? (
										<span className="text-destructive">
											{linha.canceladas.qtde} · {formatToMoney(linha.canceladas.valor)}
										</span>
									) : (
										<span className="text-muted-foreground">—</span>
									)}
								</TableCell>
								{canViewSensitive ? (
									<TableCell className={cn("text-right tabular-nums", { "text-red-600 dark:text-red-400": (linha.margemBruta ?? 0) < 0 })}>
										{linha.margemBruta === null ? "—" : formatToMoney(linha.margemBruta)}
									</TableCell>
								) : null}
								<TableCell className="text-right">
									{linha.meta ? (
										<div className="flex flex-col items-end gap-1">
											<span className="text-xs tabular-nums">
												{formatDecimalPlaces(linha.meta.atingidoPercentual ?? 0, 1, 1)}% de {formatToMoney(linha.meta.objetivo)}
											</span>
											<div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
												<div
													className={cn("h-full rounded-full", (linha.meta.atingidoPercentual ?? 0) >= 100 ? "bg-green-600" : "bg-primary")}
													style={{ width: `${Math.min(100, Math.max(0, linha.meta.atingidoPercentual ?? 0))}%` }}
												/>
											</div>
										</div>
									) : (
										<span className="text-xs text-muted-foreground">—</span>
									)}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</section>
	);
}
