"use client";
import { ResponsiveMenuAnimatedBody } from "@/components/Utils/ResponsiveMenuAnimatedBody";
import { LoadingButton } from "@/components/loading-button";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";

import DateInput from "@/components/Inputs/DateInput";
import SelectClientInput from "@/components/Inputs/SelectClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage } from "@/lib/errors";
import { formatDateForInputValue, formatDateOnInputChange } from "@/lib/formatting";
import { createInteraction } from "@/lib/mutations/interactions";
import { cn } from "@/lib/utils";
import { type TInteractionState, useInternalInteractionState } from "@/state-hooks/use-internal-interaction-state";
import { useMutation } from "@tanstack/react-query";
import dayjs from "dayjs";
import { CalendarCheck, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { INTERACTION_CHANNEL_META, REGISTER_CHANNELS } from "./channel-meta";

/**
 * Horário efetivo do agendamento: 9h do dia escolhido; se já passou (hoje depois
 * das 9h), próxima hora cheia — o servidor exige data estritamente futura para PLANEJADA.
 */
function getScheduleDateTime(day: Date) {
	const nineAm = dayjs(day).hour(9).minute(0).second(0).millisecond(0);
	if (nineAm.isAfter(dayjs())) return nineAm.toDate();
	return dayjs().add(1, "hour").minute(0).second(0).millisecond(0).toDate();
}

type NewInteractionProps = {
	sellerId: string | null;
	/** Popula o estado inicial (cliente, data, modo, canal, descrição). */
	initialState?: Partial<TInteractionState>;
	closeModal: () => void;
	callbacks?: {
		onSuccess?: () => void;
	};
};

export function NewInteraction({ sellerId, initialState, closeModal, callbacks }: NewInteractionProps) {
	const { state, updateInteraction } = useInternalInteractionState({ initialState });

	const { mutate, isPending } = useMutation({
		mutationKey: ["create-interaction"],
		mutationFn: async (input: { cliente: NonNullable<TInteractionState["cliente"]>; dataInteracao: Date | null }) =>
			createInteraction({
				clienteId: input.cliente.id,
				vendedorId: sellerId,
				canal: state.canal,
				direcao: "SAIDA",
				descricao: state.descricao || null,
				dataInteracao: input.dataInteracao,
				planejada: state.modo === "AGENDAR",
				followUpEm: null,
				followUpDescricao: null,
			}),
		onSuccess: (data) => {
			toast.success(data.message);
			callbacks?.onSuccess?.();
			closeModal();
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	function handleSubmit() {
		if (!state.cliente) {
			toast.error("Selecione um cliente para a interação.");
			return;
		}
		if (state.modo === "EXECUTADO") {
			// Registro de contato já realizado: o servidor usa "agora" como data.
			mutate({ cliente: state.cliente, dataInteracao: null });
			return;
		}
		if (!state.dataInteracao) {
			toast.error("Escolha a data do agendamento.");
			return;
		}
		if (dayjs(state.dataInteracao).isBefore(dayjs(), "day")) {
			toast.error("Não é possível agendar uma interação para uma data passada.");
			return;
		}
		mutate({ cliente: state.cliente, dataInteracao: getScheduleDateTime(state.dataInteracao) });
	}

	return (
		<ResponsiveMenu.Root
			open
			onOpenChange={(open) => {
				if (!open) closeModal();
			}}
		>
			<ResponsiveMenu.Content dialogVariant="sm" drawerVariant="md">
				<ResponsiveMenu.Header>
					<ResponsiveMenu.Title>NOVA INTERAÇÃO</ResponsiveMenu.Title>
					<ResponsiveMenu.Description>Agende uma abordagem para um cliente ou registre um contato já executado.</ResponsiveMenu.Description>
				</ResponsiveMenu.Header>
				<ResponsiveMenuAnimatedBody stateKey="content" className="overflow-x-hidden overflow-y-auto">
					<div className="flex w-full flex-col gap-4">
						{/* Modo */}
						<div className="flex flex-col gap-1.5">
							<h3 className="text-xs font-bold tracking-tight uppercase text-muted-foreground">O que deseja fazer?</h3>
							<div className="flex flex-wrap gap-1.5">
								<Button
									type="button"
									variant={state.modo === "AGENDAR" ? "default" : "outline"}
									size="sm"
									className={cn("gap-1.5", state.modo !== "AGENDAR" && "text-muted-foreground")}
									onClick={() => updateInteraction({ modo: "AGENDAR" })}
								>
									<CalendarCheck className="h-3.5 w-3.5" />
									Agendar abordagem
								</Button>
								<Button
									type="button"
									variant={state.modo === "EXECUTADO" ? "default" : "outline"}
									size="sm"
									className={cn("gap-1.5", state.modo !== "EXECUTADO" && "text-muted-foreground")}
									onClick={() => updateInteraction({ modo: "EXECUTADO" })}
								>
									<CheckCircle2 className="h-3.5 w-3.5" />
									Registrar contato executado
								</Button>
							</div>
						</div>

						{/* Cliente */}
						<SelectClientInput
							label="Cliente"
							labelClassName="text-xs font-bold tracking-tight uppercase text-muted-foreground"
							resetOptionLabel="Selecione um cliente..."
							value={state.cliente}
							handleChange={(client) => updateInteraction({ cliente: { id: client.id, nome: client.nome, telefone: client.telefone } })}
							onReset={() => updateInteraction({ cliente: null })}
						/>

						{/* Data (só para agendamento) */}
						{state.modo === "AGENDAR" ? (
							<DateInput
								label="DATA DO AGENDAMENTO"
								labelClassName="text-xs font-bold tracking-tight uppercase text-muted-foreground"
								value={formatDateForInputValue(state.dataInteracao)}
								handleChange={(value) => updateInteraction({ dataInteracao: formatDateOnInputChange(value, "date") })}
							/>
						) : null}

						{/* Canal */}
						<div className="flex flex-col gap-1.5">
							<h3 className="text-xs font-bold tracking-tight uppercase text-muted-foreground">Canal</h3>
							<div className="flex flex-wrap gap-1.5">
								{REGISTER_CHANNELS.map((channel) => (
									<Button
										key={channel}
										type="button"
										variant={state.canal === channel ? "default" : "outline"}
										size="sm"
										className={cn("gap-1.5", state.canal !== channel && "text-muted-foreground")}
										onClick={() => updateInteraction({ canal: channel })}
									>
										{INTERACTION_CHANNEL_META[channel].icon}
										{INTERACTION_CHANNEL_META[channel].label}
									</Button>
								))}
							</div>
						</div>

						{/* Nota */}
						<div className="flex flex-col gap-1.5">
							<h3 className="text-xs font-bold tracking-tight uppercase text-muted-foreground">Nota (opcional)</h3>
							<Textarea
								value={state.descricao}
								onChange={(event) => updateInteraction({ descricao: event.target.value })}
								placeholder={
									state.modo === "AGENDAR" ? "Ex.: ligar para oferecer a reposição do pedido" : "Ex.: confirmou que passa sábado para buscar a encomenda"
								}
								rows={3}
							/>
						</div>
					</div>
				</ResponsiveMenuAnimatedBody>
				<ResponsiveMenu.Footer>
					<ResponsiveMenu.Close variant="outline">CANCELAR</ResponsiveMenu.Close>
					<LoadingButton loading={isPending} onClick={handleSubmit}>
						{state.modo === "AGENDAR" ? "AGENDAR" : "REGISTRAR"}
					</LoadingButton>
				</ResponsiveMenu.Footer>
			</ResponsiveMenu.Content>
		</ResponsiveMenu.Root>
	);
}
