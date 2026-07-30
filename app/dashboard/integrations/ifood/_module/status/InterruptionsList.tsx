"use client";

import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/errors";
import { formatDateAsLocale } from "@/lib/formatting";
import type { TIfoodInterruptionDTO } from "@/lib/integrations/ifood/merchant-types";
import { deleteIfoodInterruption } from "@/lib/mutations/ifood";
import { useMutation } from "@tanstack/react-query";
import { CirclePause, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { IfoodSectionEmpty } from "../shared/IfoodSectionEmpty";

type InterruptionsListProps = {
	merchantId: string;
	interruptions: TIfoodInterruptionDTO[];
	canManage: boolean;
	onChanged: () => void;
};

/** Lista de pausas programadas da loja, com remoção (reabre a loja no período). */
export function InterruptionsList({ merchantId, interruptions, canManage, onChanged }: InterruptionsListProps) {
	const { mutate: removeInterruption, isPending } = useMutation({
		mutationKey: ["delete-ifood-interruption", merchantId],
		mutationFn: deleteIfoodInterruption,
		onSuccess: (data) => {
			toast.success(data.message);
			onChanged();
		},
		onError: (error) => {
			toast.error(getErrorMessage(error));
		},
	});

	if (interruptions.length === 0) {
		return <IfoodSectionEmpty icon={CirclePause} message="Nenhuma pausa programada. A loja segue os horários de funcionamento configurados." />;
	}

	return (
		<div className="flex w-full flex-col gap-2">
			{interruptions.map((interruption) => (
				<div key={interruption.id} className="flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
					<div className="flex min-w-0 flex-col gap-0.5">
						<span className="truncate text-sm font-medium text-foreground">{interruption.descricao ?? "Pausa programada"}</span>
						<span className="text-xs text-muted-foreground">
							{interruption.inicio ? formatDateAsLocale(interruption.inicio, true) : "—"} até{" "}
							{interruption.fim ? formatDateAsLocale(interruption.fim, true) : "—"}
						</span>
					</div>
					{canManage ? (
						<Button
							variant="ghost-destructive"
							size="sm"
							disabled={isPending}
							onClick={() => removeInterruption({ merchantId, interruptionId: interruption.id })}
							title="Remover pausa"
						>
							<Trash2 className="h-4 w-4" />
						</Button>
					) : null}
				</div>
			))}
		</div>
	);
}
