"use client";

import type { TGetClientPortfolioOutput } from "@/app/api/client-portfolios/route";
import { Button } from "@/components/ui/button";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { getErrorMessage } from "@/lib/errors";
import { resolveInteraction } from "@/lib/mutations/interactions";
import { cn } from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";
import dayjs from "dayjs";
import { Check, Clock, X } from "lucide-react";
import { toast } from "sonner";

type FollowUpsProps = {
	followUps: TGetClientPortfolioOutput["data"]["followUps"];
	onResolved: () => void;
};

export function FollowUps({ followUps, onResolved }: FollowUpsProps) {
	const { mutate: resolve, isPending } = useMutation({
		mutationKey: ["resolve-follow-up"],
		mutationFn: resolveInteraction,
		onSuccess: (data) => {
			toast.success(data.message);
			onResolved();
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	return (
		<SectionWrapper title="Follow-ups de hoje" icon={<Clock className="h-4 w-4 min-h-4 min-w-4" />}>
			{followUps.length === 0 ? (
				<p className="text-xs text-muted-foreground">Nenhum retorno agendado para hoje.</p>
			) : (
				<div className="flex flex-col">
					{followUps.map((followUp) => (
						<div key={followUp.id} className="flex items-start gap-2.5 border-b border-border py-2.5 last:border-b-0 last:pb-0 first:pt-0">
							<span
								className={cn(
									"shrink-0 rounded-md bg-secondary px-2 py-1 text-[0.7rem] font-bold tabular-nums",
									followUp.atrasado && "bg-destructive/10 text-destructive",
								)}
							>
								{followUp.atrasado ? `${formatOverdue(followUp.dataInteracao)}` : dayjs(followUp.dataInteracao).format("HH:mm")}
							</span>
							<div className="flex min-w-0 flex-1 flex-col gap-0.5">
								<p className="text-sm font-semibold leading-tight">{followUp.cliente?.nome ?? followUp.titulo}</p>
								<p className="text-xs text-muted-foreground truncate">{followUp.descricao ?? followUp.titulo}</p>
							</div>
							<div className="flex shrink-0 items-center gap-0.5">
								<Button
									variant="ghost"
									size="icon"
									className="h-7 w-7 text-green-600 hover:text-green-700"
									aria-label="Marcar como realizado"
									disabled={isPending}
									onClick={() => resolve({ id: followUp.id, resolution: "REALIZADA", descricao: null })}
								>
									<Check className="h-4 w-4" />
								</Button>
								<Button
									variant="ghost"
									size="icon"
									className="h-7 w-7 text-muted-foreground"
									aria-label="Cancelar follow-up"
									disabled={isPending}
									onClick={() => resolve({ id: followUp.id, resolution: "CANCELADA", descricao: null })}
								>
									<X className="h-4 w-4" />
								</Button>
							</div>
						</div>
					))}
				</div>
			)}
		</SectionWrapper>
	);
}

function formatOverdue(date: Date | string | null) {
	if (!date) return "Atrasado";
	return `Atrasado ${dayjs(date).format("DD/MM")}`;
}
