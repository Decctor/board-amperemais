"use client";

import SelectClientInput from "@/components/Inputs/SelectClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import ResponsiveMenuV2 from "@/components/Utils/ResponsiveMenuV2";
import { getErrorMessage } from "@/lib/errors";
import { createInteraction } from "@/lib/mutations/interactions";
import { cn } from "@/lib/utils";
import type { TInteractionChannelEnum } from "@/schemas/enums";
import { useMutation } from "@tanstack/react-query";
import dayjs, { type Dayjs } from "dayjs";
import { CalendarCheck, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { INTERACTION_CHANNEL_META, REGISTER_CHANNELS } from "./utils";

type TSelectedClient = { id: string; nome: string; telefone: string };

/**
 * Horário do agendamento: 9h do dia clicado; se já passou (hoje depois das 9h),
 * usa a próxima hora cheia — o servidor exige data estritamente futura para PLANEJADA.
 */
function getScheduleDate(day: Dayjs) {
	const nineAm = day.hour(9).minute(0).second(0).millisecond(0);
	if (nineAm.isAfter(dayjs())) return nineAm.toDate();
	return dayjs().add(1, "hour").minute(0).second(0).millisecond(0).toDate();
}

type CreateAgendaInteractionMenuProps = {
	date: Dayjs;
	vendedorId: string | null;
	closeModal: () => void;
	callbacks?: {
		onSuccess?: () => void;
	};
};

export function CreateAgendaInteractionMenu({ date, vendedorId, closeModal, callbacks }: CreateAgendaInteractionMenuProps) {
	const isToday = date.isSame(dayjs(), "day");
	const [mode, setMode] = useState<"agendar" | "executado">("agendar");
	const [selectedClient, setSelectedClient] = useState<TSelectedClient | null>(null);
	const [canal, setCanal] = useState<TInteractionChannelEnum>("WHATSAPP");
	const [nota, setNota] = useState("");

	const { mutate, isPending } = useMutation({
		mutationKey: ["create-agenda-interaction", date.format("YYYY-MM-DD")],
		mutationFn: async (client: TSelectedClient) =>
			createInteraction({
				clienteId: client.id,
				vendedorId,
				canal,
				direcao: "SAIDA",
				descricao: nota || null,
				// Executado: agora (só é oferecido para hoje). Agendado: 9h do dia (ou próxima hora cheia).
				dataInteracao: mode === "executado" ? null : getScheduleDate(date),
				planejada: mode === "agendar",
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
		if (!selectedClient) {
			toast.error("Selecione um cliente para a interação.");
			return;
		}
		mutate(selectedClient);
	}

	const dateLabel = date.format("DD/MM");

	return (
		<ResponsiveMenuV2
			menuTitle="NOVA INTERAÇÃO"
			menuDescription={`Crie uma interação para o dia ${dateLabel}: agende uma abordagem ou registre um contato já executado.`}
			menuActionButtonText={mode === "agendar" ? "AGENDAR" : "REGISTRAR"}
			menuCancelButtonText="CANCELAR"
			actionFunction={handleSubmit}
			actionIsLoading={isPending}
			stateIsLoading={false}
			stateError={null}
			closeMenu={closeModal}
			dialogVariant="sm"
			drawerVariant="md"
		>
			<div className="flex w-full flex-col gap-4">
				{/* Modo */}
				<div className="flex flex-col gap-1.5">
					<h3 className="text-xs font-bold tracking-tight uppercase text-muted-foreground">O que deseja fazer?</h3>
					<div className="flex flex-wrap gap-1.5">
						<Button
							type="button"
							variant={mode === "agendar" ? "default" : "outline"}
							size="sm"
							className={cn("gap-1.5", mode !== "agendar" && "text-muted-foreground")}
							onClick={() => setMode("agendar")}
						>
							<CalendarCheck className="h-3.5 w-3.5" />
							Agendar para {dateLabel}
						</Button>
						<Button
							type="button"
							variant={mode === "executado" ? "default" : "outline"}
							size="sm"
							className={cn("gap-1.5", mode !== "executado" && "text-muted-foreground")}
							disabled={!isToday}
							title={isToday ? undefined : "Só é possível registrar como executado no dia de hoje."}
							onClick={() => setMode("executado")}
						>
							<CheckCircle2 className="h-3.5 w-3.5" />
							Marcar como executado
						</Button>
					</div>
				</div>

				{/* Cliente */}
				<SelectClientInput
					label="Cliente"
					labelClassName="text-xs font-bold tracking-tight uppercase text-muted-foreground"
					resetOptionLabel="Selecione um cliente..."
					value={selectedClient}
					handleChange={(client) => setSelectedClient({ id: client.id, nome: client.nome, telefone: client.telefone })}
					onReset={() => setSelectedClient(null)}
				/>

				{/* Canal */}
				<div className="flex flex-col gap-1.5">
					<h3 className="text-xs font-bold tracking-tight uppercase text-muted-foreground">Canal</h3>
					<div className="flex flex-wrap gap-1.5">
						{REGISTER_CHANNELS.map((channel) => (
							<Button
								key={channel}
								type="button"
								variant={canal === channel ? "default" : "outline"}
								size="sm"
								className={cn("gap-1.5", canal !== channel && "text-muted-foreground")}
								onClick={() => setCanal(channel)}
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
						value={nota}
						onChange={(event) => setNota(event.target.value)}
						placeholder={mode === "agendar" ? "Ex.: ligar para oferecer a reposição do pedido" : "Ex.: confirmou que passa sábado para buscar a encomenda"}
						rows={3}
					/>
				</div>
			</div>
		</ResponsiveMenuV2>
	);
}
