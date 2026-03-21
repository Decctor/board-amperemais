"use client";

import type { TGetPoiTransactionRequestsOutput } from "@/app/api/point-of-interaction/transaction-requests/management/route";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/errors";
import { formatDateAsLocale, formatToMoney } from "@/lib/formatting";
import { usePoiTransactionRequestsRealtime } from "@/lib/hooks/use-supabase-realtime";
import { approvePoiTransactionRequest, rejectPoiTransactionRequest } from "@/lib/mutations/poi-transaction-requests";
import { usePoiTransactionRequests } from "@/lib/queries/poi-transaction-requests";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { GitPullRequestArrow, RefreshCcw, ShieldCheck, ShieldX, Smartphone } from "lucide-react";
import { toast } from "sonner";

type PointOfInteractionTransactionRequestsQueueProps = {
	orgId: string;
};

export function PointOfInteractionTransactionRequestsQueue({ orgId }: PointOfInteractionTransactionRequestsQueueProps) {
	const queryClient = useQueryClient();
	const { data: requests = [], isLoading, queryKey } = usePoiTransactionRequests();

	usePoiTransactionRequestsRealtime({
		orgId,
		queryKey,
	});

	const { mutate: approveRequest, isPending: isApproving } = useMutation({
		mutationFn: approvePoiTransactionRequest,
		onSuccess: () => {
			toast.success("Solicitação aprovada com sucesso.");
			queryClient.invalidateQueries({ queryKey });
			queryClient.invalidateQueries({ queryKey: ["sales"] });
		},
		onError: (error) => {
			toast.error(getErrorMessage(error));
		},
	});

	const { mutate: rejectRequest, isPending: isRejecting } = useMutation({
		mutationFn: (requestId: string) => rejectPoiTransactionRequest({ requestId }),
		onSuccess: () => {
			toast.success("Solicitação rejeitada.");
			queryClient.invalidateQueries({ queryKey });
		},
		onError: (error) => {
			toast.error(getErrorMessage(error));
		},
	});

	return (
		<div className="bg-card border-primary/20 flex w-full flex-col gap-1 rounded-xl border px-3 py-4 shadow-2xs md:h-full md:min-h-0">
			<div className="flex flex-col">
				<div className="flex items-center justify-between">
					<h1 className="text-xs font-medium tracking-tight uppercase">SOLICITAÇÕES</h1>
					<div className="flex items-center gap-2">
						<GitPullRequestArrow className="w-4 h-4 min-w-4 min-h-4" />
					</div>
				</div>
				<p className="text-[0.65rem] text-muted-foreground">Solicitacoes enviadas de transações recebidas pelo ponto de interação.</p>
			</div>

			{isLoading ? (
				<div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
					<RefreshCcw className="h-4 w-4 animate-spin" /> Carregando solicitações...
				</div>
			) : requests.length === 0 ? (
				<p className="py-4 text-sm text-muted-foreground">Nenhuma solicitação pendente no momento.</p>
			) : (
				<div className="mt-4 grid gap-3 md:flex-1 md:min-h-0 md:overflow-y-auto md:pr-1">
					{requests.map((request) => (
						<PoiTransactionRequestCard
							key={request.id}
							request={request}
							onApprove={() => approveRequest(request.id)}
							onReject={() => rejectRequest(request.id)}
							disabled={isApproving || isRejecting}
						/>
					))}
				</div>
			)}
		</div>
	);
}

function PoiTransactionRequestCard({
	request,
	onApprove,
	onReject,
	disabled,
}: {
	request: TGetPoiTransactionRequestsOutput["data"]["requests"][number];
	onApprove: () => void;
	onReject: () => void;
	disabled: boolean;
}) {
	const resumo = request.resumoSolicitacao as {
		cliente?: { nome?: string; telefone?: string };
		venda?: { valorBruto?: number; valorResgate?: number; valorFinal?: number; modo?: string };
	};

	return (
		<div className="bg-card border-primary/20 flex w-full flex-col gap-1 rounded-xl border px-3 py-4 shadow-2xs">
			<div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
				<div className="space-y-2">
					<div className="flex flex-wrap items-center gap-2 text-xs">
						<span className="rounded-full bg-amber-100 px-2.5 py-1 font-bold text-amber-700">{request.status}</span>
						<span className="rounded-full bg-secondary px-2.5 py-1 font-medium text-muted-foreground">
							{formatDateAsLocale(request.dataInsercao, true)}
						</span>
						{resumo?.venda?.modo ? <span className="rounded-full bg-primary/10 px-2.5 py-1 font-bold text-primary">{resumo.venda.modo}</span> : null}
					</div>
					<div>
						<h3 className="text-sm font-black uppercase tracking-tight">{request.cliente?.nome ?? resumo?.cliente?.nome ?? "Cliente não identificado"}</h3>
						<p className="text-xs text-muted-foreground">{request.cliente?.telefone ?? resumo?.cliente?.telefone ?? "Telefone não informado"}</p>
					</div>
					<div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
						<span>
							Valor bruto: <strong className="text-foreground">{formatToMoney(resumo?.venda?.valorBruto ?? 0)}</strong>
						</span>
						<span>
							Resgate: <strong className="text-foreground">{formatToMoney(resumo?.venda?.valorResgate ?? 0)}</strong>
						</span>
						<span>
							Total final: <strong className="text-foreground">{formatToMoney(resumo?.venda?.valorFinal ?? 0)}</strong>
						</span>
					</div>
				</div>
				<div className="flex flex-col gap-2 sm:flex-row">
					<Button size="sm" className="gap-2" disabled={disabled} onClick={onApprove}>
						<ShieldCheck className="h-4 w-4" /> Aprovar
					</Button>
					<Button size="sm" variant="outline" className="gap-2" disabled={disabled} onClick={onReject}>
						<ShieldX className="h-4 w-4" /> Rejeitar
					</Button>
				</div>
			</div>
		</div>
	);
}
