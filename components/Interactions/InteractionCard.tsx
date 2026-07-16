"use client";

import type { TGetCampaignInteractionsOutputItems } from "@/app/api/campaigns/interactions/route";
import ClientHoverCard from "@/components/Clients/ClientHoverCard";
import TemplatePreview from "@/components/MessageTemplates/TemplatePreview";
import { WhatsappIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getErrorMessage } from "@/lib/errors";
import { formatDateAsLocale } from "@/lib/formatting";
import { buildInteractionMessageVariables } from "@/lib/interactions/message-preview";
import { retryCampaignInteraction } from "@/lib/mutations/campaigns";
import type { TInteractionContextMetadados } from "@/lib/message-templates";
import { cn } from "@/lib/utils";
import { InteractionMetadataSchema, type TInteractionDeliveryChannelEnum, type TInteractionMetadata } from "@/schemas/interactions";
import { InteractionsSentStatusOptions } from "@/utils/select-options";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { Calendar, CalendarCheck, Code, Eye, Mail, RefreshCw, UserRound } from "lucide-react";
import { cloneElement, createContext, isValidElement, use, useMemo, type ReactNode } from "react";
import { BsCalendarPlus } from "react-icons/bs";
import { toast } from "sonner";

export type TInteractionCardInteraction = TGetCampaignInteractionsOutputItems[number];

type InteractionCardContextValue = {
	interaction: TInteractionCardInteraction;
};

const InteractionCardContext = createContext<InteractionCardContextValue | null>(null);

function useInteractionCard() {
	const context = use(InteractionCardContext);
	if (!context) {
		throw new Error("InteractionCard compound components must be used within InteractionCard.Provider.");
	}
	return context;
}

function InteractionCardProvider({ interaction, children }: { interaction: TInteractionCardInteraction; children: ReactNode }) {
	return <InteractionCardContext value={{ interaction }}>{children}</InteractionCardContext>;
}

function InteractionCardFrame({ children, className }: { children: ReactNode; className?: string }) {
	return <div className={cn("bg-card border-border flex w-full flex-col gap-2 rounded-xl border px-3 py-4 shadow-2xs", className)}>{children}</div>;
}

function InteractionCardHeader({ children }: { children: ReactNode }) {
	return <div className="w-full flex items-center justify-between gap-2">{children}</div>;
}

function InteractionCardLeading({ children, className }: { children: ReactNode; className?: string }) {
	return <div className={cn("flex items-center gap-3", className)}>{children}</div>;
}

function InteractionCardActions({ children, className }: { children: ReactNode; className?: string }) {
	return <div className={cn("flex items-center gap-3", className)}>{children}</div>;
}

function InteractionCardBody({ children }: { children: ReactNode }) {
	return <div className="w-full flex flex-col gap-0.5">{children}</div>;
}

function InteractionCardDescription() {
	const { interaction } = useInteractionCard();
	return <p className="text-xs font-medium tracking-tight text-muted-foreground">{interaction.descricao}</p>;
}

function InteractionCardFooter({ children }: { children: ReactNode }) {
	return <div className="w-full flex items-center justify-between gap-2 flex-wrap">{children}</div>;
}

function InteractionCardCampaignTitle() {
	const { interaction } = useInteractionCard();
	return <h1 className="text-xs font-bold tracking-tight lg:text-sm">{interaction.campanha?.titulo ?? "CAMPANHA NÃO ENCONTRADA"}</h1>;
}

function InteractionCardClientChip() {
	const { interaction } = useInteractionCard();
	return (
		<ClientHoverCard clientId={interaction.cliente.id}>
			<Chip.Root variant="secondary" size="md" shape="xl" className="cursor-pointer">
				<Chip.Icon>
					<UserRound className="w-4 h-4 min-w-4 min-h-4" />
				</Chip.Icon>
				<Chip.Label caps>{interaction.cliente.nome ?? "NÃO INFORMADO"}</Chip.Label>
			</Chip.Root>
		</ClientHoverCard>
	);
}

type NerdsField = {
	label: string;
	value: string;
};

type NerdsChannelBlock = {
	key: TInteractionDeliveryChannelEnum;
	label: string;
	icon: ReactNode;
	headerClassName: string;
	iconWrapperClassName: string;
	status: string | null;
	fields: NerdsField[];
	error?: string;
};

function parseInteractionMetadata(metadados: unknown): TInteractionMetadata | null {
	const parsed = InteractionMetadataSchema.safeParse(metadados);
	return parsed.success ? parsed.data : null;
}

function channelWasTouched(metadata: TInteractionMetadata | null, channel: TInteractionDeliveryChannelEnum): boolean {
	if (!metadata) return false;
	return (
		metadata.channelsAttempted?.includes(channel) === true ||
		metadata.channelsSent?.includes(channel) === true ||
		metadata.channelsSkipped?.includes(channel) === true ||
		!!metadata.channelErrors?.[channel]
	);
}

function getChannelStatusTone(status: string | null) {
	if (!status) return "muted" as const;
	const normalized = status.toUpperCase();
	if (normalized === "FALHOU" || normalized === "BLOQUEADA") return "destructive" as const;
	if (normalized === "ENVIADO" || normalized === "ENTREGUE" || normalized === "LIDO") return "success" as const;
	if (normalized === "PENDENTE") return "secondary" as const;
	return "outline" as const;
}

function buildWhatsappBlock(metadata: TInteractionMetadata | null): NerdsChannelBlock | null {
	if (!metadata) return null;

	const whatsappMessageId = metadata.whatsappMessageId ?? metadata.whatsappMensagemId;
	const hasWhatsappData =
		channelWasTouched(metadata, "WHATSAPP") ||
		!!whatsappMessageId ||
		!!metadata.chatMessageId ||
		!!metadata.clientMessageId ||
		!!metadata.jobId ||
		!!metadata.whatsappStatus;

	if (!hasWhatsappData) return null;

	const fields: NerdsField[] = [];
	if (whatsappMessageId) fields.push({ label: "Message ID", value: whatsappMessageId });
	if (metadata.chatMessageId) fields.push({ label: "Chat Message ID", value: String(metadata.chatMessageId) });
	if (metadata.clientMessageId) fields.push({ label: "Client Message ID", value: String(metadata.clientMessageId) });
	if (metadata.jobId) fields.push({ label: "Job ID", value: String(metadata.jobId) });

	return {
		key: "WHATSAPP",
		label: "WhatsApp",
		icon: <WhatsappIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />,
		headerClassName: "bg-emerald-500/10 border-emerald-500/10",
		iconWrapperClassName: "bg-emerald-500/15",
		status: metadata.whatsappStatus ?? null,
		fields,
		error: metadata.channelErrors?.WHATSAPP,
	};
}

function buildEmailBlock(metadata: TInteractionMetadata | null): NerdsChannelBlock | null {
	if (!metadata) return null;

	const hasEmailData = channelWasTouched(metadata, "EMAIL") || !!metadata.emailMessageId || !!metadata.emailStatus;

	if (!hasEmailData) return null;

	const fields: NerdsField[] = [];
	if (metadata.emailMessageId) fields.push({ label: "Message ID", value: String(metadata.emailMessageId) });

	return {
		key: "EMAIL",
		label: "E-mail",
		icon: <Mail className="h-4 w-4 text-primary" />,
		headerClassName: "bg-primary/8 border-primary/12",
		iconWrapperClassName: "bg-primary/12",
		status: metadata.emailStatus ?? null,
		fields,
		error: metadata.channelErrors?.EMAIL,
	};
}

function NerdsFieldItem({ label, value }: NerdsField) {
	return (
		<div className="flex flex-col gap-1">
			<span className="text-[0.6rem] font-extrabold tracking-[0.08em] text-muted-foreground uppercase">{label}</span>
			<div className="bg-secondary/60 rounded-lg px-2.5 py-2">
				<span className="text-[0.7rem] leading-snug font-medium break-all tabular-nums">{value}</span>
			</div>
		</div>
	);
}

function NerdsChannelCard({ block }: { block: NerdsChannelBlock }) {
	const statusTone = getChannelStatusTone(block.status);

	return (
		<div className="border-border/70 overflow-hidden rounded-xl border">
			<div className={cn("flex items-center justify-between gap-2 border-b px-3 py-2.5", block.headerClassName)}>
				<div className="flex min-w-0 items-center gap-2">
					<div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", block.iconWrapperClassName)}>{block.icon}</div>
					<span className="text-xs font-bold tracking-tight">{block.label}</span>
				</div>
				{block.status ? (
					<Chip.Root variant={statusTone} size="xs" shape="pill">
						<Chip.Label caps weight="bold">
							{block.status}
						</Chip.Label>
					</Chip.Root>
				) : (
					<Chip.Root variant="muted" size="xs" shape="pill">
						<Chip.Label caps weight="bold">
							Sem status
						</Chip.Label>
					</Chip.Root>
				)}
			</div>
			<div className="flex flex-col gap-2.5 p-3">
				{block.fields.length > 0 ? (
					block.fields.map((field) => <NerdsFieldItem key={field.label} {...field} />)
				) : (
					<p className="text-[0.7rem] text-muted-foreground">Nenhum identificador de envio registrado para este canal.</p>
				)}
				{block.error ? (
					<div className="bg-destructive/8 border-destructive/15 rounded-lg border px-2.5 py-2">
						<span className="text-[0.6rem] font-extrabold tracking-[0.08em] text-destructive uppercase">Erro</span>
						<p className="mt-1 text-[0.7rem] leading-snug text-destructive">{block.error}</p>
					</div>
				) : null}
			</div>
		</div>
	);
}

function InteractionCardMessagePreview({ className }: { className?: string }) {
	const { interaction } = useInteractionCard();
	const templateContent = interaction.campanha?.whatsappTemplate?.conteudo ?? null;

	const variables = useMemo(
		() =>
			buildInteractionMessageVariables({
				client: interaction.cliente,
				contextMetadados: (interaction.metadados ?? undefined) as TInteractionContextMetadados | undefined,
			}),
		[interaction.cliente, interaction.metadados],
	);

	if (!templateContent) return null;

	return (
		<HoverCard openDelay={200} closeDelay={100}>
			<HoverCardTrigger asChild>
				<Button
					type="button"
					size="icon"
					variant="ghost"
					className={cn("h-7 w-7 text-muted-foreground hover:text-foreground", className)}
					aria-label="Preview da mensagem"
				>
					<Eye className="h-4 w-4" />
				</Button>
			</HoverCardTrigger>
			<HoverCardContent
				className="w-[360px] overflow-auto p-2 max-h-[70vh] scrollbar-thin scrollbar-track-primary/10 scrollbar-thumb-primary/30"
				align="end"
				side="bottom"
			>
				<TemplatePreview content={templateContent} variables={variables} compact />
			</HoverCardContent>
		</HoverCard>
	);
}

function InteractionCardDataForNerds({ className }: { className?: string }) {
	const { interaction } = useInteractionCard();
	const metadata = parseInteractionMetadata(interaction.metadados);
	const channelBlocks = [buildWhatsappBlock(metadata), buildEmailBlock(metadata)].filter((block): block is NerdsChannelBlock => block !== null);

	return (
		<HoverCard openDelay={200} closeDelay={100}>
			<HoverCardTrigger asChild>
				<Button
					type="button"
					size="icon"
					variant="ghost"
					className={cn("h-7 w-7 text-muted-foreground hover:text-foreground", className)}
					aria-label="Data for nerds"
				>
					<Code className="h-4 w-4" />
				</Button>
			</HoverCardTrigger>
			<HoverCardContent className="max-h-[70vh] w-88 overflow-auto p-0" align="end" side="bottom">
				<div className="border-border bg-secondary/40 border-b px-4 py-3">
					<div className="flex items-center gap-2">
						<div className="bg-background flex h-7 w-7 items-center justify-center rounded-lg border border-border/70 shadow-xs">
							<Code className="h-3.5 w-3.5 text-muted-foreground" />
						</div>
						<div className="flex flex-col">
							<span className="text-[0.6rem] font-extrabold tracking-[0.08em] text-muted-foreground uppercase">Debug</span>
							<span className="text-sm leading-tight font-bold tracking-tight">Data for nerds</span>
						</div>
					</div>
				</div>

				<div className="flex flex-col gap-3 p-3">
					<NerdsFieldItem label="Interação" value={interaction.id} />

					{channelBlocks.length > 0 ? (
						channelBlocks.map((block) => <NerdsChannelCard key={block.key} block={block} />)
					) : (
						<div className="border-border/70 bg-secondary/30 rounded-xl border px-3 py-4 text-center">
							<p className="text-[0.7rem] text-muted-foreground">Nenhum dado de canal disponível para esta interação.</p>
						</div>
					)}
				</div>
			</HoverCardContent>
		</HoverCard>
	);
}

function InteractionCardSentStatus() {
	const { interaction } = useInteractionCard();
	const sentStatusConfig = useMemo(() => {
		return InteractionsSentStatusOptions.find((status) => status.value === interaction.statusEnvio);
	}, [interaction.statusEnvio]);

	if (!sentStatusConfig) return null;

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Chip.Root variant="ghost" size="sm" shape="pill" className={cn(sentStatusConfig.className, "border-none")}>
						<Chip.Icon>
							{isValidElement<{ className?: string }>(sentStatusConfig.icon)
								? cloneElement(sentStatusConfig.icon, {
										className: cn("w-4 h-4 min-w-4 min-h-4", sentStatusConfig.icon.props.className),
									})
								: sentStatusConfig.icon}
						</Chip.Icon>
						<Chip.Label caps weight="bold">
							{sentStatusConfig.label}
						</Chip.Label>
					</Chip.Root>
				</TooltipTrigger>
				<TooltipContent>
					<p className="text-xs block py-0.5 text-center italic font-medium leading-tight">
						{sentStatusConfig.message(interaction.erroEnvio || undefined)}
					</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

function InteractionCardRetryButton() {
	const { interaction } = useInteractionCard();
	const queryClient = useQueryClient();
	const { mutate: handleRetryInteraction, isPending: retryIsPending } = useMutation({
		mutationKey: ["retry-campaign-interaction", interaction.id],
		mutationFn: async () => await retryCampaignInteraction({ interactionId: interaction.id }),
		onSuccess: async (response) => {
			// O endpoint responde 200 mesmo quando o reenvio não foi executado (reenviada: false)
			if (response.data.reenviada) toast.success(response.message);
			else toast.error(response.message);
			await queryClient.invalidateQueries({ queryKey: ["campaign-interactions-logs"] });
		},
		onError: (error) => {
			toast.error(getErrorMessage(error));
		},
	});

	if (interaction.statusEnvio !== "FALHOU" && interaction.statusEnvio !== "BLOQUEADA") return null;

	return (
		<Button
			type="button"
			size="sm"
			variant="ghost"
			onClick={() => handleRetryInteraction()}
			disabled={retryIsPending}
			aria-label="Reenviar interação"
			className="h-7 gap-1.5 px-2.5 text-xs font-bold text-muted-foreground hover:text-foreground"
		>
			<RefreshCw
				className={cn("w-4 h-4 min-w-4 min-h-4", {
					"animate-spin": retryIsPending,
				})}
			/>
			<span className="hidden sm:inline">{retryIsPending ? "REENVIANDO..." : "REENVIAR"}</span>
		</Button>
	);
}

function InteractionCardCreatedAt() {
	const { interaction } = useInteractionCard();
	return (
		<div className="flex items-center gap-2">
			<div className="flex items-center gap-1.5">
				<BsCalendarPlus className="w-4 h-4 min-w-4 min-h-4" />
				<h2 className="py-0.5 text-center text-[0.65rem] font-medium italic">DATA DE CRIAÇÃO: {formatDateAsLocale(interaction.dataInsercao, true)}</h2>
			</div>
		</div>
	);
}

function InteractionCardScheduleStatus() {
	const { interaction } = useInteractionCard();
	const scheduleDateText = interaction.agendamentoDataReferencia ? dayjs(interaction.agendamentoDataReferencia).format("DD/MM/YYYY") : "Não definido";
	const scheduleBlockText = interaction.agendamentoBlocoReferencia ?? "--:--";
	const executionDateText = interaction.dataExecucao ? formatDateAsLocale(interaction.dataExecucao, true) : "Não executada";

	if (interaction.dataExecucao) {
		return (
			<Chip.Root variant="success" size="sm" shape="pill">
				<Chip.Icon>
					<CalendarCheck className="w-4 h-4 min-w-4 min-h-4" />
				</Chip.Icon>
				<Chip.Label className="text-xs block py-0.5 text-center italic font-medium leading-tight">{executionDateText}</Chip.Label>
			</Chip.Root>
		);
	}

	return (
		<Chip.Root variant="secondary" size="sm" shape="pill" className="px-2 py-1 sm:px-3 sm:py-1.5">
			<Chip.Icon>
				<Calendar className="w-4 h-4 min-w-4 min-h-4" />
			</Chip.Icon>
			<Chip.Label className="text-xs block py-0.5 text-center italic font-medium leading-tight">
				AGENDADO PARA: {scheduleDateText} ({scheduleBlockText})
			</Chip.Label>
		</Chip.Root>
	);
}

export const InteractionCard = {
	Provider: InteractionCardProvider,
	Frame: InteractionCardFrame,
	Body: InteractionCardBody,
	Header: InteractionCardHeader,
	Leading: InteractionCardLeading,
	Actions: InteractionCardActions,
	Description: InteractionCardDescription,
	Footer: InteractionCardFooter,
	CampaignTitle: InteractionCardCampaignTitle,
	ClientChip: InteractionCardClientChip,
	MessagePreview: InteractionCardMessagePreview,
	DataForNerds: InteractionCardDataForNerds,
	SentStatus: InteractionCardSentStatus,
	RetryButton: InteractionCardRetryButton,
	CreatedAt: InteractionCardCreatedAt,
	ScheduleStatus: InteractionCardScheduleStatus,
};
