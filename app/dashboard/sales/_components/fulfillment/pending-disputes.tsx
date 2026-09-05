"use client";
import { ResponsiveMenuAnimatedBody } from "@/components/Utils/ResponsiveMenuAnimatedBody";
import { LoadingButton } from "@/components/loading-button";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";

import type { TGetSalesFulfillmentOutputDefault } from "@/app/api/sales/fulfillment/route";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/errors";
import { formatToMoney } from "@/lib/formatting";
import { postFulfillmentDisputeResponse } from "@/lib/mutations/sales";
import { cn } from "@/lib/utils";
import { SalesIntegrationPill } from "@/components/Sales/SalesIntegrationPill";
import { useMutation } from "@tanstack/react-query";
import { CircleCheck, CircleUser, MessageSquareWarning, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type TPendingDisputeOrder = TGetSalesFulfillmentOutputDefault["pendingDisputes"][number];

const DISPUTE_TIMEOUT_ACTION_LABELS: Record<string, string> = {
	ACCEPT_CANCELLATION: "o iFood ACEITA o cancelamento automaticamente",
	REJECT_CANCELLATION: "o iFood REJEITA o cancelamento automaticamente",
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

function formatDisputeCountdown(expiraEm: string | null, now: number) {
	if (!expiraEm) return null;
	const remainingMs = new Date(expiraEm).getTime() - now;
	if (remainingMs <= 0) return { label: "Prazo esgotado", overdue: true };
	const remainingMinutes = Math.ceil(remainingMs / 60_000);
	return { label: `${remainingMinutes} min p/ responder`, overdue: remainingMinutes <= 2 };
}

/**
 * Pill de disputas de cancelamento abertas (Plataforma de Negociação do iFood — HANDSHAKE_DISPUTE),
 * no estilo da pill de pedidos a confirmar. A disputa tem prazo: sem resposta, o canal executa a
 * ação de timeout sozinho. Clique abre a fila com aceitar/rejeitar por pedido.
 */
export function PendingDisputesPill({
	pending,
	canManage,
	onChanged,
}: {
	pending: TPendingDisputeOrder[];
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
				<span className="flex h-6 min-h-6 w-6 min-w-6 items-center justify-center rounded-full bg-destructive text-[0.65rem] font-bold text-white ring-2 ring-background">
					{pending.length}
				</span>
				<span className="text-xs font-medium">{pending.length === 1 ? "disputa de cancelamento" : "disputas de cancelamento"}</span>
				<span className="relative flex h-2 w-2">
					<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
					<span className="relative inline-flex h-2 w-2 rounded-full bg-destructive" />
				</span>
			</button>

			{menuIsOpen ? <PendingDisputesMenu pending={pending} canManage={canManage} closeMenu={() => setMenuIsOpen(false)} onChanged={onChanged} /> : null}
		</>
	);
}

function PendingDisputesMenu({
	pending,
	canManage,
	closeMenu,
	onChanged,
}: {
	pending: TPendingDisputeOrder[];
	canManage: boolean;
	closeMenu: () => void;
	onChanged: () => void;
}) {
	const now = useNowTick(true);
	// Aceitar cancela o pedido — exige um segundo clique de confirmação, como a recusa da fila de
	// confirmação.
	const [acceptingSaleId, setAcceptingSaleId] = useState<string | null>(null);

	const { mutate, isPending: mutationIsPending } = useMutation({
		mutationKey: ["fulfillment-dispute-response"],
		mutationFn: postFulfillmentDisputeResponse,
		onSuccess: (data) => {
			toast.success(data.message);
			setAcceptingSaleId(null);
			onChanged();
		},
		onError: (error) => {
			toast.error(getErrorMessage(error));
		},
	});

	function handleAccept(order: TPendingDisputeOrder) {
		if (acceptingSaleId !== order.vendaId) {
			setAcceptingSaleId(order.vendaId);
			return;
		}
		mutate({ saleId: order.vendaId, disputeId: order.disputa.disputaId, decision: "ACEITAR", reason: null });
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
					<ResponsiveMenu.Title>DISPUTAS DE CANCELAMENTO</ResponsiveMenu.Title>
					<ResponsiveMenu.Description>
						O cliente ou o iFood pediu o cancelamento destes pedidos. Responda antes do prazo — sem resposta, o iFood decide sozinho.
					</ResponsiveMenu.Description>
				</ResponsiveMenu.Header>
				<ResponsiveMenuAnimatedBody stateKey="content" className="overflow-x-hidden overflow-y-auto">
					<div className="flex flex-col gap-3">
						{pending.map((order) => {
							const countdown = formatDisputeCountdown(order.disputa.expiraEm, now);
							const timeoutLabel = order.disputa.acaoTimeout ? DISPUTE_TIMEOUT_ACTION_LABELS[order.disputa.acaoTimeout.toUpperCase()] : null;
							const isAccepting = acceptingSaleId === order.vendaId;

							return (
								<div key={order.vendaId} className="flex flex-col gap-2 rounded-xl border border-destructive/30 bg-card px-3 py-3">
									<div className="flex items-center justify-between gap-2 flex-wrap">
										<div className="flex items-center gap-2">
											<h3 className="text-sm font-bold tracking-tight">#{order.displayId ?? order.orderId}</h3>
											<SalesIntegrationPill integracao={order.integracao} />
										</div>
										{countdown ? (
											<span
												className={cn(
													"rounded-md px-2 py-0.5 text-[0.65rem] font-semibold",
													countdown.overdue ? "bg-destructive/10 text-destructive" : "bg-amber-500/10 text-amber-700 dark:text-amber-400",
												)}
											>
												{countdown.label}
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

									{order.disputa.mensagem ? (
										<p className="flex items-start gap-1.5 text-xs text-muted-foreground">
											<MessageSquareWarning className="mt-0.5 h-3.5 w-3.5 min-w-3.5 text-destructive" />
											<span className="italic">"{order.disputa.mensagem}"</span>
										</p>
									) : null}
									{timeoutLabel ? <p className="text-[0.65rem] text-muted-foreground">Sem resposta no prazo, {timeoutLabel}.</p> : null}

									{canManage ? (
										<div className="flex items-center gap-2">
											<Button
												size="sm"
												variant="outline"
												className="grow text-destructive hover:text-destructive"
												disabled={mutationIsPending}
												onClick={() => handleAccept(order)}
											>
												<CircleCheck className="h-4 w-4" />
												{isAccepting ? "CONFIRMAR CANCELAMENTO" : "ACEITAR CANCELAMENTO"}
											</Button>
											<Button
												size="sm"
												className="grow"
												disabled={mutationIsPending}
												onClick={() => mutate({ saleId: order.vendaId, disputeId: order.disputa.disputaId, decision: "REJEITAR", reason: null })}
											>
												<XCircle className="h-4 w-4" />
												REJEITAR DISPUTA
											</Button>
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
