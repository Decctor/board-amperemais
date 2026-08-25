import { BrandLogo } from "@/components/Brand/BrandLogo";
// Proposta comercial de uso único — Fran Farma.
// Clube de benefícios (cashback + campanhas de WhatsApp) sobre a plataforma RecompraCRM,
// com Gestor de Crescimento operando as campanhas pela farmácia.
// Renderizada dentro do shell de impressão em ../page.tsx (A4). Não faz parte do produto.

import { ARTHUR_WHATSAPP_NUMBER, LUCAS_WHATSAPP_NUMBER } from "@/config/internal-coms";
import {
	AlarmClock,
	ArrowRight,
	BarChart3,
	BrainCircuit,
	CalendarCheck,
	Check,
	ClipboardList,
	Gift,
	HeartHandshake,
	LayoutDashboard,
	type LucideIcon,
	Megaphone,
	MessageCircleMore,
	QrCode,
	RefreshCw,
	Rocket,
	ScanLine,
	ShieldCheck,
	Sparkles,
	Star,
	Store,
	Ticket,
	TrendingDown,
	Trophy,
	Users,
	Wallet,
} from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import { FaWhatsapp } from "react-icons/fa6";
import { Sheet, SheetFooter } from "./_shared";

/* -------------------------------------------------------------------------- */
/*  Paleta Fran Farma (extraída da logo)                                       */
/* -------------------------------------------------------------------------- */

const BRAND = {
	green: "#0D4D2B",
	greenDeep: "#06301B",
	mint: "#7FD1A0",
	// Mint escurecido — legível como texto sobre fundos claros
	mintText: "#256B47",
	ink: "#171717",
	border: "#E5E5E5",
	surface: "#F5F5F5",
} as const;

function hexToRgba(hex: string, alpha: number) {
	const h = hex.replace("#", "");
	const r = parseInt(h.slice(0, 2), 16);
	const g = parseInt(h.slice(2, 4), 16);
	const b = parseInt(h.slice(4, 6), 16);
	return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const heroGradient = {
	backgroundImage: `linear-gradient(135deg, ${BRAND.green} 0%, ${BRAND.greenDeep} 100%)`,
};

/* -------------------------------------------------------------------------- */
/*  Dados da proposta                                                          */
/* -------------------------------------------------------------------------- */

const IMPLEMENTATION_FEE = "10.000";
const MONTHLY_PRICE_PER_UNIT = "499,90";

const SUPPORT_CONTACTS = [
	{ name: "Lucas Fernandes", phone: "34 99662-6855", whatsapp: LUCAS_WHATSAPP_NUMBER },
	{ name: "Arthur Carvalho", phone: "34 99948-0791", whatsapp: ARTHUR_WHATSAPP_NUMBER },
] as const;

const WHATSAPP_MESSAGE = "Olá! Quero conversar sobre a proposta da Fran Farma.";

const SOLUTION_CARDS = [
	{
		icon: ClipboardList,
		title: "Cadastro em segundos",
		body: "No balcão, só com nome, WhatsApp e CPF. Sem app, sem cartãozinho, sem burocracia — a fila não para.",
	},
	{
		icon: Gift,
		title: "Cashback que traz de volta",
		body: "Parte de cada compra vira crédito com validade, resgatado pelo CPF na próxima visita. Um motivo concreto para voltar.",
	},
	{
		icon: MessageCircleMore,
		title: "WhatsApp na hora certa",
		body: "Aniversário, cashback a expirar, cliente sumido: mensagens automáticas com um motivo real para voltar à loja.",
	},
];

const PROFILE_FIELDS = ["Nome completo", "Telefone / WhatsApp", "CPF", "Data de nascimento", "Gênero", "Consentimento LGPD"];

const DELIVERABLES = [
	{
		icon: Sparkles,
		title: "Clube com a cara da Fran Farma",
		body: "Percentual de cashback, validade e regras de resgate definidos junto com vocês.",
	},
	{
		icon: ScanLine,
		title: "Operação no balcão",
		body: "Fluxo simples de cadastro e resgate por CPF, com a equipe treinada para não travar a fila.",
	},
	{
		icon: MessageCircleMore,
		title: "Campanhas automáticas",
		body: "Boas-vindas, aniversário, inatividade e cashback expirando rodando sozinhas, todos os dias.",
	},
	{
		icon: LayoutDashboard,
		title: "Painel de gestão",
		body: "Base de clientes, cashback emitido e resgatado, e faturamento atribuído a cada campanha.",
	},
	{
		icon: HeartHandshake,
		title: "Gestor de crescimento",
		body: "A gente cria, dispara e otimiza as campanhas por vocês, com leitura mensal de resultados.",
	},
	{
		icon: ShieldCheck,
		title: "LGPD by design",
		body: "Consentimento no cadastro, opt-out em toda mensagem e boas práticas de dados desde o primeiro dia.",
	},
];

const ROADMAP: { icon: LucideIcon; title: string; body: string; now?: boolean }[] = [
	{
		icon: Gift,
		title: "Clube de benefícios",
		body: "Cadastro no balcão + cashback no CPF. A fundação de tudo.",
		now: true,
	},
	{
		icon: MessageCircleMore,
		title: "Campanhas automáticas",
		body: "Aniversário, inatividade e cashback expirando, sem esforço da equipe.",
	},
	{
		icon: BrainCircuit,
		title: "Inteligência da base",
		body: "RFM, visão 360º do cliente e produtos de recompra por perfil.",
	},
	{
		icon: Store,
		title: "Loja digital",
		body: "Catálogo próprio com o mesmo cashback, comprando também fora do balcão.",
	},
];

/* -------------------------------------------------------------------------- */
/*  Proposta — Fran Farma                                                      */
/* -------------------------------------------------------------------------- */

export function FranFarmaProposal() {
	return (
		<>
			<CoverSheet />
			<OpportunitySheet />
			<SolutionSheet />
			<RegistrationSheet />
			<CashbackSheet />
			<ReactivationSheet />
			<PointsSheet />
			<GrowthManagerSheet />
			<InvestmentSheet />
		</>
	);
}

/* -------------------------------------------------------------------------- */
/*  Primitivos locais                                                          */
/* -------------------------------------------------------------------------- */

function Eyebrow({ children, tone = "green" }: { children: ReactNode; tone?: "green" | "mint" | "white" }) {
	const color = tone === "mint" ? BRAND.mintText : tone === "white" ? "rgba(255,255,255,0.75)" : BRAND.green;
	return (
		<span className="text-[0.68rem] font-extrabold uppercase tracking-[0.28em]" style={{ color }}>
			{children}
		</span>
	);
}

function SectionLabel({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
	return (
		<div className="mb-3 flex items-center gap-2.5">
			<div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: hexToRgba(BRAND.green, 0.1), color: BRAND.green }}>
				<Icon className="h-[18px] w-[18px]" />
			</div>
			<h2 className="text-lg font-black uppercase leading-none tracking-tight text-neutral-900">{text}</h2>
		</div>
	);
}

/* Cabeçalho das folhas de pilar */
function PillarHeader({ n, icon: Icon, title, lead }: { n: string; icon: LucideIcon; title: string; lead: string }) {
	return (
		<div className="flex items-start gap-5">
			<div
				className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl text-white shadow-lg"
				style={{ backgroundColor: BRAND.green, boxShadow: `0 12px 28px -10px ${hexToRgba(BRAND.green, 0.5)}` }}
			>
				<Icon className="h-8 w-8" />
			</div>
			<div className="min-w-0">
				<Eyebrow tone="mint">Pilar {n}</Eyebrow>
				<h2 className="mt-1 text-[2.4rem] font-black leading-none tracking-tight">{title}</h2>
				<p className="mt-2.5 max-w-xl text-[0.98rem] leading-relaxed text-neutral-600">{lead}</p>
			</div>
		</div>
	);
}

function BenefitRow({ children }: { children: ReactNode }) {
	return (
		<li className="flex items-start gap-2.5">
			<span
				className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full"
				style={{ backgroundColor: hexToRgba(BRAND.green, 0.1), color: BRAND.green }}
			>
				<Check className="h-3 w-3" strokeWidth={3.5} />
			</span>
			<span className="text-[0.92rem] leading-snug text-neutral-700">{children}</span>
		</li>
	);
}

/* Faixa de fechamento — ancora o pé de cada pilar com o resultado prático. */
function TakeawayStrip({ children }: { children: ReactNode }) {
	return (
		<div className="mt-8 flex items-center gap-3.5 rounded-2xl px-6 py-4" style={{ backgroundColor: hexToRgba(BRAND.green, 0.06) }}>
			<span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-white" style={{ backgroundColor: BRAND.green }}>
				<ArrowRight className="h-5 w-5" />
			</span>
			<p className="text-[0.98rem] leading-snug text-neutral-700">
				<strong className="font-black text-neutral-900">O resultado:</strong> {children}
			</p>
		</div>
	);
}

function SubHeading({ children }: { children: ReactNode }) {
	return <h3 className="mb-3 text-sm font-black uppercase tracking-wide text-neutral-900">{children}</h3>;
}

function MockCaption({ children }: { children: ReactNode }) {
	return <span className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-neutral-500">{children}</span>;
}

/* Moldura de dispositivo — usada nos mockups de tablet e WhatsApp */
function DeviceFrame({ children, className = "" }: { children: ReactNode; className?: string }) {
	return (
		<div
			className={`w-full rounded-[26px] p-3 shadow-2xl ${className}`}
			style={{ backgroundColor: "#0f172a", boxShadow: "0 30px 60px -25px rgba(15,23,42,0.6)" }}
		>
			{children}
		</div>
	);
}

/* -------------------------------------------------------------------------- */
/*  1 · Capa                                                                   */
/* -------------------------------------------------------------------------- */

function CoverSheet() {
	return (
		<Sheet className="text-white">
			<div className="relative flex h-full flex-1 flex-col justify-between px-14 py-16" style={{ backgroundColor: BRAND.green }}>
				{/* textura de pontos */}
				<div
					className="pointer-events-none absolute inset-0 opacity-[0.12]"
					style={{ backgroundImage: "radial-gradient(circle, #fff 1.2px, transparent 1.2px)", backgroundSize: "22px 22px" }}
				/>
				{/* brilho mint */}
				<div
					className="pointer-events-none absolute -right-40 -top-40 h-[560px] w-[560px] rounded-full opacity-40"
					style={{ background: `radial-gradient(circle, ${BRAND.mint} 0%, transparent 62%)` }}
				/>
				<div
					className="pointer-events-none absolute -bottom-56 -left-36 h-[500px] w-[500px] rounded-full opacity-40"
					style={{ background: `radial-gradient(circle, ${BRAND.greenDeep} 0%, transparent 62%)` }}
				/>

				{/* topo */}
				<div className="relative z-10 flex items-center justify-between">
					<div className="relative h-14 w-40">
						<BrandLogo lockup="stacked" tone="white" alt="RecompraCRM" fill className="object-contain object-left" />
					</div>
					<div className="flex flex-col items-end gap-1">
						<span className="rounded-full bg-white/10 px-4 py-1.5 text-[0.65rem] font-extrabold uppercase tracking-[0.22em] ring-1 ring-white/20">
							Proposta comercial
						</span>
						<span className="text-[0.68rem] font-semibold tracking-wide text-white/60">Agosto de 2026 · válida por 15 dias</span>
					</div>
				</div>

				{/* centro */}
				<div className="relative z-10 max-w-2xl">
					<Eyebrow tone="white">Preparada com exclusividade para</Eyebrow>
					<div className="mt-5 flex items-center gap-5">
						<div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-2xl shadow-lg ring-1 ring-white/25">
							{/* scale-150 corta a margem verde larga do arquivo da logo */}
							<Image src="/logo-fran-farma.jpg" alt="Fran Farma" width={96} height={96} className="h-full w-full scale-150 object-cover" />
						</div>
						<h1 className="text-[4rem] font-black leading-[0.9] tracking-tight text-balance">
							FRAN
							<br />
							FARMA
						</h1>
					</div>
					<div className="mt-6">
						<span
							className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-extrabold uppercase tracking-wide"
							style={{ backgroundColor: BRAND.mint, color: BRAND.greenDeep }}
						>
							<Gift className="h-4 w-4" /> Clube de Benefícios · cashback no CPF
						</span>
					</div>
					<p className="mt-8 max-w-xl text-lg font-medium leading-relaxed text-white/85">
						Um clube próprio para transformar cada compra de balcão em relacionamento — <strong className="font-extrabold text-white">fidelizar</strong> quem
						já compra, <strong className="font-extrabold text-white">reativar</strong> quem sumiu e ter{" "}
						<strong className="font-extrabold text-white">alguém operando isso</strong> pela farmácia, todo mês.
					</p>
				</div>

				{/* rodapé */}
				<div className="relative z-10 flex items-end justify-between">
					<div className="flex flex-col gap-1">
						<span className="text-[0.7rem] font-bold uppercase tracking-[0.25em] text-white/50">Os cinco pilares</span>
						<div className="flex flex-wrap items-center gap-1.5 text-[0.82rem] font-extrabold">
							<span className="rounded-md bg-white/10 px-2.5 py-1.5">Cadastro</span>
							<span className="text-white/40">·</span>
							<span className="rounded-md bg-white/10 px-2.5 py-1.5">Cashback</span>
							<span className="text-white/40">·</span>
							<span className="rounded-md bg-white/10 px-2.5 py-1.5">Reativação</span>
							<span className="text-white/40">·</span>
							<span className="rounded-md bg-white/10 px-2.5 py-1.5">Pontos e sorteios</span>
							<span className="text-white/40">·</span>
							<span className="rounded-md bg-white/10 px-2.5 py-1.5">Gestor</span>
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
	{ value: "Todo mês", label: "o cliente de farmácia volta — uso contínuo, higiene e cuidado diário não esperam promoção", icon: RefreshCw },
	{ value: "5–7×", label: "mais caro conquistar um cliente novo do que fazer um antigo voltar", icon: TrendingDown },
	{ value: "0", label: "contatos guardados hoje: cada cliente que sai pela porta some com a farmácia", icon: Users },
];

function OpportunitySheet() {
	return (
		<Sheet>
			<div className="flex flex-1 flex-col px-14 pt-16">
				<Eyebrow>O ponto de partida</Eyebrow>
				<h2 className="mt-4 max-w-3xl text-[2.9rem] font-black leading-[1.02] tracking-tight text-balance">
					O cliente já volta todo mês.
					<br />
					<span style={{ color: BRAND.green }}>A questão é para qual farmácia.</span>
				</h2>
				<p className="mt-5 max-w-2xl text-[1.05rem] leading-relaxed text-neutral-600">
					Na farmácia, a recompra é a regra: uso contínuo, dermocosméticos, higiene e cuidado diário trazem o mesmo cliente de volta todo mês. Mas sem um
					benefício próprio, essa volta é decidida por preço e conveniência — muitas vezes na grande rede.{" "}
					<strong className="font-bold text-neutral-900">O clube dá à Fran Farma um motivo que é só dela.</strong>
				</p>

				<div className="mt-10 grid grid-cols-3 gap-5">
					{OPPORTUNITY_STATS.map((stat) => (
						<div key={stat.label} className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-6">
							<div
								className="flex h-11 w-11 items-center justify-center rounded-xl"
								style={{ backgroundColor: hexToRgba(BRAND.green, 0.1), color: BRAND.green }}
							>
								<stat.icon className="h-5 w-5" />
							</div>
							<span className="text-[2.1rem] font-black leading-none tracking-tight" style={{ color: BRAND.ink }}>
								{stat.value}
							</span>
							<span className="text-sm leading-snug text-neutral-500">{stat.label}</span>
						</div>
					))}
				</div>

				{/* A virada */}
				<div className="mt-11 overflow-hidden rounded-2xl" style={{ backgroundColor: BRAND.surface }}>
					<div className="grid grid-cols-[1.1fr_auto_1.1fr] items-stretch">
						<div className="flex flex-col justify-center gap-2 p-8">
							<span className="text-[0.7rem] font-extrabold uppercase tracking-[0.2em] text-neutral-500">Hoje</span>
							<p className="text-lg font-bold leading-snug text-neutral-500">
								A venda acontece, o cliente vai embora e a próxima visita depende de quem estiver mais perto no dia.
							</p>
						</div>
						<div className="flex items-center justify-center px-2" style={{ backgroundColor: hexToRgba(BRAND.green, 0.06) }}>
							<div className="flex h-11 w-11 items-center justify-center rounded-full text-white" style={{ backgroundColor: BRAND.green }}>
								<ArrowRight className="h-5 w-5" />
							</div>
						</div>
						<div className="flex flex-col justify-center gap-2 p-8" style={{ backgroundColor: hexToRgba(BRAND.mint, 0.16) }}>
							<span className="text-[0.7rem] font-extrabold uppercase tracking-[0.2em]" style={{ color: BRAND.mintText }}>
								Com o clube
							</span>
							<p className="text-lg font-extrabold leading-snug text-neutral-900">
								Cada compra vira cadastro, cashback e um motivo concreto para o cliente voltar aqui — em piloto automático.
							</p>
						</div>
					</div>
				</div>

				<p className="mt-9 max-w-2xl text-[1.05rem] leading-relaxed text-neutral-600">
					As próximas páginas mostram exatamente como isso funciona na prática — telas reais do sistema, pilar a pilar, até o investimento.
				</p>
			</div>
			<SheetFooter index="02 / 09" label="A oportunidade" />
		</Sheet>
	);
}

/* -------------------------------------------------------------------------- */
/*  3 · A solução e o escopo                                                   */
/* -------------------------------------------------------------------------- */

function SolutionSheet() {
	return (
		<Sheet>
			<div className="flex flex-1 flex-col gap-6 px-14 py-12">
				{/* A solução */}
				<div>
					<SectionLabel icon={Sparkles} text="A solução — Clube de Benefícios" />
					<div className="grid grid-cols-3 gap-4">
						{SOLUTION_CARDS.map((card) => (
							<div key={card.title} className="flex flex-col gap-2.5 rounded-2xl border border-neutral-200 bg-white p-4">
								<div
									className="flex h-10 w-10 items-center justify-center rounded-xl"
									style={{ backgroundColor: hexToRgba(BRAND.green, 0.1), color: BRAND.green }}
								>
									<card.icon className="h-5 w-5" />
								</div>
								<h3 className="text-[0.8rem] font-black uppercase leading-tight tracking-tight text-neutral-900">{card.title}</h3>
								<p className="text-[0.75rem] leading-snug text-neutral-600">{card.body}</p>
							</div>
						))}
					</div>

					{/* Campos do cadastro */}
					<div className="mt-4 flex items-center gap-4 rounded-2xl border border-neutral-200 bg-white px-5 py-3.5">
						<span className="flex-shrink-0 text-[0.62rem] font-black uppercase leading-tight tracking-[0.18em] text-neutral-400">
							O que o
							<br />
							cadastro
							<br />
							captura
						</span>
						<div className="flex flex-wrap gap-1.5">
							{PROFILE_FIELDS.map((field) => (
								<span
									key={field}
									className="rounded-full px-2.5 py-1 text-[0.68rem] font-bold"
									style={{ backgroundColor: hexToRgba(BRAND.mint, 0.2), color: BRAND.green }}
								>
									{field}
								</span>
							))}
						</div>
					</div>
				</div>

				{/* Escopo */}
				<div>
					<SectionLabel icon={Check} text="Escopo — o que entregamos" />
					<div className="grid grid-cols-2 gap-x-6 gap-y-4">
						{DELIVERABLES.map((item) => (
							<div key={item.title} className="flex items-start gap-3">
								<div
									className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
									style={{ backgroundColor: hexToRgba(BRAND.mint, 0.22), color: BRAND.green }}
								>
									<item.icon className="h-4 w-4" />
								</div>
								<div className="min-w-0">
									<h4 className="text-[0.82rem] font-bold leading-tight text-neutral-900">{item.title}</h4>
									<p className="text-[0.75rem] leading-snug text-neutral-600">{item.body}</p>
								</div>
							</div>
						))}
					</div>
				</div>

				{/* A recompra já existe */}
				<div
					className="mt-auto flex items-center gap-4 overflow-hidden rounded-2xl px-6 py-5"
					style={{ backgroundColor: hexToRgba(BRAND.green, 0.08), border: `1px solid ${hexToRgba(BRAND.green, 0.25)}` }}
				>
					<div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-white" style={{ backgroundColor: BRAND.green }}>
						<RefreshCw className="h-6 w-6" />
					</div>
					<div className="min-w-0 flex-1">
						<div className="mb-1 flex items-center gap-2">
							<h4 className="text-[0.92rem] font-black uppercase tracking-tight" style={{ color: BRAND.green }}>
								A recompra já existe
							</h4>
							<span
								className="rounded-full px-2 py-0.5 text-[0.55rem] font-black uppercase tracking-wider"
								style={{ backgroundColor: BRAND.mint, color: BRAND.greenDeep }}
							>
								Previsível por natureza
							</span>
						</div>
						<p className="text-[0.85rem] leading-snug text-neutral-700">
							O cliente de farmácia volta todo mês por necessidade — a única pergunta é para qual farmácia. O clube faz essa escolha pesar para a Fran Farma.
							Os cinco pilares a seguir mostram cada peça funcionando.
						</p>
					</div>
				</div>
			</div>
			<SheetFooter index="03 / 09" label="A solução · Fran Farma" />
		</Sheet>
	);
}

/* -------------------------------------------------------------------------- */
/*  4 · Pilar 01 — Cadastro                                                    */
/* -------------------------------------------------------------------------- */

function RegistrationSheet() {
	return (
		<Sheet>
			<div className="flex flex-1 flex-col px-14 pt-14">
				<PillarHeader
					n="01"
					icon={ClipboardList}
					title="Cadastro em segundos"
					lead="No balcão, o cliente informa nome, WhatsApp e CPF — e já entra no clube. Sem aplicativo, sem cartãozinho, sem travar a fila do caixa."
				/>

				<div className="mt-9 grid grid-cols-[0.95fr_1.05fr] items-start gap-10">
					{/* Coluna texto */}
					<div className="flex flex-col gap-7 pt-1">
						<div>
							<SubHeading>Como funciona no balcão</SubHeading>
							<ul className="flex flex-col gap-2.5">
								<BenefitRow>O atendente pergunta o CPF — hábito que o cliente já tem da nota.</BenefitRow>
								<BenefitRow>CPF novo abre o cadastro na hora: nome, WhatsApp e aniversário.</BenefitRow>
								<BenefitRow>CPF já cadastrado puxa o saldo de cashback direto na tela.</BenefitRow>
								<BenefitRow>Consentimento LGPD registrado no mesmo passo, sem papel.</BenefitRow>
							</ul>
						</div>

						<div
							className="rounded-2xl border border-dashed p-5"
							style={{ borderColor: hexToRgba(BRAND.mint, 0.75), backgroundColor: hexToRgba(BRAND.mint, 0.1) }}
						>
							<div className="mb-1.5 flex items-center gap-2">
								<QrCode className="h-4 w-4" style={{ color: BRAND.mintText }} />
								<span className="text-[0.7rem] font-black uppercase tracking-wider" style={{ color: BRAND.mintText }}>
									Cadastro também fora do balcão
								</span>
							</div>
							<p className="text-[0.92rem] leading-relaxed text-neutral-700">
								O mesmo formulário abre por um QR Code — no balcão, na gôndola, no encarte e nas redes sociais. Quem ainda não é cliente também entra na
								base: <strong className="font-extrabold">seguidores e vizinhos viram contatos identificados</strong>, prontos para receber ofertas.
							</p>
						</div>

						<div>
							<SubHeading>Todos os dados que o cadastro pede</SubHeading>
							<div className="flex flex-wrap gap-1.5">
								{PROFILE_FIELDS.map((field) => (
									<span
										key={field}
										className="rounded-full px-3 py-1.5 text-[0.72rem] font-bold"
										style={{ backgroundColor: hexToRgba(BRAND.mint, 0.2), color: BRAND.green }}
									>
										{field}
									</span>
								))}
							</div>
						</div>
					</div>

					{/* Coluna mockup — formulário de cadastro */}
					<div className="flex flex-col items-center gap-3">
						<RegistrationFormMock />
						<MockCaption>O formulário que o balcão e o QR Code abrem</MockCaption>
					</div>
				</div>

				<TakeawayStrip>uma base de clientes que cresce todos os dias — dentro e fora da loja — e que pertence à Fran Farma.</TakeawayStrip>
			</div>
			<SheetFooter index="04 / 09" label="Pilar 01 · Cadastro" />
		</Sheet>
	);
}

function MockField({ label, value, placeholder }: { label: string; value: string; placeholder?: boolean }) {
	return (
		<div className="flex flex-col gap-1">
			<span className="text-[0.55rem] font-black uppercase tracking-[0.15em] text-neutral-400">{label}</span>
			<div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2">
				<span className={`text-[0.78rem] font-semibold ${placeholder ? "text-neutral-400" : "text-neutral-800"}`}>{value}</span>
			</div>
		</div>
	);
}

function RegistrationFormMock() {
	return (
		<DeviceFrame className="max-w-[400px]">
			<div className="overflow-hidden rounded-[18px] bg-white">
				{/* barra do navegador */}
				<div className="flex items-center gap-2 border-b border-neutral-200 bg-neutral-100 px-4 py-2.5">
					<span className="h-2 w-2 rounded-full bg-neutral-300" />
					<span className="h-2 w-2 rounded-full bg-neutral-300" />
					<span className="h-2 w-2 rounded-full bg-neutral-300" />
					<span className="ml-2 flex-1 truncate rounded-md bg-white px-2.5 py-1 text-[0.6rem] font-semibold text-neutral-500 ring-1 ring-neutral-200">
						clube.franfarma.com.br
					</span>
				</div>

				{/* cabeçalho do clube */}
				<div className="flex items-center gap-3 px-5 py-4 text-white" style={heroGradient}>
					<div className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-lg ring-1 ring-white/25">
						<Image src="/logo-fran-farma.jpg" alt="Fran Farma" width={36} height={36} className="h-full w-full scale-150 object-cover" />
					</div>
					<div className="flex flex-col leading-none">
						<span className="text-[0.85rem] font-extrabold">Fran Farma</span>
						<span className="text-[0.62rem] font-medium text-white/70">Clube de Benefícios</span>
					</div>
				</div>

				{/* campos */}
				<div className="flex flex-col gap-3 px-5 py-5">
					<MockField label="Nome completo" value="Maria Souza" />
					<div className="grid grid-cols-2 gap-3">
						<MockField label="Telefone / WhatsApp" value="(34) 99912-4478" />
						<MockField label="CPF" value="123.456.789-00" />
					</div>
					<div className="grid grid-cols-2 gap-3">
						<MockField label="Data de nascimento" value="14/03/1987" />
						<div className="flex flex-col gap-1">
							<span className="text-[0.55rem] font-black uppercase tracking-[0.15em] text-neutral-400">Você é</span>
							<div className="flex gap-1.5">
								<span className="flex-1 rounded-lg border border-neutral-200 py-2 text-center text-[0.7rem] font-semibold text-neutral-400">Homem</span>
								<span
									className="flex-1 rounded-lg py-2 text-center text-[0.7rem] font-bold text-white"
									style={{ backgroundColor: BRAND.green }}
								>
									Mulher
								</span>
							</div>
						</div>
					</div>

					{/* consentimento */}
					<div className="mt-1 flex items-start gap-2 rounded-lg px-3 py-2.5" style={{ backgroundColor: hexToRgba(BRAND.mint, 0.14) }}>
						<span
							className="mt-0.5 flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded-[4px] text-white"
							style={{ backgroundColor: BRAND.green }}
						>
							<Check className="h-2.5 w-2.5" strokeWidth={4} />
						</span>
						<span className="text-[0.62rem] leading-snug text-neutral-600">
							Autorizo a Fran Farma a me enviar ofertas e novidades pelo WhatsApp — de acordo com a LGPD.
						</span>
					</div>

					<div
						className="mt-1 flex items-center justify-center gap-1.5 rounded-xl py-3 text-[0.8rem] font-extrabold uppercase tracking-wide text-white"
						style={{ backgroundColor: BRAND.green }}
					>
						<Gift className="h-4 w-4" /> Entrar para o clube
					</div>
					<p className="text-center text-[0.6rem] text-neutral-400">Leva menos de 1 minuto — e não precisa comprar nada.</p>
				</div>
			</div>
		</DeviceFrame>
	);
}

/* -------------------------------------------------------------------------- */
/*  5 · Pilar 02 — Fidelização com cashback                                    */
/* -------------------------------------------------------------------------- */

function CashbackSheet() {
	return (
		<Sheet>
			<div className="flex flex-1 flex-col px-14 pt-14">
				<PillarHeader
					n="02"
					icon={Wallet}
					title="Fidelização com cashback"
					lead="Parte de cada compra vira crédito com validade, resgatado pelo CPF na visita seguinte. O cliente ganha um motivo concreto para voltar aqui — e não na rede da esquina."
				/>

				<div className="mt-9 grid grid-cols-[0.95fr_1.05fr] items-start gap-10">
					{/* Coluna texto */}
					<div className="flex flex-col gap-7 pt-1">
						<div>
							<SubHeading>Como funciona no balcão</SubHeading>
							<ul className="flex flex-col gap-2.5">
								<BenefitRow>O cliente informa o CPF — o mesmo fluxo do cadastro.</BenefitRow>
								<BenefitRow>O cashback é calculado sobre a compra e creditado na hora.</BenefitRow>
								<BenefitRow>O saldo é resgatado em compras futuras, com validade definida.</BenefitRow>
								<BenefitRow>Percentuais, validade e regras definidos por vocês, por período.</BenefitRow>
							</ul>
						</div>

						<div
							className="rounded-2xl border border-dashed p-5"
							style={{ borderColor: hexToRgba(BRAND.mint, 0.75), backgroundColor: hexToRgba(BRAND.mint, 0.1) }}
						>
							<div className="mb-1.5 flex items-center gap-2">
								<Gift className="h-4 w-4" style={{ color: BRAND.mintText }} />
								<span className="text-[0.7rem] font-black uppercase tracking-wider" style={{ color: BRAND.mintText }}>
									O ativo que fica com vocês
								</span>
							</div>
							<p className="text-[0.92rem] leading-relaxed text-neutral-700">
								O cashback é a isca. O que fica é a <strong className="font-extrabold">base de clientes da Fran Farma</strong>, pronta para campanhas — e
								segmentada automaticamente pela Matriz RFM.
							</p>
						</div>

						<RfmMiniMatrix />
					</div>

					{/* Coluna mockup — tablet Ponto de Interação */}
					<div className="flex flex-col items-center gap-3">
						<PointOfInteractionMock />
						<MockCaption>Ponto de Interação · tablet no balcão</MockCaption>
					</div>
				</div>

				<TakeawayStrip>clientes com um motivo concreto para escolher a Fran Farma — e uma base que se segmenta sozinha a cada compra.</TakeawayStrip>
			</div>
			<SheetFooter index="05 / 09" label="Pilar 02 · Fidelização" />
		</Sheet>
	);
}

function PointOfInteractionMock() {
	return (
		<DeviceFrame className="max-w-[380px]">
			<div className="overflow-hidden rounded-[18px] bg-white">
				{/* barra da loja */}
				<div className="flex items-center justify-between px-5 py-3.5 text-white" style={heroGradient}>
					<div className="flex items-center gap-2">
						<div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-lg ring-1 ring-white/25">
							<Image src="/logo-fran-farma.jpg" alt="Fran Farma" width={32} height={32} className="h-full w-full scale-150 object-cover" />
						</div>
						<div className="flex flex-col leading-none">
							<span className="text-[0.8rem] font-extrabold">Fran Farma</span>
							<span className="text-[0.6rem] font-medium text-white/60">Balcão · Caixa 01</span>
						</div>
					</div>
					<span className="rounded-full bg-white/15 px-2.5 py-1 text-[0.58rem] font-bold uppercase tracking-wide">Pontuar</span>
				</div>

				{/* perfil do cliente */}
				<div className="flex flex-col gap-4 px-5 py-5">
					<div className="flex items-center gap-3">
						<div
							className="flex h-12 w-12 items-center justify-center rounded-full text-base font-black"
							style={{ backgroundColor: hexToRgba(BRAND.green, 0.12), color: BRAND.green }}
						>
							MS
						</div>
						<div className="flex flex-col leading-tight">
							<span className="text-[0.95rem] font-extrabold tracking-tight text-neutral-900">Maria Souza</span>
							<span className="text-[0.72rem] text-neutral-500">(34) 99912-4478 · 18 compras</span>
						</div>
						<span
							className="ml-auto rounded-full px-2.5 py-1 text-[0.58rem] font-black tracking-wide"
							style={{ backgroundColor: BRAND.mint, color: BRAND.greenDeep }}
						>
							CLIENTE LEAL
						</span>
					</div>

					{/* saldo de cashback */}
					<div className="rounded-2xl px-5 py-4 text-center" style={{ backgroundColor: hexToRgba(BRAND.mint, 0.16) }}>
						<span className="text-[0.62rem] font-black uppercase tracking-[0.2em]" style={{ color: BRAND.mintText }}>
							Cashback disponível
						</span>
						<p className="mt-1 text-3xl font-black tabular-nums" style={{ color: BRAND.ink }}>
							R$ 23,50
						</p>
						<span className="mt-0.5 block text-[0.58rem] font-semibold text-neutral-500">Válido até 30/09</span>
					</div>

					{/* valor da venda */}
					<div className="flex items-center justify-between rounded-xl border border-neutral-200 px-4 py-3">
						<span className="text-[0.72rem] font-semibold text-neutral-500">Valor da venda</span>
						<span className="text-lg font-black tabular-nums text-neutral-900">R$ 187,40</span>
					</div>

					{/* botões */}
					<div className="grid grid-cols-2 gap-2.5">
						<div
							className="flex items-center justify-center gap-1.5 rounded-xl py-3 text-[0.78rem] font-extrabold uppercase text-white"
							style={{ backgroundColor: BRAND.green }}
						>
							<Sparkles className="h-4 w-4" /> Pontuar
						</div>
						<div
							className="flex items-center justify-center gap-1.5 rounded-xl py-3 text-[0.78rem] font-extrabold uppercase"
							style={{ backgroundColor: BRAND.mint, color: BRAND.greenDeep }}
						>
							<Gift className="h-4 w-4" /> Resgatar
						</div>
					</div>
					<p className="text-center text-[0.62rem] text-neutral-500">
						Vai gerar <strong className="font-bold text-neutral-600">R$ 9,37</strong> de cashback nesta compra
					</p>
				</div>
			</div>
		</DeviceFrame>
	);
}

const RFM_SEGMENTS = [
	{ label: "Campeões", count: 84, bg: "#fb923c", text: "#0a0a0a" },
	{ label: "Leais", count: 213, bg: "#4ade80", text: "#0a0a0a" },
	{ label: "Em risco", count: 96, bg: "#facc15", text: "#0a0a0a" },
	{ label: "Prestes a dormir", count: 61, bg: "#ca8a04", text: "#fff" },
	{ label: "Hibernando", count: 148, bg: "#c084fc", text: "#fff" },
	{ label: "Perdidos", count: 179, bg: "#ef4444", text: "#fff" },
];

function RfmMiniMatrix() {
	return (
		<div>
			<SubHeading>Sua base, já segmentada</SubHeading>
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

/* -------------------------------------------------------------------------- */
/*  6 · Pilar 03 — Reativação automática                                       */
/* -------------------------------------------------------------------------- */

const FUNNEL = [
	{ label: "Enviados", value: 980, pct: 100 },
	{ label: "Entregues", value: 946, pct: 96 },
	{ label: "Lidos", value: 637, pct: 65 },
	{ label: "Convertidos", value: 141, pct: 14 },
];

function ReactivationSheet() {
	return (
		<Sheet>
			<div className="flex flex-1 flex-col px-14 pt-14">
				<PillarHeader
					n="03"
					icon={Megaphone}
					title="Reativação automática"
					lead="Quando um cliente passa do ciclo habitual sem aparecer, a plataforma dispara a mensagem certa no WhatsApp — com cashback de presente para trazê-lo de volta."
				/>

				<div className="mt-9 grid grid-cols-[1.05fr_0.95fr] items-start gap-10">
					{/* Mockup WhatsApp */}
					<div className="flex flex-col items-center gap-3">
						<WhatsappCampaignMock />
						<MockCaption>Campanha automática · gatilho “Em risco”</MockCaption>
					</div>

					{/* Funil + gatilhos */}
					<div className="flex flex-col gap-7 pt-1">
						<div>
							<SubHeading>Funil da campanha</SubHeading>
							<div className="flex flex-col gap-2.5">
								{FUNNEL.map((step, i) => (
									<div key={step.label} className="flex flex-col gap-1">
										<div className="flex items-center justify-between text-[0.78rem]">
											<span className="font-bold text-neutral-700">{step.label}</span>
											<span className="font-black tabular-nums text-neutral-900">
												{step.value.toLocaleString("pt-BR")}
												<span className="ml-1.5 font-semibold text-neutral-500">{step.pct}%</span>
											</span>
										</div>
										<div className="h-2.5 w-full overflow-hidden rounded-full bg-neutral-100">
											<div
												className="h-full rounded-full"
												style={{
													width: `${step.pct}%`,
													backgroundColor: i === FUNNEL.length - 1 ? BRAND.mint : BRAND.green,
													opacity: i === FUNNEL.length - 1 ? 1 : 1 - i * 0.12,
												}}
											/>
										</div>
									</div>
								))}
							</div>
							<div className="mt-4 flex items-center gap-2.5 rounded-xl px-4 py-3" style={{ backgroundColor: hexToRgba(BRAND.mint, 0.16) }}>
								<span className="text-2xl font-black tabular-nums" style={{ color: BRAND.ink }}>
									R$ 9.870
								</span>
								<span className="text-[0.8rem] font-semibold leading-tight text-neutral-600">
									em vendas recuperadas
									<br />
									de uma única campanha
								</span>
							</div>
						</div>

						<div>
							<SubHeading>Dispara sozinho quando</SubHeading>
							<ul className="flex flex-col gap-2.5">
								<BenefitRow>O cliente passa do ciclo habitual dele sem aparecer.</BenefitRow>
								<BenefitRow>Alguém migra para um segmento de risco na Matriz RFM.</BenefitRow>
								<BenefitRow>O cashback está prestes a expirar — urgência com motivo real.</BenefitRow>
								<BenefitRow>É aniversário do cliente — mensagem + brinde na hora.</BenefitRow>
							</ul>
						</div>
					</div>
				</div>

				<TakeawayStrip>clientes que sumiram voltando a comprar — no piloto automático, sem a equipe levantar um dedo.</TakeawayStrip>
			</div>
			<SheetFooter index="06 / 09" label="Pilar 03 · Reativação" />
		</Sheet>
	);
}

function WhatsappCampaignMock() {
	return (
		<DeviceFrame className="max-w-[360px] overflow-hidden">
			<div className="overflow-hidden rounded-[18px]" style={{ backgroundColor: "#e6ddd4" }}>
				{/* header whatsapp */}
				<div className="flex items-center gap-3 px-4 py-3 text-white" style={{ backgroundColor: "#075E54" }}>
					<div className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-full ring-1 ring-white/25">
						<Image src="/logo-fran-farma.jpg" alt="Fran Farma" width={36} height={36} className="h-full w-full scale-150 object-cover" />
					</div>
					<div className="flex flex-col leading-none">
						<span className="text-[0.85rem] font-bold">Fran Farma</span>
						<span className="text-[0.6rem] text-white/70">conta comercial</span>
					</div>
					<FaWhatsapp className="ml-auto h-5 w-5 text-white/80" />
				</div>

				{/* mensagens */}
				<div
					className="flex flex-col gap-2.5 px-4 py-5"
					style={{ backgroundImage: "radial-gradient(rgba(0,0,0,0.03) 1px, transparent 1px)", backgroundSize: "16px 16px" }}
				>
					<div className="max-w-[85%] self-start rounded-2xl rounded-tl-sm bg-white px-3.5 py-2.5 shadow-sm">
						<p className="text-[0.82rem] leading-snug text-neutral-800">
							Oi, Maria! 👋 Sentimos sua falta aqui na <strong>Fran Farma</strong>.
						</p>
						<p className="mt-2 text-[0.82rem] leading-snug text-neutral-800">
							Você tem <strong>R$ 23,50 de cashback</strong> esperando por você — mas ele vence dia 30! 🎁
						</p>
						<span className="mt-1.5 block text-right text-[0.58rem] text-neutral-500">09:14 ✓✓</span>
					</div>

					<div className="max-w-[85%] self-start rounded-2xl rounded-tl-sm px-3.5 py-2.5 shadow-sm" style={{ backgroundColor: "#dcf8c6" }}>
						<p className="text-[0.82rem] leading-snug text-neutral-800">Nossa, nem lembrava! Passo aí amanhã pra pegar o remédio da minha mãe 🙌</p>
						<span className="mt-1.5 block text-right text-[0.58rem] text-neutral-500">09:31 ✓✓</span>
					</div>

					{/* etiqueta convertido */}
					<div
						className="mt-1 self-center rounded-full px-3 py-1 text-[0.6rem] font-black uppercase tracking-wide text-white shadow"
						style={{ backgroundColor: BRAND.green }}
					>
						Convertido · compra de R$ 187,40
					</div>
				</div>
			</div>
		</DeviceFrame>
	);
}

/* -------------------------------------------------------------------------- */
/*  7 · Pilar 04 — Pontos, vale-compras e sorteios                             */
/* -------------------------------------------------------------------------- */

const RAFFLE_NUMBERS = [
	{ code: "04821", value: "R$ 214,90" },
	{ code: "04822", value: "R$ 187,40" },
	{ code: "05107", value: "R$ 96,20" },
];

function PointsSheet() {
	return (
		<Sheet>
			<div className="flex flex-1 flex-col px-14 pt-14">
				<PillarHeader
					n="04"
					icon={Ticket}
					title="Pontos, vale-compras e sorteios"
					lead="O modelo alternativo ao cashback, no mesmo motor do clube: cada real vira ponto, pontos viram vale-compras — e as campanhas geram números da sorte para sorteios."
				/>

				{/* Pontos → vale-compras */}
				<div className="mt-8">
					<div className="mb-3 flex items-center gap-2.5">
						<h3 className="text-sm font-black uppercase tracking-wide text-neutral-900">Pontos e vale-compras</h3>
						<span
							className="rounded-full px-2.5 py-0.5 text-[0.55rem] font-black uppercase tracking-wider"
							style={{ backgroundColor: hexToRgba(BRAND.mint, 0.25), color: BRAND.green }}
						>
							Mesmo motor do cashback · só muda a régua
						</span>
					</div>

					<div className="grid grid-cols-[1fr_auto_1fr_auto_0.95fr] items-center gap-4">
						<ConversionStep value="R$ 1,00" label="em compras" />
						<StepArrow />
						<ConversionStep value="1 ponto" label="creditado na hora" accent />
						<StepArrow />
						<VoucherMock />
					</div>

					<div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2">
						<ul className="flex flex-col gap-2.5">
							<BenefitRow>A cada R$ 1,00 em compras, 1 ponto creditado pelo CPF no caixa.</BenefitRow>
							<BenefitRow>500 pontos viram um vale-compras de R$ 5,00, resgatado no WhatsApp.</BenefitRow>
						</ul>
						<ul className="flex flex-col gap-2.5">
							<BenefitRow>O voucher tem código único e vale desconto direto no caixa.</BenefitRow>
							<BenefitRow>Conversão, validade e limites de resgate configurados por vocês.</BenefitRow>
						</ul>
					</div>
				</div>

				{/* Sorteios */}
				<div className="mt-8">
					<SubHeading>Campanhas que geram números para sorteios</SubHeading>
					<div className="grid grid-cols-[1.05fr_0.95fr] items-start gap-8">
						<div className="rounded-2xl border border-neutral-200 bg-white p-5">
							<div className="mb-3 flex items-center gap-2">
								<Trophy className="h-4 w-4" style={{ color: BRAND.mintText }} />
								<span className="text-[0.72rem] font-black uppercase tracking-wide text-neutral-900">Sorteio de aniversário da Fran Farma</span>
							</div>
							<p className="mb-3 text-[0.72rem] font-semibold" style={{ color: BRAND.mintText }}>
								A cada R$ 100 em compras · 1 número da sorte
							</p>
							<div className="flex flex-col gap-2">
								{RAFFLE_NUMBERS.map((n) => (
									<div key={n.code} className="flex items-center gap-3 rounded-xl px-3 py-2" style={{ backgroundColor: hexToRgba(BRAND.mint, 0.12) }}>
										<span className="rounded-lg px-2.5 py-1 text-[0.9rem] font-black tabular-nums text-white" style={{ backgroundColor: BRAND.green }}>
											{n.code}
										</span>
										<div className="flex min-w-0 flex-col leading-tight">
											<span className="text-[0.75rem] font-extrabold text-neutral-900">Maria Souza</span>
											<span className="text-[0.65rem] text-neutral-500">Compra de {n.value} · Fran Farma</span>
										</div>
									</div>
								))}
							</div>
						</div>

						<ul className="flex flex-col gap-2.5 pt-1">
							<BenefitRow>A campanha define a regra — ex.: a cada R$ 100 no período, um número.</BenefitRow>
							<BenefitRow>O número é gerado na compra e enviado por WhatsApp na hora.</BenefitRow>
							<BenefitRow>Cada número é único e fica no cadastro — auditável no dia do sorteio.</BenefitRow>
							<BenefitRow>O painel lista todos os números emitidos por campanha e por cliente.</BenefitRow>
						</ul>
					</div>
				</div>

				<TakeawayStrip>
					pontos que viram vale-compras e compras que viram números da sorte — tudo sobre o mesmo cadastro, sem sistema paralelo.
				</TakeawayStrip>
			</div>
			<SheetFooter index="07 / 09" label="Pilar 04 · Pontos e sorteios" />
		</Sheet>
	);
}

function ConversionStep({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
	return (
		<div
			className="flex flex-col items-center gap-1 rounded-2xl border px-4 py-5 text-center"
			style={
				accent
					? { borderColor: hexToRgba(BRAND.mint, 0.7), backgroundColor: hexToRgba(BRAND.mint, 0.12) }
					: { borderColor: BRAND.border, backgroundColor: "#fff" }
			}
		>
			<span className="text-xl font-black tracking-tight" style={{ color: accent ? BRAND.green : BRAND.ink }}>
				{value}
			</span>
			<span className="text-[0.68rem] font-semibold text-neutral-500">{label}</span>
		</div>
	);
}

function StepArrow() {
	return (
		<span className="flex h-7 w-7 items-center justify-center rounded-full text-white" style={{ backgroundColor: BRAND.green }}>
			<ArrowRight className="h-3.5 w-3.5" />
		</span>
	);
}

function VoucherMock() {
	return (
		<div className="overflow-hidden rounded-2xl shadow-lg" style={{ boxShadow: `0 16px 34px -18px ${hexToRgba(BRAND.green, 0.6)}` }}>
			<div className="flex items-center gap-2 px-3.5 py-2 text-white" style={heroGradient}>
				<Ticket className="h-3.5 w-3.5" />
				<span className="text-[0.62rem] font-extrabold uppercase tracking-wide">Vale-compras · Fran Farma</span>
			</div>
			<div className="flex flex-col items-center gap-0.5 bg-white px-3.5 py-3 text-center">
				<span className="text-[0.55rem] font-black uppercase tracking-[0.15em] text-neutral-400">Desconto na próxima compra</span>
				<span className="text-2xl font-black tabular-nums" style={{ color: BRAND.green }}>
					R$ 5,00
				</span>
				<span className="text-[0.58rem] text-neutral-500">500 pontos · válido por 30 dias</span>
				<span
					className="mt-1 rounded-md px-2.5 py-1 text-[0.65rem] font-black tracking-[0.15em]"
					style={{ backgroundColor: hexToRgba(BRAND.mint, 0.22), color: BRAND.green }}
				>
					FF-A8K3
				</span>
			</div>
		</div>
	);
}

/* -------------------------------------------------------------------------- */
/*  8 · Pilar 05 — Gestor de crescimento                                       */
/* -------------------------------------------------------------------------- */

const MONTHLY_ROUTINE = [
	{
		icon: CalendarCheck,
		title: "Calendário do mês",
		body: "Montamos as campanhas do período — datas comemorativas, sazonalidade da farmácia e segmentos prioritários.",
	},
	{
		icon: Megaphone,
		title: "Criação e disparo",
		body: "Escrevemos as mensagens, definimos o público na Matriz RFM e disparamos — vocês só aprovam.",
	},
	{
		icon: BarChart3,
		title: "Leitura de resultados",
		body: "Enviados, lidos, convertidos e faturamento atribuído a cada campanha, entregues em relatório mensal.",
	},
	{
		icon: RefreshCw,
		title: "Ajuste do ciclo",
		body: "O que converteu vira régua; o que não converteu é trocado. Cada mês começa melhor que o anterior.",
	},
];

function GrowthManagerSheet() {
	return (
		<Sheet>
			<div className="flex flex-1 flex-col px-14 pt-14">
				<PillarHeader
					n="05"
					icon={HeartHandshake}
					title="Gestor de crescimento"
					lead="A parte que costuma travar todo clube de fidelidade é a operação. Aqui ela não fica com vocês: a gente cria, dispara e otimiza as campanhas pela Fran Farma."
				/>

				{/* Rotina mensal */}
				<div className="mt-8">
					<SubHeading>A rotina mensal, feita por nós</SubHeading>
					<div className="grid grid-cols-4 gap-3.5">
						{MONTHLY_ROUTINE.map((step, i) => (
							<div key={step.title} className="flex flex-col gap-2 rounded-2xl border border-neutral-200 bg-white p-4">
								<div className="flex items-center gap-2">
									<span
										className="flex h-6 w-6 items-center justify-center rounded-full text-[0.65rem] font-black text-white"
										style={{ backgroundColor: BRAND.green }}
									>
										{i + 1}
									</span>
									<step.icon className="h-4 w-4" style={{ color: BRAND.mintText }} />
								</div>
								<h4 className="text-[0.78rem] font-black uppercase leading-tight tracking-tight text-neutral-900">{step.title}</h4>
								<p className="text-[0.7rem] leading-snug text-neutral-600">{step.body}</p>
							</div>
						))}
					</div>
				</div>

				{/* Painel */}
				<div className="mt-8">
					<SubHeading>O painel que vocês acompanham</SubHeading>
					<div className="rounded-3xl border border-neutral-200 bg-neutral-50/60 p-6">
						{/* barra topo do painel */}
						<div className="mb-4 flex items-center justify-between">
							<div className="flex items-center gap-2">
								<span className="flex h-7 w-7 items-center justify-center rounded-lg text-white" style={{ backgroundColor: BRAND.green }}>
									<LayoutDashboard className="h-4 w-4" />
								</span>
								<span className="text-sm font-black tracking-tight text-neutral-900">Painel do clube</span>
								<span className="text-xs text-neutral-500">· Fran Farma</span>
							</div>
							<div className="flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-[0.68rem] font-bold text-neutral-500 ring-1 ring-neutral-200">
								Agosto de 2026
							</div>
						</div>

						<div className="grid grid-cols-4 gap-3">
							<StatMock title="Base do clube" icon={Users} value="781" sub="+126 no mês" />
							<StatMock title="Cashback emitido" icon={Gift} value="R$ 6.940" sub="R$ 4.180 resgatados" progress={60} />
							<StatMock title="Taxa de retorno" icon={RefreshCw} value="62%" sub="clientes que voltaram em 60 dias" />
							<StatMock title="Receita atribuída" icon={BarChart3} value="R$ 31.460" sub="a campanhas do mês" highlight />
						</div>

						<div className="mt-3 grid grid-cols-3 gap-3">
							<CampaignRowMock name="Cashback expirando" trigger="Saldo vence em 7 dias" sent="312" revenue="R$ 9.870" />
							<CampaignRowMock name="Cliente sumido" trigger="Passou do ciclo habitual" sent="268" revenue="R$ 12.240" />
							<CampaignRowMock name="Aniversário" trigger="No dia, com brinde" sent="94" revenue="R$ 5.310" />
						</div>
					</div>
				</div>

				<TakeawayStrip>um clube que roda de verdade todo mês — porque tem dono, e o dono é a gente.</TakeawayStrip>
			</div>
			<SheetFooter index="08 / 09" label="Pilar 05 · Gestor de crescimento" />
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
			style={highlight ? { borderColor: hexToRgba(BRAND.mint, 0.7), backgroundColor: hexToRgba(BRAND.mint, 0.09) } : { borderColor: BRAND.border }}
		>
			<div className="flex items-center gap-1.5 text-neutral-500">
				<Icon className="h-3.5 w-3.5" />
				<span className="text-[0.58rem] font-black uppercase tracking-wide">{title}</span>
			</div>
			<span className="text-xl font-black tabular-nums leading-none text-neutral-900">{value}</span>
			{typeof progress === "number" ? (
				<div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
					<div className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: BRAND.green }} />
				</div>
			) : null}
			<span className="text-[0.62rem] leading-tight text-neutral-500">{sub}</span>
		</div>
	);
}

function CampaignRowMock({ name, trigger, sent, revenue }: { name: string; trigger: string; sent: string; revenue: string }) {
	return (
		<div className="flex flex-col gap-2 rounded-xl border border-neutral-200 bg-white px-3.5 py-3">
			<div className="flex items-center gap-1.5">
				<AlarmClock className="h-3 w-3 flex-shrink-0 text-neutral-400" />
				<span className="truncate text-[0.75rem] font-extrabold tracking-tight text-neutral-900">{name}</span>
				<span
					className="ml-auto flex-shrink-0 rounded-full px-1.5 py-0.5 text-[0.5rem] font-black uppercase tracking-wide"
					style={{ backgroundColor: hexToRgba(BRAND.mint, 0.25), color: BRAND.green }}
				>
					Auto
				</span>
			</div>
			<span className="text-[0.62rem] leading-tight text-neutral-500">{trigger}</span>
			<div className="flex items-end justify-between border-t border-neutral-100 pt-2">
				<div className="flex flex-col leading-none">
					<span className="text-[0.5rem] font-black uppercase tracking-wide text-neutral-400">Enviados</span>
					<span className="mt-0.5 text-[0.8rem] font-black tabular-nums text-neutral-700">{sent}</span>
				</div>
				<div className="flex flex-col items-end leading-none">
					<span className="text-[0.5rem] font-black uppercase tracking-wide text-neutral-400">Receita</span>
					<span className="mt-0.5 text-[0.8rem] font-black tabular-nums" style={{ color: BRAND.green }}>
						{revenue}
					</span>
				</div>
			</div>
		</div>
	);
}

/* -------------------------------------------------------------------------- */
/*  9 · Investimento, caminho e fechamento                                     */
/* -------------------------------------------------------------------------- */

function InvestmentSheet() {
	return (
		<Sheet>
			<div className="flex flex-1 flex-col gap-6 px-14 py-11">
				<SectionLabel icon={BarChart3} text="Investimento" />

				{/* Implementação + mensalidade */}
				<div className="grid grid-cols-2 items-stretch gap-5">
					<InvestmentCard
						name="Implementação"
						tag="Pagamento único"
						tagline="O clube construído sob medida e entregue funcionando."
						price={`R$ ${IMPLEMENTATION_FEE}`}
						period="único"
						features={[
							"Clube com a identidade da Fran Farma",
							"Regras de cashback definidas juntos",
							"Configuração e testes na loja",
							"Treinamento da equipe do balcão",
						]}
					/>
					<InvestmentCard
						name="Mensalidade"
						tag="Recorrente · por unidade"
						tagline="O clube rodando, evoluindo e operado com a gente."
						price={`R$ ${MONTHLY_PRICE_PER_UNIT}`}
						period="/mês por unidade"
						highlight
						features={[
							"Campanhas automáticas de WhatsApp",
							"Gestor de crescimento dedicado",
							"Painel de gestão da base",
							"Suporte dedicado por WhatsApp",
						]}
					/>
				</div>

				{/* Nota de transparência */}
				<div
					className="flex items-start gap-3 rounded-xl px-5 py-3.5"
					style={{ backgroundColor: hexToRgba(BRAND.green, 0.06), border: `1px dashed ${hexToRgba(BRAND.green, 0.35)}` }}
				>
					<ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: BRAND.green }} />
					<p className="text-[0.78rem] leading-snug text-neutral-700">
						<strong>Sem surpresa.</strong> A implementação é cobrada uma única vez, para todas as unidades. A mensalidade é por unidade ativa e cobre operação,
						hospedagem, evolução e suporte — sem fidelidade: o clube fica porque funciona, não por contrato.
					</p>
				</div>

				{/* O caminho que se abre */}
				<div>
					<SectionLabel icon={Rocket} text="O caminho que se abre" />
					<div className="grid grid-cols-4 gap-3">
						{ROADMAP.map((step, i) => (
							<div
								key={step.title}
								className="relative flex flex-col gap-2 rounded-2xl bg-white p-4"
								style={{
									border: step.now ? `2px solid ${BRAND.mint}` : "1px solid #e5e5e5",
									boxShadow: step.now ? `0 10px 30px -12px ${hexToRgba(BRAND.green, 0.4)}` : undefined,
								}}
							>
								{step.now ? (
									<span
										className="absolute -top-2.5 right-4 rounded-full px-2.5 py-0.5 text-[0.55rem] font-black uppercase tracking-wider"
										style={{ backgroundColor: BRAND.mint, color: BRAND.greenDeep }}
									>
										Começa aqui
									</span>
								) : null}
								<span
									className="flex h-7 w-7 items-center justify-center rounded-full text-[0.72rem] font-black text-white"
									style={{ backgroundColor: BRAND.green }}
								>
									{i + 1}
								</span>
								<step.icon className="h-4 w-4" style={{ color: BRAND.mintText }} />
								<h4 className="text-[0.76rem] font-black uppercase leading-tight tracking-tight text-neutral-900">{step.title}</h4>
								<p className="text-[0.68rem] leading-snug text-neutral-600">{step.body}</p>
							</div>
						))}
					</div>
					<p className="mt-3 text-[0.74rem] leading-snug text-neutral-500">
						Cada etapa usa a mesma base de clientes construída no clube — nada se refaz, tudo se soma. Os pilares 01 a 05 mostram as etapas seguintes já
						funcionando.
					</p>
				</div>

				{/* Closing CTA */}
				<div className="relative mt-auto overflow-hidden rounded-3xl px-8 py-7 text-white" style={heroGradient}>
					<div
						className="absolute inset-0 opacity-[0.12]"
						style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "16px 16px" }}
					/>
					<div className="absolute right-0 top-0 h-full w-2" style={{ backgroundColor: BRAND.mint }} />
					<div className="relative z-10 flex flex-col gap-4">
						<div className="flex items-center gap-2">
							<Star className="h-5 w-5" fill="currentColor" />
							<h2 className="text-xl font-black uppercase leading-tight tracking-tight">Vamos colocar o clube da Fran Farma no ar</h2>
						</div>
						<p className="max-w-xl text-[0.82rem] leading-relaxed opacity-90">
							A Fran Farma já tem o que as grandes redes disputam: o cliente da região, todo mês, no balcão. Falta o clube que transforma essa frequência em
							fidelidade. Chame a gente no WhatsApp e em poucos dias os primeiros clientes estarão cadastrados.
						</p>
						<div className="mt-1 flex flex-wrap gap-3">
							{SUPPORT_CONTACTS.map((contact) => (
								<a
									key={contact.name}
									href={`https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`}
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
			<SheetFooter index="09 / 09" label="Investimento" />
		</Sheet>
	);
}

function InvestmentCard({
	name,
	tag,
	tagline,
	price,
	period,
	features,
	highlight,
}: {
	name: string;
	tag: string;
	tagline: string;
	price: string;
	period: string;
	features: string[];
	highlight?: boolean;
}) {
	return (
		<div
			className="relative flex flex-col gap-4 rounded-2xl bg-white p-6"
			style={{
				border: highlight ? `2px solid ${BRAND.mint}` : "1px solid #e5e5e5",
				boxShadow: highlight ? `0 10px 30px -12px ${hexToRgba(BRAND.green, 0.45)}` : undefined,
			}}
		>
			<span
				className="absolute -top-3 right-5 inline-flex items-center gap-1 rounded-full px-3 py-1 text-[0.6rem] font-black uppercase tracking-wider"
				style={highlight ? { backgroundColor: BRAND.mint, color: BRAND.greenDeep } : { backgroundColor: BRAND.green, color: "#fff" }}
			>
				{tag}
			</span>

			<div>
				<h3 className="text-base font-black uppercase tracking-tight text-neutral-900">{name}</h3>
				<p className="mt-0.5 text-[0.72rem] leading-snug text-neutral-500">{tagline}</p>
			</div>

			<div className="flex items-end gap-1">
				<span className="text-3xl font-black tracking-tight" style={{ color: BRAND.green }}>
					{price}
				</span>
				<span className="mb-1 text-[0.75rem] font-semibold text-neutral-400">{period}</span>
			</div>

			<div className="h-px w-full bg-neutral-100" />

			<ul className="flex flex-col gap-2">
				{features.map((feature) => (
					<li key={feature} className="flex items-start gap-2">
						<Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" style={{ color: BRAND.mintText }} />
						<span className="text-[0.74rem] leading-snug text-neutral-700">{feature}</span>
					</li>
				))}
			</ul>
		</div>
	);
}
