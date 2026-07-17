"use client";

import ErrorComponent from "@/components/Layouts/ErrorComponent";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/errors";
import { formatDateAsLocale, formatToMoney } from "@/lib/formatting";
import { postIfoodOrderAction } from "@/lib/mutations/ifood";
import { useIfoodOrders } from "@/lib/queries/ifood";
import { cn } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CircleCheck, CircleUser, Info, Package, RefreshCw, Store, Truck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ControlIfoodOrder } from "./ControlIfoodOrder";
import { getIfoodOrderStatusConfig } from "./ifood-order-status-config";

type IfoodOrdersTabProps = {
	canManage: boolean;
};

const DELIVERY_MODE_META: Record<string, { label: string; icon: typeof Truck }> = {
	ENTREGA: { label: "Entrega", icon: Truck },
	RETIRADA: { label: "Retirada", icon: Package },
	PRESENCIAL: { label: "No local", icon: Store },
};

/**
 * Aba de pedidos: lista os pedidos iFood ingeridos (tabela sales) com as ações do ciclo de vida.
 * A lista atualiza sozinha a cada 30s; os pedidos entram no banco via webhook/cron/script de
 * homologação (`npm run ifood:homologation-polling -- --collect`).
 */
export function IfoodOrdersTab({ canManage }: IfoodOrdersTabProps) {
	const queryClient = useQueryClient();
	const ordersQuery = useIfoodOrders();
	const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

	const { mutate: quickConfirm, isPending: quickConfirmIsPending } = useMutation({
		mutationKey: ["ifood-order-quick-confirm"],
		mutationFn: postIfoodOrderAction,
		onSuccess: (data) => {
			toast.success(data.message);
			queryClient.invalidateQueries({ queryKey: ordersQuery.queryKey });
		},
		onError: (error) => {
			toast.error(getErrorMessage(error));
		},
	});

	const orders = ordersQuery.data ?? [];

	return (
		<div className="flex w-full flex-col gap-3">
			<div className="flex w-full items-center justify-between gap-2">
				<p className="text-xs text-muted-foreground">
					Pedidos dos últimos 7 dias. Novos pedidos devem ser confirmados no iFood em até <span className="font-semibold">8 minutos</span>.
				</p>
				<Button variant="outline" size="sm" onClick={() => ordersQuery.refetch()} disabled={ordersQuery.isRefetching}>
					<RefreshCw className={cn("h-4 w-4", ordersQuery.isRefetching && "animate-spin")} />
					ATUALIZAR
				</Button>
			</div>

			{ordersQuery.isLoading ? (
				<LoadingComponent />
			) : ordersQuery.isError ? (
				<ErrorComponent msg={getErrorMessage(ordersQuery.error)} />
			) : orders.length === 0 ? (
				<p className="w-full py-6 text-center text-sm tracking-tight text-muted-foreground">
					Nenhum pedido do iFood encontrado no período. Os pedidos aparecem aqui assim que são ingeridos pela integração.
				</p>
			) : (
				orders.map((order) => {
					const statusConfig = getIfoodOrderStatusConfig(order.situacao);
					const deliveryMeta = order.entregaModalidade ? DELIVERY_MODE_META[order.entregaModalidade] : null;
					const isNewOrder = order.situacao?.toUpperCase() === "PLACED";

					return (
						<div key={order.vendaId} className="bg-card border-border flex w-full flex-col gap-2 rounded-xl border px-4 py-3 shadow-2xs">
							<div className="flex flex-col justify-between gap-2 md:flex-row md:items-center">
								<div className="flex items-center gap-2 flex-wrap">
									<h3 className="text-sm font-bold tracking-tight">#{order.displayId ?? order.orderId}</h3>
									<span
										className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-[0.65rem] font-semibold tracking-tight", statusConfig.className)}
									>
										{statusConfig.label}
									</span>
									{deliveryMeta ? (
										<span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-[0.65rem] text-muted-foreground">
											<deliveryMeta.icon className="h-3 w-3" />
											{deliveryMeta.label}
										</span>
									) : null}
								</div>
								<div className="flex items-center gap-2">
									{canManage && isNewOrder ? (
										<Button
											size="sm"
											disabled={quickConfirmIsPending}
											onClick={() => quickConfirm({ orderId: order.orderId, action: "confirm", cancellationCode: null })}
										>
											<CircleCheck className="h-4 w-4" />
											CONFIRMAR
										</Button>
									) : null}
									<Button variant="outline" size="sm" onClick={() => setSelectedOrderId(order.orderId)}>
										<Info className="h-4 w-4" />
										DETALHES
									</Button>
								</div>
							</div>
							<div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
								<span className="inline-flex items-center gap-1">
									<CircleUser className="h-3 w-3" />
									{order.cliente?.nome ?? "NÃO IDENTIFICADO"}
								</span>
								<span>{order.dataVenda ? formatDateAsLocale(order.dataVenda, true) : "-"}</span>
								<span>
									{order.quantidadeItens} {order.quantidadeItens === 1 ? "item" : "itens"}
								</span>
								<span className="font-semibold text-foreground">{formatToMoney(order.valorTotal)}</span>
							</div>
						</div>
					);
				})
			)}

			{selectedOrderId ? (
				<ControlIfoodOrder
					orderId={selectedOrderId}
					canManage={canManage}
					closeModal={() => setSelectedOrderId(null)}
					callbacks={{
						onSuccess: () => {
							queryClient.invalidateQueries({ queryKey: ordersQuery.queryKey });
							queryClient.invalidateQueries({ queryKey: ["ifood-order-details", selectedOrderId] });
						},
					}}
				/>
			) : null}
		</div>
	);
}
