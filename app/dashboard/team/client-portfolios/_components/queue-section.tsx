"use client";

import type { TGetClientPortfolioOutput } from "@/app/api/client-portfolios/route";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { getErrorMessage } from "@/lib/errors";
import { formatDateAsLocale, formatToMoney } from "@/lib/formatting";
import { createInteraction } from "@/lib/mutations/interactions";
import { useClientInteractions } from "@/lib/queries/client-portfolios";
import { cn } from "@/lib/utils";
import { getRFMConfigByLabel } from "@/utils/rfm";
import { useMutation } from "@tanstack/react-query";
import dayjs from "dayjs";
import {
	AlarmClock,
	Cake,
	ChevronDown,
	ClipboardCheck,
	PhoneIcon,
	ListChecks,
	MessageCircle,
	Megaphone,
	RefreshCw,
	Sparkles,
	Tag,
	TrendingDown,
	UserRound,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { RegisterInteractionMenu } from "./register-interaction-menu";
import { INTERACTION_CHANNEL_META, buildWhatsappLink, getClientInitials } from "./utils";
import { WhatsappIcon } from "@/components/icons";
import Image from "next/image";

type TQueueItem = TGetClientPortfolioOutput["data"]["fila"][number];

const REASON_ICONS: Record<TQueueItem["motivos"][number]["tipo"], React.ReactNode> = {
	DEBITO_CADENCIA: <AlarmClock className="h-3.5 w-3.5 min-h-3.5 min-w-3.5" />,
	CICLO_ESTOURADO: <RefreshCw className="h-3.5 w-3.5 min-h-3.5 min-w-3.5" />,
	MUDANCA_SEGMENTO: <TrendingDown className="h-3.5 w-3.5 min-h-3.5 min-w-3.5" />,
	ANIVERSARIO: <Cake className="h-3.5 w-3.5 min-h-3.5 min-w-3.5" />,
	TOP_CLIENTE_FRIO: <Sparkles className="h-3.5 w-3.5 min-h-3.5 min-w-3.5" />,
	SEGUNDA_COMPRA: <Sparkles className="h-3.5 w-3.5 min-h-3.5 min-w-3.5" />,
};

function SegmentChip({ segmento }: { segmento: string | null }) {
	if (!segmento) return null;
	const config = getRFMConfigByLabel(segmento);
	return (
		<span className={cn("rounded-full px-2 py-0.5 text-[0.6rem] font-bold tracking-wide", config.backgroundCollor, config.textCollor)}>{segmento}</span>
	);
}

function ClientRelationshipTimeline({ clienteId }: { clienteId: string }) {
	const { data, isLoading } = useClientInteractions({ clienteId, limit: 6 });

	if (isLoading) return <p className="text-xs text-muted-foreground">Carregando linha do tempo...</p>;
	const interactions = data?.interactions ?? [];
	if (interactions.length === 0) return <p className="text-xs text-muted-foreground">Nenhuma interação registrada com esse cliente ainda.</p>;

	return (
		<div className="flex flex-col gap-1.5">
			<h4 className="text-[0.65rem] font-bold tracking-tight uppercase text-muted-foreground">Relacionamento recente</h4>
			{interactions.map((interaction) => {
				const isCampaign = !!interaction.campanhaId;
				const channelMeta = interaction.canal ? INTERACTION_CHANNEL_META[interaction.canal] : null;
				const anchorDate = interaction.dataInteracao ?? interaction.dataInsercao;
				return (
					<div key={interaction.id} className="flex items-start gap-2 text-xs">
						<span className="mt-0.5 text-muted-foreground">
							{isCampaign ? <Megaphone className="h-3.5 w-3.5" /> : (channelMeta?.icon ?? <MessageCircle className="h-3.5 w-3.5" />)}
						</span>
						<div className="flex min-w-0 flex-1 flex-col">
							<span className="font-semibold truncate">
								{isCampaign ? `Campanha: ${interaction.campanha?.titulo ?? interaction.titulo}` : interaction.titulo}
								{interaction.status === "PLANEJADA" ? " (agendada)" : ""}
							</span>
							{interaction.descricao ? <span className="text-muted-foreground truncate">{interaction.descricao}</span> : null}
						</div>
						<span className="shrink-0 text-muted-foreground">{formatDateAsLocale(anchorDate)}</span>
					</div>
				);
			})}
		</div>
	);
}

function OfferItem({ label, nome, imagemUrl }: { label: string; nome: string; imagemUrl: string | null }) {
	const showImg = !!imagemUrl;
	return (
		<div className="flex items-center gap-2 text-xs font-medium">
			{showImg ? (
				<Image
					src={imagemUrl ?? undefined}
					alt=""
					loading="lazy"
					className="h-4 w-4 min-h-4 min-w-4 shrink-0 rounded-[4px] border border-border/60 object-cover"
				/>
			) : (
				<span className="flex h-4 w-4 min-h-4 min-w-4 shrink-0 items-center justify-center rounded-[4px] bg-muted text-muted-foreground">
					<Tag className="h-2.5 w-2.5" />
				</span>
			)}
			<span className="shrink-0 text-muted-foreground">{label}:</span>
			<span className="truncate font-semibold">{nome}</span>
		</div>
	);
}

function QueueCard({ item, vendedorId, onRegistered }: { item: TQueueItem; vendedorId: string | null; onRegistered: () => void }) {
	const [expanded, setExpanded] = useState(false);
	const [registerModalOpen, setRegisterModalOpen] = useState(false);
	const [handled, setHandled] = useState(false);

	const whatsappLink = buildWhatsappLink(item.cliente.telefone);
	const callLink = item.cliente.telefone ? `tel:${item.cliente.telefone}` : null;
	const { mutate: snooze, isPending: snoozePending } = useMutation({
		mutationKey: ["snooze-approach", item.cliente.id],
		// "Depois" cria uma interação PLANEJADA para amanhã: suprime o cliente da fila até lá.
		mutationFn: () =>
			createInteraction({
				clienteId: item.cliente.id,
				vendedorId,
				canal: "OUTRO",
				direcao: "SAIDA",
				descricao: "Abordagem adiada pela fila da carteira.",
				dataInteracao: dayjs().add(1, "day").hour(9).minute(0).second(0).millisecond(0).toDate(),
				planejada: true,
				followUpEm: null,
				followUpDescricao: null,
			}),
		onSuccess: () => {
			toast.success("Movida para amanhã — o cliente sai da fila até lá.");
			setHandled(true);
			onRegistered();
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	return (
		<div
			className={cn("bg-card border-border flex w-full flex-col gap-2.5 rounded-xl border px-3 py-3 shadow-2xs transition-all", handled && "opacity-50")}
		>
			<div className="flex items-center gap-2.5">
				<span className="flex h-9 w-9 min-h-9 min-w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
					{getClientInitials(item.cliente.nome)}
				</span>
				<div className="flex min-w-0 flex-1 flex-col gap-0.5">
					<div className="flex flex-wrap items-center gap-1.5">
						<h3 className="text-sm font-extrabold tracking-tight uppercase truncate">{item.cliente.nome}</h3>
						<SegmentChip segmento={item.cliente.segmento} />
					</div>
					<p className="text-xs text-muted-foreground">
						{item.cliente.totalCompras} compra{item.cliente.totalCompras === 1 ? "" : "s"} · LTV {formatToMoney(item.cliente.valorTotalCompras)}
						{item.cliente.ultimaCompraData ? ` · última compra em ${formatDateAsLocale(item.cliente.ultimaCompraData)}` : ""}
					</p>
				</div>
				<Button
					variant="ghost"
					size="icon"
					className="h-8 w-8"
					aria-label={`Ver contexto de ${item.cliente.nome}`}
					onClick={() => setExpanded((v) => !v)}
				>
					<ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
				</Button>
			</div>

			<div className="flex flex-col gap-1">
				<h4 className="text-[0.6rem] font-bold tracking-wide uppercase text-muted-foreground">Por que agora</h4>
				{item.motivos.map((motivo) => (
					<div key={motivo.tipo} className="flex items-start gap-1.5 text-xs font-medium">
						<span className="mt-0.5 text-muted-foreground">{REASON_ICONS[motivo.tipo]}</span>
						<span>{motivo.texto}</span>
					</div>
				))}
				{item.ultimoContato ? (
					<p className="text-[0.7rem] text-muted-foreground">
						Último contato: {item.ultimoContato.origem === "CAMPANHA" ? "campanha" : "você"} em {formatDateAsLocale(item.ultimoContato.data)}
						{item.ultimoContato.statusEnvio === "LIDO" ? " (lida)" : item.ultimoContato.statusEnvio === "ENTREGUE" ? " (entregue)" : ""}
					</p>
				) : null}
			</div>

			{item.oferta.produtoRecompraNome || item.oferta.produtoSugeridoNome ? (
				<div className="flex flex-col gap-1.5">
					<h4 className="text-[0.6rem] font-bold tracking-wide uppercase text-muted-foreground">O que oferecer</h4>
					<div className="flex flex-col gap-1.5">
						{item.oferta.produtoRecompraNome ? (
							<OfferItem label="Recompra" nome={item.oferta.produtoRecompraNome} imagemUrl={item.oferta.produtoRecompraImagemUrl} />
						) : null}
						{item.oferta.produtoSugeridoNome ? (
							<OfferItem label="Sugestão" nome={item.oferta.produtoSugeridoNome} imagemUrl={item.oferta.produtoSugeridoImagemUrl} />
						) : null}
					</div>
				</div>
			) : null}

			{!handled ? (
				<div className="flex flex-wrap items-center gap-1.5">
					{whatsappLink ? (
						<Button asChild size="sm" variant={"brand"} className="gap-1.5">
							<a href={whatsappLink} target="_blank" rel="noopener noreferrer">
								<WhatsappIcon className="h-3.5 w-3.5" /> ABORDAR VIA WHATSAPP
							</a>
						</Button>
					) : null}
					{callLink ? (
						<Button asChild size="sm" variant="brand-secondary" className="gap-1.5">
							<a href={callLink} target="_blank" rel="noopener noreferrer">
								<PhoneIcon className="h-3.5 w-3.5" /> ABORDAR VIA LIGAÇÃO
							</a>
						</Button>
					) : null}
					<Button variant="outline" size="sm" className="gap-1.5" onClick={() => setRegisterModalOpen(true)}>
						<ClipboardCheck className="h-3.5 w-3.5" /> REGISTRAR
					</Button>
					<Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => snooze()} disabled={snoozePending}>
						DEPOIS
					</Button>
				</div>
			) : (
				<p className="text-xs font-bold text-green-600 uppercase tracking-wide">Tratada ✓</p>
			)}

			{expanded ? (
				<div className="border-t border-border pt-2.5">
					<ClientRelationshipTimeline clienteId={item.cliente.id} />
				</div>
			) : null}

			{registerModalOpen ? (
				<RegisterInteractionMenu
					cliente={{ id: item.cliente.id, nome: item.cliente.nome }}
					vendedorId={vendedorId}
					closeModal={() => setRegisterModalOpen(false)}
					callbacks={{
						onSuccess: () => {
							setHandled(true);
							onRegistered();
						},
					}}
				/>
			) : null}
		</div>
	);
}

type QueueSectionProps = {
	fila: TGetClientPortfolioOutput["data"]["fila"];
	totalEmDebito: number;
	carteiraTotal: number;
	vendedorId: string | null;
	onRegistered: () => void;
};

export function QueueSection({ fila, totalEmDebito, carteiraTotal, vendedorId, onRegistered }: QueueSectionProps) {
	return (
		<SectionWrapper
			title="Fila de abordagens"
			icon={<ListChecks className="h-4 w-4 min-h-4 min-w-4" />}
			actions={
				totalEmDebito > fila.length ? (
					<span className="text-[0.65rem] font-semibold text-muted-foreground">
						{totalEmDebito} em débito de contato · mostrando os {fila.length} prioritários
					</span>
				) : null
			}
		>
			{fila.length === 0 ? (
				<Empty>
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<UserRound />
						</EmptyMedia>
						<EmptyTitle>Fila em dia!</EmptyTitle>
						<EmptyDescription>
							{carteiraTotal === 0
								? "Sua carteira ainda está vazia — ela é montada automaticamente a partir das suas vendas recorrentes."
								: "Nenhum cliente da sua carteira está em débito de comunicação hoje."}
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			) : (
				<div className="flex flex-col gap-2.5">
					{fila.map((item) => (
						<QueueCard key={item.cliente.id} item={item} vendedorId={vendedorId} onRegistered={onRegistered} />
					))}
				</div>
			)}
		</SectionWrapper>
	);
}
