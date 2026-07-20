// Proposta comercial de uso único — Café Tijucano (Indústrias Brunelli).
// Renderizada dentro do shell de impressão em ../page.tsx (A4). Não faz parte do produto.
// A marca é RecompraCRM (azul + dourado). Fase 1: B2B + distribuição.

import { ARTHUR_WHATSAPP_NUMBER, LUCAS_WHATSAPP_NUMBER } from "@/config/internal-coms";
import LogoVerticalWhite from "@/utils/svgs/logos/RECOMPRA - COMPLETE - VERTICAL - WHITE.svg";
import {
	AlarmClock,
	ArrowRight,
	Bot,
	CalendarCheck,
	Check,
	ClipboardCheck,
	Coffee,
	Contact,
	Gift,
	Layers,
	ListChecks,
	type LucideIcon,
	MessagesSquare,
	QrCode,
	RefreshCw,
	ShoppingBag,
	ShoppingCart,
	Sparkles,
	Star,
	Target,
	TrendingDown,
	TrendingUp,
	Users,
	Wallet,
} from "lucide-react";
import Image from "next/image";
import { Fragment, type ReactNode } from "react";
import { FaWhatsapp } from "react-icons/fa6";
import { BRAND, heroGradient, Kicker, Sheet, SheetFooter } from "./_shared";

/* -------------------------------------------------------------------------- */
/*  Dados da proposta                                                          */
/* -------------------------------------------------------------------------- */

const IMPLEMENTATION = "10.000";
const IMPLEMENTATION_INSTALLMENT = "3.333,33";
const IMPLEMENTATION_CASH = "9.500";
const PLAN_PLATFORM = "899";
const PLAN_GROWTH = "2.500";

const SUPPORT_CONTACTS = [
	{ name: "Lucas Fernandes", phone: "34 99662-6855", whatsapp: LUCAS_WHATSAPP_NUMBER },
	{ name: "Arthur Carvalho", phone: "34 99948-0791", whatsapp: ARTHUR_WHATSAPP_NUMBER },
] as const;

/* -------------------------------------------------------------------------- */
/*  Proposta — Café Tijucano                                                   */
/* -------------------------------------------------------------------------- */

export function CafeTijucanoProposal() {
	return (
		<>
			<CoverSheet />
			<OpportunitySheet />
			<PortfolioSheet />
			<RepurchaseSheet />
			<WhatsappSheet />
			<RoadmapSheet />
			<PricingSheet />
		</>
	);
}

/* -------------------------------------------------------------------------- */
/*  1 · Capa                                                                   */
/* -------------------------------------------------------------------------- */

function CoverSheet() {
	return (
		<Sheet className="text-white">
			<div className="relative flex h-full flex-1 flex-col justify-between px-14 py-16" style={{ backgroundColor: BRAND.blue }}>
				{/* textura de pontos */}
				<div
					className="pointer-events-none absolute inset-0 opacity-[0.12]"
					style={{ backgroundImage: "radial-gradient(circle, #fff 1.2px, transparent 1.2px)", backgroundSize: "22px 22px" }}
				/>
				{/* brilho dourado */}
				<div
					className="pointer-events-none absolute -right-40 -top-40 h-[560px] w-[560px] rounded-full opacity-40"
					style={{ background: `radial-gradient(circle, ${BRAND.gold} 0%, transparent 62%)` }}
				/>
				<div
					className="pointer-events-none absolute -bottom-56 -left-36 h-[500px] w-[500px] rounded-full opacity-35"
					style={{ background: `radial-gradient(circle, ${BRAND.blueDeep} 0%, transparent 62%)` }}
				/>

				{/* topo */}
				<div className="relative z-10 flex items-center justify-between">
					<div className="relative h-14 w-40">
						<Image src={LogoVerticalWhite} alt="RecompraCRM" fill className="object-contain object-left" />
					</div>
					<div className="flex flex-col items-end gap-1">
						<span className="rounded-full bg-white/10 px-4 py-1.5 text-[0.65rem] font-extrabold uppercase tracking-[0.22em] ring-1 ring-white/20">
							Proposta comercial
						</span>
						<span className="text-[0.68rem] font-semibold tracking-wide text-white/60">Julho de 2026 · válida por 15 dias</span>
					</div>
				</div>

				{/* centro */}
				<div className="relative z-10 max-w-2xl">
					<Kicker tone="white">Preparada com exclusividade para</Kicker>
					<h1 className="mt-4 text-[4.2rem] font-black leading-[0.92] tracking-tight text-balance">
						CAFÉ
						<br />
						TIJUCANO
					</h1>
					<div className="mt-6 flex flex-wrap items-center gap-3">
						<span
							className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-extrabold uppercase tracking-wide"
							style={{ backgroundColor: BRAND.gold, color: BRAND.ink }}
						>
							<Coffee className="h-4 w-4" /> Indústrias Brunelli · Ituiutaba-MG
						</span>
					</div>
					<p className="mt-8 max-w-xl text-lg font-medium leading-relaxed text-white/85">
						Você já vende <strong className="font-extrabold text-white">o melhor café</strong>. Falta garantir que ele seja recomprado —{" "}
						<strong className="font-extrabold text-white">fidelizar</strong> quem já compra, <strong className="font-extrabold text-white">reativar</strong>{" "}
						quem está sumindo e dar à sua equipe uma <strong className="font-extrabold text-white">rotina comercial</strong> que se cumpre sozinha.
					</p>
				</div>

				{/* rodapé */}
				<div className="relative z-10 flex items-end justify-between">
					<div className="flex flex-col gap-1">
						<span className="text-[0.7rem] font-bold uppercase tracking-[0.25em] text-white/50">Os três pilares · Fase 1</span>
						<div className="flex items-center gap-2 text-sm font-extrabold">
							<span className="rounded-md bg-white/10 px-3 py-1.5">Carteira Comercial</span>
							<span className="text-white/40">·</span>
							<span className="rounded-md bg-white/10 px-3 py-1.5">Recompra Inteligente</span>
							<span className="text-white/40">·</span>
							<span className="rounded-md bg-white/10 px-3 py-1.5">WhatsApp + IA</span>
						</div>
					</div>
					<span className="text-[0.7rem] font-semibold tabular-nums text-white/40">recompracrm.com.br</span>
				</div>
			</div>
		</Sheet>
	);
}

/* -------------------------------------------------------------------------- */
/*  2 · A oportunidade                                                         */
/* -------------------------------------------------------------------------- */

const OPPORTUNITY_STATS = [
	{ value: "5–7×", label: "mais caro conquistar um cliente novo do que fazer um atual comprar de novo", icon: RefreshCw },
	{ value: "100%", label: "das decisões de quem visitar ou ligar dependem hoje da memória do vendedor — não auditável", icon: Users },
	{ value: "0", label: "campanhas automáticas de recompra rodando hoje: tudo depende de alguém lembrar e ligar", icon: TrendingDown },
];

const PAINS = [
	"A recompra vive na cabeça do vendedor — sem CRM, sem alerta, sem rotina.",
	"Sem visão de carteira: quem parou, quem está sumindo, quem pode comprar mais.",
	"Se o vendedor sai, o histórico de quem comprava o quê sai junto com ele.",
	"Na distribuição, quem enxerga o consumidor final é o supermercado, não você.",
];

function OpportunitySheet() {
	return (
		<Sheet>
			<div className="flex flex-1 flex-col px-14 pt-16">
				<Kicker>O ponto de partida</Kicker>
				<h2 className="mt-4 max-w-3xl text-[2.9rem] font-black leading-[1.02] tracking-tight text-balance">
					Café é recompra por natureza.
					<br />
					<span style={{ color: BRAND.blue }}>Hoje, ela depende de quem lembra.</span>
				</h2>
				<p className="mt-5 max-w-2xl text-[1.05rem] leading-relaxed text-neutral-600">
					O Café Tijucano vende por três canais — distribuição no varejo, B2B direto (padarias, hotéis, escritórios) e D2C no e-commerce. O problema não é
					vender a primeira vez. É{" "}
					<strong className="font-bold text-neutral-900">não deixar a segunda, a terceira e a décima compra dependerem de alguém lembrar.</strong>
				</p>

				<div className="mt-9 grid grid-cols-3 gap-5">
					{OPPORTUNITY_STATS.map((stat) => (
						<div key={stat.label} className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-6">
							<div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundColor: "rgba(36,84,156,0.10)", color: BRAND.blue }}>
								<stat.icon className="h-5 w-5" />
							</div>
							<span className="text-4xl font-black tracking-tight" style={{ color: BRAND.ink }}>
								{stat.value}
							</span>
							<span className="text-sm leading-snug text-neutral-500">{stat.label}</span>
						</div>
					))}
				</div>

				{/* A virada */}
				<div className="mt-9 overflow-hidden rounded-2xl" style={{ backgroundColor: BRAND.surface }}>
					<div className="grid grid-cols-[1.1fr_auto_1.1fr] items-stretch">
						<div className="flex flex-col justify-center gap-2 p-7">
							<span className="text-[0.7rem] font-extrabold uppercase tracking-[0.2em] text-neutral-500">Hoje</span>
							<p className="text-lg font-bold leading-snug text-neutral-500">
								A venda acontece, o vendedor segue para a próxima e a recompra depende de ele lembrar.
							</p>
						</div>
						<div className="flex items-center justify-center px-2" style={{ backgroundColor: "rgba(36,84,156,0.06)" }}>
							<div className="flex h-11 w-11 items-center justify-center rounded-full text-white" style={{ backgroundColor: BRAND.blue }}>
								<ArrowRight className="h-5 w-5" />
							</div>
						</div>
						<div className="flex flex-col justify-center gap-2 p-7" style={{ backgroundColor: "rgba(255,185,0,0.10)" }}>
							<span className="text-[0.7rem] font-extrabold uppercase tracking-[0.2em]" style={{ color: BRAND.goldText }}>
								Com o RecompraCRM
							</span>
							<p className="text-lg font-extrabold leading-snug text-neutral-900">
								Cada venda vira carteira, alerta de recompra e um motivo real para voltar — em piloto automático.
							</p>
						</div>
					</div>
				</div>

				{/* Dores */}
				<div className="mt-8">
					<h3 className="mb-3 text-sm font-black uppercase tracking-wide text-neutral-900">O que está escorrendo pelo ralo hoje</h3>
					<div className="grid grid-cols-2 gap-x-8 gap-y-2.5">
						{PAINS.map((pain) => (
							<div key={pain} className="flex items-start gap-2.5">
								<span className="mt-1.5 h-2 w-2 flex-shrink-0 rotate-45 rounded-[2px]" style={{ backgroundColor: BRAND.blue }} />
								<span className="text-[0.9rem] leading-snug text-neutral-600">{pain}</span>
							</div>
						))}
					</div>
				</div>
			</div>
			<SheetFooter index="02 / 07" label="A oportunidade" />
		</Sheet>
	);
}

/* -------------------------------------------------------------------------- */
/*  Primitivos de pilar                                                        */
/* -------------------------------------------------------------------------- */

function PillarHeader({ n, icon: Icon, title, lead }: { n: string; icon: LucideIcon; title: string; lead: string }) {
	return (
		<div className="flex items-start gap-5">
			<div
				className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl text-white shadow-lg"
				style={{ backgroundColor: BRAND.blue, boxShadow: "0 12px 28px -10px rgba(36,84,156,0.5)" }}
			>
				<Icon className="h-8 w-8" />
			</div>
			<div className="min-w-0">
				<span className="text-[0.7rem] font-black uppercase tracking-[0.25em]" style={{ color: BRAND.goldText }}>
					Pilar {n}
				</span>
				<h2 className="mt-1 text-[2.4rem] font-black leading-none tracking-tight">{title}</h2>
				<p className="mt-2.5 max-w-2xl text-[0.98rem] leading-relaxed text-neutral-600">{lead}</p>
			</div>
		</div>
	);
}

function BenefitRow({ children }: { children: ReactNode }) {
	return (
		<li className="flex items-start gap-2.5">
			<span
				className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full"
				style={{ backgroundColor: "rgba(36,84,156,0.10)", color: BRAND.blue }}
			>
				<Check className="h-3 w-3" strokeWidth={3.5} />
			</span>
			<span className="text-[0.92rem] leading-snug text-neutral-700">{children}</span>
		</li>
	);
}

function AssetCallout({ title, children }: { title: string; children: ReactNode }) {
	return (
		<div className="rounded-2xl border border-dashed p-5" style={{ borderColor: "rgba(255,185,0,0.55)", backgroundColor: "rgba(255,185,0,0.07)" }}>
			<div className="mb-1.5 flex items-center gap-2">
				<Gift className="h-4 w-4" style={{ color: BRAND.goldText }} />
				<span className="text-[0.7rem] font-black uppercase tracking-wider" style={{ color: BRAND.goldText }}>
					{title}
				</span>
			</div>
			<p className="text-[0.92rem] leading-relaxed text-neutral-700">{children}</p>
		</div>
	);
}

function TakeawayStrip({ children }: { children: ReactNode }) {
	return (
		<div className="mt-8 flex items-center gap-3.5 rounded-2xl px-6 py-4" style={{ backgroundColor: "rgba(36,84,156,0.06)" }}>
			<span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-white" style={{ backgroundColor: BRAND.blue }}>
				<ArrowRight className="h-5 w-5" />
			</span>
			<p className="text-[0.98rem] leading-snug text-neutral-700">
				<strong className="font-black text-neutral-900">O resultado:</strong> {children}
			</p>
		</div>
	);
}

/* -------------------------------------------------------------------------- */
/*  3 · Pilar 1 — Gestão de Carteira Comercial                                 */
/* -------------------------------------------------------------------------- */

function PortfolioSheet() {
	return (
		<Sheet>
			<div className="flex flex-1 flex-col px-14 pt-14">
				<PillarHeader
					n="01"
					icon={CalendarCheck}
					title="Gestão de Carteira Comercial"
					lead="Cada vendedor abre o dia com uma fila pronta: quem contatar, por quê e o que oferecer. A carteira deixa de morar na cabeça de cada um e passa a ser um ativo da empresa."
				/>

				{/* mockup app: stat cards + fila */}
				<div className="mt-8 rounded-3xl border border-neutral-200 bg-neutral-50/60 p-6">
					<div className="mb-4 flex items-center justify-between">
						<div className="flex items-center gap-2">
							<span className="flex h-7 w-7 items-center justify-center rounded-lg text-white" style={{ backgroundColor: BRAND.blue }}>
								<CalendarCheck className="h-4 w-4" />
							</span>
							<span className="text-sm font-black tracking-tight text-neutral-900">Meu dia</span>
							<span className="text-xs text-neutral-500">· Rafael · Carteira B2B — Triângulo Mineiro</span>
						</div>
						<div className="flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-[0.68rem] font-bold text-neutral-500 ring-1 ring-neutral-200">
							Terça, 21 jul
						</div>
					</div>

					<div className="grid grid-cols-4 gap-3">
						<StatMock title="Meta do dia" icon={Target} value="R$ 4.800" sub="de R$ 6.000" progress={80} />
						<StatMock title="Abordagens hoje" icon={ListChecks} value="5 / 12" sub="9 clientes na fila" />
						<StatMock title="Vendas hoje" icon={ShoppingCart} value="7" sub="Ticket médio R$ 690" />
						<StatMock title="Influenciadas no mês" icon={RefreshCw} value="41" sub="R$ 52.300 após abordagens" highlight />
					</div>

					<div className="mt-4 flex items-center gap-2">
						<ListChecks className="h-4 w-4" style={{ color: BRAND.blue }} />
						<span className="text-[0.72rem] font-black uppercase tracking-wide text-neutral-700">Fila de abordagens</span>
						<span className="ml-1 rounded-full bg-white px-2 py-0.5 text-[0.62rem] font-bold text-neutral-500 ring-1 ring-neutral-200">9 prioritários</span>
					</div>

					<div className="mt-3 grid grid-cols-2 gap-3">
						<QueueCardMock
							initials="PP"
							name="Padaria Ponto do Pão"
							segment="EM RISCO"
							segBg="#facc15"
							segText="#0a0a0a"
							meta="18 compras · LTV R$ 14.200 · última há 34 dias"
							reasonIcon={AlarmClock}
							reason="34 dias sem pedir — ciclo habitual é de 15 dias."
							offer="Recompra: Torrado e Moído Tradicional 500g (fardo)"
						/>
						<QueueCardMock
							initials="HS"
							name="Hotel Serra Azul"
							segment="NÃO PODE PERDER"
							segBg="#60a5fa"
							segText="#fff"
							meta="26 compras · LTV R$ 38.900 · última há 40 dias"
							reasonIcon={TrendingDown}
							reason="Caiu de Campeões para risco — alto volume, sem contato."
							offer="Sugestão: repor grãos + Cápsulas Tijucano nos quartos"
						/>
					</div>
				</div>

				<div className="mt-6 grid grid-cols-[1.15fr_0.85fr] items-start gap-8">
					<p className="text-[0.95rem] leading-relaxed text-neutral-600">
						A carteira é montada <strong className="font-bold text-neutral-900">automaticamente</strong> a partir das compras recorrentes de cada cliente. O
						gestor acompanha abordagens, conversões e vendas influenciadas por vendedor — sem planilha, sem cobrança no escuro.
					</p>
					<AssetCallout title="O ativo que fica com você">
						Se o vendedor sai, hoje a carteira sai junto. Aqui é o contrário: <strong className="font-extrabold">o histórico fica com a empresa</strong>. O
						vendedor troca; a carteira, não.
					</AssetCallout>
				</div>

				<TakeawayStrip>
					uma equipe que sabe exatamente quem procurar todo dia — e um gestor que enxerga cada conversão, mesmo quando o time muda.
				</TakeawayStrip>
			</div>
			<SheetFooter index="03 / 07" label="Pilar 01 · Gestão de Carteira" />
		</Sheet>
	);
}

function StatMock({
	title,
	icon: Icon,
	value,
	sub,
	progress,
	highlight,
}: {
	title: string;
	icon: LucideIcon;
	value: string;
	sub: string;
	progress?: number;
	highlight?: boolean;
}) {
	return (
		<div
			className="flex flex-col gap-2 rounded-xl border bg-white p-3.5"
			style={highlight ? { borderColor: "rgba(255,185,0,0.5)", backgroundColor: "rgba(255,185,0,0.06)" } : { borderColor: BRAND.border }}
		>
			<div className="flex items-center gap-1.5 text-neutral-500">
				<Icon className="h-3.5 w-3.5" />
				<span className="text-[0.58rem] font-black uppercase tracking-wide">{title}</span>
			</div>
			<span className="text-xl font-black tabular-nums leading-none text-neutral-900">{value}</span>
			{typeof progress === "number" ? (
				<div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
					<div className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: BRAND.blue }} />
				</div>
			) : null}
			<span className="text-[0.62rem] leading-tight text-neutral-500">{sub}</span>
		</div>
	);
}

function QueueCardMock({
	initials,
	name,
	segment,
	segBg,
	segText,
	meta,
	reasonIcon: ReasonIcon,
	reason,
	offer,
}: {
	initials: string;
	name: string;
	segment: string;
	segBg: string;
	segText: string;
	meta: string;
	reasonIcon: LucideIcon;
	reason: string;
	offer: string;
}) {
	return (
		<div className="flex flex-col gap-2.5 rounded-xl border border-neutral-200 bg-white px-3.5 py-3 shadow-sm">
			<div className="flex items-center gap-2.5">
				<span
					className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold"
					style={{ backgroundColor: "rgba(36,84,156,0.10)", color: BRAND.blue }}
				>
					{initials}
				</span>
				<div className="flex min-w-0 flex-1 flex-col gap-0.5">
					<div className="flex items-center gap-1.5">
						<span className="truncate text-[0.82rem] font-extrabold uppercase tracking-tight text-neutral-900">{name}</span>
						<span
							className="flex-shrink-0 rounded-full px-1.5 py-0.5 text-[0.5rem] font-black tracking-wide"
							style={{ backgroundColor: segBg, color: segText }}
						>
							{segment}
						</span>
					</div>
					<span className="text-[0.66rem] text-neutral-500">{meta}</span>
				</div>
			</div>

			<div className="flex flex-col gap-1">
				<span className="text-[0.55rem] font-black uppercase tracking-wide text-neutral-500">Por que agora</span>
				<div className="flex items-start gap-1.5 text-[0.72rem] font-medium text-neutral-700">
					<ReasonIcon className="mt-0.5 h-3 w-3 flex-shrink-0 text-neutral-500" />
					<span>{reason}</span>
				</div>
			</div>

			<div className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5" style={{ backgroundColor: "rgba(36,84,156,0.05)" }}>
				<Sparkles className="h-3 w-3 flex-shrink-0" style={{ color: BRAND.blue }} />
				<span className="truncate text-[0.68rem] font-semibold text-neutral-600">{offer}</span>
			</div>

			<div className="flex items-center gap-1.5">
				<span
					className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[0.6rem] font-extrabold uppercase text-neutral-900"
					style={{ backgroundColor: BRAND.gold }}
				>
					<FaWhatsapp className="h-3 w-3" /> Abordar
				</span>
				<span className="flex items-center gap-1 rounded-md border border-neutral-200 px-2.5 py-1.5 text-[0.6rem] font-bold uppercase text-neutral-500">
					<ClipboardCheck className="h-3 w-3" /> Registrar
				</span>
			</div>
		</div>
	);
}

/* -------------------------------------------------------------------------- */
/*  4 · Pilar 2 — Recompra por RFM + Crédito                                   */
/* -------------------------------------------------------------------------- */

const RFM_SEGMENTS = [
	{ label: "Campeões", count: 38, bg: "#fb923c", text: "#0a0a0a" },
	{ label: "Leais", count: 96, bg: "#4ade80", text: "#0a0a0a" },
	{ label: "Em risco", count: 44, bg: "#facc15", text: "#0a0a0a" },
	{ label: "Prestes a dormir", count: 29, bg: "#ca8a04", text: "#fff" },
	{ label: "Hibernando", count: 52, bg: "#c084fc", text: "#fff" },
	{ label: "Perdidos", count: 71, bg: "#ef4444", text: "#fff" },
];

function RepurchaseSheet() {
	return (
		<Sheet>
			<div className="flex flex-1 flex-col px-14 pt-14">
				<PillarHeader
					n="02"
					icon={Wallet}
					title="Campanhas de Recompra por RFM"
					lead="Sua base B2B e de distribuição se segmenta sozinha — campeões, leais, em risco, hibernando, perdidos. Quem começa a sumir recebe um crédito para voltar. Quem já compra recebe a sugestão certa para comprar mais."
				/>

				<div className="mt-9 grid grid-cols-[0.95fr_1.05fr] items-start gap-10">
					{/* Coluna texto */}
					<div className="flex flex-col gap-7 pt-1">
						<div>
							<h3 className="mb-3 text-sm font-black uppercase tracking-wide text-neutral-900">Como funciona</h3>
							<ul className="flex flex-col gap-2.5">
								<BenefitRow>Toda compra atualiza o segmento do cliente na Matriz RFM — sem ninguém classificar na mão.</BenefitRow>
								<BenefitRow>Entrou em risco? O sistema libera um Crédito de Recompra e dispara a campanha.</BenefitRow>
								<BenefitRow>Upsell automático: quem só compra grão passa a receber oferta de cápsulas ou kit.</BenefitRow>
								<BenefitRow>Percentuais, regras e validade definidos por você — por canal e por segmento.</BenefitRow>
							</ul>
						</div>

						<AssetCallout title="O que isso destrava">
							Você para de perder cliente em silêncio: quem cai de segmento vira campanha na hora. O crédito é a isca; o que fica é uma{" "}
							<strong className="font-extrabold">base viva, segmentada sozinha</strong> a cada pedido.
						</AssetCallout>

						<RfmMiniMatrix />
					</div>

					{/* Coluna mockup — crédito + upsell */}
					<div className="flex flex-col items-center gap-3">
						<CreditCardMock />
						<span className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-neutral-500">Campanha automática · gatilho “Em risco”</span>
					</div>
				</div>

				<TakeawayStrip>
					clientes com um motivo concreto para escolher o Café Tijucano de novo — e uma base que se organiza sozinha, sem planilha.
				</TakeawayStrip>
			</div>
			<SheetFooter index="04 / 07" label="Pilar 02 · Recompra" />
		</Sheet>
	);
}

function RfmMiniMatrix() {
	return (
		<div>
			<h3 className="mb-2.5 text-sm font-black uppercase tracking-wide text-neutral-900">Sua base B2B, já segmentada</h3>
			<div className="grid grid-cols-3 gap-2">
				{RFM_SEGMENTS.map((seg) => (
					<div key={seg.label} className="flex flex-col gap-1 rounded-xl border border-neutral-200 px-3 py-2.5">
						<span className="text-xl font-black tabular-nums leading-none text-neutral-900">{seg.count}</span>
						<span
							className="w-fit rounded-full px-2 py-0.5 text-[0.58rem] font-black uppercase tracking-wide"
							style={{ backgroundColor: seg.bg, color: seg.text }}
						>
							{seg.label}
						</span>
					</div>
				))}
			</div>
		</div>
	);
}

function CreditCardMock() {
	return (
		<div
			className="w-full max-w-[380px] rounded-[26px] p-3 shadow-2xl"
			style={{ backgroundColor: "#0f172a", boxShadow: "0 30px 60px -25px rgba(15,23,42,0.6)" }}
		>
			<div className="overflow-hidden rounded-[18px] bg-white">
				{/* barra da marca */}
				<div className="flex items-center justify-between px-5 py-3.5 text-white" style={{ backgroundColor: BRAND.blue }}>
					<div className="flex items-center gap-2">
						<div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 text-[0.7rem] font-black">PP</div>
						<div className="flex flex-col leading-none">
							<span className="text-[0.8rem] font-extrabold">Padaria Ponto do Pão</span>
							<span className="text-[0.6rem] font-medium text-white/60">Compra só Torrado e Moído</span>
						</div>
					</div>
					<span
						className="rounded-full px-2.5 py-1 text-[0.55rem] font-black uppercase tracking-wide text-gray-950"
						style={{ backgroundColor: "#facc15" }}
					>
						Em risco
					</span>
				</div>

				<div className="flex flex-col gap-4 px-5 py-5">
					{/* crédito liberado */}
					<div className="rounded-2xl px-5 py-4 text-center" style={{ backgroundColor: "rgba(255,185,0,0.12)" }}>
						<span className="text-[0.62rem] font-black uppercase tracking-[0.2em]" style={{ color: BRAND.goldText }}>
							Crédito de Recompra liberado
						</span>
						<p className="mt-1 text-3xl font-black tabular-nums" style={{ color: BRAND.ink }}>
							R$ 90,00
						</p>
						<span className="text-[0.62rem] text-neutral-500">válido por 20 dias na próxima compra</span>
					</div>

					{/* upsell */}
					<div className="flex items-start gap-2 rounded-xl border border-dashed border-neutral-300 px-4 py-3">
						<TrendingUp className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: BRAND.blue }} />
						<p className="text-[0.72rem] leading-snug text-neutral-600">
							<strong className="font-bold text-neutral-800">Sugestão de upsell:</strong> incluir Cápsulas Tijucano — cliente ainda não experimentou a linha.
						</p>
					</div>

					{/* botão resgate */}
					<div
						className="flex items-center justify-center gap-1.5 rounded-xl py-3 text-[0.78rem] font-extrabold uppercase text-white"
						style={{ backgroundColor: BRAND.blue }}
					>
						<Gift className="h-4 w-4" /> Quero resgatar meu crédito
					</div>
				</div>
			</div>
		</div>
	);
}

/* -------------------------------------------------------------------------- */
/*  5 · Pilar 3 — WhatsApp Hub + IA Tijucaninho                                */
/* -------------------------------------------------------------------------- */

const HUB_ROWS = [
	{ seller: "Rafael", tag: "B2B — Triângulo", open: 3, waiting: 1, won: 4, ai: false },
	{ seller: "Marina", tag: "Distribuição", open: 5, waiting: 0, won: 6, ai: false },
	{ seller: "Tijucaninho", tag: "campanhas", open: 12, waiting: 0, won: 9, ai: true },
];

function WhatsappSheet() {
	return (
		<Sheet>
			<div className="flex flex-1 flex-col px-14 pt-14">
				<PillarHeader
					n="03"
					icon={MessagesSquare}
					title="WhatsApp Hub + IA Tijucaninho"
					lead="Todas as conversas de WhatsApp de cada vendedor num painel único para o gestor. E uma IA de atendimento — o Tijucaninho — que responde as campanhas de recompra sozinha, sem sobrecarregar o time."
				/>

				<div className="mt-9 grid grid-cols-[1.05fr_0.95fr] items-start gap-10">
					{/* Mockup WhatsApp com IA */}
					<div className="flex flex-col items-center gap-3">
						<WhatsappTijucaninhoMock />
						<span className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-neutral-500">
							Campanha sem vendedor exclusivo · atende o Tijucaninho
						</span>
					</div>

					{/* Painel + como funciona */}
					<div className="flex flex-col gap-6 pt-1">
						<HubPanelMock />

						<div>
							<h3 className="mb-3 text-sm font-black uppercase tracking-wide text-neutral-900">Como funciona</h3>
							<ul className="flex flex-col gap-2.5">
								<BenefitRow>Todo disparo leva um botão “Quero resgatar meu bônus”.</BenefitRow>
								<BenefitRow>Cliente com vendedor exclusivo → cai direto para ele, com histórico à mão.</BenefitRow>
								<BenefitRow>Sem vendedor exclusivo → cai para o Tijucaninho, que fecha o pedido sozinho.</BenefitRow>
							</ul>
						</div>
					</div>
				</div>

				<TakeawayStrip>
					cada campanha de recompra vira conversa atendida — pela pessoa certa ou pela IA — sem ninguém do time parar tudo para responder.
				</TakeawayStrip>
			</div>
			<SheetFooter index="05 / 07" label="Pilar 03 · WhatsApp + IA" />
		</Sheet>
	);
}

function HubPanelMock() {
	return (
		<div className="rounded-2xl border border-neutral-200 bg-neutral-50/60 p-4">
			<div className="mb-3 flex items-center gap-2">
				<span className="flex h-6 w-6 items-center justify-center rounded-md text-white" style={{ backgroundColor: BRAND.blue }}>
					<MessagesSquare className="h-3.5 w-3.5" />
				</span>
				<span className="text-[0.72rem] font-black uppercase tracking-wide text-neutral-700">WhatsApp Hub · visão do gestor</span>
			</div>
			<div className="grid grid-cols-[1.4fr_repeat(3,0.9fr)] gap-x-2 gap-y-1.5 text-[0.62rem]">
				<span className="font-bold uppercase tracking-wide text-neutral-400">Vendedor</span>
				<span className="text-center font-bold uppercase tracking-wide text-neutral-400">Abertas</span>
				<span className="text-center font-bold uppercase tracking-wide text-neutral-400">S/ resp.</span>
				<span className="text-center font-bold uppercase tracking-wide text-neutral-400">Ganhas</span>
				{HUB_ROWS.map((row) => (
					<Fragment key={row.seller}>
						<div className="flex items-center gap-1.5 rounded-md px-1.5 py-1" style={row.ai ? { backgroundColor: "rgba(255,185,0,0.14)" } : undefined}>
							{row.ai ? (
								<Bot className="h-3.5 w-3.5 flex-shrink-0" style={{ color: BRAND.goldText }} />
							) : (
								<span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ backgroundColor: BRAND.blue }} />
							)}
							<span className="truncate text-[0.68rem] font-extrabold text-neutral-800">{row.seller}</span>
						</div>
						<span className="self-center text-center font-black tabular-nums text-neutral-800">{row.open}</span>
						<span className="self-center text-center font-black tabular-nums" style={{ color: row.waiting > 0 ? "#c2410c" : "#16a34a" }}>
							{row.waiting}
						</span>
						<span className="self-center text-center font-black tabular-nums text-neutral-800">{row.won}</span>
					</Fragment>
				))}
			</div>
		</div>
	);
}

function WhatsappTijucaninhoMock() {
	return (
		<div
			className="w-full max-w-[360px] overflow-hidden rounded-[26px] p-3 shadow-2xl"
			style={{ backgroundColor: "#0f172a", boxShadow: "0 30px 60px -25px rgba(15,23,42,0.6)" }}
		>
			<div className="overflow-hidden rounded-[18px]" style={{ backgroundColor: "#e6ddd4" }}>
				{/* header whatsapp */}
				<div className="flex items-center gap-3 px-4 py-3 text-white" style={{ backgroundColor: "#075E54" }}>
					<div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-[0.7rem] font-black">CT</div>
					<div className="flex flex-col leading-none">
						<span className="text-[0.85rem] font-bold">Café Tijucano</span>
						<span className="text-[0.6rem] text-white/70">conta comercial</span>
					</div>
					<FaWhatsapp className="ml-auto h-5 w-5 text-white/80" />
				</div>

				{/* mensagens */}
				<div
					className="flex flex-col gap-2.5 px-4 py-5"
					style={{ backgroundImage: "radial-gradient(rgba(0,0,0,0.03) 1px, transparent 1px)", backgroundSize: "16px 16px" }}
				>
					<div className="max-w-[88%] self-start rounded-2xl rounded-tl-sm bg-white px-3.5 py-2.5 shadow-sm">
						<p className="text-[0.82rem] leading-snug text-neutral-800">Oi, Padaria Pão de Ouro! ☕ Sentimos falta do pedido de vocês.</p>
						<p className="mt-2 text-[0.82rem] leading-snug text-neutral-800">
							Separamos <strong>R$ 90 de crédito</strong> para a próxima compra — válido por 20 dias! 🎁
						</p>
						<div className="mt-2 rounded-lg py-1.5 text-center text-[0.72rem] font-bold text-white" style={{ backgroundColor: BRAND.blue }}>
							Quero resgatar meu bônus
						</div>
						<span className="mt-1.5 block text-right text-[0.58rem] text-neutral-500">09:13 ✓✓</span>
					</div>

					<div className="max-w-[85%] self-end rounded-2xl rounded-tr-sm px-3.5 py-2.5 shadow-sm" style={{ backgroundColor: "#dcf8c6" }}>
						<p className="text-[0.82rem] leading-snug text-neutral-800">Ainda tem aquele fardo de torrado e moído?</p>
						<span className="mt-1.5 block text-right text-[0.58rem] text-neutral-500">09:14 ✓✓</span>
					</div>

					<div
						className="max-w-[88%] self-start rounded-2xl rounded-tl-sm bg-white px-3.5 py-2.5 shadow-sm"
						style={{ borderLeft: `3px solid ${BRAND.gold}` }}
					>
						<div className="mb-1 flex items-center gap-1.5">
							<Bot className="h-3.5 w-3.5" style={{ color: BRAND.goldText }} />
							<span className="text-[0.58rem] font-black uppercase tracking-wider" style={{ color: BRAND.goldText }}>
								Tijucaninho · IA
							</span>
						</div>
						<p className="text-[0.82rem] leading-snug text-neutral-800">
							Tem sim! Fecho 2 fardos com o seu crédito de R$ 90 já aplicado — confirma pra você?
						</p>
						<span className="mt-1.5 block text-right text-[0.58rem] text-neutral-500">09:14 ✓✓</span>
					</div>

					<div
						className="mt-1 self-center rounded-full px-3 py-1 text-[0.6rem] font-black uppercase tracking-wide text-white shadow"
						style={{ backgroundColor: BRAND.blue }}
					>
						Convertido · pedido de R$ 640,00 · pela IA
					</div>
				</div>
			</div>
		</div>
	);
}

/* -------------------------------------------------------------------------- */
/*  6 · Roadmap — o caminho que se abre                                        */
/* -------------------------------------------------------------------------- */

const ROADMAP: { icon: LucideIcon; phase: string; title: string; body: string; now?: boolean }[] = [
	{
		icon: Contact,
		phase: "Agora · 3 meses",
		title: "CRM & Gestão de Carteira",
		body: "Carteira, recompra por RFM com crédito e WhatsApp Hub + IA. A fundação de dados de tudo.",
		now: true,
	},
	{
		icon: QrCode,
		phase: "A partir do 4º trim.",
		title: "Clube de Fidelidade D2C",
		body: "QR Code nas gôndolas, ligando o cupom fiscal ao sistema — o consumidor final vira contato seu, não do varejo.",
	},
	{
		icon: Layers,
		phase: "Depois",
		title: "Base unificada dos 3 canais",
		body: "Distribuição + B2B + D2C na mesma base. Um só cadastro por cliente, comprando onde comprar.",
	},
	{
		icon: ShoppingBag,
		phase: "Depois",
		title: "E-commerce & assinatura",
		body: "Recompra e assinatura personalizadas por perfil de consumo — o café certo na hora certa.",
	},
];

function RoadmapSheet() {
	return (
		<Sheet>
			<div className="flex flex-1 flex-col px-14 pt-16">
				<Kicker>O caminho que se abre</Kicker>
				<h2 className="mt-4 max-w-2xl text-[2.9rem] font-black leading-[1.02] tracking-tight text-balance">
					Nada se refaz. <span style={{ color: BRAND.blue }}>Tudo se soma.</span>
				</h2>
				<p className="mt-5 max-w-2xl text-[1.05rem] leading-relaxed text-neutral-600">
					O CRM de agora é o <strong className="font-bold text-neutral-900">alicerce técnico e de dados</strong> do clube de fidelidade de depois. Cada
					etapa usa a base construída na anterior.
				</p>

				<div className="mt-10 grid grid-cols-4 gap-4">
					{ROADMAP.map((step, i) => (
						<div
							key={step.title}
							className="relative flex flex-col gap-2.5 rounded-2xl bg-white p-5"
							style={{
								border: step.now ? `2px solid ${BRAND.gold}` : "1px solid #e5e5e5",
								boxShadow: step.now ? "0 12px 30px -12px rgba(36,84,156,0.4)" : undefined,
							}}
						>
							{step.now ? (
								<span
									className="absolute -top-2.5 right-4 rounded-full px-2.5 py-0.5 text-[0.55rem] font-black uppercase tracking-wider"
									style={{ backgroundColor: BRAND.gold, color: BRAND.ink }}
								>
									Começa aqui
								</span>
							) : null}
							<span
								className="flex h-8 w-8 items-center justify-center rounded-full text-[0.8rem] font-black text-white"
								style={{ backgroundColor: BRAND.blue }}
							>
								{i + 1}
							</span>
							<step.icon className="h-5 w-5" style={{ color: BRAND.goldText }} />
							<span className="text-[0.6rem] font-black uppercase tracking-wider text-neutral-400">{step.phase}</span>
							<h4 className="text-[0.82rem] font-black uppercase leading-tight tracking-tight text-neutral-900">{step.title}</h4>
							<p className="text-[0.72rem] leading-snug text-neutral-600">{step.body}</p>
						</div>
					))}
				</div>

				<div className="mt-9 flex items-start gap-4 rounded-2xl px-6 py-5" style={{ backgroundColor: "rgba(36,84,156,0.06)" }}>
					<span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-white" style={{ backgroundColor: BRAND.blue }}>
						<QrCode className="h-5 w-5" />
					</span>
					<p className="text-[0.92rem] leading-relaxed text-neutral-700">
						O clube D2C é o projeto maior: depende de integração ponto a ponto com cada rede de supermercado, por isso entra como{" "}
						<strong className="font-extrabold text-neutral-900">próximo passo</strong> — não como escopo fechado agora. Mas quando chegar a hora, ele nasce
						em cima de uma base que já estará de pé.
					</p>
				</div>
			</div>
			<SheetFooter index="06 / 07" label="Roadmap · O caminho que se abre" />
		</Sheet>
	);
}

/* -------------------------------------------------------------------------- */
/*  7 · Investimento                                                           */
/* -------------------------------------------------------------------------- */

const PLATFORM_FEATURES = [
	"Plataforma completa (3 pilares) no ar",
	"Hospedagem, infraestrutura e evolução contínua",
	"Suporte dedicado por WhatsApp",
	"Sua equipe cria e dispara as campanhas",
];

const GROWTH_FEATURES = [
	"Operação das campanhas por nós — réguas de RFM e crédito",
	"Reuniões quinzenais de segmentos, ofertas e resultados",
	"Relatório mensal: recuperação, reativação, upsell e ROI",
	"Assento no board: decisões de campanha, calendário e mix",
];

function PricingSheet() {
	return (
		<Sheet>
			<div className="flex flex-1 flex-col gap-6 px-14 pt-14">
				<div>
					<Kicker>Investimento</Kicker>
					<h2 className="mt-3 max-w-2xl text-[2.6rem] font-black leading-[1.02] tracking-tight text-balance">
						Uma fundação agora. <span style={{ color: BRAND.blue }}>Toda a recompra conectada.</span>
					</h2>
				</div>

				{/* Implementação */}
				<div
					className="relative flex items-center justify-between gap-6 overflow-hidden rounded-3xl px-8 py-6 text-white"
					style={{ backgroundColor: BRAND.blue }}
				>
					<div
						className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-35"
						style={{ background: `radial-gradient(circle, ${BRAND.gold} 0%, transparent 64%)` }}
					/>
					<div className="relative z-10">
						<span className="text-[0.7rem] font-black uppercase tracking-[0.22em] text-white/60">Implementação · pagamento único</span>
						<div className="mt-2 flex items-end gap-1.5">
							<span className="text-2xl font-bold text-white/70">R$</span>
							<span className="text-6xl font-black leading-none tracking-tight">{IMPLEMENTATION}</span>
						</div>
						<p className="mt-2 text-[0.82rem] text-white/70">
							Em até <strong className="font-black text-white">3× de R$ {IMPLEMENTATION_INSTALLMENT}</strong> ou{" "}
							<strong className="font-black text-white">R$ {IMPLEMENTATION_CASH} à vista</strong> (5% off) · entrega em 3 meses
						</p>
					</div>
					<div className="relative z-10 hidden shrink-0 flex-col gap-1.5 border-l border-white/15 pl-6 sm:flex">
						{["Os 3 pilares entregues", "Migração da base atual", "Onboarding + treinamento"].map((item) => (
							<div key={item} className="flex items-center gap-2 text-[0.78rem] font-semibold text-white/80">
								<Check className="h-3.5 w-3.5" style={{ color: BRAND.gold }} strokeWidth={3} /> {item}
							</div>
						))}
					</div>
				</div>

				{/* Planos de recorrência */}
				<div>
					<span className="text-[0.7rem] font-black uppercase tracking-[0.22em] text-neutral-400">Recorrência · escolha o modelo</span>
					<div className="mt-3 grid grid-cols-2 items-stretch gap-5">
						<PlanCard
							name="Plano Plataforma"
							role="A sua equipe opera"
							price={PLAN_PLATFORM}
							tagline="O Café Tijucano opera o CRM com a própria equipe."
							features={PLATFORM_FEATURES}
						/>
						<PlanCard
							name="Plano Growth"
							role="A gente opera com você"
							price={PLAN_GROWTH}
							tagline="A RecompraCRM assume as campanhas e senta no board de marketing."
							features={GROWTH_FEATURES}
							highlight
						/>
					</div>
				</div>

				{/* Nota */}
				<div
					className="flex items-start gap-3 rounded-xl px-5 py-3"
					style={{ backgroundColor: "rgba(36,84,156,0.05)", border: "1px dashed rgba(36,84,156,0.3)" }}
				>
					<Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: BRAND.blue }} />
					<p className="text-[0.74rem] leading-snug text-neutral-700">
						<strong>Sem fidelidade — cancele quando quiser.</strong> O Plano Growth existe para quem quer a RecompraCRM como <strong>time</strong>, não só
						como software: a gente opera as campanhas junto, não entrega a ferramenta e some.
					</p>
				</div>

				{/* Closing CTA */}
				<div className="relative mt-auto overflow-hidden rounded-3xl px-8 py-6 text-white" style={heroGradient}>
					<div
						className="absolute inset-0 opacity-[0.12]"
						style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "16px 16px" }}
					/>
					<div className="absolute right-0 top-0 h-full w-2" style={{ backgroundColor: BRAND.gold }} />
					<div className="relative z-10 flex flex-col gap-3.5">
						<div className="flex items-center gap-2">
							<Star className="h-5 w-5" fill="currentColor" />
							<h2 className="text-xl font-black uppercase leading-tight tracking-tight">Vamos fazer o melhor café ser recomprado</h2>
						</div>
						<p className="max-w-2xl text-[0.82rem] leading-relaxed opacity-90">
							A venda já roda nos três canais. O que falta é a camada de relacionamento — a que faz o cliente voltar sem depender da memória de ninguém.
							Somos daqui de Ituiutaba, como vocês: suporte perto, sem fila de chamado. É só chamar um de nós no WhatsApp.
						</p>
						<div className="mt-1 flex flex-wrap gap-3">
							{SUPPORT_CONTACTS.map((contact) => (
								<a
									key={contact.name}
									href={`https://wa.me/${contact.whatsapp}?text=${encodeURIComponent("Olá! Quero conversar sobre a proposta do Café Tijucano.")}`}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[0.78rem] font-bold text-neutral-900 shadow-sm transition-transform hover:scale-[1.02] print:pointer-events-none"
								>
									<FaWhatsapp className="h-4 w-4 text-green-600" />
									<span>{contact.name}</span>
									<span className="font-medium tabular-nums text-neutral-500">{contact.phone}</span>
								</a>
							))}
						</div>
					</div>
				</div>
			</div>
			<SheetFooter index="07 / 07" label="Investimento" />
		</Sheet>
	);
}

function PlanCard({
	name,
	role,
	price,
	tagline,
	features,
	highlight,
}: {
	name: string;
	role: string;
	price: string;
	tagline: string;
	features: string[];
	highlight?: boolean;
}) {
	return (
		<div
			className="relative flex flex-col gap-3.5 rounded-2xl bg-white p-6"
			style={{
				border: highlight ? `2px solid ${BRAND.gold}` : "1px solid #e5e5e5",
				boxShadow: highlight ? "0 12px 30px -12px rgba(36,84,156,0.45)" : undefined,
			}}
		>
			{highlight ? (
				<span
					className="absolute -top-3 right-5 inline-flex items-center gap-1 rounded-full px-3 py-1 text-[0.6rem] font-black uppercase tracking-wider"
					style={{ backgroundColor: BRAND.gold, color: BRAND.ink }}
				>
					Operação conjunta
				</span>
			) : null}

			<div>
				<span className="text-[0.62rem] font-black uppercase tracking-[0.18em] text-neutral-400">{role}</span>
				<h3 className="mt-0.5 text-base font-black uppercase tracking-tight text-neutral-900">{name}</h3>
				<p className="mt-1 text-[0.72rem] leading-snug text-neutral-500">{tagline}</p>
			</div>

			<div className="flex items-end gap-1">
				<span className="text-lg font-bold text-neutral-400">R$</span>
				<span className="text-4xl font-black leading-none tracking-tight" style={{ color: BRAND.blue }}>
					{price}
				</span>
				<span className="mb-1 text-[0.75rem] font-semibold text-neutral-400">/mês</span>
			</div>

			<div className="h-px w-full bg-neutral-100" />

			<ul className="flex flex-col gap-2">
				{features.map((feature) => (
					<li key={feature} className="flex items-start gap-2">
						<Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" style={{ color: highlight ? BRAND.goldText : BRAND.blue }} strokeWidth={3} />
						<span className="text-[0.74rem] leading-snug text-neutral-700">{feature}</span>
					</li>
				))}
			</ul>
		</div>
	);
}
