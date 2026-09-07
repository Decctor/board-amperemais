"use client";

import ErrorComponent from "@/components/Layouts/ErrorComponent";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/ui/section";
import { useIfoodInterruptions } from "@/lib/queries/ifood";
import { useQueryClient } from "@tanstack/react-query";
import { CirclePause, Store } from "lucide-react";
import { useState } from "react";
import { IfoodSectionEmpty } from "../shared/IfoodSectionEmpty";
import { IfoodSectionLoading } from "../shared/IfoodSectionLoading";
import { InterruptionsList } from "./InterruptionsList";
import { NewIfoodInterruption } from "./NewIfoodInterruption";

type IfoodInterruptionsSectionProps = {
	merchantId: string | null;
	canManage: boolean;
};

/**
 * Seção de pausas programadas da loja. Criar ou remover uma pausa muda a disponibilidade da loja,
 * então o status da operação também é invalidado.
 */
export function IfoodInterruptionsSection({ merchantId, canManage }: IfoodInterruptionsSectionProps) {
	const queryClient = useQueryClient();
	const { data: interrupcoes, isLoading, isError, error, queryKey } = useIfoodInterruptions({ merchantId });
	const [newInterruptionIsOpen, setNewInterruptionIsOpen] = useState(false);

	function invalidateInterruptions() {
		queryClient.invalidateQueries({ queryKey });
		queryClient.invalidateQueries({ queryKey: ["ifood-merchant-status", merchantId] });
	}

	return (
		<Section.Root>
			<Section.Header>
				<Section.Icon>
					<CirclePause className="w-4 h-4 min-w-4 min-h-4" />
				</Section.Icon>
				<Section.Title>PAUSAS PROGRAMADAS</Section.Title>
				<Section.Actions>
					{canManage && merchantId ? (
						<Button variant="ghost" size="xs" onClick={() => setNewInterruptionIsOpen(true)} className="flex items-center gap-1">
							<CirclePause className="w-4 h-4 min-w-4 min-h-4" />
							PAUSAR LOJA
						</Button>
					) : null}
				</Section.Actions>
			</Section.Header>
			<Section.Body>
				{!merchantId ? (
					<IfoodSectionEmpty icon={Store} message="Selecione uma loja para gerenciar as pausas programadas." />
				) : isLoading ? (
					<IfoodSectionLoading rows={2} />
				) : isError ? (
					<ErrorComponent msg={error instanceof Error ? error.message : "Erro ao carregar as pausas programadas."} />
				) : (
					<InterruptionsList merchantId={merchantId} interruptions={interrupcoes ?? []} canManage={canManage} onChanged={invalidateInterruptions} />
				)}

				{newInterruptionIsOpen && merchantId ? (
					<NewIfoodInterruption
						merchantId={merchantId}
						closeModal={() => setNewInterruptionIsOpen(false)}
						callbacks={{ onSuccess: invalidateInterruptions }}
					/>
				) : null}
			</Section.Body>
		</Section.Root>
	);
}
