import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/errors";
import { formatDateAsLocale, formatToMoney } from "@/lib/formatting";
import { cancelTabOrOrder, updateTabOrderStatus } from "@/lib/mutations/tabs";
import { useTabById } from "@/lib/queries/tabs";
import { cn } from "@/lib/utils";
import type { TSaleAttendanceStatusEnum } from "@/schemas/enums";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRightLeft, Ban, CheckCheck, ChefHat, MapPin, Plus, Utensils } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { CloseTab } from "./CloseTab";
import { LaunchTabOrder } from "./LaunchTabOrder";
import { TransferTab } from "./TransferTab";

const ORDER_STATUS_META: Record<string, { label: string; className: string }> = {
	NAO_INICIADO: { label: "NA FILA", className: "bg-muted/50 text-muted-foreground" },
	EM_PREPARO: { label: "EM PREPARO", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
	PRONTO: { label: "PRONTO", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
	EM_ENTREGA: { label: "EM ENTREGA", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
	ENTREGUE: { label: "ENTREGUE", className: "bg-green-500/10 text-green-700 dark:text-green-400" },
	PARCIALMENTE_ENTREGUE: { label: "PARCIAL", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
	CANCELADO: { label: "CANCELADO", className: "bg-destructive/10 text-destructive" },
};

// Acao rapida do garcom por status do pedido (a cozinha usa o board de Preparo).
const ORDER_NEXT_ACTION: Partial<Record<TSaleAttendanceStatusEnum, { status: TSaleAttendanceStatusEnum; label: string }>> = {
	PRONTO: { status: "ENTREGUE", label: "ENTREGAR" },
	EM_PREPARO: { status: "PRONTO", label: "PRONTO" },
	NAO_INICIADO: { status: "EM_PREPARO", label: "INICIAR" },
};

type ControlTabProps = {
	tabId: string;
	closeModal: () => void;
	callbacks?: {
		onSuccess?: () => void;
	};
};

export function ControlTab({ tabId, closeModal, callbacks }: ControlTabProps) {
	const queryClient = useQueryClient();
	const { data: tab, isLoading, isError, error, queryKey } = useTabById({ tabId });
	const [subModal, setSubModal] = useState<"pedido" | "fechar" | "transferir" | null>(null);

	function refresh() {
		queryClient.invalidateQueries({ queryKey });
		queryClient.invalidateQueries({ queryKey: ["tabs"] });
		queryClient.invalidateQueries({ queryKey: ["preparation-tickets"] });
		callbacks?.onSuccess?.();
	}

	const { mutate: mutateOrderStatus, isPending: orderStatusPending } = useMutation({
		mutationKey: ["update-tab-order-status", tabId],
		mutationFn: updateTabOrderStatus,
		onSuccess: (data) => {
			toast.success(data.message);
			refresh();
		},
		onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
	});

	const { mutate: mutateCancel, isPending: cancelPending } = useMutation({
		mutationKey: ["cancel-tab-or-order", tabId],
		mutationFn: cancelTabOrOrder,
		onSuccess: (data) => {
			toast.success(data.message);
			refresh();
		},
		onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
	});

	function handleCancelOrder(orderId: string, hasDeliveredItems: boolean) {
		if (!window.confirm("Cancelar este pedido?")) return;
		const devolverEstoque = hasDeliveredItems ? window.confirm("Devolver os itens entregues ao estoque? (OK = devolver, Cancelar = manter a saída)") : null;
		mutateCancel({ tabOrderId: orderId, tabId: null, devolverEstoque, confirmarItensEntregues: null, motivo: null });
	}

	function handleCancelTab() {
		if (!window.confirm("Cancelar a conta inteira? Pedidos ativos serão cancelados.")) return;
		const hasDelivered = (tab?.pedidos ?? []).some((order) => order.itens.some((item) => (item.quantidadeEntregue ?? 0) > 0));
		mutateCancel({
			tabId,
			tabOrderId: null,
			devolverEstoque: null,
			confirmarItensEntregues: hasDelivered ? window.confirm("A conta possui itens já entregues (consumo real). Confirmar o cancelamento mesmo assim?") : null,
			motivo: null,
		});
	}

	const etiqueta = tab?.servicePoint?.rotulo ?? (tab?.codigo ? `Comanda ${tab.codigo}` : "Conta");

	return (
		<>
			<ResponsiveMenu
				menuTitle={etiqueta.toUpperCase()}
				menuDescription="Gerencie os pedidos da conta, transfira, cancele ou feche com pagamento."
				menuActionButtonText="FECHAR CONTA"
				menuActionButtonDisabled={!tab || tab.status !== "ABERTA" || (tab.consumoParcial ?? 0) <= 0}
				menuSecondaryActionButtonText="LANÇAR PEDIDO"
				menuSecondaryActionButtonDisabled={!tab || tab.status !== "ABERTA"}
				menuCancelButtonText="VOLTAR"
				actionFunction={() => setSubModal("fechar")}
				secondaryActionFunction={() => setSubModal("pedido")}
				actionIsLoading={false}
				stateIsLoading={isLoading}
				stateError={isError ? getErrorMessage(error) : null}
				closeMenu={closeModal}
				dialogVariant="md"
				drawerVariant="lg"
			>
				{tab ? (
					<div className="flex flex-col gap-3 p-1">
						<div className="flex items-center justify-between rounded-xl bg-secondary/50 px-3 py-2">
							<div className="flex flex-col">
								<span className="text-[0.65rem] uppercase text-muted-foreground">Consumo em aberto</span>
								<span className="text-base font-bold">{formatToMoney(tab.consumoParcial ?? 0)}</span>
							</div>
							<div className="flex flex-col items-end text-xs text-muted-foreground">
								<span className="flex items-center gap-1">
									<MapPin className="w-3 h-3" />
									{tab.servicePoint?.rotulo ?? "Sem ponto"}
								</span>
								<span>Aberta em {formatDateAsLocale(tab.dataAbertura, true)}</span>
							</div>
						</div>

						<div className="flex flex-col gap-2">
							<span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-tight">
								<Utensils className="w-3.5 h-3.5" />
								Pedidos ({tab.pedidos.length})
							</span>
							{tab.pedidos.length === 0 ? <p className="py-3 text-center text-xs text-muted-foreground">Nenhum pedido lançado ainda.</p> : null}
							{tab.pedidos.map((order) => {
								const statusMeta = ORDER_STATUS_META[order.status] ?? ORDER_STATUS_META.NAO_INICIADO;
								const nextAction = tab.status === "ABERTA" ? ORDER_NEXT_ACTION[order.status] : undefined;
								const hasDeliveredItems = order.itens.some((item) => (item.quantidadeEntregue ?? 0) > 0);
								const isCancellable = tab.status === "ABERTA" && order.status !== "CANCELADO";
								return (
									<div key={order.id} className="flex flex-col gap-1.5 rounded-xl border border-border px-3 py-2">
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-2">
												<span className="flex items-center gap-1 text-sm font-bold tracking-tight">
													<ChefHat className="w-3.5 h-3.5" />
													Pedido {order.numero}
												</span>
												<span className={cn("rounded-md px-1.5 py-0.5 text-[0.65rem] font-semibold", statusMeta.className)}>{statusMeta.label}</span>
											</div>
											<div className="flex items-center gap-1">
												{nextAction ? (
													<Button
														size="sm"
														variant="secondary"
														className="h-7 text-xs flex items-center gap-1"
														disabled={orderStatusPending}
														onClick={() => mutateOrderStatus({ tabOrderId: order.id, status: nextAction.status })}
													>
														<CheckCheck className="w-3 h-3" />
														{nextAction.label}
													</Button>
												) : null}
												{isCancellable ? (
													<Button
														size="sm"
														variant="ghost"
														className="h-7 text-xs text-destructive"
														disabled={cancelPending}
														onClick={() => handleCancelOrder(order.id, hasDeliveredItems)}
													>
														<Ban className="w-3 h-3" />
													</Button>
												) : null}
											</div>
										</div>
										<div className="flex flex-col gap-0.5">
											{order.itens.map((item) => {
												const metadata = (item.metadados ?? {}) as { nome?: string };
												return (
													<div key={item.id} className="flex items-center justify-between text-xs">
														<span className={cn(item.quantidadeCancelada >= item.quantidade ? "line-through text-muted-foreground" : "")}>
															{item.quantidade}x {metadata.nome ?? "Item"}
														</span>
														<span className="font-medium">{formatToMoney(item.valorVendaTotalLiquido)}</span>
													</div>
												);
											})}
										</div>
										{order.observacoes ? <p className="text-[0.7rem] text-muted-foreground">{order.observacoes}</p> : null}
									</div>
								);
							})}
						</div>

						{tab.status === "ABERTA" ? (
							<div className="flex items-center gap-2">
								<Button variant="outline" size="sm" className="flex items-center gap-1.5" onClick={() => setSubModal("pedido")}>
									<Plus className="w-3.5 h-3.5" />
									PEDIDO
								</Button>
								<Button variant="outline" size="sm" className="flex items-center gap-1.5" onClick={() => setSubModal("transferir")}>
									<ArrowRightLeft className="w-3.5 h-3.5" />
									TRANSFERIR
								</Button>
								<Button variant="ghost" size="sm" className="flex items-center gap-1.5 text-destructive" disabled={cancelPending} onClick={handleCancelTab}>
									<Ban className="w-3.5 h-3.5" />
									CANCELAR CONTA
								</Button>
							</div>
						) : null}
					</div>
				) : null}
			</ResponsiveMenu>

			{subModal === "pedido" && tab ? <LaunchTabOrder tabId={tab.id} closeModal={() => setSubModal(null)} callbacks={{ onSuccess: refresh }} /> : null}
			{subModal === "fechar" && tab ? (
				<CloseTab
					tabId={tab.id}
					consumoParcial={tab.consumoParcial ?? 0}
					closeModal={() => setSubModal(null)}
					callbacks={{
						onSuccess: () => {
							refresh();
							closeModal();
						},
					}}
				/>
			) : null}
			{subModal === "transferir" && tab ? (
				<TransferTab tabId={tab.id} currentServicePointId={tab.servicePointId} closeModal={() => setSubModal(null)} callbacks={{ onSuccess: refresh }} />
			) : null}
		</>
	);
}
