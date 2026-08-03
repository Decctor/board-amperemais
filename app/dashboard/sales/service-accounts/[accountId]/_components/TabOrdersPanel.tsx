"use client";
import type { TTabDetails } from "@/app/api/tabs/route";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { getErrorMessage } from "@/lib/errors";
import { formatDateAsLocale, formatToMoney } from "@/lib/formatting";
import { cancelTabOrOrder, updateTabOrderStatus } from "@/lib/mutations/tabs";
import { cn } from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { ArrowRightLeft, Ban, CheckCheck, ChefHat, CircleUser, Clock, MapPin, UserRound, Utensils } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ORDER_NEXT_ACTION, ORDER_STATUS_META, formatTabAge } from "./tab-meta";

// ============================================================================
// Painel da conta: consumo em aberto, pedidos lançados e ações secundárias.
// Confirmações destrutivas expandem inline (progressive disclosure) em vez de
// abrir window.confirm/modal — o operador vê o contexto do que está cancelando.
// ============================================================================

type TabOrdersPanelProps = {
	tab: TTabDetails;
	refresh: () => void;
	onRequestTransfer: () => void;
};

export function TabOrdersPanel({ tab, refresh, onRequestTransfer }: TabOrdersPanelProps) {
	const isOpen = tab.status === "ABERTA";
	const [confirmingOrderId, setConfirmingOrderId] = useState<string | null>(null);
	const [confirmingTabCancel, setConfirmingTabCancel] = useState(false);

	const { mutate: mutateOrderStatus, isPending: orderStatusPending } = useMutation({
		mutationKey: ["update-tab-order-status", tab.id],
		mutationFn: updateTabOrderStatus,
		onSuccess: (data) => {
			toast.success(data.message);
			refresh();
		},
		onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
	});

	const { mutate: mutateCancel, isPending: cancelPending } = useMutation({
		mutationKey: ["cancel-tab-or-order", tab.id],
		mutationFn: cancelTabOrOrder,
		onSuccess: (data) => {
			toast.success(data.message);
			setConfirmingOrderId(null);
			setConfirmingTabCancel(false);
			refresh();
		},
		onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
	});

	const tabHasDeliveredItems = tab.pedidos.some((order) => order.itens.some((item) => (item.quantidadeEntregue ?? 0) > 0));

	return (
		<div className="flex min-w-0 flex-col gap-5">
			{/* Consumo em aberto + metadados da conta */}
			<section className="flex flex-col gap-3">
				<div className="flex flex-col gap-0.5">
					<span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-muted-foreground">
						{tab.status === "ABERTA" ? "Consumo em aberto" : "Total da conta"}
					</span>
					<span className="text-3xl font-black tabular-nums tracking-tight">
						{formatToMoney(tab.status === "ABERTA" ? (tab.consumoParcial ?? 0) : (tab.valorTotal ?? tab.consumoParcial ?? 0))}
					</span>
				</div>
				<div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
					<span className="flex items-center gap-1.5">
						<MapPin className="size-3.5" />
						{tab.servicePoint?.rotulo ?? "Sem ponto"}
					</span>
					<span className="flex items-center gap-1.5">
						<Clock className="size-3.5" />
						Aberta em {formatDateAsLocale(tab.dataAbertura, true)} · há {formatTabAge(tab.dataAbertura)}
					</span>
					{tab.cliente ? (
						<span className="flex items-center gap-1.5">
							<CircleUser className="size-3.5" />
							{tab.cliente.nome}
						</span>
					) : null}
					{tab.responsavelVendedor ? (
						<span className="flex items-center gap-1.5">
							<UserRound className="size-3.5" />
							{tab.responsavelVendedor.nome}
						</span>
					) : null}
				</div>
				{tab.observacoes ? <p className="text-xs text-muted-foreground">{tab.observacoes}</p> : null}
			</section>

			{/* Pedidos */}
			<section className="flex flex-col gap-2.5">
				<h2 className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-[0.08em] text-muted-foreground">
					<Utensils className="size-3.5" />
					Pedidos ({tab.pedidos.length})
				</h2>

				{tab.pedidos.length === 0 ? (
					<div className="flex flex-col items-center gap-1.5 rounded-2xl border border-dashed border-border py-8 text-center">
						<ChefHat className="size-7 text-muted-foreground" />
						<p className="text-sm font-semibold">Nenhum pedido lançado ainda.</p>
						<p className="max-w-xs text-xs text-muted-foreground">Os pedidos da conta aparecem aqui. O pagamento acontece só no fechamento.</p>
					</div>
				) : null}

				{tab.pedidos.map((order) => {
					const statusMeta = ORDER_STATUS_META[order.status] ?? ORDER_STATUS_META.NAO_INICIADO;
					const nextAction = isOpen ? ORDER_NEXT_ACTION[order.status] : undefined;
					const hasDeliveredItems = order.itens.some((item) => (item.quantidadeEntregue ?? 0) > 0);
					const isCancellable = isOpen && order.status !== "CANCELADO";
					const isConfirmingCancel = confirmingOrderId === order.id;

					return (
						<article key={order.id} className="flex flex-col gap-2 rounded-2xl border border-border px-3.5 py-3">
							<header className="flex items-center justify-between gap-2">
								<div className="flex min-w-0 items-center gap-2">
									<span className="flex items-center gap-1.5 text-sm font-bold tracking-tight">
										<ChefHat className="size-3.5" />
										Pedido {order.numero}
									</span>
									<span className={cn("rounded-md px-1.5 py-0.5 text-[0.65rem] font-semibold", statusMeta.className)}>{statusMeta.label}</span>
								</div>
								<div className="flex shrink-0 items-center gap-1">
									{nextAction && !isConfirmingCancel ? (
										<Button
											size="sm"
											variant="secondary"
											className="h-8 gap-1 text-xs"
											disabled={orderStatusPending}
											onClick={() => mutateOrderStatus({ tabOrderId: order.id, status: nextAction.status })}
										>
											<CheckCheck className="size-3" />
											{nextAction.label}
										</Button>
									) : null}
									{isCancellable && !isConfirmingCancel ? (
										<Button
											size="icon"
											variant="ghost"
											className="size-8 text-muted-foreground hover:text-destructive"
											aria-label={`Cancelar pedido ${order.numero}`}
											disabled={cancelPending}
											onClick={() => {
												setConfirmingTabCancel(false);
												setConfirmingOrderId(order.id);
											}}
										>
											<Ban className="size-3.5" />
										</Button>
									) : null}
								</div>
							</header>

							<div className="flex flex-col gap-1">
								{order.itens.map((item) => {
									const metadata = (item.metadados ?? {}) as { nome?: string };
									const fullyCancelled = item.quantidadeCancelada >= item.quantidade;
									return (
										<div key={item.id} className="flex flex-col gap-0.5">
											<div className="flex items-baseline justify-between gap-3 text-sm">
												<span className={cn("min-w-0 font-medium", fullyCancelled && "text-muted-foreground line-through")}>
													{item.quantidade}x {metadata.nome ?? "Item"}
												</span>
												<span className="shrink-0 text-xs font-bold tabular-nums">{formatToMoney(item.valorVendaTotalLiquido)}</span>
											</div>
											{item.adicionais.length > 0 ? (
												<div className="flex flex-col gap-px pl-4">
													{item.adicionais.map((addOn) => (
														<span key={addOn.id} className={cn("text-xs text-muted-foreground", fullyCancelled && "line-through")}>
															+ {addOn.quantidade}x {addOn.nome}
															{addOn.valorTotal > 0 ? ` · ${formatToMoney(addOn.valorTotal)}` : ""}
														</span>
													))}
												</div>
											) : null}
										</div>
									);
								})}
							</div>

							{order.observacoes ? <p className="text-xs text-muted-foreground">{order.observacoes}</p> : null}

							{isConfirmingCancel ? (
								<InlineCancelOrderConfirm
									orderNumber={order.numero}
									hasDeliveredItems={hasDeliveredItems}
									pending={cancelPending}
									onKeep={() => setConfirmingOrderId(null)}
									onConfirm={(devolverEstoque) =>
										mutateCancel({
											tabOrderId: order.id,
											tabId: null,
											devolverEstoque,
											confirmarItensEntregues: null,
											motivo: null,
										})
									}
								/>
							) : null}
						</article>
					);
				})}
			</section>

			{/* Ações secundárias — transferência e cancelamento da conta */}
			{isOpen ? (
				<section className="flex flex-col gap-2 border-t border-border pt-4">
					<div className="flex flex-wrap items-center gap-2">
						<Button variant="outline" size="sm" className="gap-1.5" onClick={onRequestTransfer}>
							<ArrowRightLeft className="size-3.5" />
							TRANSFERIR
						</Button>
						{!confirmingTabCancel ? (
							<Button
								variant="ghost"
								size="sm"
								className="gap-1.5 text-muted-foreground hover:text-destructive"
								disabled={cancelPending}
								onClick={() => {
									setConfirmingOrderId(null);
									setConfirmingTabCancel(true);
								}}
							>
								<Ban className="size-3.5" />
								CANCELAR CONTA
							</Button>
						) : null}
					</div>

					{confirmingTabCancel ? (
						<InlineCancelTabConfirm
							hasDeliveredItems={tabHasDeliveredItems}
							pending={cancelPending}
							onKeep={() => setConfirmingTabCancel(false)}
							onConfirm={(confirmarItensEntregues) =>
								mutateCancel({
									tabId: tab.id,
									tabOrderId: null,
									devolverEstoque: null,
									confirmarItensEntregues,
									motivo: null,
								})
							}
						/>
					) : null}
				</section>
			) : null}
		</div>
	);
}

// ============================================================================
// Confirmações inline
// ============================================================================

type InlineCancelOrderConfirmProps = {
	orderNumber: number;
	hasDeliveredItems: boolean;
	pending: boolean;
	onKeep: () => void;
	onConfirm: (devolverEstoque: boolean | null) => void;
};

function InlineCancelOrderConfirm({ orderNumber, hasDeliveredItems, pending, onKeep, onConfirm }: InlineCancelOrderConfirmProps) {
	const [devolverEstoque, setDevolverEstoque] = useState(true);

	return (
		<div className="flex flex-col gap-2.5 rounded-xl bg-destructive/5 px-3 py-2.5 animate-in fade-in-0 slide-in-from-top-1 duration-200">
			<p className="text-xs font-semibold text-destructive">Cancelar o pedido {orderNumber}? Esta ação não pode ser desfeita.</p>
			{hasDeliveredItems ? (
				<label className="flex items-center gap-2 text-xs font-medium">
					<Checkbox checked={devolverEstoque} onCheckedChange={(checked) => setDevolverEstoque(checked === true)} />
					Devolver os itens já entregues ao estoque
				</label>
			) : null}
			<div className="flex items-center gap-2">
				<Button size="sm" variant="outline" className="h-8 flex-1 text-xs" disabled={pending} onClick={onKeep}>
					MANTER PEDIDO
				</Button>
				<Button
					size="sm"
					variant="destructive"
					className="h-8 flex-1 text-xs"
					disabled={pending}
					onClick={() => onConfirm(hasDeliveredItems ? devolverEstoque : null)}
				>
					CANCELAR PEDIDO
				</Button>
			</div>
		</div>
	);
}

type InlineCancelTabConfirmProps = {
	hasDeliveredItems: boolean;
	pending: boolean;
	onKeep: () => void;
	onConfirm: (confirmarItensEntregues: boolean | null) => void;
};

function InlineCancelTabConfirm({ hasDeliveredItems, pending, onKeep, onConfirm }: InlineCancelTabConfirmProps) {
	const [confirmDelivered, setConfirmDelivered] = useState(false);
	const blocked = hasDeliveredItems && !confirmDelivered;

	return (
		<div className="flex flex-col gap-2.5 rounded-xl bg-destructive/5 px-3 py-2.5 animate-in fade-in-0 slide-in-from-top-1 duration-200">
			<p className="text-xs font-semibold text-destructive">Cancelar a conta inteira? Pedidos ativos serão cancelados.</p>
			{hasDeliveredItems ? (
				<label className="flex items-center gap-2 text-xs font-medium">
					<Checkbox checked={confirmDelivered} onCheckedChange={(checked) => setConfirmDelivered(checked === true)} />
					A conta possui itens já entregues (consumo real). Confirmo o cancelamento mesmo assim.
				</label>
			) : null}
			<div className="flex items-center gap-2">
				<Button size="sm" variant="outline" className="h-8 flex-1 text-xs" disabled={pending} onClick={onKeep}>
					MANTER CONTA
				</Button>
				<Button size="sm" variant="destructive" className="h-8 flex-1 text-xs" disabled={pending || blocked} onClick={() => onConfirm(hasDeliveredItems ? true : null)}>
					CANCELAR CONTA
				</Button>
			</div>
		</div>
	);
}
