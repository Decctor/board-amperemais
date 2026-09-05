"use client";
import { ResponsiveMenuAnimatedBody } from "@/components/Utils/ResponsiveMenuAnimatedBody";
import { LoadingButton } from "@/components/loading-button";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage } from "@/lib/errors";
import { createInteraction, updateCommunicationPause } from "@/lib/mutations/interactions";
import { cn } from "@/lib/utils";
import type { TInteractionChannelEnum } from "@/schemas/enums";
import { useMutation } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useState } from "react";
import { toast } from "sonner";
import { INTERACTION_CHANNEL_META, REGISTER_CHANNELS } from "./utils";

const FOLLOW_UP_PRESETS = [
	{ label: "Amanhã", getDate: () => dayjs().add(1, "day") },
	{ label: "Em 3 dias", getDate: () => dayjs().add(3, "day") },
	{ label: "Próxima semana", getDate: () => dayjs().add(7, "day") },
];

type RegisterInteractionMenuProps = {
	cliente: { id: string; nome: string };
	sellerId: string | null;
	closeModal: () => void;
	callbacks?: {
		onSuccess?: () => void;
	};
};

export function RegisterInteractionMenu({ cliente, sellerId, closeModal, callbacks }: RegisterInteractionMenuProps) {
	const [canal, setCanal] = useState<TInteractionChannelEnum>("WHATSAPP");
	const [nota, setNota] = useState("");
	const [followUpPresetIndex, setFollowUpPresetIndex] = useState<number | null>(null);
	const [pausarComunicacao, setPausarComunicacao] = useState(false);

	const { mutate, isPending } = useMutation({
		mutationKey: ["create-interaction", cliente.id],
		mutationFn: async () => {
			const followUpPreset = followUpPresetIndex !== null ? FOLLOW_UP_PRESETS[followUpPresetIndex] : null;
			const created = await createInteraction({
				clienteId: cliente.id,
				vendedorId: sellerId,
				canal,
				direcao: "SAIDA",
				descricao: nota || null,
				dataInteracao: null,
				planejada: false,
				followUpEm: followUpPreset ? followUpPreset.getDate().hour(10).minute(0).second(0).millisecond(0).toDate() : null,
				followUpDescricao: null,
			});
			if (pausarComunicacao) {
				await updateCommunicationPause({ clienteId: cliente.id, retomar: false });
			}
			return created;
		},
		onSuccess: (data) => {
			toast.success(data.message);
			if (followUpPresetIndex !== null) toast.info("Retorno agendado.");
			if (pausarComunicacao) toast.info("Comunicação pausada — campanhas também não vão abordar.");
			callbacks?.onSuccess?.();
			closeModal();
		},
		onError: (error) => {
			toast.error(getErrorMessage(error));
		},
	});

	return (
		<ResponsiveMenu.Root
			open
			onOpenChange={(open) => {
				if (!open) closeModal();
			}}
		>
			<ResponsiveMenu.Content dialogVariant="sm" drawerVariant="md">
				<ResponsiveMenu.Header>
					<ResponsiveMenu.Title>REGISTRAR CONTATO</ResponsiveMenu.Title>
					<ResponsiveMenu.Description>{`Registre o contato com ${cliente.nome}. Isso reinicia o relógio de cadência e alimenta a linha do tempo do cliente.`}</ResponsiveMenu.Description>
				</ResponsiveMenu.Header>
				<ResponsiveMenuAnimatedBody stateKey="content" className="overflow-x-hidden overflow-y-auto">
					<div className="flex w-full flex-col gap-4">
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
						<div className="flex flex-col gap-1.5">
							<h3 className="text-xs font-bold tracking-tight uppercase text-muted-foreground">Nota (opcional)</h3>
							<Textarea
								value={nota}
								onChange={(event) => setNota(event.target.value)}
								placeholder="Ex.: confirmou que passa sábado para buscar a encomenda"
								rows={3}
							/>
						</div>
						<div className="flex flex-col gap-1.5">
							<h3 className="text-xs font-bold tracking-tight uppercase text-muted-foreground">Agendar retorno (opcional)</h3>
							<div className="flex flex-wrap gap-1.5">
								{FOLLOW_UP_PRESETS.map((preset, index) => (
									<Button
										key={preset.label}
										type="button"
										variant={followUpPresetIndex === index ? "default" : "outline"}
										size="sm"
										className={cn(followUpPresetIndex !== index && "text-muted-foreground")}
										onClick={() => setFollowUpPresetIndex(followUpPresetIndex === index ? null : index)}
									>
										{preset.label}
									</Button>
								))}
							</div>
						</div>
						<label className="flex items-start gap-2 rounded-lg border border-border px-3 py-2.5 cursor-pointer">
							<Checkbox checked={pausarComunicacao} onCheckedChange={(checked) => setPausarComunicacao(checked === true)} className="mt-0.5" />
							<span className="flex flex-col gap-0.5">
								<span className="text-sm font-semibold">O cliente pediu pausa nas comunicações</span>
								<span className="text-xs text-muted-foreground">Pausa por 90 dias — vale para campanhas automáticas e para a sua fila.</span>
							</span>
						</label>
					</div>
				</ResponsiveMenuAnimatedBody>
				<ResponsiveMenu.Footer>
					<ResponsiveMenu.Close variant="outline">CANCELAR</ResponsiveMenu.Close>
					<LoadingButton loading={isPending} onClick={() => mutate()}>
						REGISTRAR
					</LoadingButton>
				</ResponsiveMenu.Footer>
			</ResponsiveMenu.Content>
		</ResponsiveMenu.Root>
	);
}
