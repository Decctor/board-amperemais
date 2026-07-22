"use client";

import ResponsiveMenuV2 from "@/components/Utils/ResponsiveMenuV2";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getErrorMessage } from "@/lib/errors";
import { formatDateAsLocale, formatToMoney } from "@/lib/formatting";
import { postIfoodOrderAction } from "@/lib/mutations/ifood";
import { useIfoodOrderDetails } from "@/lib/queries/ifood";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { IFOOD_ORDER_ACTION_BUTTON_LABELS, getAvailableIfoodOrderActions, getIfoodOrderStatusConfig } from "./ifood-order-status-config";
import { cn } from "@/lib/utils";
import SelectInput from "@/components/Inputs/SelectInput";

type ControlIfoodOrderProps = {
	orderId: string;
	canManage: boolean;
	/**
	 * Status do pedido no nosso banco (derivado dos eventos). O `GET /orders/{id}` do iFood nem
	 * sempre traz `status` no payload — nesses casos este valor é a fonte confiável do estágio.
	 */
	fallbackStatus?: string | null;
	closeModal: () => void;
	callbacks?: {
		onSuccess?: () => void;
	};
};

const ORDER_TYPE_LABELS: Record<string, string> = {
	DELIVERY: "ENTREGA",
	TAKEOUT: "RETIRADA",
	DINE_IN: "CONSUMO NO LOCAL",
	INDOOR: "CONSUMO NO LOCAL",
};

/** Modal de detalhes do pedido iFood com as ações do ciclo de vida (confirmar, preparo, pronto, despachar, cancelar). */
export function ControlIfoodOrder({ orderId, canManage, fallbackStatus, closeModal, callbacks }: ControlIfoodOrderProps) {
	const detailsQuery = useIfoodOrderDetails({ orderId });
	const [cancellationCode, setCancellationCode] = useState<string | null>(null);

	const { mutate, isPending } = useMutation({
		mutationKey: ["ifood-order-action", orderId],
		mutationFn: postIfoodOrderAction,
		onSuccess: (data) => {
			callbacks?.onSuccess?.();
			toast.success(data.message);
			closeModal();
		},
		onError: (error) => {
			toast.error(getErrorMessage(error));
		},
	});

	const pedido = detailsQuery.data?.pedido;
	const motivosCancelamento = detailsQuery.data?.motivosCancelamento ?? [];
	const effectiveStatus = pedido?.status ?? fallbackStatus ?? null;
	const availableActions = getAvailableIfoodOrderActions(effectiveStatus);
	// Cada etapa do ciclo é um botão próprio: com status desconhecido (o iFood nem sempre devolve
	// `status` nos detalhes) todas ficam disponíveis e o próprio iFood valida a sequência.
	const lifecycleActions = availableActions.filter((action) => action !== "requestCancellation");
	const canCancel = canManage && availableActions.includes("requestCancellation");
	const statusConfig = getIfoodOrderStatusConfig(effectiveStatus);

	function handleCancellation() {
		if (!cancellationCode) return toast.error("Selecione o motivo de cancelamento do pedido.");
		mutate({ orderId, action: "requestCancellation", cancellationCode });
	}
	console.log(detailsQuery.data);
	return (
		<ResponsiveMenuV2
			menuTitle={pedido?.displayId ? `PEDIDO #${pedido.displayId}` : "PEDIDO IFOOD"}
			menuDescription="Detalhes do pedido no iFood. As ações são enviadas para a API do iFood e o status definitivo chega pelos eventos."
			menuActionButtonText="FECHAR"
			menuCancelButtonText="VOLTAR"
			closeMenu={closeModal}
			actionFunction={closeModal}
			actionIsLoading={isPending}
			stateIsLoading={detailsQuery.isLoading}
		>
			{detailsQuery.isError ? (
				<p className="text-sm text-destructive">{getErrorMessage(detailsQuery.error)}</p>
			) : pedido ? (
				<div className="flex flex-col gap-4">
					<div className="flex items-center justify-between gap-2 flex-wrap">
						<span
							className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-[0.65rem] font-semibold tracking-tight", statusConfig.className)}
						>
							{statusConfig.label}
						</span>
						<div className="flex items-center gap-2 text-xs text-muted-foreground">
							{pedido.tipo ? <span>{ORDER_TYPE_LABELS[pedido.tipo] ?? pedido.tipo}</span> : null}
							{pedido.criadoEm ? <span>{formatDateAsLocale(pedido.criadoEm, true)}</span> : null}
							{pedido.ehTeste ? <span className="font-semibold text-amber-600 dark:text-amber-400">PEDIDO DE TESTE</span> : null}
						</div>
					</div>

					<div className="flex flex-col gap-1 rounded-xl border border-border bg-card px-3 py-3">
						<h3 className="text-[0.65rem] font-medium tracking-tight uppercase text-muted-foreground">Cliente</h3>
						<p className="text-sm font-semibold">{pedido.cliente.nome ?? "NÃO IDENTIFICADO"}</p>
						{pedido.cliente.telefone ? <p className="text-xs text-muted-foreground">{pedido.cliente.telefone}</p> : null}
						{pedido.entrega.endereco ? <p className="text-xs text-muted-foreground">{pedido.entrega.endereco}</p> : null}
					</div>

					<div className="flex flex-col gap-2 rounded-xl border border-border bg-card px-3 py-3">
						<h3 className="text-[0.65rem] font-medium tracking-tight uppercase text-muted-foreground">Itens</h3>
						{pedido.itens.map((item, index) => (
							<div key={index} className="flex flex-col gap-0.5 border-b border-border/50 pb-2 last:border-b-0 last:pb-0">
								<div className="flex items-center justify-between gap-2">
									<p className="text-sm">
										<span className="font-semibold">{item.quantidade}x</span> {item.nome}
									</p>
									<span className="text-sm font-medium">{formatToMoney(item.valorTotal)}</span>
								</div>
								{item.complementos.map((complemento, complementoIndex) => (
									<p key={complementoIndex} className="pl-4 text-xs text-muted-foreground">
										+ {complemento.quantidade}x {complemento.nome}
									</p>
								))}
								{item.observacoes ? <p className="pl-4 text-xs italic text-muted-foreground">"{item.observacoes}"</p> : null}
							</div>
						))}
						<div className="flex flex-col gap-0.5 pt-1 text-xs text-muted-foreground">
							<div className="flex items-center justify-between">
								<span>Subtotal</span>
								<span>{formatToMoney(pedido.totais.subtotal)}</span>
							</div>
							<div className="flex items-center justify-between">
								<span>Taxa de entrega</span>
								<span>{formatToMoney(pedido.totais.taxaEntrega)}</span>
							</div>
							{pedido.totais.descontos > 0 ? (
								<div className="flex items-center justify-between">
									<span>Descontos</span>
									<span>-{formatToMoney(pedido.totais.descontos)}</span>
								</div>
							) : null}
							<div className="flex items-center justify-between text-sm font-bold text-foreground">
								<span>Total</span>
								<span>{formatToMoney(pedido.totais.total)}</span>
							</div>
							{pedido.pagamento.prePago > 0 ? (
								<p className="pt-1 text-[0.65rem] font-medium text-green-700 dark:text-green-400">
									PAGO ONLINE ({formatToMoney(pedido.pagamento.prePago)}) — NÃO COBRAR NA ENTREGA
								</p>
							) : null}
						</div>
					</div>

					{canManage && lifecycleActions.length > 0 ? (
						<div className="flex flex-col gap-2 rounded-xl border border-border bg-card px-3 py-3">
							<h3 className="text-[0.65rem] font-medium tracking-tight uppercase text-muted-foreground">Ações do pedido</h3>
							<div className="flex flex-wrap gap-2">
								{lifecycleActions.map((action) => (
									<Button key={action} size="sm" variant="outline" disabled={isPending} onClick={() => mutate({ orderId, action, cancellationCode: null })}>
										{IFOOD_ORDER_ACTION_BUTTON_LABELS[action]}
									</Button>
								))}
							</div>
							{!effectiveStatus ? (
								<p className="text-[0.65rem] leading-relaxed text-muted-foreground">
									O iFood não informou o estágio deste pedido. Todas as etapas estão liberadas — o próprio iFood valida a sequência e recusa ações fora de
									ordem.
								</p>
							) : null}
						</div>
					) : null}

					{canCancel ? (
						<div className="flex flex-col gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-3">
							<SelectInput
								options={motivosCancelamento.map((motivo) => ({ label: motivo.descricao, value: motivo.codigo, id: motivo.codigo }))}
								value={cancellationCode ?? undefined}
								handleChange={(value) => setCancellationCode(value)}
								label="Motivo do cancelamento"
								resetOptionLabel="Selecione o motivo do cancelamento..."
								onReset={() => setCancellationCode(null)}
							/>

							<button
								type="button"
								disabled={isPending || !cancellationCode}
								onClick={handleCancellation}
								className="w-full rounded-md border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/20 disabled:cursor-not-allowed disabled:opacity-50"
							>
								SOLICITAR CANCELAMENTO NO IFOOD
							</button>
							<p className="text-[0.65rem] text-muted-foreground">
								Cancelamentos excessivos geram penalidades no iFood e podem fechar a loja temporariamente.
							</p>
						</div>
					) : null}
				</div>
			) : null}
		</ResponsiveMenuV2>
	);
}
