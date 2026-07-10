"use client";

import type { TGetActionApprovalsOutput } from "@/app/api/action-approvals/route";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getErrorMessage } from "@/lib/errors";
import { formatDateAsLocale, formatToMoney } from "@/lib/formatting";
import { useActionApprovalsRealtime } from "@/lib/hooks/use-supabase-realtime";
import { decideActionApproval } from "@/lib/mutations/action-approvals";
import { useActionApprovals } from "@/lib/queries/action-approvals";
import { cn } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BadgeDollarSign, BadgePercent, CheckCheck, CircleUser, GitPullRequestArrow, RefreshCcw, X } from "lucide-react";
import { BsCalendarPlus } from "react-icons/bs";
import { useState } from "react";
import { toast } from "sonner";

type TActionApprovalRequest = NonNullable<TGetActionApprovalsOutput["data"]["default"]>[number];

type ActionApprovalsQueueProps = {
	orgId: string;
	canApprove: boolean;
};

/**
 * Fila de aprovações de ações pendentes (molde de TransactionRequestsQueue). Renderiza qualquer
 * tipo de solicitação a partir do `resumo` denormalizado — sem switch por payload.
 */
export function ActionApprovalsQueue({ orgId, canApprove }: ActionApprovalsQueueProps) {
	const queryClient = useQueryClient();
	const { data: requests = [], isLoading, queryKey } = useActionApprovals({ status: "PENDENTE" });

	useActionApprovalsRealtime({ orgId, queryKey });

	const { mutate: decide, isPending: isDeciding } = useMutation({
		mutationKey: ["decide-action-approval"],
		mutationFn: decideActionApproval,
		onSuccess: (data) => {
			toast.success(data.message);
			queryClient.invalidateQueries({ queryKey });
		},
		onError: (error) => {
			toast.error(getErrorMessage(error));
		},
	});

	return (
		<div className="bg-card border-border flex w-full flex-col gap-1 rounded-xl border px-3 py-4 shadow-2xs">
			<div className="flex flex-col">
				<div className="flex items-center justify-between">
					<h1 className="text-xs font-medium tracking-tight uppercase">APROVAÇÕES PENDENTES</h1>
					<GitPullRequestArrow className="w-4 h-4 min-w-4 min-h-4" />
				</div>
				<p className="text-[0.65rem] text-muted-foreground">
					Solicitações de ações que excedem os limites dos operadores (ex: descontos acima do teto no PDV).
				</p>
			</div>

			{isLoading ? (
				<div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
					<RefreshCcw className="h-4 w-4 animate-spin" /> Carregando solicitações...
				</div>
			) : requests.length === 0 ? (
				<p className="py-4 text-sm text-muted-foreground">Nenhuma solicitação pendente no momento.</p>
			) : (
				<div className="mt-4 flex flex-col gap-3">
					{requests.map((request) => (
						<ActionApprovalRequestCard
							key={request.id}
							request={request}
							canApprove={canApprove}
							disabled={isDeciding}
							onDecide={(decisao, motivo) => decide({ id: request.id, decisao, motivo })}
						/>
					))}
				</div>
			)}
		</div>
	);
}

function ActionApprovalRequestCard({
	request,
	canApprove,
	disabled,
	onDecide,
}: {
	request: TActionApprovalRequest;
	canApprove: boolean;
	disabled: boolean;
	onDecide: (decisao: "APROVAR" | "REJEITAR", motivo: string | null) => void;
}) {
	const [isRejecting, setIsRejecting] = useState(false);
	const [motivo, setMotivo] = useState("");

	return (
		<div className="bg-card border border-border flex w-full flex-col gap-2 rounded-xl px-3 py-4 shadow-2xs h-fit">
			<div className="w-full flex items-center justify-between flex-col md:flex-row gap-2">
				<div className="flex items-center gap-2 flex-wrap">
					<h1 className="text-xs font-bold tracking-tight lg:text-sm">{request.resumo.titulo}</h1>
					<div className="flex items-center gap-1">
						<CircleUser className="w-4 h-4 min-w-4 min-h-4" />
						<p className="py-0.5 text-center text-[0.65rem] font-medium italic">{request.solicitante?.nome ?? "Solicitante não identificado"}</p>
					</div>
				</div>
				<div className="flex items-center gap-3">
					<div className="flex items-center gap-1.5 text-[0.65rem] font-bold text-foreground">
						<BsCalendarPlus className="w-4 min-w-4 h-4 min-h-4" />
						<p className="text-xs font-medium tracking-tight uppercase">{formatDateAsLocale(request.dataInsercao, true)}</p>
					</div>
					<div className={cn("flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[0.65rem] bg-amber-100 text-amber-700")}>
						<p className="text-xs font-medium tracking-tight uppercase">{request.status}</p>
					</div>
				</div>
			</div>

			<div className="flex items-center gap-2 text-xs text-muted-foreground">
				<BadgePercent className="w-4 min-w-4 h-4 min-h-4" />
				<p>{request.resumo.descricao}</p>
			</div>

			<div className="w-full flex items-center justify-center lg:justify-between gap-2 flex-wrap">
				{request.resumo.valorPrincipal !== null ? (
					<div className="flex items-center gap-1.5 text-[0.65rem] font-bold text-foreground">
						<BadgeDollarSign className="w-4 min-w-4 h-4 min-h-4" />
						<p className="text-xs font-medium tracking-tight uppercase">VALOR: {formatToMoney(request.resumo.valorPrincipal)}</p>
					</div>
				) : (
					<div />
				)}
				{canApprove ? (
					isRejecting ? (
						<div className="flex items-center gap-2 flex-wrap">
							<Input
								placeholder="Motivo da rejeição (opcional)"
								className="w-56 text-xs"
								value={motivo}
								onChange={(event) => setMotivo(event.target.value)}
							/>
							<Button disabled={disabled} variant="destructive" size="sm" onClick={() => onDecide("REJEITAR", motivo || null)}>
								CONFIRMAR REJEIÇÃO
							</Button>
							<Button disabled={disabled} variant="ghost" size="sm" onClick={() => setIsRejecting(false)}>
								VOLTAR
							</Button>
						</div>
					) : (
						<div className="flex items-center gap-3">
							<Button disabled={disabled} variant="ghost-destructive" className="flex items-center gap-1.5" size="sm" onClick={() => setIsRejecting(true)}>
								<X className="w-4 min-w-4 h-4 min-h-4" />
								REJEITAR
							</Button>
							<Button disabled={disabled} variant="brand" className="flex items-center gap-1.5" size="sm" onClick={() => onDecide("APROVAR", null)}>
								<CheckCheck className="w-4 min-w-4 h-4 min-h-4" />
								APROVAR
							</Button>
						</div>
					)
				) : (
					<p className="text-[0.65rem] text-muted-foreground">Aguardando decisão de um aprovador.</p>
				)}
			</div>
		</div>
	);
}
