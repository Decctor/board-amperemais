"use client";

import { BrandLogo } from "@/components/Brand/BrandLogo";
import { Button } from "@/components/ui/button";
import { ARTHUR_WHATSAPP_NUMBER, LUCAS_WHATSAPP_NUMBER } from "@/config/internal-coms";
import {
	BadgeCheck,
	BarChart3,
	CalendarRange,
	Check,
	LayoutDashboard,
	LineChart,
	MessageSquareQuote,
	Plug,
	Printer,
	Send,
	ShieldCheck,
	Sparkles,
	Star,
	Target,
	Users,
} from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import { FaWhatsapp } from "react-icons/fa6";

// ---------------------------------------------------------------------------
// Pontual Supermercados brand palette (extracted from the brand logo).
// Self-contained: this proposal is a one-off and is not an org in the DB,
// so we don't go through OrgColorsProvider.
// ---------------------------------------------------------------------------
const BRAND = {
	red: "#E2342B",
	redDark: "#B01E1C",
	green: "#1B9E47",
	greenDark: "#147A37",
} as const;

function hexToRgba(hex: string, alpha: number) {
	const h = hex.replace("#", "");
	const r = parseInt(h.slice(0, 2), 16);
	const g = parseInt(h.slice(2, 4), 16);
	const b = parseInt(h.slice(4, 6), 16);
	return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const heroGradient = {
	backgroundImage: `linear-gradient(135deg, ${BRAND.red} 0%, ${BRAND.redDark} 100%)`,
};

const SUPPORT_CONTACTS = [
	{ name: "Lucas Fernandes", phone: "34 99662-6855", whatsapp: LUCAS_WHATSAPP_NUMBER },
	{ name: "Arthur Carvalho", phone: "34 99948-0791", whatsapp: ARTHUR_WHATSAPP_NUMBER },
] as const;

const SOLUTION_CARDS = [
	{
		icon: FaWhatsapp,
		title: "API Oficial do WhatsApp",
		body: "O canal com a maior taxa de abertura do mercado, dentro das regras da Meta — sem risco de bloqueio do número.",
	},
	{
		icon: Target,
		title: "Personalizado por cliente",
		body: "Cada cliente recebe a oferta que o Mercafácil gerou para o CPF dele. Mensagem certa, para a pessoa certa.",
	},
	{
		icon: Send,
		title: "Disparo em massa",
		body: "Campanhas para toda a base — ou para segmentos específicos — com poucos cliques e no melhor horário.",
	},
];

const DELIVERABLES = [
	{
		icon: BadgeCheck,
		title: "Implementação completa",
		body: "Setup da conta API Oficial, infraestrutura de disparo e templates aprovados pela Meta.",
	},
	{
		icon: Plug,
		title: "Integração com o Mercafácil",
		body: "Os segmentos e cupons gerados por CPF viram mensagem automaticamente — a oferta certa em cada disparo.",
	},
	{
		icon: LayoutDashboard,
		title: "Dashboard de campanhas",
		body: "Enviados, entregues, lidos, cliques e resgates de cupom atribuídos a cada campanha.",
	},
	{
		icon: Send,
		title: "Operação contínua",
		body: "Criamos, agendamos e disparamos as campanhas por você — a comunicação roda sem ocupar sua equipe.",
	},
	{
		icon: Sparkles,
		title: "Acompanhamento & fine-tuning",
		body: "Testes de horário, copy, segmentação e frequência para subir, mês a mês, a taxa de resgate.",
	},
	{
		icon: ShieldCheck,
		title: "Opt-out & saúde do número",
		body: "Gestão de descadastro (LGPD) e do nível de qualidade Meta para manter o canal sempre ativo.",
	},
];

const STEPS = [
	{ icon: BadgeCheck, title: "Setup & aprovação", body: "Configuração da conta API Oficial e dos templates junto à Meta." },
	{ icon: Plug, title: "Integração", body: "Conexão com os segmentos e cupons do Mercafácil." },
	{ icon: Send, title: "Primeira campanha", body: "Disparo piloto e primeira leitura de resultados reais." },
	{ icon: LineChart, title: "Otimização contínua", body: "Ajuste de copy, horário e segmentação a cada ciclo." },
];

export default function PropostaPontualPage() {
	function handlePrint() {
		window.print();
	}

	return (
		<div
			className="proposal-root flex min-h-screen flex-col items-center gap-6 bg-neutral-100 p-4 pb-24 print:gap-0 print:bg-white print:p-0 print:pb-0"
			style={{ backgroundColor: hexToRgba(BRAND.red, 0.05) }}
		>
			<style>{`
				@page { size: A4 portrait; margin: 0; }
				.proposal-sheet { width: 210mm; }
				@media screen { .proposal-sheet { min-height: 297mm; } }
				@media print {
					.proposal-root { background: #fff !important; }
					.proposal-sheet { height: 297mm; overflow: hidden; break-before: page; box-shadow: none !important; }
					.proposal-sheet:first-child { break-before: avoid; }
					html, body { background: #fff !important; }
				}
			`}</style>

			{/* ============================== PAGE 1 ============================== */}
			<Sheet pageNumber={1} totalPages={2}>
				<div className="flex flex-1 flex-col gap-5 px-11 py-9">
					{/* Hero */}
					<div className="relative overflow-hidden rounded-3xl px-8 py-7" style={heroGradient}>
						<div
							className="absolute inset-0 opacity-[0.12]"
							style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "16px 16px" }}
						/>
						{/* green accent bar */}
						<div className="absolute right-0 top-0 h-full w-2" style={{ backgroundColor: BRAND.green }} />
						<div className="relative z-10 flex items-center gap-5">
							<div className="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white p-1.5 shadow-lg">
								<Image
									src="/logo-pontual-supermercados.png"
									alt="Pontual Supermercados"
									width={72}
									height={72}
									className="h-full w-full object-contain rounded-xl"
								/>
							</div>
							<div className="min-w-0 text-white">
								<p className="text-[0.65rem] font-bold uppercase tracking-[0.3em] opacity-85">Proposta Comercial · Pontual Supermercados</p>
								<h1 className="mt-1 text-[2rem] font-black uppercase leading-[0.95] tracking-tight">
									Suas ofertas onde o<br />
									cliente realmente lê
								</h1>
								<p className="mt-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider backdrop-blur">
									<FaWhatsapp className="h-3.5 w-3.5" />
									Disparo de promoções personalizadas via API Oficial do WhatsApp
								</p>
							</div>
						</div>
					</div>

					{/* O cenário */}
					<div className="rounded-2xl px-6 py-5" style={{ backgroundColor: hexToRgba(BRAND.green, 0.07), borderLeft: `4px solid ${BRAND.green}` }}>
						<div className="mb-2 flex items-center gap-2">
							<Users className="h-4 w-4" style={{ color: BRAND.greenDark }} />
							<h2 className="text-sm font-black uppercase tracking-tight" style={{ color: BRAND.greenDark }}>
								O cenário
							</h2>
						</div>
						<p className="text-[0.82rem] leading-relaxed text-neutral-700">
							Hoje o Pontual já gera, via <strong>Mercafácil</strong>, promoções e cupons personalizados por CPF — o cliente informa o CPF no PDV e os
							descontos certos são aplicados automaticamente. <strong>O desafio não está em gerar a oferta certa; está em comunicá-la.</strong> O app próprio
							tem alcance baixo e e-mail/SMS têm engajamento limitado. As ofertas existem, mas não chegam a quem deveria. É exatamente aí que entramos.
						</p>
					</div>

					{/* A solução */}
					<div>
						<SectionLabel icon={Sparkles} text="A solução" />
						<div className="grid grid-cols-3 gap-4">
							{SOLUTION_CARDS.map((card) => (
								<div key={card.title} className="flex flex-col gap-2.5 rounded-2xl border border-neutral-200 bg-white p-4">
									<div
										className="flex h-10 w-10 items-center justify-center rounded-xl"
										style={{ backgroundColor: hexToRgba(BRAND.red, 0.1), color: BRAND.red }}
									>
										<card.icon className="h-5 w-5" />
									</div>
									<h3 className="text-[0.8rem] font-black uppercase leading-tight tracking-tight text-neutral-900">{card.title}</h3>
									<p className="text-[0.72rem] leading-snug text-neutral-600">{card.body}</p>
								</div>
							))}
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
										style={{ backgroundColor: hexToRgba(BRAND.green, 0.12), color: BRAND.greenDark }}
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

						{/* ROI highlight — already included in the R$ 899,90 plan */}
						<div
							className="mt-4 flex items-center gap-4 overflow-hidden rounded-2xl px-5 py-4"
							style={{ backgroundColor: hexToRgba(BRAND.green, 0.1), border: `1px solid ${hexToRgba(BRAND.green, 0.3)}` }}
						>
							<div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-white" style={{ backgroundColor: BRAND.greenDark }}>
								<LineChart className="h-5 w-5" />
							</div>
							<div className="min-w-0 flex-1">
								<div className="flex items-center gap-2">
									<h4 className="text-[0.82rem] font-black uppercase tracking-tight" style={{ color: BRAND.greenDark }}>
										ROI por campanha
									</h4>
									<span
										className="rounded-full px-2 py-0.5 text-[0.55rem] font-black uppercase tracking-wider text-white"
										style={{ backgroundColor: BRAND.green }}
									>
										Incluso no plano
									</span>
								</div>
								<p className="text-[0.74rem] leading-snug text-neutral-700">
									Atribuímos cada resgate de cupom à campanha que o gerou e cruzamos com o faturamento — você enxerga, em reais, o retorno de cada disparo. O
									argumento que prova o valor mês a mês.
								</p>
							</div>
						</div>
					</div>
				</div>
			</Sheet>

			{/* ============================== PAGE 2 ============================== */}
			<Sheet pageNumber={2} totalPages={2}>
				<div className="flex flex-1 flex-col gap-6 px-11 py-9">
					<SectionLabel icon={BarChart3} text="Planos & investimento" />

					{/* Plans */}
					<div className="grid grid-cols-2 items-stretch gap-5">
						{/* Operação */}
						<PlanCard
							name="Operação"
							tagline="Implementação + operação completa, rodando por você."
							price="R$ 899,90"
							period="/mês"
							accent={BRAND.red}
							features={[
								"Implementação completa da solução",
								"Integração com o Mercafácil",
								"Dashboard de campanhas",
								"Relatório de ROI por campanha",
								"Operação e disparos contínuos",
								"Acompanhamento e fine-tuning mensal",
								"Suporte por WhatsApp",
							]}
						/>
						{/* Operação + Estratégia */}
						<PlanCard
							name="Operação + Estratégia"
							tagline="Tudo do plano Operação, com um time ao seu lado."
							price="R$ 2.500"
							period="/mês"
							accent={BRAND.green}
							highlight
							features={[
								"Tudo do plano Operação, mais:",
								"Reuniões recorrentes com estratégia e marketing",
								"Planejamento conjunto do calendário promocional",
								"Análise aprofundada de resultados",
								"Recomendações acionáveis a cada ciclo",
								"Prioridade no atendimento e nas otimizações",
							]}
						/>
					</div>

					{/* Meta cost note */}
					<div
						className="flex items-start gap-3 rounded-xl px-5 py-3.5"
						style={{ backgroundColor: hexToRgba(BRAND.red, 0.06), border: `1px dashed ${hexToRgba(BRAND.red, 0.35)}` }}
					>
						<MessageSquareQuote className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: BRAND.red }} />
						<p className="text-[0.74rem] leading-snug text-neutral-700">
							<strong>Custo de envio à parte.</strong> A tarifa por conversa cobrada pela Meta (API Oficial) é faturada diretamente ao Pontual, conforme
							volume de disparos. Nossa mensalidade cobre o serviço, a operação e a tecnologia — sem margem sobre o envio.
						</p>
					</div>

					{/* Como começamos */}
					<div>
						<SectionLabel icon={CalendarRange} text="Como começamos" />
						<div className="grid grid-cols-4 gap-3">
							{STEPS.map((step, i) => (
								<div key={step.title} className="relative flex flex-col gap-2 rounded-2xl border border-neutral-200 bg-white p-4">
									<span
										className="flex h-7 w-7 items-center justify-center rounded-full text-[0.72rem] font-black text-white"
										style={{ backgroundColor: BRAND.red }}
									>
										{i + 1}
									</span>
									<step.icon className="h-4 w-4" style={{ color: BRAND.greenDark }} />
									<h4 className="text-[0.76rem] font-black uppercase leading-tight tracking-tight text-neutral-900">{step.title}</h4>
									<p className="text-[0.68rem] leading-snug text-neutral-600">{step.body}</p>
								</div>
							))}
						</div>
					</div>

					{/* Closing CTA */}
					<div className="relative mt-auto overflow-hidden rounded-3xl px-8 py-7 text-white" style={heroGradient}>
						<div
							className="absolute inset-0 opacity-[0.12]"
							style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "16px 16px" }}
						/>
						<div className="absolute right-0 top-0 h-full w-2" style={{ backgroundColor: BRAND.green }} />
						<div className="relative z-10 flex flex-col gap-4">
							<div className="flex items-center gap-2">
								<Star className="h-5 w-5" fill="currentColor" />
								<h2 className="text-xl font-black uppercase leading-tight tracking-tight">Vamos transformar suas ofertas em vendas</h2>
							</div>
							<p className="max-w-xl text-[0.82rem] leading-relaxed opacity-90">
								O Pontual já tem a inteligência de oferta. Falta o canal certo para entregá-la. Vamos colocar a comunicação para rodar e medir, campanha a
								campanha, o quanto isso volta em resgate e em vendas.
							</p>
							<div className="mt-1 flex flex-wrap gap-3">
								{SUPPORT_CONTACTS.map((contact) => (
									<a
										key={contact.name}
										href={`https://wa.me/${contact.whatsapp}?text=${encodeURIComponent("Olá! Quero conversar sobre a proposta do Pontual.")}`}
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
			</Sheet>

			{/* Print control */}
			<aside className="fixed right-6 top-1/2 z-20 hidden w-56 -translate-y-1/2 flex-col gap-3 rounded-2xl bg-white p-4 shadow-xl lg:flex print:hidden">
				<div className="flex flex-col gap-0.5">
					<div className="flex items-center gap-1.5">
						<Printer className="h-4 w-4" />
						<p className="text-sm font-semibold text-neutral-900">Imprimir / Salvar PDF</p>
					</div>
					<p className="text-xs text-neutral-500">Proposta de 2 páginas (A4), pronta para enviar.</p>
				</div>
				<Button type="button" className="w-full gap-2" onClick={handlePrint}>
					<Printer className="h-4 w-4" />
					IMPRIMIR
				</Button>
			</aside>

			<nav className="fixed bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white/95 p-2 shadow-xl backdrop-blur lg:hidden print:hidden">
				<Button type="button" className="h-11 gap-2 rounded-full px-5 text-sm font-semibold" onClick={handlePrint}>
					<Printer className="h-4 w-4" />
					IMPRIMIR / PDF
				</Button>
			</nav>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

function Sheet({ children, pageNumber, totalPages }: { children: ReactNode; pageNumber: number; totalPages: number }) {
	return (
		<section className="proposal-sheet relative flex flex-col bg-white text-neutral-900 shadow-2xl print:shadow-none">
			<div className="flex flex-1 flex-col">{children}</div>
			<div className="flex items-center justify-between border-t border-neutral-200 px-11 py-3">
				<span className="text-[0.6rem] font-medium uppercase tracking-widest text-neutral-400">Proposta · Pontual Supermercados</span>
				<div className="flex items-center gap-3">
					<div className="flex items-center gap-1.5">
						<span className="text-[0.6rem] font-medium text-neutral-400">Powered by</span>
						<div className="relative h-4 w-20">
							<BrandLogo lockup="horizontal-badge" tone="color-on-light" alt="RecompraCRM" fill className="object-contain" />
						</div>
					</div>
					<span className="text-[0.6rem] font-medium text-neutral-400">
						{pageNumber} / {totalPages}
					</span>
				</div>
			</div>
		</section>
	);
}

function MetaCell({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-xl border border-neutral-200 bg-white px-4 py-2.5">
			<p className="text-[0.58rem] font-bold uppercase tracking-[0.2em] text-neutral-400">{label}</p>
			<p className="text-[0.82rem] font-bold text-neutral-900">{value}</p>
		</div>
	);
}

function SectionLabel({ icon: Icon, text }: { icon: typeof Sparkles; text: string }) {
	return (
		<div className="mb-3 flex items-center gap-2.5">
			<div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: hexToRgba(BRAND.red, 0.1), color: BRAND.red }}>
				<Icon className="h-[18px] w-[18px]" />
			</div>
			<h2 className="text-lg font-black uppercase leading-none tracking-tight text-neutral-900">{text}</h2>
		</div>
	);
}

function PlanCard({
	name,
	tagline,
	price,
	period,
	accent,
	features,
	highlight,
}: {
	name: string;
	tagline: string;
	price: string;
	period: string;
	accent: string;
	features: string[];
	highlight?: boolean;
}) {
	return (
		<div
			className="relative flex flex-col gap-4 rounded-2xl bg-white p-6"
			style={{
				border: highlight ? `2px solid ${accent}` : "1px solid #e5e5e5",
				boxShadow: highlight ? `0 10px 30px -12px ${hexToRgba(accent, 0.5)}` : undefined,
			}}
		>
			{highlight ? (
				<span
					className="absolute -top-3 right-5 inline-flex items-center gap-1 rounded-full px-3 py-1 text-[0.6rem] font-black uppercase tracking-wider text-white"
					style={{ backgroundColor: accent }}
				>
					<Star className="h-3 w-3" fill="currentColor" />
					Recomendado
				</span>
			) : null}

			<div>
				<h3 className="text-base font-black uppercase tracking-tight text-neutral-900">{name}</h3>
				<p className="mt-0.5 text-[0.72rem] leading-snug text-neutral-500">{tagline}</p>
			</div>

			<div className="flex items-end gap-1">
				<span className="text-3xl font-black tracking-tight" style={{ color: accent }}>
					{price}
				</span>
				<span className="mb-1 text-[0.75rem] font-semibold text-neutral-400">{period}</span>
			</div>

			<div className="h-px w-full bg-neutral-100" />

			<ul className="flex flex-col gap-2">
				{features.map((feature, i) => {
					const isHeader = i === 0 && feature.endsWith(":");
					return (
						<li key={feature} className="flex items-start gap-2">
							{isHeader ? (
								<span className="text-[0.74rem] font-bold leading-snug text-neutral-900">{feature}</span>
							) : (
								<>
									<Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" style={{ color: accent }} />
									<span className="text-[0.74rem] leading-snug text-neutral-700">{feature}</span>
								</>
							)}
						</li>
					);
				})}
			</ul>
		</div>
	);
}
