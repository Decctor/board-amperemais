"use client";

import type { TTabOrderRequestListItem } from "@/app/api/tabs/order-requests/route";
import SelectInput from "@/components/Inputs/SelectInput";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/errors";
import { decideTabOrderRequest } from "@/lib/mutations/tabs";
import { useServiceSettings, useTabOrderRequests, useTabs } from "@/lib/queries/tabs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Ban, Check, Inbox } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

function formatRequestAge(from: Date | string) {
	const minutes = Math.max(0, Math.floor((Date.now() - new Date(from).getTime()) / 60000));
	return minutes < 60 ? `${minutes}min` : `${Math.floor(minutes / 60)}h`;
}

function RequestCard({ request, onDecided }: { request: TTabOrderRequestListItem; onDecided: () => void }) {
	const { data: settings } = useServiceSettings();
	const { data: openTabs } = useTabs();
	const [selectedTabId, setSelectedTabId] = useState<string | null>(null);

	const { mutate, isPending } = useMutation({
		mutationKey: ["decide-tab-order-request", request.id],
		mutationFn: decideTabOrderRequest,
		onSuccess: (data) => {
			toast.success(data.message);
			onDecided();
		},
		onError: (error) => {
			toast.error(getErrorMessage(error));
			onDecided();
		},
	});

	// O QR do ponto nao escolhe silenciosamente entre varias comandas: quando a
	// solicitacao nao tem tab e o modo nao resolve a implicita, o operador seleciona.
	const autoResolvesTab = settings?.contas.identificacao === "AUTOMATICA" && settings?.contas.maxAbertasPorPonto === 1;
	const needsTabSelection = !request.tabId && !(request.servicePointId && autoResolvesTab);
	const etiqueta = request.tab?.codigo
		? `Comanda ${request.tab.codigo}`
		: (request.servicePoint?.rotulo ?? "Solicitação");

	return (
		<div className="flex flex-col gap-2 rounded-xl border border-amber-500/40 bg-amber-500/5 px-3.5 py-3">
			<div className="flex items-center justify-between">
				<span className="text-sm font-bold tracking-tight uppercase">{etiqueta}</span>
				<span className="text-xs text-muted-foreground">
					{formatRequestAge(request.dataInsercao)}
					{request.status === "ERRO" ? " · ERRO" : ""}
				</span>
			</div>
			<div className="flex flex-col gap-0.5">
				{request.payloadSolicitacao.itens.map((item, index) => (
					<span key={`${request.id}-${index}`} className="text-xs">
						{item.quantidade}x {item.nome}
					</span>
				))}
				{request.payloadSolicitacao.observacoes ? (
					<span className="text-[0.7rem] text-muted-foreground">{request.payloadSolicitacao.observacoes}</span>
				) : null}
				{request.status === "ERRO" && request.erroProcessamento ? <span className="text-[0.7rem] text-destructive">{request.erroProcessamento}</span> : null}
			</div>
			{needsTabSelection ? (
				<SelectInput
					label="CONTA DE DESTINO"
					value={selectedTabId}
					options={(openTabs ?? []).map((tab) => ({
						id: tab.id,
						value: tab.id,
						label: tab.servicePoint?.rotulo ? `${tab.servicePoint.rotulo}${tab.codigo ? ` · ${tab.codigo}` : ""}` : (tab.codigo ?? tab.id.slice(0, 6)),
					}))}
					resetOptionLabel="SELECIONE"
					handleChange={(value) => setSelectedTabId(value)}
					onReset={() => setSelectedTabId(null)}
				/>
			) : null}
			<div className="flex items-center gap-2">
				<Button
					size="sm"
					variant="secondary"
					className="flex items-center gap-1.5"
					disabled={isPending || (needsTabSelection && !selectedTabId)}
					onClick={() => mutate({ requestId: request.id, acao: "APROVAR", tabId: selectedTabId })}
				>
					<Check className="h-3.5 w-3.5" />
					APROVAR
				</Button>
				<Button
					size="sm"
					variant="ghost"
					className="flex items-center gap-1.5 text-destructive"
					disabled={isPending}
					onClick={() => mutate({ requestId: request.id, acao: "REJEITAR", motivoRejeicao: null })}
				>
					<Ban className="h-3.5 w-3.5" />
					REJEITAR
				</Button>
			</div>
		</div>
	);
}

export default function OrderRequestsSection() {
	const queryClient = useQueryClient();
	const { data: requests, queryKey } = useTabOrderRequests();

	if (!requests || requests.length === 0) return null;

	function refresh() {
		queryClient.invalidateQueries({ queryKey });
		queryClient.invalidateQueries({ queryKey: ["tabs"] });
		queryClient.invalidateQueries({ queryKey: ["preparation-tickets"] });
	}

	return (
		<div className="flex flex-col gap-2">
			<h2 className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-tight text-muted-foreground">
				<Inbox className="h-4 w-4" />
				Solicitações de pedido ({requests.length})
			</h2>
			<div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
				{requests.map((request) => (
					<RequestCard key={request.id} request={request} onDecided={refresh} />
				))}
			</div>
		</div>
	);
}
