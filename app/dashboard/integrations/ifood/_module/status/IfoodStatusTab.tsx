"use client";

import ErrorComponent from "@/components/Layouts/ErrorComponent";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useIfoodInterruptions, useIfoodMerchantStatus } from "@/lib/queries/ifood";
import { useQueryClient } from "@tanstack/react-query";
import { CirclePause } from "lucide-react";
import { useState } from "react";
import { getIfoodOperationLabel, getIfoodStatusConfig } from "../shared/ifood-status-config";
import { InterruptionsList } from "./InterruptionsList";
import { NewIfoodInterruption } from "./NewIfoodInterruption";
import { OpeningHoursEditor } from "./OpeningHoursEditor";

type IfoodStatusTabProps = {
	merchantId: string | null;
	canManage: boolean;
};

/** Aba de status e horários: disponibilidade por operação, pausas programadas e horários. */
export function IfoodStatusTab({ merchantId, canManage }: IfoodStatusTabProps) {
	const queryClient = useQueryClient();
	const statusQuery = useIfoodMerchantStatus({ merchantId });
	const interruptionsQuery = useIfoodInterruptions({ merchantId });
	const [newInterruptionIsOpen, setNewInterruptionIsOpen] = useState(false);

	if (!merchantId) return null;

	return (
		<div className="flex w-full flex-col gap-3">
			{statusQuery.isLoading ? (
				<LoadingComponent />
			) : statusQuery.isError ? (
				<ErrorComponent msg={statusQuery.error instanceof Error ? statusQuery.error.message : "Erro ao carregar o status da loja."} />
			) : (
				<div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
					{(statusQuery.data ?? []).map((operacao, index) => {
						const config = getIfoodStatusConfig(operacao.estado, operacao.disponivel);
						return (
							<div key={`${operacao.operacao}-${index}`} className="bg-card border-border flex w-full flex-col gap-2 rounded-xl border px-3 py-4 shadow-2xs">
								<div className="flex w-full items-center justify-between gap-2">
									<h3 className="text-xs font-medium tracking-tight uppercase">{getIfoodOperationLabel(operacao.operacao)}</h3>
									<span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-semibold", config.className)}>{config.label}</span>
								</div>
								{operacao.mensagem?.titulo ? (
									<div className="flex flex-col gap-0.5">
										<p className="text-sm font-medium text-foreground">{operacao.mensagem.titulo}</p>
										{operacao.mensagem.subtitulo ? <p className="text-xs text-muted-foreground">{operacao.mensagem.subtitulo}</p> : null}
									</div>
								) : null}
								{operacao.validacoes.filter((validacao) => validacao.titulo).length > 0 ? (
									<div className="flex flex-col gap-1 border-t border-border pt-2">
										{operacao.validacoes
											.filter((validacao) => validacao.titulo)
											.map((validacao, validationIndex) => (
												<p key={validationIndex} className="text-xs text-muted-foreground">
													• {validacao.titulo}
												</p>
											))}
									</div>
								) : null}
							</div>
						);
					})}
				</div>
			)}

			<div className="flex w-full flex-col gap-3">
				<div className="flex w-full items-center justify-between gap-2">
					<h3 className="text-xs font-medium tracking-tight uppercase">Pausas programadas</h3>
					{canManage ? (
						<Button variant="outline" size="sm" onClick={() => setNewInterruptionIsOpen(true)}>
							<CirclePause className="h-4 w-4" />
							PAUSAR LOJA
						</Button>
					) : null}
				</div>
				{interruptionsQuery.isLoading ? (
					<LoadingComponent />
				) : interruptionsQuery.isError ? (
					<ErrorComponent
						msg={interruptionsQuery.error instanceof Error ? interruptionsQuery.error.message : "Erro ao carregar as pausas programadas."}
					/>
				) : (
					<InterruptionsList
						merchantId={merchantId}
						interruptions={interruptionsQuery.data ?? []}
						canManage={canManage}
						onChanged={() => {
							queryClient.invalidateQueries({ queryKey: interruptionsQuery.queryKey });
							queryClient.invalidateQueries({ queryKey: ["ifood-merchant-status", merchantId] });
						}}
					/>
				)}
			</div>

			<OpeningHoursEditor merchantId={merchantId} canManage={canManage} />

			{newInterruptionIsOpen ? (
				<NewIfoodInterruption
					merchantId={merchantId}
					closeModal={() => setNewInterruptionIsOpen(false)}
					callbacks={{
						onSuccess: () => {
							queryClient.invalidateQueries({ queryKey: interruptionsQuery.queryKey });
							queryClient.invalidateQueries({ queryKey: ["ifood-merchant-status", merchantId] });
						},
					}}
				/>
			) : null}
		</div>
	);
}
