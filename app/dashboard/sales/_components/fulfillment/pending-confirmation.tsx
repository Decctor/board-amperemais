"use client";
import { ResponsiveMenuAnimatedBody } from "@/components/Utils/ResponsiveMenuAnimatedBody";
import { LoadingButton } from "@/components/loading-button";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";

import type { TGetSalesFulfillmentOutputDefault } from "@/app/api/sales/fulfillment/route";
import { Button } from "@/components/ui/button";
import { SelectGroup, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getErrorMessage } from "@/lib/errors";
import { formatToMoney } from "@/lib/formatting";
import { postFulfillmentOrderConfirmation } from "@/lib/mutations/sales";
import { useFulfillmentOrderCancellationReasons } from "@/lib/queries/sales-fulfillment";
import { cn } from "@/lib/utils";
import { SalesIntegrationPill } from "@/components/Sales/SalesIntegrationPill";
import { useMutation } from "@tanstack/react-query";
import { CircleCheck, CircleUser, Package, Store, Truck, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type TPendingConfirmationOrder = TGetSalesFulfillmentOutputDefault["pendingConfirmation"][number];

export const IFOOD_CONFIRMATION_SLA_MINUTES = 8;

const DELIVERY_MODE_META: Record<string, { label: string; icon: typeof Truck }> = {
	ENTREGA: { label: "Entrega", icon: Truck },
	RETIRADA: { label: "Retirada", icon: Package },
	PRESENCIAL: { label: "No local", icon: Store },
};

function useNowTick(enabled: boolean) {
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		if (!enabled) return;
		const interval = setInterval(() => setNow(Date.now()), 15_000);
		return () => clearInterval(interval);
	}, [enabled]);
	return now;
}

function formatSlaCountdown(orderDate: Date | string | null, now: number) {
	if (!orderDate) return null;
	const deadline = new Date(orderDate).getTime() + IFOOD_CONFIRMATION_SLA_MINUTES * 60 * 1000;
	const remainingMs = deadline - now;
	if (remainingMs <= 0) return { label: "SLA estourado", overdue: true };
	const remainingMinutes = Math.ceil(remainingMs / 60_000);
	return { label: `${remainingMinutes} min p/ confirmar`, overdue: remainingMinutes <= 2 };
}

/**
 * Pill de pedidos a confirmar (canais gerenciados — iFood PLACED), no estilo das pills de
 * conexões do dashboard. Clique abre o menu (dialog/drawer) com a fila de confirmação.
 */
export function PendingConfirmationPill({
	pending,
	canManage,
	onChanged,
}: {
	pending: TPendingConfirmationOrder[];
	canManage: boolean;
	onChanged: () => void;
}) {
	const [menuIsOpen, setMenuIsOpen] = useState(false);

	if (pending.length === 0) return null;

	return (
		<>
			<button
				type="button"
				onClick={() => setMenuIsOpen(true)}
				className="flex shrink-0 items-center gap-1.5 rounded-lg bg-secondary px-2 py-1.5 transition-colors hover:bg-secondary/70"
			>
				<span className="flex h-6 min-h-6 w-6 min-w-6 items-center justify-center rounded-full bg-[#EA1D2C] text-[0.65rem] font-bold text-white ring-2 ring-background">
					{pending.length}
				</span>
				<span className="text-xs font-medium">{pending.length === 1 ? "pedido a confirmar" : "pedidos a confirmar"}</span>
				<span className="relative flex h-2 w-2">
					<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-75" />
					<span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
				</span>
			</button>

			{menuIsOpen ? (
				<PendingConfirmationMenu pending={pending} canManage={canManage} closeMenu={() => setMenuIsOpen(false)} onChanged={onChanged} />
			) : null}
		</>
	);
}

function PendingConfirmationMenu({
	pending,
	canManage,
	closeMenu,
	onChanged,
}: {
	pending: TPendingConfirmationOrder[];
	canManage: boolean;
	closeMenu: () => void;
	onChanged: () => void;
}) {
	const now = useNowTick(true);
	const [rejectingSaleId, setRejectingSaleId] = useState<string | null>(null);
	const [cancellationCode, setCancellationCode] = useState<string | null>(null);
	const reasonsQuery = useFulfillmentOrderCancellationReasons({ saleId: rejectingSaleId });

	const { mutate, isPending: mutationIsPending } = useMutation({
		mutationKey: ["fulfillment-order-confirmation"],
		mutationFn: postFulfillmentOrderConfirmation,
		onSuccess: (data) => {
			toast.success(data.message);
			setRejectingSaleId(null);
			setCancellationCode(null);
			onChanged();
		},
		onError: (error) => {
			toast.error(getErrorMessage(error));
		},
	});

	function handleReject(saleId: string) {
		if (rejectingSaleId !== saleId) {
			setRejectingSaleId(saleId);
			setCancellationCode(null);
			return;
		}
		if (!cancellationCode) return toast.error("Selecione o motivo de recusa do pedido.");
		mutate({ saleId, decision: "RECUSAR", cancellationCode });
	}

	return (
		<ResponsiveMenu.Root
			open
			onOpenChange={(open) => {
				if (!open) closeMenu();
			}}
		>
			<ResponsiveMenu.Content drawerClassName="max-h-[70dvh]">
				<ResponsiveMenu.Header>
					<ResponsiveMenu.Title>PEDIDOS A CONFIRMAR</ResponsiveMenu.Title>
					<ResponsiveMenu.Description>{`Pedidos do iFood aguardando confirmação. O iFood cancela pedidos não confirmados em ${IFOOD_CONFIRMATION_SLA_MINUTES} minutos.`}</ResponsiveMenu.Description>
				</ResponsiveMenu.Header>
				<ResponsiveMenuAnimatedBody stateKey="content" className="overflow-x-hidden overflow-y-auto">
					<div className="flex flex-col gap-3">
						{pending.map((order) => {
							const sla = formatSlaCountdown(order.dataVenda, now);
							const deliveryMeta = order.entregaModalidade ? DELIVERY_MODE_META[order.entregaModalidade] : null;
							const isRejecting = rejectingSaleId === order.vendaId;

							return (
								<div key={order.vendaId} className="flex flex-col gap-2 rounded-xl border border-border bg-card px-3 py-3">
									<div className="flex items-center justify-between gap-2 flex-wrap">
										<div className="flex items-center gap-2">
											<h3 className="text-sm font-bold tracking-tight">#{order.displayId ?? order.orderId}</h3>
											<SalesIntegrationPill integracao={order.integracao} />
											{deliveryMeta ? (
												<span className="inline-flex items-center gap-1 rounded-md bg-secondary px-1.5 py-0.5 text-[0.65rem] text-muted-foreground">
													<deliveryMeta.icon className="h-3 w-3" />
													{deliveryMeta.label}
												</span>
											) : null}
										</div>
										{sla ? (
											<span
												className={cn(
													"rounded-md px-2 py-0.5 text-[0.65rem] font-semibold",
													sla.overdue ? "bg-destructive/10 text-destructive" : "bg-amber-500/10 text-amber-700 dark:text-amber-400",
												)}
											>
												{sla.label}
											</span>
										) : null}
									</div>

									<div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
										<span className="inline-flex items-center gap-1">
											<CircleUser className="h-3 w-3" />
											{order.cliente?.nome ?? "NÃO IDENTIFICADO"}
										</span>
										<span>
											{order.quantidadeItens} {order.quantidadeItens === 1 ? "item" : "itens"}
										</span>
										<span className="font-semibold text-foreground">{formatToMoney(order.valorTotal)}</span>
									</div>
									{order.observacoes ? <p className="text-xs italic text-muted-foreground">"{order.observacoes}"</p> : null}

									{canManage ? (
										<div className="flex flex-col gap-2">
											{isRejecting ? (
												<Select
													items={[...(reasonsQuery.data ?? []).map((motivo) => ({ value: motivo.codigo, label: motivo.descricao }))]}
													value={cancellationCode ?? null}
													onValueChange={(value) => {
														if (value === null) return;
														setCancellationCode(value);
													}}
												>
													<SelectTrigger className="w-full">
														<SelectValue placeholder={reasonsQuery.isLoading ? "Carregando motivos..." : "Selecione o motivo da recusa..."} />
													</SelectTrigger>
													<SelectContent>
														<SelectGroup>
															{(reasonsQuery.data ?? []).map((motivo) => (
																<SelectItem key={motivo.codigo} value={motivo.codigo}>
																	{motivo.descricao}
																</SelectItem>
															))}
														</SelectGroup>
													</SelectContent>
												</Select>
											) : null}
											<div className="flex items-center gap-2">
												<Button
													size="sm"
													className="grow"
													disabled={mutationIsPending}
													onClick={() => mutate({ saleId: order.vendaId, decision: "CONFIRMAR", cancellationCode: null })}
												>
													<CircleCheck className="h-4 w-4" />
													CONFIRMAR
												</Button>
												<Button
													size="sm"
													variant="outline"
													className="grow text-destructive hover:text-destructive"
													disabled={mutationIsPending || (isRejecting && !cancellationCode && reasonsQuery.isLoading)}
													onClick={() => handleReject(order.vendaId)}
												>
													<XCircle className="h-4 w-4" />
													{isRejecting ? "CONFIRMAR RECUSA" : "RECUSAR"}
												</Button>
											</div>
										</div>
									) : null}
								</div>
							);
						})}
					</div>
				</ResponsiveMenuAnimatedBody>
				<ResponsiveMenu.Footer>
					<ResponsiveMenu.Close variant="outline">VOLTAR</ResponsiveMenu.Close>
					<LoadingButton onClick={closeMenu}>FECHAR</LoadingButton>
				</ResponsiveMenu.Footer>
			</ResponsiveMenu.Content>
		</ResponsiveMenu.Root>
	);
}
