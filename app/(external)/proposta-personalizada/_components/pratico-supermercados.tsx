// Proposta comercial de uso único — Prático Supermercados.
// Solução personalizada (Hub de Clientes integrado ao ERPFlex) — não é o RecompraCRM,
// mas a proposta vive aqui pela qualidade do design system.
// Renderizada dentro do shell de impressão em ../page.tsx (A4). Não faz parte do produto.

import { ARTHUR_WHATSAPP_NUMBER, LUCAS_WHATSAPP_NUMBER } from "@/config/internal-coms";
import {
	BarChart3,
	Check,
	ClipboardList,
	Contact,
	Database,
	DoorOpen,
	Gift,
	LayoutDashboard,
	type LucideIcon,
	Megaphone,
	MonitorSmartphone,
	Plug,
	Rocket,
	ShieldCheck,
	ShoppingCart,
	Sparkles,
	Star,
	Users,
} from "lucide-react";
import Image from "next/image";
import { FaWhatsapp } from "react-icons/fa6";
import { Sheet, SheetFooter } from "./_shared";

/* -------------------------------------------------------------------------- */
/*  Paleta Prático Supermercados (extraída da logo)                            */
/* -------------------------------------------------------------------------- */

const BRAND = {
	green: "#245D3C",
	greenDeep: "#17402A",
	lime: "#AACE46",
	// Lime escurecido — legível como texto sobre fundos claros
	limeText: "#5F7A1E",
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

const PRICE_PER_STORE = "399,90";
const IMPLEMENTATION_FEE = "5.000";

const SUPPORT_CONTACTS = [
	{ name: "Lucas Fernandes", phone: "34 99662-6855", whatsapp: LUCAS_WHATSAPP_NUMBER },
	{ name: "Arthur Carvalho", phone: "34 99948-0791", whatsapp: ARTHUR_WHATSAPP_NUMBER },
] as const;

const SOLUTION_CARDS = [
	{
		icon: ClipboardList,
		title: "Cadastro que vale a pena",
		body: "Para participar, o cliente preenche um perfil completo — dados de contato e de família que permitem segmentar ofertas de verdade.",
	},
	{
		icon: Plug,
		title: "Benefício direto no caixa",
		body: "Integrado ao ERPFlex: o cliente informa o CPF no PDV e o benefício é aplicado na hora. Sem app, sem cartãozinho, sem atrito.",
	},
	{
		icon: Database,
		title: "Uma base que é sua",
		body: "Cada cadastro vira um ativo do Prático: uma base própria, rica e segmentável — independente de qualquer plataforma.",
	},
];

const PROFILE_FIELDS = [
	"Nome completo",
	"Telefone / WhatsApp",
	"CPF",
	"Gênero",
	"Estado civil",
	"Filhos",
	"Moradores na residência",
	"Consentimento LGPD",
];

const DELIVERABLES = [
	{
		icon: MonitorSmartphone,
		title: "Hub de cadastro sob medida",
		body: "Formulário rápido, com a cara do Prático, para o cliente se cadastrar na loja ou pelo próprio celular.",
	},
	{
		icon: Plug,
		title: "Integração com o ERPFlex",
		body: "Benefícios aplicados no caixa por CPF, dentro do fluxo que sua operação já usa hoje.",
	},
	{
		icon: LayoutDashboard,
		title: "Painel de gestão da base",
		body: "Busca, filtros por perfil e visão do crescimento dos cadastros, loja a loja.",
	},
	{
		icon: ShieldCheck,
		title: "LGPD by design",
		body: "Consentimento no cadastro, opt-out e boas práticas de dados desde o primeiro dia.",
	},
	{
		icon: Users,
		title: "Treinamento das equipes",
		body: "Frente de caixa preparada para convidar e cadastrar clientes sem travar a fila.",
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
		body: "Cadastro rico + benefício no caixa. A fundação de tudo.",
		now: true,
	},
	{
		icon: Gift,
		title: "Clube de fidelidade",
		body: "Cashback e vantagens exclusivas sobre a base já cadastrada.",
	},
	{
		icon: Megaphone,
		title: "CRM & campanhas",
		body: "Reativação e ofertas segmentadas pelo perfil de cada cliente.",
	},
	{
		icon: ShoppingCart,
		title: "E-commerce",
		body: "A mesma base de clientes, comprando também fora da loja.",
	},
];

/* -------------------------------------------------------------------------- */
/*  Proposta — Prático Supermercados                                           */
/* -------------------------------------------------------------------------- */

export function PraticoSupermercadosProposal() {
	return (
		<>
			<IntroSheet />
			<InvestmentSheet />
		</>
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
					{/* barra de acento lime */}
					<div className="absolute right-0 top-0 h-full w-2" style={{ backgroundColor: BRAND.lime }} />
					<div className="relative z-10 flex items-center gap-5">
						<div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl shadow-lg ring-1 ring-white/25">
							<Image src="/logo-pratico-supermercados.jpg" alt="Prático Supermercados" width={80} height={80} className="h-full w-full object-cover" />
						</div>
						<div className="min-w-0 text-white">
							<p className="text-[0.65rem] font-bold uppercase tracking-[0.3em] opacity-85">Proposta Comercial · Prático Supermercados</p>
							<h1 className="mt-1 text-[2rem] font-black uppercase leading-[0.95] tracking-tight">
								Conheça cada cliente
								<br />
								que passa no seu caixa
							</h1>
							<p className="mt-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider backdrop-blur">
								<Users className="h-3.5 w-3.5" />
								Hub de Clientes · benefícios direto no caixa, integrado ao ERPFlex
							</p>
						</div>
					</div>
				</div>

				{/* O cenário */}
				<div className="rounded-2xl px-6 py-5" style={{ backgroundColor: hexToRgba(BRAND.lime, 0.12), borderLeft: `4px solid ${BRAND.lime}` }}>
					<div className="mb-2 flex items-center gap-2">
						<Users className="h-4 w-4" style={{ color: BRAND.green }} />
						<h2 className="text-sm font-black uppercase tracking-tight" style={{ color: BRAND.green }}>
							O cenário
						</h2>
					</div>
					<p className="text-[0.82rem] leading-relaxed text-neutral-700">
						O Prático processa milhares de vendas todos os dias no <strong>ERPFlex</strong> — um fluxo enorme de clientes passando pelo caixa.{" "}
						<strong>Quanto mais se sabe sobre quem compra, mais valor cada venda pode gerar</strong> — em benefícios, ofertas certeiras e relacionamento. É
						aí que entramos.
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
									style={{ backgroundColor: hexToRgba(BRAND.green, 0.1), color: BRAND.green }}
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
									style={{ backgroundColor: hexToRgba(BRAND.lime, 0.18), color: BRAND.green }}
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
									style={{ backgroundColor: hexToRgba(BRAND.lime, 0.2), color: BRAND.green }}
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
						style={{ backgroundColor: hexToRgba(BRAND.green, 0.08), border: `1px solid ${hexToRgba(BRAND.green, 0.25)}` }}
					>
						<div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-white" style={{ backgroundColor: BRAND.green }}>
							<DoorOpen className="h-5 w-5" />
						</div>
						<div className="min-w-0 flex-1">
							<div className="flex items-center gap-2">
								<h4 className="text-[0.82rem] font-black uppercase tracking-tight" style={{ color: BRAND.green }}>
									A porta de entrada
								</h4>
								<span
									className="rounded-full px-2 py-0.5 text-[0.55rem] font-black uppercase tracking-wider"
									style={{ backgroundColor: BRAND.lime, color: BRAND.greenDeep }}
								>
									Pensado para crescer
								</span>
							</div>
							<p className="text-[0.74rem] leading-snug text-neutral-700">
								O hub é a fundação. Com a base formada, os próximos passos — clube de fidelidade, CRM, campanhas, e-commerce — já nascem com clientes
								conhecidos, sem começar do zero. O detalhe na próxima página.
							</p>
						</div>
					</div>
				</div>
			</div>
			<SheetFooter index="01 / 02" label="Proposta · Prático Supermercados" />
		</Sheet>
	);
}

/* -------------------------------------------------------------------------- */
/*  2 · Investimento, caminho e fechamento                                     */
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
						tag="Pagamento único"
						tagline="O hub construído sob medida e entregue funcionando."
						price={`R$ ${IMPLEMENTATION_FEE}`}
						period="único"
						features={[
							"Desenvolvimento do hub personalizado",
							"Integração com o ERPFlex",
							"Configuração e testes nas lojas",
							"Treinamento das equipes de caixa",
						]}
					/>
					<InvestmentCard
						name="Mensalidade"
						tag="Recorrente · por loja"
						tagline="A plataforma rodando, evoluindo e suportada."
						price={`R$ ${PRICE_PER_STORE}`}
						period="/mês por loja"
						highlight
						features={["Hospedagem e infraestrutura", "Painel de gestão da base", "Evolução contínua da plataforma", "Suporte dedicado por WhatsApp"]}
					/>
				</div>

				{/* Nota de transparência */}
				<div
					className="flex items-start gap-3 rounded-xl px-5 py-3.5"
					style={{ backgroundColor: hexToRgba(BRAND.green, 0.06), border: `1px dashed ${hexToRgba(BRAND.green, 0.35)}` }}
				>
					<ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: BRAND.green }} />
					<p className="text-[0.74rem] leading-snug text-neutral-700">
						<strong>Sem surpresa.</strong> A implementação é cobrada uma única vez, para toda a rede. A mensalidade cobre operação, hospedagem, evolução e
						suporte — sem fidelidade.
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
									border: step.now ? `2px solid ${BRAND.lime}` : "1px solid #e5e5e5",
									boxShadow: step.now ? `0 10px 30px -12px ${hexToRgba(BRAND.green, 0.4)}` : undefined,
								}}
							>
								{step.now ? (
									<span
										className="absolute -top-2.5 right-4 rounded-full px-2.5 py-0.5 text-[0.55rem] font-black uppercase tracking-wider"
										style={{ backgroundColor: BRAND.lime, color: BRAND.greenDeep }}
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
								<step.icon className="h-4 w-4" style={{ color: BRAND.limeText }} />
								<h4 className="text-[0.76rem] font-black uppercase leading-tight tracking-tight text-neutral-900">{step.title}</h4>
								<p className="text-[0.68rem] leading-snug text-neutral-600">{step.body}</p>
							</div>
						))}
					</div>
					<p className="mt-3 text-[0.72rem] leading-snug text-neutral-500">
						Cada etapa usa a mesma base de clientes construída no hub — nada se refaz, tudo se soma.
					</p>
				</div>

				{/* Closing CTA */}
				<div className="relative mt-auto overflow-hidden rounded-3xl px-8 py-7 text-white" style={heroGradient}>
					<div
						className="absolute inset-0 opacity-[0.12]"
						style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "16px 16px" }}
					/>
					<div className="absolute right-0 top-0 h-full w-2" style={{ backgroundColor: BRAND.lime }} />
					<div className="relative z-10 flex flex-col gap-4">
						<div className="flex items-center gap-2">
							<Star className="h-5 w-5" fill="currentColor" />
							<h2 className="text-xl font-black uppercase leading-tight tracking-tight">Vamos conhecer cada cliente do Prático</h2>
						</div>
						<p className="max-w-xl text-[0.82rem] leading-relaxed opacity-90">
							A operação já roda no ERPFlex. O que falta é a camada de relacionamento — e ela começa com um cadastro que o cliente tem um bom motivo para
							preencher. Chame a gente no WhatsApp e colocamos o hub de pé.
						</p>
						<div className="mt-1 flex flex-wrap gap-3">
							{SUPPORT_CONTACTS.map((contact) => (
								<a
									key={contact.name}
									href={`https://wa.me/${contact.whatsapp}?text=${encodeURIComponent("Olá! Quero conversar sobre a proposta do Prático.")}`}
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
			<SheetFooter index="02 / 02" label="Proposta · Prático Supermercados" />
		</Sheet>
	);
}

/* -------------------------------------------------------------------------- */
/*  Primitivos locais                                                          */
/* -------------------------------------------------------------------------- */

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
				border: highlight ? `2px solid ${BRAND.lime}` : "1px solid #e5e5e5",
				boxShadow: highlight ? `0 10px 30px -12px ${hexToRgba(BRAND.green, 0.45)}` : undefined,
			}}
		>
			<span
				className="absolute -top-3 right-5 inline-flex items-center gap-1 rounded-full px-3 py-1 text-[0.6rem] font-black uppercase tracking-wider"
				style={highlight ? { backgroundColor: BRAND.lime, color: BRAND.greenDeep } : { backgroundColor: BRAND.green, color: "#fff" }}
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
						<Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" style={{ color: BRAND.limeText }} />
						<span className="text-[0.74rem] leading-snug text-neutral-700">{feature}</span>
					</li>
				))}
			</ul>
		</div>
	);
}
