// Proposta comercial de uso único — Grupo Dutra (RecompraCRM Enterprise).
// Um único ecossistema de fidelização para toda a rede do cliente:
// 2 supermercados, indústria de alimentos, espetinho e ferragista.
// Renderizada dentro do shell de impressão em ../page.tsx (A4). Não faz parte do produto.

import { ARTHUR_WHATSAPP_NUMBER, LUCAS_WHATSAPP_NUMBER } from "@/config/internal-coms";
import {
	ArrowRight,
	BarChart3,
	Check,
	Contact,
	Database,
	DoorOpen,
	Factory,
	Flame,
	Gift,
	LayoutDashboard,
	Link2,
	type LucideIcon,
	Megaphone,
	Network,
	Plug,
	QrCode,
	RefreshCw,
	Repeat,
	Rocket,
	ShieldCheck,
	ShoppingCart,
	Sparkles,
	Star,
	Store,
	Ticket,
	Trophy,
	Users,
	Wallet,
	Wrench,
} from "lucide-react";
import type { ReactNode } from "react";
import { FaWhatsapp } from "react-icons/fa6";
import { Sheet, SheetFooter } from "./_shared";

/* -------------------------------------------------------------------------- */
/*  Paleta Grupo Dutra (extraída das logomarcas — vermelho + azul-marinho)     */
/* -------------------------------------------------------------------------- */

const BRAND = {
	red: "#E11B22",
	redDeep: "#A5121A",
	// Vermelho escurecido — legível como texto sobre fundos claros (~4.7:1)
	redText: "#B7141B",
	blue: "#173A8A",
	blueDeep: "#0E2557",
} as const;

function hexToRgba(hex: string, alpha: number) {
	const h = hex.replace("#", "");
	const r = parseInt(h.slice(0, 2), 16);
	const g = parseInt(h.slice(2, 4), 16);
	const b = parseInt(h.slice(4, 6), 16);
	return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const heroGradient = {
	backgroundImage: `linear-gradient(135deg, ${BRAND.blue} 0%, ${BRAND.blueDeep} 100%)`,
};

/* -------------------------------------------------------------------------- */
/*  Emblema Dutra (SVG — reproduz o selo oval da marca)                        */
/* -------------------------------------------------------------------------- */

function DutraEmblem({ className }: { className?: string }) {
	return (
		<svg viewBox="0 0 260 130" className={className} role="img" aria-label="Grupo Dutra" xmlns="http://www.w3.org/2000/svg">
			<defs>
				<linearGradient id="dutra-red" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stopColor="#F0353B" />
					<stop offset="1" stopColor={BRAND.redDeep} />
				</linearGradient>
			</defs>
			{/* anel externo vermelho */}
			<ellipse cx="130" cy="65" rx="126" ry="61" fill="url(#dutra-red)" />
			{/* campo azul-marinho */}
			<ellipse cx="130" cy="65" rx="112" ry="50" fill={BRAND.blue} />
			<ellipse cx="130" cy="65" rx="112" ry="50" fill="none" stroke="#ffffff" strokeWidth="2.5" opacity="0.9" />
			{/* GRUPO */}
			<text x="130" y="40" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontSize="13" letterSpacing="7" fontWeight="700" fill="#ffffff">
				GRUPO
			</text>
			{/* DUTRA */}
			<text
				x="130"
				y="92"
				textAnchor="middle"
				fontFamily="Arial Black, Arial, sans-serif"
				fontSize="46"
				fontWeight="900"
				fill="#ffffff"
				stroke={BRAND.redDeep}
				strokeWidth="1.2"
				paintOrder="stroke"
			>
				DUTRA
			</text>
		</svg>
	);
}

/* -------------------------------------------------------------------------- */
/*  Dados da proposta                                                          */
/* -------------------------------------------------------------------------- */

const PRICE_PER_UNIT = "499,00";
const UNITS = 5;
const TOTAL_MONTHLY = "2.495,00";
const IMPLEMENTATION_FEE = "10.000";
const IMPLEMENTATION_INSTALLMENT = "3.333,33";

const SUPPORT_CONTACTS = [
	{ name: "Lucas Fernandes", phone: "34 99662-6855", whatsapp: LUCAS_WHATSAPP_NUMBER },
	{ name: "Arthur Carvalho", phone: "34 99948-0791", whatsapp: ARTHUR_WHATSAPP_NUMBER },
] as const;

// As cinco unidades de negócio do grupo — a base do argumento "ecossistema".
const BUSINESS_UNITS = [
	{ icon: Store, name: "Supermercado Dutra", detail: "Loja 01", tag: "Varejo" },
	{ icon: Store, name: "Supermercado Dutra", detail: "Loja 02", tag: "Varejo" },
	{ icon: Factory, name: "Alimentos Dutra", detail: "Indústria de alimentos", tag: "Indústria" },
	{ icon: Flame, name: "Espetinho Dutra", detail: "Food service", tag: "Alimentação" },
	{ icon: Wrench, name: "DutraFer", detail: "Ferragista", tag: "Construção" },
] as const;

const SOLUTION_CARDS = [
	{
		icon: QrCode,
		title: "Cadastro via QR Code",
		body: "O cliente aponta a câmera e se cadastra na hora — em qualquer unidade do grupo. Sem precisar comprar nada.",
	},
	{
		icon: Plug,
		title: "Compra vinculada por CPF",
		body: "Integrado ao ERP que o Dutra já usa: o CPF informado no PDV entra no histórico do cadastro, automaticamente.",
	},
	{
		icon: Network,
		title: "Uma base que é do grupo",
		body: "Cada cadastro vira um ativo do Grupo Dutra: uma base única, rica e segmentável — compartilhada por todas as unidades.",
	},
];

const PROFILE_FIELDS = [
	"Nome completo",
	"Telefone / WhatsApp",
	"CPF",
	"Homem / Mulher",
	"Tem filhos",
	"Moradores na residência",
	"Consentimento LGPD",
];

const DELIVERABLES = [
	{
		icon: QrCode,
		title: "Hub de cadastro via QR Code",
		body: "Formulário com a cara do Grupo Dutra, aberto pela câmera do celular — cadastro completo mesmo sem compra.",
	},
	{
		icon: Plug,
		title: "Integração com seu ERP",
		body: "Nossa API conectada ao ERP do grupo: o CPF informado no PDV vincula cada compra ao cadastro.",
	},
	{
		icon: LayoutDashboard,
		title: "Painel de gestão da base",
		body: "Busca, filtros por perfil e visão do crescimento dos cadastros — unidade a unidade, e do grupo inteiro.",
	},
	{
		icon: ShieldCheck,
		title: "LGPD by design",
		body: "Consentimento no cadastro, opt-out e boas práticas de dados desde o primeiro dia.",
	},
	{
		icon: Users,
		title: "Treinamento das equipes",
		body: "Frente de caixa de cada unidade preparada para convidar e cadastrar clientes sem travar a fila.",
	},
	{
		icon: Sparkles,
		title: "Suporte dedicado",
		body: "Canal direto por WhatsApp com quem construiu a solução — sem fila de chamado.",
	},
];

const ROADMAP: { icon: LucideIcon; title: string; body: string; now?: boolean }[] = [
	{
		icon: Contact,
		title: "Hub de Clientes",
		body: "Cadastro via QR Code + compras por CPF no ERP. A fundação de tudo.",
		now: true,
	},
	{
		icon: Gift,
		title: "Clube de fidelidade",
		body: "Cashback ou pontos, vale-compras e sorteios sobre a base já cadastrada.",
	},
	{
		icon: Megaphone,
		title: "CRM & campanhas",
		body: "Reativação automática no WhatsApp pelo perfil e comportamento de compra.",
	},
	{
		icon: ShoppingCart,
		title: "E-commerce",
		body: "A mesma base de clientes, comprando também fora da loja.",
	},
];

/* -------------------------------------------------------------------------- */
/*  Proposta — Grupo Dutra                                                      */
/* -------------------------------------------------------------------------- */

export function GrupoDutraProposal() {
	return (
		<>
			<IntroSheet />
			<EcosystemSheet />
			<QrCodePillarSheet />
			<ErpPillarSheet />
			<CashbackPillarSheet />
			<ReactivationPillarSheet />
			<PointsPillarSheet />
			<InvestmentSheet />
		</>
	);
}

/* -------------------------------------------------------------------------- */
/*  Primitivos locais                                                          */
/* -------------------------------------------------------------------------- */

function SectionLabel({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
	return (
		<div className="mb-3 flex items-center gap-2.5">
			<div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: hexToRgba(BRAND.blue, 0.1), color: BRAND.blue }}>
				<Icon className="h-[18px] w-[18px]" />
			</div>
			<h2 className="text-lg font-black uppercase leading-none tracking-tight text-neutral-900">{text}</h2>
		</div>
	);
}

function PillarHeader({ n, icon: Icon, kicker, title, lead }: { n: string; icon: LucideIcon; kicker: string; title: string; lead: string }) {
	return (
		<div className="flex items-start gap-5">
			<div
				className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl text-white shadow-lg"
				style={{ backgroundColor: BRAND.blue, boxShadow: `0 12px 28px -10px ${hexToRgba(BRAND.blue, 0.5)}` }}
			>
				<Icon className="h-8 w-8" />
			</div>
			<div className="min-w-0">
				<div className="flex items-center gap-2.5">
					<span className="text-[0.7rem] font-black uppercase tracking-[0.25em]" style={{ color: BRAND.redText }}>
						Pilar {n}
					</span>
					<span
						className="rounded-full px-2 py-0.5 text-[0.55rem] font-black uppercase tracking-wider"
						style={{ backgroundColor: hexToRgba(BRAND.red, 0.12), color: BRAND.redText }}
					>
						{kicker}
					</span>
				</div>
				<h2 className="mt-1 text-[2.3rem] font-black leading-none tracking-tight text-neutral-900">{title}</h2>
				<p className="mt-2.5 max-w-xl text-[0.95rem] leading-relaxed text-neutral-600">{lead}</p>
			</div>
		</div>
	);
}

function BenefitRow({ children }: { children: ReactNode }) {
	return (
		<li className="flex items-start gap-2.5">
			<span
				className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full"
				style={{ backgroundColor: hexToRgba(BRAND.blue, 0.1), color: BRAND.blue }}
			>
				<Check className="h-3 w-3" strokeWidth={3.5} />
			</span>
			<span className="text-[0.9rem] leading-snug text-neutral-700">{children}</span>
		</li>
	);
}

function TakeawayStrip({ children }: { children: ReactNode }) {
	return (
		<div className="mt-auto flex items-center gap-3.5 rounded-2xl px-6 py-4" style={{ backgroundColor: hexToRgba(BRAND.blue, 0.06) }}>
			<span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-white" style={{ backgroundColor: BRAND.blue }}>
				<ArrowRight className="h-5 w-5" />
			</span>
			<p className="text-[0.92rem] leading-snug text-neutral-700">
				<strong className="font-black text-neutral-900">O resultado:</strong> {children}
			</p>
		</div>
	);
}

/* -------------------------------------------------------------------------- */
/*  1 · Cenário, solução e escopo                                              */
/* -------------------------------------------------------------------------- */

function IntroSheet() {
	return (
		<Sheet>
			<div className="flex flex-1 flex-col gap-5 px-11 py-9">
				{/* Hero */}
				<div className="relative overflow-hidden rounded-3xl px-8 py-7" style={heroGradient}>
					<div
						className="absolute inset-0 opacity-[0.12]"
						style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "16px 16px" }}
					/>
					<div className="absolute right-0 top-0 h-full w-2" style={{ backgroundColor: BRAND.red }} />
					<div className="relative z-10 flex items-center gap-5">
						<div className="flex h-20 w-32 flex-shrink-0 items-center justify-center rounded-2xl bg-white/95 p-2 shadow-lg ring-1 ring-white/25">
							<DutraEmblem className="h-full w-full" />
						</div>
						<div className="min-w-0 text-white">
							<p className="text-[0.65rem] font-bold uppercase tracking-[0.3em] opacity-85">Proposta Comercial · Grupo Dutra</p>
							<h1 className="mt-1 text-[1.95rem] font-black uppercase leading-[0.95] tracking-tight">
								Conheça cada cliente
								<br />
								de todos os seus negócios
							</h1>
							<p className="mt-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-wider backdrop-blur">
								<Network className="h-3.5 w-3.5" />
								RecompraCRM Enterprise · fidelização unificada, integrada ao seu ERP
							</p>
						</div>
					</div>
				</div>

				{/* O cenário */}
				<div className="rounded-2xl px-6 py-5" style={{ backgroundColor: hexToRgba(BRAND.red, 0.07), borderLeft: `4px solid ${BRAND.red}` }}>
					<div className="mb-2 flex items-center gap-2">
						<Users className="h-4 w-4" style={{ color: BRAND.blue }} />
						<h2 className="text-sm font-black uppercase tracking-tight" style={{ color: BRAND.blue }}>
							O cenário
						</h2>
					</div>
					<p className="text-[0.82rem] leading-relaxed text-neutral-700">
						O Grupo Dutra processa milhares de vendas todos os dias — dois supermercados, uma indústria de alimentos, um espetinho e uma ferragista. É o
						mesmo cliente circulando entre os seus negócios. <strong>Quanto mais o grupo sabe sobre quem compra, mais valor cada venda gera</strong> — em
						benefícios, ofertas certeiras e relacionamento. É aí que entramos: unificando tudo em um só ecossistema.
					</p>
				</div>

				{/* A solução */}
				<div>
					<SectionLabel icon={Sparkles} text="A solução — Hub de Clientes" />
					<div className="grid grid-cols-3 gap-4">
						{SOLUTION_CARDS.map((card) => (
							<div key={card.title} className="flex flex-col gap-2.5 rounded-2xl border border-neutral-200 bg-white p-4">
								<div
									className="flex h-10 w-10 items-center justify-center rounded-xl"
									style={{ backgroundColor: hexToRgba(BRAND.blue, 0.1), color: BRAND.blue }}
								>
									<card.icon className="h-5 w-5" />
								</div>
								<h3 className="text-[0.8rem] font-black uppercase leading-tight tracking-tight text-neutral-900">{card.title}</h3>
								<p className="text-[0.72rem] leading-snug text-neutral-600">{card.body}</p>
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
									className="rounded-full px-2.5 py-1 text-[0.66rem] font-bold"
									style={{ backgroundColor: hexToRgba(BRAND.red, 0.1), color: BRAND.redText }}
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
					<div className="grid grid-cols-2 gap-x-5 gap-y-3.5">
						{DELIVERABLES.map((item) => (
							<div key={item.title} className="flex items-start gap-3">
								<div
									className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
									style={{ backgroundColor: hexToRgba(BRAND.blue, 0.1), color: BRAND.blue }}
								>
									<item.icon className="h-4 w-4" />
								</div>
								<div className="min-w-0">
									<h4 className="text-[0.78rem] font-bold leading-tight text-neutral-900">{item.title}</h4>
									<p className="text-[0.72rem] leading-snug text-neutral-600">{item.body}</p>
								</div>
							</div>
						))}
					</div>

					{/* A porta de entrada */}
					<div
						className="mt-4 flex items-center gap-4 overflow-hidden rounded-2xl px-5 py-4"
						style={{ backgroundColor: hexToRgba(BRAND.blue, 0.06), border: `1px solid ${hexToRgba(BRAND.blue, 0.22)}` }}
					>
						<div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-white" style={{ backgroundColor: BRAND.blue }}>
							<DoorOpen className="h-5 w-5" />
						</div>
						<div className="min-w-0 flex-1">
							<div className="flex items-center gap-2">
								<h4 className="text-[0.82rem] font-black uppercase tracking-tight" style={{ color: BRAND.blue }}>
									A porta de entrada
								</h4>
								<span
									className="rounded-full px-2 py-0.5 text-[0.55rem] font-black uppercase tracking-wider"
									style={{ backgroundColor: BRAND.red, color: "#fff" }}
								>
									Pensado para crescer
								</span>
							</div>
							<p className="text-[0.74rem] leading-snug text-neutral-700">
								O hub é a fundação. Com a base formada e as compras rastreadas, os próximos passos — cashback, campanhas, e-commerce — já nascem com
								clientes conhecidos, sem começar do zero. As próximas páginas mostram cada peça em detalhe.
							</p>
						</div>
					</div>
				</div>
			</div>
			<SheetFooter index="01 / 08" label="Proposta · Grupo Dutra" />
		</Sheet>
	);
}

/* -------------------------------------------------------------------------- */
/*  2 · Um ecossistema — todos os negócios do grupo (página adicional)         */
/* -------------------------------------------------------------------------- */

function EcosystemSheet() {
	return (
		<Sheet>
			<div className="flex flex-1 flex-col px-11 py-9">
				<PillarHeader
					n="00"
					icon={Network}
					kicker="A visão enterprise"
					title="Um ecossistema, todos os seus negócios"
					lead="Hoje cada unidade do Grupo Dutra enxerga só a própria venda. Nós conectamos todas em uma base única — o mesmo cliente, reconhecido em qualquer negócio do grupo."
				/>

				{/* As cinco unidades */}
				<div className="mt-8">
					<h3 className="mb-3 text-sm font-black uppercase tracking-wide text-neutral-900">As cinco unidades do grupo</h3>
					<div className="grid grid-cols-5 gap-3">
						{BUSINESS_UNITS.map((unit, i) => (
							<div key={`${unit.name}-${i}`} className="flex flex-col items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-3 py-4 text-center">
								<div
									className="flex h-12 w-12 items-center justify-center rounded-xl"
									style={{ backgroundColor: hexToRgba(BRAND.blue, 0.1), color: BRAND.blue }}
								>
									<unit.icon className="h-6 w-6" />
								</div>
								<span className="text-[0.72rem] font-black uppercase leading-tight tracking-tight text-neutral-900">{unit.name}</span>
								<span className="text-[0.62rem] font-medium leading-tight text-neutral-500">{unit.detail}</span>
								<span
									className="mt-0.5 rounded-full px-2 py-0.5 text-[0.52rem] font-black uppercase tracking-wide"
									style={{ backgroundColor: hexToRgba(BRAND.red, 0.1), color: BRAND.redText }}
								>
									{unit.tag}
								</span>
							</div>
						))}
					</div>
				</div>

				{/* Diagrama hub central */}
				<div className="mt-7 grid grid-cols-[1fr_1.05fr] items-stretch gap-6">
					<div className="flex flex-col justify-center gap-4 rounded-3xl p-7 text-white" style={heroGradient}>
						<div className="flex items-center gap-2.5">
							<div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25">
								<Database className="h-5 w-5" />
							</div>
							<div className="leading-tight">
								<p className="text-[0.6rem] font-bold uppercase tracking-[0.22em] text-white/60">O núcleo do ecossistema</p>
								<p className="text-base font-black uppercase tracking-tight">Base única do Grupo Dutra</p>
							</div>
						</div>
						<p className="text-[0.82rem] leading-relaxed text-white/85">
							Todo cadastro e toda compra — de qualquer unidade — chegam ao mesmo lugar. O cliente que faz o rancho no supermercado, compra o espetinho no
							fim de semana e passa na ferragista para reformar a casa é <strong className="font-extrabold text-white">uma pessoa só</strong> aos olhos do
							grupo.
						</p>
						<div className="grid grid-cols-3 gap-2.5">
							<EcoStat value="5" label="unidades conectadas" />
							<EcoStat value="1" label="base de clientes" />
							<EcoStat value="360°" label="visão do cliente" />
						</div>
					</div>

					{/* O que a unificação destrava */}
					<div className="flex flex-col justify-center gap-3">
						<h3 className="text-sm font-black uppercase tracking-wide text-neutral-900">O que a unificação destrava</h3>
						<UnlockRow icon={Link2} title="Cadastro único, reconhecido em todo lugar">
							O cliente se cadastra uma vez e é reconhecido no supermercado, no espetinho e na ferragista — sem refazer nada.
						</UnlockRow>
						<UnlockRow icon={Repeat} title="Cashback que circula entre os negócios">
							Acumula comprando o rancho e resgata no espetinho — o benefício amarra o cliente ao grupo, não a uma loja.
						</UnlockRow>
						<UnlockRow icon={Users} title="Perfil completo por comportamento de compra">
							Quem compra em atacado, quem só leva hortifrúti, quem reforma a casa — o grupo passa a saber, e a oferecer certo.
						</UnlockRow>
						<UnlockRow icon={BarChart3} title="Visão consolidada do grupo inteiro">
							Um painel com o desempenho de cada unidade e do ecossistema — receita, recorrência e clientes ativos em um só lugar.
						</UnlockRow>
					</div>
				</div>

				{/* Jornada cruzada */}
				<div className="mt-7 rounded-2xl border border-dashed px-6 py-5" style={{ borderColor: hexToRgba(BRAND.red, 0.4), backgroundColor: hexToRgba(BRAND.red, 0.05) }}>
					<div className="mb-2.5 flex items-center gap-2">
						<Sparkles className="h-4 w-4" style={{ color: BRAND.redText }} />
						<span className="text-[0.72rem] font-black uppercase tracking-wider" style={{ color: BRAND.redText }}>
							A jornada que só o ecossistema enxerga
						</span>
					</div>
					<div className="flex items-center gap-2 text-[0.72rem] font-semibold text-neutral-700">
						<JourneyStep icon={ShoppingCart} label="Rancho no Supermercado" />
						<ArrowRight className="h-3.5 w-3.5 flex-shrink-0 text-neutral-400" />
						<JourneyStep icon={Flame} label="Espetinho no fim de semana" />
						<ArrowRight className="h-3.5 w-3.5 flex-shrink-0 text-neutral-400" />
						<JourneyStep icon={Wrench} label="Reforma na DutraFer" />
						<ArrowRight className="h-3.5 w-3.5 flex-shrink-0 text-neutral-400" />
						<JourneyStep icon={Factory} label="Produto Alimentos Dutra" />
					</div>
					<p className="mt-3 text-[0.78rem] leading-snug text-neutral-600">
						Um mesmo cliente, quatro compras, um só relacionamento. Sem o ecossistema, são quatro estranhos. Com ele, é o cliente mais valioso do grupo —
						e o Dutra sabe exatamente como recompensá-lo.
					</p>
				</div>

				<TakeawayStrip>
					todos os dados dos seus negócios em um só ecossistema — e a fidelização do seu cliente unificada, operada por nós de ponta a ponta.
				</TakeawayStrip>
			</div>
			<SheetFooter index="02 / 08" label="A visão enterprise · Ecossistema Dutra" />
		</Sheet>
	);
}

function EcoStat({ value, label }: { value: string; label: string }) {
	return (
		<div className="rounded-xl bg-white/10 px-3 py-2.5 ring-1 ring-white/15">
			<p className="text-xl font-black leading-none tracking-tight">{value}</p>
			<p className="mt-1 text-[0.56rem] font-semibold uppercase leading-tight tracking-wide text-white/70">{label}</p>
		</div>
	);
}

function UnlockRow({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
	return (
		<div className="flex items-start gap-3">
			<div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: hexToRgba(BRAND.red, 0.1), color: BRAND.redText }}>
				<Icon className="h-4 w-4" />
			</div>
			<div className="min-w-0">
				<h4 className="text-[0.76rem] font-bold leading-tight text-neutral-900">{title}</h4>
				<p className="text-[0.7rem] leading-snug text-neutral-600">{children}</p>
			</div>
		</div>
	);
}

function JourneyStep({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
	return (
		<span className="flex min-w-0 flex-1 items-center gap-1.5 rounded-lg bg-white px-2.5 py-2 ring-1 ring-neutral-200">
			<Icon className="h-3.5 w-3.5 flex-shrink-0" style={{ color: BRAND.blue }} />
			<span className="truncate">{label}</span>
		</span>
	);
}

/* -------------------------------------------------------------------------- */
/*  3 · Pilar 01 — Cadastro via QR Code                                        */
/* -------------------------------------------------------------------------- */

function QrCodePillarSheet() {
	return (
		<Sheet>
			<div className="flex flex-1 flex-col px-11 py-9">
				<PillarHeader
					n="01"
					icon={QrCode}
					kicker="Principal interesse · começa aqui"
					title="Cadastro via QR Code"
					lead="Um QR Code espalhado pelas unidades, encartes e redes sociais. O cliente aponta a câmera, preenche o perfil e entra para a base do grupo — mesmo sem comprar nada."
				/>

				<div className="mt-8 grid grid-cols-[1fr_0.85fr] items-start gap-8">
					{/* Coluna texto */}
					<div className="flex flex-col gap-6">
						<div>
							<h3 className="mb-3 text-sm font-black uppercase tracking-wide text-neutral-900">Como funciona</h3>
							<ul className="flex flex-col gap-2.5">
								<BenefitRow>QR Code em gôndolas, caixas, balcões, encarte e redes sociais — onde o cliente estiver.</BenefitRow>
								<BenefitRow>Aponta a câmera e o formulário abre direto no navegador — sem baixar aplicativo.</BenefitRow>
								<BenefitRow>Perfil completo preenchido em menos de um minuto, com consentimento LGPD.</BenefitRow>
								<BenefitRow>O cadastro cai na base na hora — sem depender de compra ou de fila no caixa.</BenefitRow>
							</ul>
						</div>

						<div className="rounded-2xl border border-dashed p-5" style={{ borderColor: hexToRgba(BRAND.red, 0.5), backgroundColor: hexToRgba(BRAND.red, 0.06) }}>
							<div className="mb-1.5 flex items-center gap-2">
								<Sparkles className="h-4 w-4" style={{ color: BRAND.redText }} />
								<span className="text-[0.7rem] font-black uppercase tracking-wider" style={{ color: BRAND.redText }}>
									Cadastro sem compra
								</span>
							</div>
							<p className="text-[0.88rem] leading-relaxed text-neutral-700">
								Quem ainda não é cliente também entra na base: o QR Code transforma <strong className="font-extrabold">visitantes, seguidores e curiosos em
								contatos identificados</strong> — prontos para receber ofertas de qualquer unidade do grupo.
							</p>
						</div>

						<div>
							<h3 className="mb-2.5 text-sm font-black uppercase tracking-wide text-neutral-900">Todos os dados que o cadastro pede</h3>
							<div className="flex flex-wrap gap-1.5">
								{PROFILE_FIELDS.map((field) => (
									<span
										key={field}
										className="rounded-full px-2.5 py-1 text-[0.66rem] font-bold"
										style={{ backgroundColor: hexToRgba(BRAND.blue, 0.08), color: BRAND.blue }}
									>
										{field}
									</span>
								))}
							</div>
						</div>
					</div>

					{/* Coluna mockup — display com QR */}
					<div className="flex flex-col items-center gap-3">
						<QrDisplayMock />
						<span className="text-center text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-neutral-500">Display no caixa, na gôndola e no encarte</span>
					</div>
				</div>

				{/* Formulário mockup */}
				<div className="mt-6 rounded-3xl border border-neutral-200 bg-neutral-50/70 p-6">
					<div className="mb-4 flex items-center justify-between">
						<div className="flex items-center gap-2">
							<span className="flex h-7 w-7 items-center justify-center rounded-lg text-white" style={{ backgroundColor: BRAND.blue }}>
								<QrCode className="h-4 w-4" />
							</span>
							<span className="text-sm font-black tracking-tight text-neutral-900">O formulário que o QR Code abre</span>
						</div>
						<span className="rounded-lg bg-white px-3 py-1.5 text-[0.66rem] font-bold text-neutral-500 ring-1 ring-neutral-200">cadastro.grupodutra.com.br</span>
					</div>
					<div className="grid grid-cols-3 gap-3">
						<FormField label="Nome completo" value="Maria Souza" />
						<FormField label="Telefone / WhatsApp" value="(34) 99912-4478" />
						<FormField label="CPF" value="123.456.789-00" />
					</div>
					<div className="mt-3 grid grid-cols-3 gap-3">
						<FormChoice label="Você é" options={["Homem", "Mulher"]} selected={1} />
						<FormChoice label="Tem filhos?" options={["Sim", "Não"]} selected={0} />
						<FormChoice label="Moradores na casa" options={["1", "2", "3", "4", "5+"]} selected={3} />
					</div>
					<div className="mt-3 flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3.5 py-3">
						<span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded" style={{ backgroundColor: BRAND.blue }}>
							<Check className="h-3 w-3 text-white" strokeWidth={3.5} />
						</span>
						<span className="text-[0.72rem] text-neutral-600">Autorizo o Grupo Dutra a me enviar ofertas e novidades pelo WhatsApp — de acordo com a LGPD.</span>
					</div>
				</div>

				<TakeawayStrip>uma base que cresce todos os dias — dentro e fora das lojas — com o perfil completo de cada contato.</TakeawayStrip>
			</div>
			<SheetFooter index="03 / 08" label="Pilar 01 · Cadastro via QR Code" />
		</Sheet>
	);
}

function QrDisplayMock() {
	return (
		<div className="w-full max-w-[300px] overflow-hidden rounded-[26px] p-3 shadow-2xl" style={{ backgroundColor: BRAND.blueDeep, boxShadow: `0 30px 60px -25px ${hexToRgba(BRAND.blueDeep, 0.7)}` }}>
			<div className="overflow-hidden rounded-[18px] bg-white">
				<div className="flex items-center gap-2.5 px-5 py-3.5 text-white" style={{ backgroundColor: BRAND.blue }}>
					<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 text-[0.62rem] font-black">GD</div>
					<div className="flex flex-col leading-none">
						<span className="text-[0.82rem] font-extrabold">Grupo Dutra</span>
						<span className="text-[0.6rem] font-medium text-white/70">Clube de vantagens</span>
					</div>
				</div>
				<div className="flex flex-col items-center gap-3 px-5 py-6">
					<QrGraphic />
					<p className="text-center text-base font-black uppercase leading-tight tracking-tight text-neutral-900">
						Aponte a câmera
						<br />e cadastre-se
					</p>
					<p className="text-center text-[0.66rem] leading-snug text-neutral-500">Leva menos de 1 minuto — e não precisa comprar nada.</p>
				</div>
				<div className="px-5 pb-5">
					<div className="rounded-xl px-4 py-2.5 text-center text-[0.62rem] font-black uppercase tracking-wide text-white" style={{ backgroundColor: BRAND.red }}>
						Vantagens exclusivas para quem faz parte
					</div>
				</div>
			</div>
		</div>
	);
}

// QR "decorativo" — padrão de módulos, não é um QR real.
function QrGraphic() {
	const cells = [
		"1110111", "1010101", "1110111", "0001000", "1011101", "0100010", "1110111",
	];
	return (
		<div className="rounded-2xl border-4 border-neutral-900 p-3">
			<div className="grid grid-cols-7 gap-1">
				{cells.flatMap((row, r) =>
					row.split("").map((c, col) => (
						<span
							key={`${r}-${col}`}
							className="h-3.5 w-3.5 rounded-[2px]"
							style={{ backgroundColor: c === "1" ? BRAND.blueDeep : "transparent" }}
						/>
					)),
				)}
			</div>
		</div>
	);
}

function FormField({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex flex-col gap-1.5">
			<span className="text-[0.58rem] font-black uppercase tracking-wide text-neutral-500">{label}</span>
			<div className="rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-[0.78rem] font-semibold text-neutral-800">{value}</div>
		</div>
	);
}

function FormChoice({ label, options, selected }: { label: string; options: string[]; selected: number }) {
	return (
		<div className="flex flex-col gap-1.5">
			<span className="text-[0.58rem] font-black uppercase tracking-wide text-neutral-500">{label}</span>
			<div className="flex flex-wrap gap-1.5 rounded-lg border border-neutral-200 bg-white px-2 py-2">
				{options.map((opt, i) => (
					<span
						key={opt}
						className="rounded-md px-2.5 py-1 text-[0.72rem] font-bold"
						style={i === selected ? { backgroundColor: BRAND.blue, color: "#fff" } : { backgroundColor: "#f5f5f5", color: "#737373" }}
					>
						{opt}
					</span>
				))}
			</div>
		</div>
	);
}

/* -------------------------------------------------------------------------- */
/*  4 · Pilar 02 — Integração com seu ERP                                      */
/* -------------------------------------------------------------------------- */

const ERP_STEPS = [
	{ n: "1", icon: QrCode, title: "Cadastro pelo QR Code", body: "O cliente entra na base com nome, CPF e perfil completo." },
	{ n: "2", icon: ShoppingCart, title: "CPF no PDV", body: "Na hora de pagar, o cliente informa o CPF — hábito que já existe." },
	{ n: "3", icon: RefreshCw, title: "ERP → Nossa API", body: "A venda sai do ERP do grupo e chega na plataforma automaticamente." },
	{ n: "4", icon: BarChart3, title: "Histórico completo", body: "Frequência, ticket e recorrência somando no perfil do cliente." },
];

function ErpPillarSheet() {
	return (
		<Sheet>
			<div className="flex flex-1 flex-col px-11 py-9">
				<PillarHeader
					n="02"
					icon={Plug}
					kicker="Junto com o QR Code"
					title="Integração com seu ERP"
					lead="Nossa API conectada ao ERP que o Grupo Dutra já usa. O cliente informa o CPF no PDV — como já faz pela nota — e cada compra é vinculada ao cadastro feito no QR Code."
				/>

				{/* Fluxo de 4 passos */}
				<div className="mt-7 grid grid-cols-4 gap-3">
					{ERP_STEPS.map((step, i) => (
						<div key={step.n} className="relative flex flex-col gap-2 rounded-2xl border border-neutral-200 bg-white p-4">
							<div className="flex items-center gap-2">
								<span className="flex h-6 w-6 items-center justify-center rounded-full text-[0.68rem] font-black text-white" style={{ backgroundColor: BRAND.blue }}>
									{step.n}
								</span>
								<step.icon className="h-4 w-4" style={{ color: BRAND.redText }} />
							</div>
							<h4 className="text-[0.74rem] font-black uppercase leading-tight tracking-tight text-neutral-900">{step.title}</h4>
							<p className="text-[0.68rem] leading-snug text-neutral-600">{step.body}</p>
							{i < ERP_STEPS.length - 1 ? (
								<span className="absolute -right-2 top-1/2 z-10 hidden -translate-y-1/2 md:block">
									<ArrowRight className="h-4 w-4 text-neutral-300" />
								</span>
							) : null}
						</div>
					))}
				</div>

				<div className="mt-8 grid grid-cols-[0.95fr_1.05fr] items-start gap-8">
					{/* Texto */}
					<div className="flex flex-col gap-6">
						<div>
							<h3 className="mb-3 text-sm font-black uppercase tracking-wide text-neutral-900">O que isso destrava</h3>
							<ul className="flex flex-col gap-2.5">
								<BenefitRow>Todo cadastro do QR Code vira um cliente rastreável no caixa — dali em diante, cada compra conta.</BenefitRow>
								<BenefitRow>Visão de recorrência real: quem compra toda semana, quem está sumindo, quem nunca voltou.</BenefitRow>
								<BenefitRow>Segmentação por comportamento de compra + perfil familiar — não por achismo.</BenefitRow>
								<BenefitRow>A fundação pronta para cashback, campanhas e clube de fidelidade, sem retrabalho.</BenefitRow>
							</ul>
						</div>

						<div className="rounded-2xl border border-dashed p-5" style={{ borderColor: hexToRgba(BRAND.blue, 0.4), backgroundColor: hexToRgba(BRAND.blue, 0.05) }}>
							<div className="mb-1.5 flex items-center gap-2">
								<ShieldCheck className="h-4 w-4" style={{ color: BRAND.blue }} />
								<span className="text-[0.7rem] font-black uppercase tracking-wider" style={{ color: BRAND.blue }}>
									Sem mudar a operação
								</span>
							</div>
							<p className="text-[0.88rem] leading-relaxed text-neutral-700">
								Nada muda para a equipe de caixa: o fluxo do PDV continua o mesmo do ERP. A vinculação acontece <strong className="font-extrabold">nos
								bastidores, via API</strong> — sem sistema paralelo, sem redigitação.
							</p>
						</div>
					</div>

					{/* Mockup perfil do cliente */}
					<div className="flex flex-col items-center gap-3">
						<ClientProfileMock />
						<span className="text-center text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-neutral-500">Perfil do cliente · compras chegando do PDV</span>
					</div>
				</div>

				<TakeawayStrip>cada CPF digitado no PDV vira histórico de compra no perfil do cliente — sem nenhum trabalho manual da equipe.</TakeawayStrip>
			</div>
			<SheetFooter index="04 / 08" label="Pilar 02 · Integração com seu ERP" />
		</Sheet>
	);
}

function ClientProfileMock() {
	const purchases = [
		{ store: "Supermercado · Loja 01", date: "12 jul · CPF identificado no PDV", value: "R$ 214,90" },
		{ store: "DutraFer", date: "05 jul · CPF identificado no PDV", value: "R$ 187,40" },
		{ store: "Espetinho Dutra", date: "28 jun · CPF identificado no PDV", value: "R$ 96,20" },
	];
	return (
		<div className="w-full max-w-[380px] overflow-hidden rounded-[26px] p-3 shadow-2xl" style={{ backgroundColor: BRAND.blueDeep, boxShadow: `0 30px 60px -25px ${hexToRgba(BRAND.blueDeep, 0.7)}` }}>
			<div className="overflow-hidden rounded-[18px] bg-white">
				<div className="flex flex-col gap-3.5 px-5 py-5">
					{/* header perfil */}
					<div className="flex items-center gap-3">
						<div className="flex h-12 w-12 items-center justify-center rounded-full text-base font-black" style={{ backgroundColor: hexToRgba(BRAND.blue, 0.12), color: BRAND.blue }}>
							MS
						</div>
						<div className="flex flex-col leading-tight">
							<span className="text-[0.95rem] font-extrabold tracking-tight text-neutral-900">Maria Souza</span>
							<span className="text-[0.68rem] text-neutral-500">CPF •••.456.789-•• · (34) 99912-4478</span>
						</div>
					</div>
					<div className="flex flex-wrap items-center gap-1.5">
						<span className="rounded-full px-2.5 py-1 text-[0.56rem] font-black uppercase tracking-wide text-white" style={{ backgroundColor: BRAND.blue }}>
							Cadastro via QR Code
						</span>
						<span className="text-[0.6rem] font-semibold uppercase tracking-wide text-neutral-400">Mulher · Tem filhos · 4 na residência</span>
					</div>

					<span className="text-[0.6rem] font-black uppercase tracking-[0.18em] text-neutral-400">Compras vinculadas pelo ERP</span>
					<div className="flex flex-col gap-2">
						{purchases.map((p) => (
							<div key={p.store} className="flex items-center gap-3 rounded-xl border border-neutral-200 px-3 py-2.5">
								<span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: hexToRgba(BRAND.blue, 0.08), color: BRAND.blue }}>
									<ShoppingCart className="h-4 w-4" />
								</span>
								<div className="flex min-w-0 flex-1 flex-col leading-tight">
									<span className="truncate text-[0.74rem] font-bold text-neutral-900">{p.store}</span>
									<span className="truncate text-[0.6rem] text-neutral-500">{p.date}</span>
								</div>
								<span className="text-[0.82rem] font-black tabular-nums text-neutral-900">{p.value}</span>
							</div>
						))}
					</div>

					<div className="mt-1 grid grid-cols-3 gap-2 border-t border-neutral-100 pt-3 text-center">
						<ProfileStat value="26" label="Compras" />
						<ProfileStat value="R$ 168" label="Ticket médio" />
						<ProfileStat value="8 dias" label="Ciclo médio" />
					</div>
				</div>
			</div>
		</div>
	);
}

function ProfileStat({ value, label }: { value: string; label: string }) {
	return (
		<div className="flex flex-col">
			<span className="text-base font-black tabular-nums leading-none" style={{ color: BRAND.blue }}>
				{value}
			</span>
			<span className="mt-1 text-[0.56rem] font-bold uppercase tracking-wide text-neutral-400">{label}</span>
		</div>
	);
}

/* -------------------------------------------------------------------------- */
/*  5 · Pilar 03 — Fidelização com cashback                                    */
/* -------------------------------------------------------------------------- */

const RFM_SEGMENTS = [
	{ label: "Campeões", count: 84, bg: "#fb923c", text: "#0a0a0a" },
	{ label: "Leais", count: 213, bg: "#4ade80", text: "#0a0a0a" },
	{ label: "Em risco", count: 96, bg: "#facc15", text: "#0a0a0a" },
	{ label: "Prestes a dormir", count: 61, bg: "#ca8a04", text: "#fff" },
	{ label: "Hibernando", count: 148, bg: "#c084fc", text: "#fff" },
	{ label: "Perdidos", count: 179, bg: "#ef4444", text: "#fff" },
];

function CashbackPillarSheet() {
	return (
		<Sheet>
			<div className="flex flex-1 flex-col px-11 py-9">
				<PillarHeader
					n="03"
					icon={Wallet}
					kicker="Evolução · sobre a mesma base"
					title="Fidelização com cashback"
					lead="Com a base formada e as compras rastreadas, o passo seguinte é dar um motivo para voltar: o cliente acumula cashback a cada compra e resgata em qualquer unidade do grupo."
				/>

				<div className="mt-8 grid grid-cols-[0.95fr_1.05fr] items-start gap-8">
					{/* Texto */}
					<div className="flex flex-col gap-6">
						<div>
							<h3 className="mb-3 text-sm font-black uppercase tracking-wide text-neutral-900">Como funciona no caixa</h3>
							<ul className="flex flex-col gap-2.5">
								<BenefitRow>O cliente informa o CPF ou telefone no caixa — o mesmo fluxo da integração.</BenefitRow>
								<BenefitRow>O cashback é calculado sobre a compra e creditado na hora.</BenefitRow>
								<BenefitRow>O saldo é resgatado em compras futuras — em qualquer negócio do grupo.</BenefitRow>
								<BenefitRow>Percentuais e regras definidos por você, por unidade e por período.</BenefitRow>
							</ul>
						</div>

						<div className="rounded-2xl border border-dashed p-5" style={{ borderColor: hexToRgba(BRAND.red, 0.5), backgroundColor: hexToRgba(BRAND.red, 0.06) }}>
							<div className="mb-1.5 flex items-center gap-2">
								<Gift className="h-4 w-4" style={{ color: BRAND.redText }} />
								<span className="text-[0.7rem] font-black uppercase tracking-wider" style={{ color: BRAND.redText }}>
									O ativo que fica com você
								</span>
							</div>
							<p className="text-[0.88rem] leading-relaxed text-neutral-700">
								O cashback é a isca. O que fica é a <strong className="font-extrabold">base de clientes do Grupo Dutra</strong>, pronta para campanhas — e
								segmentada automaticamente pela Matriz RFM.
							</p>
						</div>
					</div>

					{/* Mockup tablet cashback */}
					<div className="flex flex-col items-center gap-3">
						<CashbackTabletMock />
						<span className="text-center text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-neutral-500">Ponto de interação · tablet no caixa</span>
					</div>
				</div>

				{/* RFM */}
				<div className="mt-7">
					<h3 className="mb-2.5 text-sm font-black uppercase tracking-wide text-neutral-900">Sua base, já segmentada</h3>
					<div className="grid grid-cols-6 gap-2.5">
						{RFM_SEGMENTS.map((seg) => (
							<div key={seg.label} className="flex flex-col gap-1.5 rounded-xl border border-neutral-200 px-3 py-2.5">
								<span className="text-2xl font-black tabular-nums leading-none text-neutral-900">{seg.count}</span>
								<span className="w-fit rounded-full px-2 py-0.5 text-[0.55rem] font-black uppercase tracking-wide" style={{ backgroundColor: seg.bg, color: seg.text }}>
									{seg.label}
								</span>
							</div>
						))}
					</div>
				</div>

				<TakeawayStrip>clientes com um motivo concreto para escolher o Dutra — e uma base que se segmenta sozinha a cada compra.</TakeawayStrip>
			</div>
			<SheetFooter index="05 / 08" label="Pilar 03 · Fidelização" />
		</Sheet>
	);
}

function CashbackTabletMock() {
	return (
		<div className="w-full max-w-[380px] overflow-hidden rounded-[26px] p-3 shadow-2xl" style={{ backgroundColor: BRAND.blueDeep, boxShadow: `0 30px 60px -25px ${hexToRgba(BRAND.blueDeep, 0.7)}` }}>
			<div className="overflow-hidden rounded-[18px] bg-white">
				<div className="flex items-center justify-between px-5 py-3.5 text-white" style={{ backgroundColor: BRAND.blue }}>
					<div className="flex items-center gap-2">
						<div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 text-[0.62rem] font-black">GD</div>
						<div className="flex flex-col leading-none">
							<span className="text-[0.8rem] font-extrabold">Grupo Dutra</span>
							<span className="text-[0.58rem] font-medium text-white/60">Supermercado · Loja 01</span>
						</div>
					</div>
					<span className="rounded-full bg-white/15 px-2.5 py-1 text-[0.56rem] font-bold uppercase tracking-wide">Pontuar</span>
				</div>

				<div className="flex flex-col gap-4 px-5 py-5">
					<div className="flex items-center gap-3">
						<div className="flex h-12 w-12 items-center justify-center rounded-full text-base font-black" style={{ backgroundColor: hexToRgba(BRAND.blue, 0.12), color: BRAND.blue }}>
							MS
						</div>
						<div className="flex flex-col leading-tight">
							<span className="text-[0.95rem] font-extrabold tracking-tight text-neutral-900">Maria Souza</span>
							<span className="text-[0.7rem] text-neutral-500">(34) 99912-4478 · 26 compras</span>
						</div>
						<span className="ml-auto rounded-full px-2.5 py-1 text-[0.56rem] font-black tracking-wide text-gray-950" style={{ backgroundColor: "#4ade80" }}>
							CLIENTE LEAL
						</span>
					</div>

					<div className="rounded-2xl px-5 py-4 text-center" style={{ backgroundColor: hexToRgba(BRAND.red, 0.1) }}>
						<span className="text-[0.62rem] font-black uppercase tracking-[0.2em]" style={{ color: BRAND.redText }}>
							Cashback disponível
						</span>
						<p className="mt-1 text-3xl font-black tabular-nums" style={{ color: BRAND.blueDeep }}>
							R$ 23,50
						</p>
					</div>

					<div className="flex items-center justify-between rounded-xl border border-neutral-200 px-4 py-3">
						<span className="text-[0.72rem] font-semibold text-neutral-500">Valor da venda</span>
						<span className="text-lg font-black tabular-nums text-neutral-900">R$ 214,90</span>
					</div>

					<div className="grid grid-cols-2 gap-2.5">
						<div className="flex items-center justify-center gap-1.5 rounded-xl py-3 text-[0.78rem] font-extrabold uppercase text-white" style={{ backgroundColor: BRAND.blue }}>
							<Sparkles className="h-4 w-4" /> Pontuar
						</div>
						<div className="flex items-center justify-center gap-1.5 rounded-xl py-3 text-[0.78rem] font-extrabold uppercase text-white" style={{ backgroundColor: BRAND.red }}>
							<Gift className="h-4 w-4" /> Resgatar
						</div>
					</div>
					<p className="text-center text-[0.62rem] text-neutral-500">
						Vai gerar <strong className="font-bold text-neutral-600">R$ 10,74</strong> de cashback nesta compra
					</p>
				</div>
			</div>
		</div>
	);
}

/* -------------------------------------------------------------------------- */
/*  6 · Pilar 04 — Reativação automática                                       */
/* -------------------------------------------------------------------------- */

const FUNNEL = [
	{ label: "Enviados", value: 1240, pct: 100 },
	{ label: "Entregues", value: 1198, pct: 96 },
	{ label: "Lidos", value: 812, pct: 65 },
	{ label: "Convertidos", value: 187, pct: 15 },
];

function ReactivationPillarSheet() {
	return (
		<Sheet>
			<div className="flex flex-1 flex-col px-11 py-9">
				<PillarHeader
					n="04"
					icon={Megaphone}
					kicker="Evolução · sobre a mesma base"
					title="Reativação automática"
					lead="Quando um cliente entra em risco de sumir, a plataforma dispara a mensagem certa no WhatsApp — com cashback de presente para trazê-lo de volta às compras."
				/>

				<div className="mt-8 grid grid-cols-[1.05fr_0.95fr] items-start gap-8">
					{/* Mockup WhatsApp */}
					<div className="flex flex-col items-center gap-3">
						<WhatsappCampaignMock />
						<span className="text-center text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-neutral-500">Campanha automática · gatilho “Em risco”</span>
					</div>

					{/* Funil + gatilhos */}
					<div className="flex flex-col gap-6 pt-1">
						<div>
							<h3 className="mb-3.5 text-sm font-black uppercase tracking-wide text-neutral-900">Funil da campanha</h3>
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
													backgroundColor: i === FUNNEL.length - 1 ? BRAND.red : BRAND.blue,
													opacity: i === FUNNEL.length - 1 ? 1 : 1 - i * 0.12,
												}}
											/>
										</div>
									</div>
								))}
							</div>
							<div className="mt-4 flex items-center gap-3 rounded-xl px-4 py-3" style={{ backgroundColor: hexToRgba(BRAND.red, 0.1) }}>
								<span className="text-2xl font-black tabular-nums" style={{ color: BRAND.redText }}>
									R$ 31.460
								</span>
								<span className="text-[0.78rem] font-semibold leading-tight text-neutral-600">
									em vendas recuperadas
									<br />
									de uma única campanha
								</span>
							</div>
						</div>

						<div>
							<h3 className="mb-3 text-sm font-black uppercase tracking-wide text-neutral-900">Dispara sozinho quando</h3>
							<ul className="flex flex-col gap-2.5">
								<BenefitRow>Um cliente fica semanas sem comprar além do ciclo habitual dele.</BenefitRow>
								<BenefitRow>Alguém migra para um segmento de risco na Matriz RFM.</BenefitRow>
								<BenefitRow>É aniversário do cliente — mensagem + brinde na hora.</BenefitRow>
								<BenefitRow>A primeira compra pede um empurrão para virar a segunda.</BenefitRow>
							</ul>
						</div>
					</div>
				</div>

				<TakeawayStrip>clientes que sumiram voltando a comprar — no piloto automático, sem você levantar um dedo.</TakeawayStrip>
			</div>
			<SheetFooter index="06 / 08" label="Pilar 04 · Reativação" />
		</Sheet>
	);
}

function WhatsappCampaignMock() {
	return (
		<div className="w-full max-w-[340px] overflow-hidden rounded-[26px] p-3 shadow-2xl" style={{ backgroundColor: BRAND.blueDeep, boxShadow: `0 30px 60px -25px ${hexToRgba(BRAND.blueDeep, 0.7)}` }}>
			<div className="overflow-hidden rounded-[18px]" style={{ backgroundColor: "#e6ddd4" }}>
				<div className="flex items-center gap-3 px-4 py-3 text-white" style={{ backgroundColor: "#075E54" }}>
					<div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-[0.68rem] font-black">GD</div>
					<div className="flex flex-col leading-none">
						<span className="text-[0.85rem] font-bold">Grupo Dutra</span>
						<span className="text-[0.6rem] text-white/70">conta comercial</span>
					</div>
					<FaWhatsapp className="ml-auto h-5 w-5 text-white/80" />
				</div>

				<div className="flex flex-col gap-2.5 px-4 py-5" style={{ backgroundImage: "radial-gradient(rgba(0,0,0,0.03) 1px, transparent 1px)", backgroundSize: "16px 16px" }}>
					<div className="max-w-[85%] self-start rounded-2xl rounded-tl-sm bg-white px-3.5 py-2.5 shadow-sm">
						<p className="text-[0.82rem] leading-snug text-neutral-800">
							Oi, Maria! 👋 Sentimos sua falta aqui no <strong>Grupo Dutra</strong>.
						</p>
						<p className="mt-2 text-[0.82rem] leading-snug text-neutral-800">
							Separamos <strong>R$ 15 de cashback</strong> pra você usar nas compras do mês — tá te esperando! 🎁
						</p>
						<span className="mt-1.5 block text-right text-[0.58rem] text-neutral-500">09:14 ✓✓</span>
					</div>

					<div className="max-w-[85%] self-start rounded-2xl rounded-tl-sm px-3.5 py-2.5 shadow-sm" style={{ backgroundColor: "#dcf8c6" }}>
						<p className="text-[0.82rem] leading-snug text-neutral-800">Oba! Sábado passo aí pra fazer o rancho do mês 🙌</p>
						<span className="mt-1.5 block text-right text-[0.58rem] text-neutral-500">09:31 ✓✓</span>
					</div>

					<div className="mt-1 self-center rounded-full px-3 py-1 text-[0.6rem] font-black uppercase tracking-wide text-white shadow" style={{ backgroundColor: BRAND.blue }}>
						Convertido · compra de R$ 214,90
					</div>
				</div>
			</div>
		</div>
	);
}

/* -------------------------------------------------------------------------- */
/*  7 · Pilar 05 — Pontos, vale-compras e sorteios                             */
/* -------------------------------------------------------------------------- */

const LUCKY_NUMBERS = [
	{ number: "04821", name: "Maria Souza", detail: "Compra de R$ 214,90 · Supermercado 01" },
	{ number: "04822", name: "Maria Souza", detail: "Compra de R$ 187,40 · DutraFer" },
	{ number: "05107", name: "Maria Souza", detail: "Compra de R$ 96,20 · Espetinho Dutra" },
];

function PointsPillarSheet() {
	return (
		<Sheet>
			<div className="flex flex-1 flex-col px-11 py-9">
				<PillarHeader
					n="05"
					icon={Ticket}
					kicker="Opção do grupo"
					title="Pontos, vale-compras e sorteios"
					lead="O modelo alternativo ao cashback, no mesmo motor do clube: cada real vira ponto, pontos viram vale-compras digital — e as campanhas geram números da sorte para sorteios."
				/>

				{/* Pontos → vale-compras */}
				<div className="mt-7">
					<div className="mb-3 flex items-center gap-2.5">
						<span className="flex h-7 w-7 items-center justify-center rounded-lg text-white" style={{ backgroundColor: BRAND.blue }}>
							<Repeat className="h-4 w-4" />
						</span>
						<h3 className="text-sm font-black uppercase tracking-wide text-neutral-900">Pontos e vale-compras</h3>
						<span className="rounded-full px-2 py-0.5 text-[0.55rem] font-black uppercase tracking-wide" style={{ backgroundColor: hexToRgba(BRAND.red, 0.1), color: BRAND.redText }}>
							Mesmo motor do cashback · só muda a régua
						</span>
					</div>
					<div className="grid grid-cols-[1fr_1fr_1fr_1.4fr] items-stretch gap-3">
						<PointStep value="R$ 1,00" label="em compras" />
						<PointStep value="1 ponto" label="creditado na hora" arrow />
						<PointStep value="500 pts" label="= R$ 5,00 em vale-compras" arrow highlight />
						<VoucherMock />
					</div>
				</div>

				<div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-2.5">
					<BenefitRow>A cada R$ 1,00 em compras, o cliente ganha 1 ponto — creditado pelo CPF no caixa.</BenefitRow>
					<BenefitRow>O resgate emite um vale-compras digital: voucher com código único, enviado no WhatsApp.</BenefitRow>
					<BenefitRow>O voucher vale desconto na próxima compra, aplicado direto no caixa de qualquer unidade.</BenefitRow>
					<BenefitRow>Conversão, validade e limites de resgate configurados por você — sem travar a operação.</BenefitRow>
				</div>

				{/* Sorteios */}
				<div className="mt-7">
					<div className="mb-3 flex items-center gap-2.5">
						<span className="flex h-7 w-7 items-center justify-center rounded-lg text-white" style={{ backgroundColor: BRAND.blue }}>
							<Trophy className="h-4 w-4" />
						</span>
						<h3 className="text-sm font-black uppercase tracking-wide text-neutral-900">Campanhas que geram números para sorteios</h3>
					</div>
					<div className="grid grid-cols-[1.1fr_0.9fr] items-start gap-6">
						<div className="overflow-hidden rounded-2xl border border-neutral-200">
							<div className="px-4 py-3 text-white" style={{ backgroundColor: BRAND.blue }}>
								<p className="text-[0.82rem] font-black uppercase tracking-tight">Sorteio de Aniversário do Grupo Dutra</p>
								<p className="text-[0.62rem] font-medium text-white/70">A cada R$ 100 em compras · 1 número da sorte</p>
							</div>
							<div className="flex flex-col divide-y divide-neutral-100">
								{LUCKY_NUMBERS.map((n) => (
									<div key={n.number} className="flex items-center gap-3 px-4 py-2.5">
										<div className="flex flex-col items-center rounded-lg px-2.5 py-1.5" style={{ backgroundColor: hexToRgba(BRAND.red, 0.08) }}>
											<span className="text-[0.5rem] font-black uppercase tracking-wide" style={{ color: BRAND.redText }}>
												Nº da sorte
											</span>
											<span className="text-base font-black tabular-nums" style={{ color: BRAND.redText }}>
												{n.number}
											</span>
										</div>
										<div className="flex min-w-0 flex-1 flex-col leading-tight">
											<span className="text-[0.78rem] font-bold text-neutral-900">{n.name}</span>
											<span className="truncate text-[0.62rem] text-neutral-500">{n.detail}</span>
										</div>
										<FaWhatsapp className="h-4 w-4 flex-shrink-0 text-green-600" />
									</div>
								))}
							</div>
						</div>

						<ul className="flex flex-col gap-2.5">
							<BenefitRow>A campanha define a regra — ex.: a cada R$ 100,00 em compras no período, um número da sorte.</BenefitRow>
							<BenefitRow>O número é gerado automaticamente na compra e enviado por WhatsApp na hora.</BenefitRow>
							<BenefitRow>Cada número é único e fica registrado no cadastro — auditável para o dia do sorteio.</BenefitRow>
							<BenefitRow>O painel lista todos os números emitidos por campanha, cliente e unidade.</BenefitRow>
						</ul>
					</div>
				</div>

				<TakeawayStrip>
					pontos que viram vale-compras e compras que viram números da sorte — tudo sobre o mesmo cadastro e a mesma integração, sem sistema paralelo.
				</TakeawayStrip>
			</div>
			<SheetFooter index="07 / 08" label="Pilar 05 · Pontos, vale-compras e sorteios" />
		</Sheet>
	);
}

function PointStep({ value, label, arrow, highlight }: { value: string; label: string; arrow?: boolean; highlight?: boolean }) {
	return (
		<div className="relative flex flex-col justify-center gap-0.5 rounded-2xl border px-4 py-3.5" style={highlight ? { borderColor: BRAND.red, backgroundColor: hexToRgba(BRAND.red, 0.06) } : { borderColor: "#e5e5e5", backgroundColor: "#fff" }}>
			{arrow ? (
				<span className="absolute -left-2.5 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white">
					<ArrowRight className="h-4 w-4 text-neutral-300" />
				</span>
			) : null}
			<span className="text-lg font-black leading-none tracking-tight" style={{ color: highlight ? BRAND.redText : BRAND.blue }}>
				{value}
			</span>
			<span className="text-[0.62rem] font-semibold leading-tight text-neutral-500">{label}</span>
		</div>
	);
}

function VoucherMock() {
	return (
		<div className="overflow-hidden rounded-2xl text-white" style={{ backgroundColor: BRAND.blue }}>
			<div className="flex items-center justify-between px-4 py-2.5">
				<div className="flex items-center gap-1.5">
					<div className="flex h-6 w-6 items-center justify-center rounded bg-white/15 text-[0.55rem] font-black">GD</div>
					<span className="text-[0.7rem] font-extrabold">Vale-Compras · Dutra</span>
				</div>
				<Gift className="h-4 w-4 text-white/80" />
			</div>
			<div className="bg-white px-4 py-3 text-center">
				<span className="text-[0.55rem] font-black uppercase tracking-[0.18em]" style={{ color: BRAND.redText }}>
					Desconto na próxima compra
				</span>
				<p className="text-2xl font-black tabular-nums" style={{ color: BRAND.blueDeep }}>
					R$ 5,00
				</p>
				<span className="text-[0.56rem] text-neutral-500">500 pontos resgatados · válido por 30 dias</span>
				<div className="mt-2 flex items-center justify-between border-t border-dashed border-neutral-200 pt-2">
					<div className="flex flex-col items-start leading-none">
						<span className="text-[0.5rem] font-bold uppercase text-neutral-400">Código</span>
						<span className="text-[0.72rem] font-black tracking-wide" style={{ color: BRAND.blue }}>
							DUTRA-8F3K
						</span>
					</div>
					<span className="rounded-md px-2 py-1 text-[0.5rem] font-black uppercase text-white" style={{ backgroundColor: BRAND.red }}>
						CPF no caixa
					</span>
				</div>
			</div>
		</div>
	);
}

/* -------------------------------------------------------------------------- */
/*  8 · Investimento                                                           */
/* -------------------------------------------------------------------------- */

function InvestmentSheet() {
	return (
		<Sheet>
			<div className="flex flex-1 flex-col gap-6 px-11 py-9">
				<SectionLabel icon={BarChart3} text="Investimento" />

				{/* Implementação + mensalidade */}
				<div className="grid grid-cols-2 items-stretch gap-5">
					<InvestmentCard
						name="Implementação"
						tag="Pagamento em 3x sem juros"
						tagline="O ecossistema construído sob medida e entregue funcionando — para todo o grupo."
						price={`R$ ${IMPLEMENTATION_FEE}`}
						period="único"
						note={`3x de R$ ${IMPLEMENTATION_INSTALLMENT} sem juros`}
						features={[
							"Hub de cadastro via QR Code personalizado",
							"Integração da nossa API com o ERP do grupo",
							"Configuração e testes nas 5 unidades",
							"Treinamento das equipes de caixa",
						]}
					/>
					<InvestmentCard
						name="Mensalidade"
						tag="Recorrente · por unidade"
						tagline="A plataforma rodando, evoluindo e operada por nós — de ponta a ponta."
						price={`R$ ${PRICE_PER_UNIT}`}
						period="/mês por unidade"
						note={`${UNITS} unidades · Total R$ ${TOTAL_MONTHLY}/mês`}
						highlight
						features={[
							"Operação completa da fidelização por nós",
							"Base unificada e painel de gestão do grupo",
							"Evolução contínua da plataforma",
							"Suporte dedicado por WhatsApp",
						]}
					/>
				</div>

				{/* Nota de transparência */}
				<div className="flex items-start gap-3 rounded-xl px-5 py-3.5" style={{ backgroundColor: hexToRgba(BRAND.blue, 0.06), border: `1px dashed ${hexToRgba(BRAND.blue, 0.35)}` }}>
					<ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: BRAND.blue }} />
					<p className="text-[0.74rem] leading-snug text-neutral-700">
						<strong>Sem surpresa.</strong> A implementação é cobrada uma única vez, em 3x sem juros, para todo o ecossistema. A mensalidade de R$ {PRICE_PER_UNIT}{" "}
						por unidade cobre a operação da fidelização feita por nós, hospedagem, evolução e suporte — sem fidelidade.
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
									border: step.now ? `2px solid ${BRAND.red}` : "1px solid #e5e5e5",
									boxShadow: step.now ? `0 10px 30px -12px ${hexToRgba(BRAND.blue, 0.4)}` : undefined,
								}}
							>
								{step.now ? (
									<span className="absolute -top-2.5 right-4 rounded-full px-2.5 py-0.5 text-[0.55rem] font-black uppercase tracking-wider text-white" style={{ backgroundColor: BRAND.red }}>
										Começa aqui
									</span>
								) : null}
								<span className="flex h-7 w-7 items-center justify-center rounded-full text-[0.72rem] font-black text-white" style={{ backgroundColor: BRAND.blue }}>
									{i + 1}
								</span>
								<step.icon className="h-4 w-4" style={{ color: BRAND.redText }} />
								<h4 className="text-[0.74rem] font-black uppercase leading-tight tracking-tight text-neutral-900">{step.title}</h4>
								<p className="text-[0.66rem] leading-snug text-neutral-600">{step.body}</p>
							</div>
						))}
					</div>
					<p className="mt-3 text-[0.72rem] leading-snug text-neutral-500">
						Cada etapa usa a mesma base de clientes construída no hub — nada se refaz, tudo se soma. Os pilares 03 a 05 mostram as etapas seguintes já funcionando.
					</p>
				</div>

				{/* Closing CTA */}
				<div className="relative mt-auto overflow-hidden rounded-3xl px-8 py-7 text-white" style={heroGradient}>
					<div className="absolute inset-0 opacity-[0.12]" style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "16px 16px" }} />
					<div className="absolute right-0 top-0 h-full w-2" style={{ backgroundColor: BRAND.red }} />
					<div className="relative z-10 flex flex-col gap-4">
						<div className="flex items-center gap-2">
							<Star className="h-5 w-5" fill="currentColor" />
							<h2 className="text-xl font-black uppercase leading-tight tracking-tight">Vamos unificar a fidelização do Grupo Dutra</h2>
						</div>
						<p className="max-w-xl text-[0.82rem] leading-relaxed opacity-90">
							Seus cinco negócios já rodam. O que falta é a camada de relacionamento que conecta todos eles — e ela começa com um QR Code que qualquer
							cliente pode escanear hoje. Chame a gente no WhatsApp e colocamos o ecossistema de pé.
						</p>
						<div className="mt-1 flex flex-wrap gap-3">
							{SUPPORT_CONTACTS.map((contact) => (
								<a
									key={contact.name}
									href={`https://wa.me/${contact.whatsapp}?text=${encodeURIComponent("Olá! Quero conversar sobre a proposta do Grupo Dutra.")}`}
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
			<SheetFooter index="08 / 08" label="Investimento" />
		</Sheet>
	);
}

function InvestmentCard({
	name,
	tag,
	tagline,
	price,
	period,
	note,
	features,
	highlight,
}: {
	name: string;
	tag: string;
	tagline: string;
	price: string;
	period: string;
	note?: string;
	features: string[];
	highlight?: boolean;
}) {
	return (
		<div
			className="relative flex flex-col gap-4 rounded-2xl bg-white p-6"
			style={{
				border: highlight ? `2px solid ${BRAND.red}` : "1px solid #e5e5e5",
				boxShadow: highlight ? `0 10px 30px -12px ${hexToRgba(BRAND.blue, 0.45)}` : undefined,
			}}
		>
			<span
				className="absolute -top-3 right-5 inline-flex items-center gap-1 rounded-full px-3 py-1 text-[0.6rem] font-black uppercase tracking-wider text-white"
				style={highlight ? { backgroundColor: BRAND.red } : { backgroundColor: BRAND.blue }}
			>
				{tag}
			</span>

			<div>
				<h3 className="text-base font-black uppercase tracking-tight text-neutral-900">{name}</h3>
				<p className="mt-0.5 text-[0.72rem] leading-snug text-neutral-500">{tagline}</p>
			</div>

			<div className="flex items-end gap-1">
				<span className="text-3xl font-black tracking-tight" style={{ color: BRAND.blue }}>
					{price}
				</span>
				<span className="mb-1 text-[0.75rem] font-semibold text-neutral-400">{period}</span>
			</div>
			{note ? (
				<span className="-mt-2 w-fit rounded-full px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-wide" style={{ backgroundColor: hexToRgba(BRAND.red, 0.1), color: BRAND.redText }}>
					{note}
				</span>
			) : null}

			<div className="h-px w-full bg-neutral-100" />

			<ul className="flex flex-col gap-2">
				{features.map((feature) => (
					<li key={feature} className="flex items-start gap-2">
						<Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" style={{ color: BRAND.redText }} />
						<span className="text-[0.74rem] leading-snug text-neutral-700">{feature}</span>
					</li>
				))}
			</ul>
		</div>
	);
}
