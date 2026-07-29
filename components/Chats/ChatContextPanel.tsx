"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getWhatsappWindowDisplay } from "@/lib/chats/whatsapp-window-status";
import { getErrorMessage } from "@/lib/errors";
import { formatDateAsLocale, formatToMoney, formatToPhone } from "@/lib/formatting";
import { useChatClientContext, type TChatMessagesPage } from "@/lib/queries/chats";
import { cn } from "@/lib/utils";
import { ArrowDownLeft, ArrowUpRight, ExternalLink, Mail, MapPin, Smartphone, Sparkles, User } from "lucide-react";
import { ChatAssignmentActions } from "./ChatAssignmentActions";

/**
 * Contexto lateral do atendimento.
 *
 * Três abas porque são três perguntas diferentes que quem atende faz, e misturá-las numa
 * coluna só obrigaria a rolar para achar qualquer uma:
 * "quem responde e em que estado?" / "quem é esse cliente?" / "como esta conversa anda?".
 *
 * A aba Cliente carrega sob demanda: a maioria dos atendimentos nunca a abre, e o
 * contexto comercial custa quatro queries.
 */

type ChatContextPanelProps = {
	chatId: string;
	chat: TChatMessagesPage["chat"];
	currentUserId: string;
	className?: string;
};

const RESPONSIBLE_LABELS = {
	USUARIO: "Responsável",
	AGENTE: "Automação",
	EXTERNO: "Atendido pelo telefone",
	NAO_ATRIBUIDO: "Sem responsável",
} as const;

const WINDOW_TONE = {
	aberta: "text-muted-foreground",
	gateway: "text-muted-foreground",
	expirando: "text-brand",
	expirada: "text-destructive",
} as const;

function formatRelative(date: Date | string | null | undefined) {
	if (!date) return "—";
	const value = new Date(date);
	const minutes = Math.floor((Date.now() - value.getTime()) / 60_000);
	if (minutes < 1) return "agora";
	if (minutes < 60) return `há ${minutes}min`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `há ${hours}h`;
	return `há ${Math.floor(hours / 24)}d`;
}

/** Linha rótulo/valor. É a unidade de leitura do painel inteiro. */
function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div className="flex items-baseline justify-between gap-3 py-1.5">
			<span className="shrink-0 text-[11px] font-extrabold uppercase tracking-[0.08em] text-muted-foreground">{label}</span>
			<span className="min-w-0 truncate text-right text-xs">{children}</span>
		</div>
	);
}

function SectionTitle({ children }: { children: React.ReactNode }) {
	return <h3 className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-muted-foreground">{children}</h3>;
}

function AttendanceTab({ chatId, chat, currentUserId }: Omit<ChatContextPanelProps, "className">) {
	const atendimento = chat.atendimentoAtivo;
	const janela = getWhatsappWindowDisplay({ expiracao: chat.whatsappJanelaDataExpiracao, tipoConexao: chat.conexaoTipo });

	return (
		<div className="flex flex-col gap-4">
			<div>
				<SectionTitle>Ações</SectionTitle>
				<ChatAssignmentActions chatId={chatId} atendimento={atendimento} currentUserId={currentUserId} />
			</div>

			<div className="border-t border-border pt-3">
				<SectionTitle>Atendimento</SectionTitle>
				<InfoRow label="Responsável">
					{atendimento?.responsavelTipo === "USUARIO" ? (
						(atendimento.responsavelUsuario?.nome ?? "Atribuído")
					) : (
						<span className="inline-flex items-center gap-1">
							{atendimento?.responsavelTipo === "AGENTE" && <Sparkles className="h-3 w-3" />}
							{atendimento?.responsavelTipo === "EXTERNO" && <Smartphone className="h-3 w-3" />}
							{RESPONSIBLE_LABELS[atendimento?.responsavelTipo ?? "NAO_ATRIBUIDO"]}
						</span>
					)}
				</InfoRow>
				<InfoRow label="Desde">{formatRelative(atendimento?.dataAtribuicao)}</InfoRow>
				{atendimento?.transferenciaMotivo && <InfoRow label="Motivo">{atendimento.transferenciaMotivo}</InfoRow>}
				{atendimento?.resumo && (
					<div className="mt-1 rounded-lg bg-muted/60 p-2 text-xs leading-snug">{atendimento.resumo}</div>
				)}
			</div>

			<div className="border-t border-border pt-3">
				<SectionTitle>Canal</SectionTitle>
				<InfoRow label="Conexão">{chat.conexaoTipo === "INTERNAL_GATEWAY" ? "Gateway interno" : "WhatsApp Business"}</InfoRow>
				<InfoRow label="Janela">
					<span className={WINDOW_TONE[janela.variant]}>{janela.label}</span>
				</InfoRow>
				{janela.variant === "expirada" && (
					<p className="mt-1 text-[11px] leading-snug text-muted-foreground">
						A janela reabre quando o cliente responder. Até lá, só um template aprovado sai daqui.
					</p>
				)}
			</div>
		</div>
	);
}

function ClientTab({ chat }: { chat: TChatMessagesPage["chat"] }) {
	const { data, isPending, isError, error } = useChatClientContext({ clienteId: chat.clienteId });

	if (isPending) return <p className="py-6 text-center text-xs text-muted-foreground">Carregando contexto do cliente...</p>;
	if (isError) return <p className="py-6 text-center text-xs text-destructive">{getErrorMessage(error)}</p>;

	const { cliente, historico, ultimasCompras, cashback } = data;

	return (
		<div className="flex flex-col gap-4">
			<div>
				<div className="flex items-start justify-between gap-2">
					<div className="flex min-w-0 flex-col">
						<span className="truncate text-sm font-bold">{cliente.nome}</span>
						{cliente.telefone && <span className="text-xs text-muted-foreground">{formatToPhone(cliente.telefone)}</span>}
					</div>
					{cliente.analiseRFMTitulo && (
						<span className="shrink-0 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
							{cliente.analiseRFMTitulo}
						</span>
					)}
				</div>
				<div className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">
					{cliente.email && (
						<span className="flex items-center gap-1.5 truncate">
							<Mail className="h-3 w-3 shrink-0" />
							{cliente.email}
						</span>
					)}
					{(cliente.localizacaoCidade || cliente.localizacaoEstado) && (
						<span className="flex items-center gap-1.5 truncate">
							<MapPin className="h-3 w-3 shrink-0" />
							{[cliente.localizacaoCidade, cliente.localizacaoEstado].filter(Boolean).join(" / ")}
						</span>
					)}
				</div>
			</div>

			{/* O âmbar é a cor de fidelidade do sistema; cashback é literalmente o momento
			    dela. É o único destaque colorido do painel, o que o mantém raro. */}
			{cashback.saldoDisponivel > 0 && (
				<div className="rounded-lg border border-brand/35 bg-brand/15 p-3">
					<span className="text-[11px] font-extrabold uppercase tracking-[0.08em]">Cashback disponível</span>
					<p className="text-lg font-extrabold tabular-nums">{formatToMoney(cashback.saldoDisponivel)}</p>
				</div>
			)}

			<div className="border-t border-border pt-3">
				<SectionTitle>Histórico</SectionTitle>
				<InfoRow label="Compras">
					<span className="tabular-nums">{historico.qtdeCompras}</span>
				</InfoRow>
				<InfoRow label="Total">
					<span className="tabular-nums">{formatToMoney(historico.valorTotalCompras)}</span>
				</InfoRow>
				<InfoRow label="Ticket médio">
					<span className="tabular-nums">{formatToMoney(historico.ticketMedio)}</span>
				</InfoRow>
				<InfoRow label="Última compra">{historico.ultimaCompraData ? formatDateAsLocale(historico.ultimaCompraData) : "—"}</InfoRow>
			</div>

			{ultimasCompras.length > 0 && (
				<div className="border-t border-border pt-3">
					<SectionTitle>Últimas compras</SectionTitle>
					<ul className="flex flex-col gap-2">
						{ultimasCompras.map((compra) => (
							<li key={compra.id}>
								{/* Nova aba: quem abre a venda está no meio de um atendimento e
								    perder a conversa para navegar seria pior que o ganho. */}
								<a
									href={`/dashboard/commercial/sales/${compra.id}`}
									target="_blank"
									rel="noopener noreferrer"
									className="flex flex-col gap-0.5 rounded-lg bg-muted/60 p-2 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
								>
									<div className="flex items-baseline justify-between gap-2 text-xs">
										<span className="flex items-center gap-1 text-muted-foreground">
											{formatDateAsLocale(compra.dataVenda, true)}
											<ExternalLink className="h-3 w-3 shrink-0" />
											<span className="sr-only">Abrir venda em nova aba</span>
										</span>
										<span className="font-bold tabular-nums">{formatToMoney(compra.valorTotal)}</span>
									</div>
									<span className="truncate text-[11px] text-muted-foreground">
										{compra.itens.map((item) => item.produtoNome).join(", ") || "Sem itens"}
									</span>
								</a>
							</li>
						))}
					</ul>
				</div>
			)}
		</div>
	);
}

function ActivityTab({ chat }: { chat: TChatMessagesPage["chat"] }) {
	const atendimento = chat.atendimentoAtivo;
	const primeiraResposta =
		atendimento?.dataUltimaEntradaCliente && atendimento?.dataPrimeiraResposta
			? Math.max(0, Math.round((new Date(atendimento.dataPrimeiraResposta).getTime() - new Date(atendimento.dataUltimaEntradaCliente).getTime()) / 60_000))
			: null;

	return (
		<div className="flex flex-col gap-4">
			<div>
				<SectionTitle>Fluxo da conversa</SectionTitle>
				<InfoRow label="Não lidas">
					<span className="tabular-nums">{chat.mensagensNaoLidas ?? 0}</span>
				</InfoRow>
				<InfoRow label="Última entrada">
					<span className="inline-flex items-center gap-1">
						<ArrowDownLeft className="h-3 w-3 text-muted-foreground" />
						{formatRelative(chat.ultimaMensagemEntradaData)}
					</span>
				</InfoRow>
				<InfoRow label="Última saída">
					<span className="inline-flex items-center gap-1">
						<ArrowUpRight className="h-3 w-3 text-muted-foreground" />
						{formatRelative(chat.ultimaMensagemSaidaData)}
					</span>
				</InfoRow>
				<InfoRow label="Última leitura">{formatRelative(chat.ultimaLeituraData)}</InfoRow>
			</div>

			<div className="border-t border-border pt-3">
				<SectionTitle>Tempos do atendimento</SectionTitle>
				{/* Minutos até a primeira resposta é a métrica que o hub existe para melhorar;
				    o resto do painel é contexto, esta linha é resultado. */}
				<InfoRow label="1ª resposta">{primeiraResposta === null ? "—" : `${primeiraResposta} min`}</InfoRow>
				<InfoRow label="Última resposta">{formatRelative(atendimento?.dataUltimaResposta)}</InfoRow>
				<InfoRow label="Aberto em">{atendimento ? formatDateAsLocale(atendimento.dataAtribuicao, true) : "—"}</InfoRow>
				{atendimento?.dataResolucao && <InfoRow label="Resolvido em">{formatDateAsLocale(atendimento.dataResolucao, true)}</InfoRow>}
			</div>
		</div>
	);
}

export function ChatContextPanel({ chatId, chat, currentUserId, className }: ChatContextPanelProps) {
	return (
		<Tabs defaultValue="atendimento" className={cn("flex h-full min-h-0 flex-col", className)}>
			<TabsList className="mx-3 mt-3 shrink-0">
				<TabsTrigger value="atendimento">Atendimento</TabsTrigger>
				<TabsTrigger value="cliente">Cliente</TabsTrigger>
				<TabsTrigger value="atividade">
					<User className="h-3.5 w-3.5 sm:hidden" />
					<span className="hidden sm:inline">Atividade</span>
				</TabsTrigger>
			</TabsList>

			<div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4 pt-3">
				<TabsContent value="atendimento" className="mt-0">
					<AttendanceTab chatId={chatId} chat={chat} currentUserId={currentUserId} />
				</TabsContent>
				<TabsContent value="cliente" className="mt-0">
					<ClientTab chat={chat} />
				</TabsContent>
				<TabsContent value="atividade" className="mt-0">
					<ActivityTab chat={chat} />
				</TabsContent>
			</div>
		</Tabs>
	);
}
