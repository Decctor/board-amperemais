"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatToMoney, formatToPhone } from "@/lib/formatting";
import { useShopOrders } from "@/lib/queries/shop";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ExternalLink, Loader2, Package, RefreshCw, ShoppingBag, Truck } from "lucide-react";
import Link from "next/link";

export default function ShopOrdersQueue() {
	const { data, isLoading, isRefetching, refetch } = useShopOrders({ status: "ORCAMENTO" });

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between">
				<div>
					<CardTitle className="text-base flex items-center gap-2">
						<ShoppingBag className="w-4 h-4" />
						Pedidos pendentes
					</CardTitle>
					<CardDescription>Pedidos aguardando confirmacao</CardDescription>
				</div>
				<Button variant="ghost" size="icon" onClick={() => refetch()} disabled={isRefetching}>
					<RefreshCw className={`w-4 h-4 ${isRefetching ? "animate-spin" : ""}`} />
				</Button>
			</CardHeader>

			<CardContent>
				{isLoading ? (
					<div className="flex items-center justify-center py-8">
						<Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
					</div>
				) : !data?.orders || data.orders.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-8 text-center">
						<ShoppingBag className="w-10 h-10 text-muted-foreground/50 mb-2" />
						<p className="text-sm text-muted-foreground">Nenhum pedido pendente.</p>
					</div>
				) : (
					<ScrollArea className="h-[300px]">
						<div className="flex flex-col gap-3 pr-4">
							{data.orders.map((order) => (
								<div
									key={order.id}
									className="flex flex-col gap-2 p-3 rounded-xl border bg-card hover:bg-accent/50 transition-colors"
								>
									<div className="flex items-center justify-between">
										<span className="font-bold text-sm">{order.idExterno}</span>
										<Badge variant="outline" className="text-xs gap-1">
											{order.entregaModalidade === "RETIRADA" ? (
												<>
													<Package className="w-3 h-3" />
													Retirada
												</>
											) : (
												<>
													<Truck className="w-3 h-3" />
													Entrega
												</>
											)}
										</Badge>
									</div>

									<div className="flex items-center justify-between text-sm">
										<div className="flex flex-col">
											<span className="font-medium">{order.cliente?.nome || "Cliente"}</span>
											<span className="text-xs text-muted-foreground">
												{order.cliente?.telefone ? formatToPhone(order.cliente.telefone) : "-"}
											</span>
										</div>
										<span className="font-bold text-primary">{formatToMoney(order.valorTotal)}</span>
									</div>

									<div className="flex items-center justify-between">
										<span className="text-xs text-muted-foreground">
											{formatDistanceToNow(new Date(order.dataInsercao), {
												addSuffix: true,
												locale: ptBR,
											})}
										</span>
										<Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" asChild>
											<Link href={`/dashboard/commercial/sales/checkout/${order.id}`}>
												<ExternalLink className="w-3 h-3" />
												Confirmar
											</Link>
										</Button>
									</div>
								</div>
							))}
						</div>
					</ScrollArea>
				)}
			</CardContent>
		</Card>
	);
}
