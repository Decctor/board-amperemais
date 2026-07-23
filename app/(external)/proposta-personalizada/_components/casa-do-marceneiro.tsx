import { BrandLogo } from "@/components/Brand/BrandLogo";
// Proposta comercial de uso único — Casa do Marceneiro.
// Renderizada dentro do shell de impressão em ../page.tsx (A4). Não faz parte do produto.

import { ARTHUR_WHATSAPP_NUMBER, LUCAS_WHATSAPP_NUMBER } from "@/config/internal-coms";
import {
	AlarmClock,
	ArrowRight,
	CalendarCheck,
	Check,
	ClipboardCheck,
	Gift,
	ListChecks,
	type LucideIcon,
	Megaphone,
	RefreshCw,
	ShoppingCart,
	Sparkles,
	Star,
	Target,
	TrendingDown,
	Users,
	Wallet,
} from "lucide-react";
import type { ReactNode } from "react";
import { FaWhatsapp } from "react-icons/fa6";
import { BRAND, heroGradient, Kicker, Sheet, SheetFooter } from "./_shared";

/* -------------------------------------------------------------------------- */
/*  Dados da proposta                                                          */
/* -------------------------------------------------------------------------- */

const PRICE_PER_STORE = "399,90";
const STORES = 5;
const TOTAL_MONTHLY = "1.999,50";
// Implementação: pagamento único por loja (R$ 2.000 × 5 = R$ 10.000, total subentendido).
const IMPLEMENTATION_PER_STORE = "2.000";

const SUPPORT_CONTACTS = [
	{ name: "Lucas Fernandes", phone: "34 99662-6855", whatsapp: LUCAS_WHATSAPP_NUMBER },
	{ name: "Arthur Carvalho", phone: "34 99948-0791", whatsapp: ARTHUR_WHATSAPP_NUMBER },
] as const;

/* -------------------------------------------------------------------------- */
/*  Proposta — Casa do Marceneiro                                              */
/* -------------------------------------------------------------------------- */

export function CasaDoMarceneiroProposal() {
	return (
		<>
			<CoverSheet />
			<OpportunitySheet />
			<LoyaltySheet />
			<ReactivationSheet />
			<RoutineSheet />
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
						<BrandLogo lockup="stacked" tone="white" alt="RecompraCRM" fill className="object-contain object-left" />
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
						CASA DO
						<br />
						MARCENEIRO
					</h1>
					<div className="mt-6 flex items-center gap-3">
						<span
							className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-extrabold uppercase tracking-wide"
							style={{ backgroundColor: BRAND.gold, color: BRAND.ink }}
						>
							<Users className="h-4 w-4" /> Rede de {STORES} lojas
						</span>
					</div>
					<p className="mt-8 max-w-xl text-lg font-medium leading-relaxed text-white/85">
						Um sistema para transformar cada venda de balcão em relacionamento — <strong className="font-extrabold text-white">fidelizar</strong> quem
						compra, <strong className="font-extrabold text-white">reativar</strong> quem sumiu e dar à sua equipe uma{" "}
						<strong className="font-extrabold text-white">rotina comercial</strong> que se cumpre sozinha.
					</p>
				</div>

				{/* rodapé */}
				<div className="relative z-10 flex items-end justify-between">
					<div className="flex flex-col gap-1">
						<span className="text-[0.7rem] font-bold uppercase tracking-[0.25em] text-white/50">Os três pilares</span>
						<div className="flex items-center gap-2 text-sm font-extrabold">
							<span className="rounded-md bg-white/10 px-3 py-1.5">Fidelização</span>
							<span className="text-white/40">·</span>
							<span className="rounded-md bg-white/10 px-3 py-1.5">Reativação</span>
							<span className="text-white/40">·</span>
							<span className="rounded-md bg-white/10 px-3 py-1.5">Rotina comercial</span>
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
	{ value: "5–7×", label: "mais caro conquistar um cliente novo do que fazer um antigo voltar", icon: RefreshCw },
	{ value: "70%", label: "dos clientes de varejo de balcão compram uma vez e nunca mais voltam", icon: TrendingDown },
	{ value: "0", label: "contatos guardados hoje: cada cliente que sai pela porta some com você", icon: Users },
];

function OpportunitySheet() {
	return (
		<Sheet>
			<div className="flex flex-1 flex-col px-14 pt-16">
				<Kicker>O ponto de partida</Kicker>
				<h2 className="mt-4 max-w-3xl text-[2.9rem] font-black leading-[1.02] tracking-tight text-balance">
					Você já tem os clientes.
					<br />
					<span style={{ color: BRAND.blue }}>Falta fazê-los voltar.</span>
				</h2>
				<p className="mt-5 max-w-2xl text-[1.05rem] leading-relaxed text-neutral-600">
					Nas 5 lojas da Casa do Marceneiro passam centenas de clientes por semana — marceneiros, reformadores, lojistas que voltam mês após mês. O
					problema não é atrair. É <strong className="font-bold text-neutral-900">não deixar esse relacionamento escorrer pelo ralo</strong> depois que a
					venda termina.
				</p>

				<div className="mt-10 grid grid-cols-3 gap-5">
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
				<div className="mt-11 overflow-hidden rounded-2xl" style={{ backgroundColor: BRAND.surface }}>
					<div className="grid grid-cols-[1.1fr_auto_1.1fr] items-stretch">
						<div className="flex flex-col justify-center gap-2 p-8">
							<span className="text-[0.7rem] font-extrabold uppercase tracking-[0.2em] text-neutral-500">Hoje</span>
							<p className="text-lg font-bold leading-snug text-neutral-500">A venda acontece, o cliente vai embora e a próxima visita depende da sorte.</p>
						</div>
						<div className="flex items-center justify-center px-2" style={{ backgroundColor: "rgba(36,84,156,0.06)" }}>
							<div className="flex h-11 w-11 items-center justify-center rounded-full text-white" style={{ backgroundColor: BRAND.blue }}>
								<ArrowRight className="h-5 w-5" />
							</div>
						</div>
						<div className="flex flex-col justify-center gap-2 p-8" style={{ backgroundColor: "rgba(255,185,0,0.10)" }}>
							<span className="text-[0.7rem] font-extrabold uppercase tracking-[0.2em]" style={{ color: BRAND.goldText }}>
								Com o RecompraCRM
							</span>
							<p className="text-lg font-extrabold leading-snug text-neutral-900">
								Cada venda vira cadastro, cashback e um motivo real para o cliente voltar — em piloto automático.
							</p>
						</div>
					</div>
				</div>

				<p className="mt-9 max-w-2xl text-[1.05rem] leading-relaxed text-neutral-600">
					As próximas páginas mostram exatamente como isso funciona na prática — telas reais do sistema, com os três pilares que resolvem o ciclo completo
					do seu cliente.
				</p>
			</div>
			<SheetFooter index="02 / 06" label="A oportunidade" />
		</Sheet>
	);
}

/* -------------------------------------------------------------------------- */
/*  Cabeçalho de pilar                                                         */
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
				<div className="flex items-center gap-2">
					<span className="text-[0.7rem] font-black uppercase tracking-[0.25em]" style={{ color: BRAND.goldText }}>
						Pilar {n}
					</span>
				</div>
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
				style={{ backgroundColor: "rgba(36,84,156,0.10)", color: BRAND.blue }}
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
/*  3 · Pilar 1 — Fidelização                                                  */
/* -------------------------------------------------------------------------- */

function LoyaltySheet() {
	return (
		<Sheet>
			<div className="flex flex-1 flex-col px-14 pt-14">
				<PillarHeader
					n="01"
					icon={Wallet}
					title="Fidelização com cashback"
					lead="No balcão, o cliente informa o telefone e ganha cashback na hora. Todo mundo que pontua deixa o contato com você — sua base cresce a cada venda."
				/>

				<div className="mt-10 grid grid-cols-[0.95fr_1.05fr] items-start gap-10">
					{/* Coluna texto */}
					<div className="flex flex-col gap-7 pt-1">
						<div>
							<h3 className="mb-3 text-sm font-black uppercase tracking-wide text-neutral-900">Como funciona no caixa</h3>
							<ul className="flex flex-col gap-2.5">
								<BenefitRow>Operador digita o telefone do cliente no tablet do balcão.</BenefitRow>
								<BenefitRow>Cadastro nasce sozinho — telefone, nome e aniversário.</BenefitRow>
								<BenefitRow>Cliente acumula cashback e resgata em compras futuras.</BenefitRow>
								<BenefitRow>Senha do vendedor finaliza — cada ponto tem um dono.</BenefitRow>
							</ul>
						</div>

						<div className="rounded-2xl border border-dashed p-5" style={{ borderColor: "rgba(255,185,0,0.55)", backgroundColor: "rgba(255,185,0,0.07)" }}>
							<div className="mb-1.5 flex items-center gap-2">
								<Gift className="h-4 w-4" style={{ color: BRAND.goldText }} />
								<span className="text-[0.7rem] font-black uppercase tracking-wider" style={{ color: BRAND.goldText }}>
									O ativo que fica com você
								</span>
							</div>
							<p className="text-[0.92rem] leading-relaxed text-neutral-700">
								O cashback é a isca. O que fica é a <strong className="font-extrabold">base de contatos das 5 lojas</strong>, pronta para campanhas — e
								segmentada automaticamente pela Matriz RFM.
							</p>
						</div>

						<RfmMiniMatrix />
					</div>

					{/* Coluna mockup — tablet Ponto de Interação */}
					<div className="flex flex-col items-center gap-3">
						<PointOfInteractionMock />
						<span className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-neutral-500">Ponto de Interação · tablet no balcão</span>
					</div>
				</div>

				<TakeawayStrip>uma base de contatos que cresce sozinha a cada atendimento — pronta para trazer o cliente de volta.</TakeawayStrip>
			</div>
			<SheetFooter index="03 / 06" label="Pilar 01 · Fidelização" />
		</Sheet>
	);
}

function PointOfInteractionMock() {
	return (
		<div
			className="w-full max-w-[380px] rounded-[26px] p-3 shadow-2xl"
			style={{ backgroundColor: "#0f172a", boxShadow: "0 30px 60px -25px rgba(15,23,42,0.6)" }}
		>
			<div className="overflow-hidden rounded-[18px] bg-white">
				{/* barra da loja */}
				<div className="flex items-center justify-between px-5 py-3.5 text-white" style={{ backgroundColor: BRAND.blue }}>
					<div className="flex items-center gap-2">
						<div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 text-[0.7rem] font-black">CM</div>
						<div className="flex flex-col leading-none">
							<span className="text-[0.8rem] font-extrabold">Casa do Marceneiro</span>
							<span className="text-[0.6rem] font-medium text-white/60">Loja Centro</span>
						</div>
					</div>
					<span className="rounded-full bg-white/15 px-2.5 py-1 text-[0.58rem] font-bold uppercase tracking-wide">Pontuar</span>
				</div>

				{/* perfil do cliente */}
				<div className="flex flex-col gap-4 px-5 py-5">
					<div className="flex items-center gap-3">
						<div
							className="flex h-12 w-12 items-center justify-center rounded-full text-base font-black"
							style={{ backgroundColor: "rgba(36,84,156,0.12)", color: BRAND.blue }}
						>
							RA
						</div>
						<div className="flex flex-col leading-tight">
							<span className="text-[0.95rem] font-extrabold tracking-tight text-neutral-900">Ronaldo Alves</span>
							<span className="text-[0.72rem] text-neutral-500">(34) 99814-2200 · 12 compras</span>
						</div>
						<span className="ml-auto rounded-full px-2.5 py-1 text-[0.58rem] font-black tracking-wide text-gray-950" style={{ backgroundColor: "#4ade80" }}>
							CLIENTE LEAL
						</span>
					</div>

					{/* saldo de cashback */}
					<div className="rounded-2xl px-5 py-4 text-center" style={{ backgroundColor: "rgba(255,185,0,0.12)" }}>
						<span className="text-[0.62rem] font-black uppercase tracking-[0.2em]" style={{ color: BRAND.goldText }}>
							Cashback disponível
						</span>
						<p className="mt-1 text-3xl font-black tabular-nums" style={{ color: BRAND.ink }}>
							R$ 48,00
						</p>
					</div>

					{/* valor da venda */}
					<div className="flex items-center justify-between rounded-xl border border-neutral-200 px-4 py-3">
						<span className="text-[0.72rem] font-semibold text-neutral-500">Valor da venda</span>
						<span className="text-lg font-black tabular-nums text-neutral-900">R$ 320,00</span>
					</div>

					{/* botões */}
					<div className="grid grid-cols-2 gap-2.5">
						<div
							className="flex items-center justify-center gap-1.5 rounded-xl py-3 text-[0.78rem] font-extrabold uppercase text-white"
							style={{ backgroundColor: BRAND.blue }}
						>
							<Sparkles className="h-4 w-4" /> Pontuar
						</div>
						<div
							className="flex items-center justify-center gap-1.5 rounded-xl py-3 text-[0.78rem] font-extrabold uppercase"
							style={{ backgroundColor: BRAND.gold, color: BRAND.ink }}
						>
							<Gift className="h-4 w-4" /> Resgatar
						</div>
					</div>
					<p className="text-center text-[0.62rem] text-neutral-500">
						Vai gerar <strong className="font-bold text-neutral-600">R$ 16,00</strong> de cashback nesta compra
					</p>
				</div>
			</div>
		</div>
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
			<h3 className="mb-2.5 text-sm font-black uppercase tracking-wide text-neutral-900">Sua base, já segmentada</h3>
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
/*  4 · Pilar 2 — Reativação                                                   */
/* -------------------------------------------------------------------------- */

const FUNNEL = [
	{ label: "Enviados", value: 1240, pct: 100 },
	{ label: "Entregues", value: 1198, pct: 96 },
	{ label: "Lidos", value: 812, pct: 65 },
	{ label: "Convertidos", value: 187, pct: 15 },
];

function ReactivationSheet() {
	return (
		<Sheet>
			<div className="flex flex-1 flex-col px-14 pt-14">
				<PillarHeader
					n="02"
					icon={Megaphone}
					title="Reativação automática"
					lead="Quando um cliente entra em risco de sumir, o RecompraCRM dispara a mensagem certa no WhatsApp — com cashback de presente para trazê-lo de volta."
				/>

				<div className="mt-9 grid grid-cols-[1.05fr_0.95fr] items-start gap-10">
					{/* Mockup WhatsApp */}
					<div className="flex flex-col gap-6">
						<div className="flex flex-col items-center gap-3">
							<WhatsappCampaignMock />
							<span className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-neutral-500">Campanha automática · gatilho “Em risco”</span>
						</div>
					</div>

					{/* Funil + texto */}
					<div className="flex flex-col gap-7 pt-1">
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
													backgroundColor: i === FUNNEL.length - 1 ? BRAND.gold : BRAND.blue,
													opacity: i === FUNNEL.length - 1 ? 1 : 1 - i * 0.12,
												}}
											/>
										</div>
									</div>
								))}
							</div>
							<div className="mt-4 flex items-center gap-2 rounded-xl px-4 py-3" style={{ backgroundColor: "rgba(255,185,0,0.12)" }}>
								<span className="text-2xl font-black tabular-nums" style={{ color: BRAND.ink }}>
									R$ 42.180
								</span>
								<span className="text-[0.8rem] font-semibold leading-tight text-neutral-600">
									em vendas recuperadas
									<br />
									de uma única campanha
								</span>
							</div>
						</div>

						<div>
							<h3 className="mb-3 text-sm font-black uppercase tracking-wide text-neutral-900">Dispara sozinho quando</h3>
							<ul className="flex flex-col gap-2.5">
								<BenefitRow>Um cliente fica dias sem comprar além do ciclo habitual.</BenefitRow>
								<BenefitRow>Alguém migra para um segmento de risco na Matriz RFM.</BenefitRow>
								<BenefitRow>É aniversário do cliente — mensagem + brinde na hora.</BenefitRow>
								<BenefitRow>A primeira compra pede um empurrão para virar a segunda.</BenefitRow>
							</ul>
						</div>
					</div>
				</div>
				<TakeawayStrip>clientes que sumiram voltando a comprar — no piloto automático, sem você levantar um dedo.</TakeawayStrip>
			</div>
			<SheetFooter index="04 / 06" label="Pilar 02 · Reativação" />
		</Sheet>
	);
}

function WhatsappCampaignMock() {
	return (
		<div
			className="w-full max-w-[360px] overflow-hidden rounded-[26px] p-3 shadow-2xl"
			style={{ backgroundColor: "#0f172a", boxShadow: "0 30px 60px -25px rgba(15,23,42,0.6)" }}
		>
			<div className="overflow-hidden rounded-[18px]" style={{ backgroundColor: "#e6ddd4" }}>
				{/* header whatsapp */}
				<div className="flex items-center gap-3 px-4 py-3 text-white" style={{ backgroundColor: "#075E54" }}>
					<div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-[0.7rem] font-black">CM</div>
					<div className="flex flex-col leading-none">
						<span className="text-[0.85rem] font-bold">Casa do Marceneiro</span>
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
							Oi, Ronaldo! 👋 Sentimos sua falta aqui na <strong>Casa do Marceneiro</strong>.
						</p>
						<p className="mt-2 text-[0.82rem] leading-snug text-neutral-800">
							Separamos <strong>R$ 30 de cashback</strong> pra você usar na próxima compra — tá te esperando! 🎁
						</p>
						<span className="mt-1.5 block text-right text-[0.58rem] text-neutral-500">09:14 ✓✓</span>
					</div>

					<div className="max-w-[85%] self-start rounded-2xl rounded-tl-sm px-3.5 py-2.5 shadow-sm" style={{ backgroundColor: "#dcf8c6" }}>
						<p className="text-[0.82rem] leading-snug text-neutral-800">Chegou aquele lote de dobradiças 3D? Passo aí no sábado 🙌</p>
						<span className="mt-1.5 block text-right text-[0.58rem] text-neutral-500">09:31 ✓✓</span>
					</div>

					{/* etiqueta convertido */}
					<div
						className="mt-1 self-center rounded-full px-3 py-1 text-[0.6rem] font-black uppercase tracking-wide text-white shadow"
						style={{ backgroundColor: BRAND.blue }}
					>
						Convertido · compra de R$ 284,00
					</div>
				</div>
			</div>
		</div>
	);
}

/* -------------------------------------------------------------------------- */
/*  5 · Pilar 3 — Rotina comercial (Carteiras)                                 */
/* -------------------------------------------------------------------------- */

function RoutineSheet() {
	return (
		<Sheet>
			<div className="flex flex-1 flex-col px-14 pt-14">
				<PillarHeader
					n="03"
					icon={CalendarCheck}
					title="Rotina comercial da equipe"
					lead="Cada vendedor abre o dia com uma fila pronta: quem contatar, por quê e o que oferecer. A gestão da carteira deixa de depender da memória de cada um."
				/>

				{/* mockup app: stat cards + fila */}
				<div className="mt-8 rounded-3xl border border-neutral-200 bg-neutral-50/60 p-6">
					{/* barra topo do app */}
					<div className="mb-4 flex items-center justify-between">
						<div className="flex items-center gap-2">
							<span className="flex h-7 w-7 items-center justify-center rounded-lg text-white" style={{ backgroundColor: BRAND.blue }}>
								<CalendarCheck className="h-4 w-4" />
							</span>
							<span className="text-sm font-black tracking-tight text-neutral-900">Meu dia</span>
							<span className="text-xs text-neutral-500">· Marina · Loja Centro</span>
						</div>
						<div className="flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-[0.68rem] font-bold text-neutral-500 ring-1 ring-neutral-200">
							Terça, 13 jul
						</div>
					</div>

					{/* stat cards */}
					<div className="grid grid-cols-4 gap-3">
						<StatMock title="Meta do dia" icon={Target} value="R$ 2.140" sub="de R$ 3.000" progress={71} />
						<StatMock title="Abordagens hoje" icon={ListChecks} value="6 / 14" sub="8 clientes na fila" />
						<StatMock title="Vendas hoje" icon={ShoppingCart} value="9" sub="Ticket médio R$ 238" />
						<StatMock title="Influenciadas no mês" icon={RefreshCw} value="37" sub="R$ 18.940 após abordagens" highlight />
					</div>

					{/* fila de abordagens */}
					<div className="mt-4 flex items-center gap-2">
						<ListChecks className="h-4 w-4" style={{ color: BRAND.blue }} />
						<span className="text-[0.72rem] font-black uppercase tracking-wide text-neutral-700">Fila de abordagens</span>
						<span className="ml-1 rounded-full bg-white px-2 py-0.5 text-[0.62rem] font-bold text-neutral-500 ring-1 ring-neutral-200">8 prioritários</span>
					</div>

					<div className="mt-3 grid grid-cols-2 gap-3">
						<QueueCardMock
							initials="JC"
							name="José Carpina"
							segment="EM RISCO"
							segBg="#facc15"
							segText="#0a0a0a"
							meta="8 compras · LTV R$ 4.120 · última há 47 dias"
							reasonIcon={AlarmClock}
							reason="47 dias sem comprar — ciclo habitual é de 21 dias."
							offer="Recompra: Verniz Marítimo 900ml"
						/>
						<QueueCardMock
							initials="ML"
							name="Móveis Lira ME"
							segment="NÃO PODE PERDÊ-LOS"
							segBg="#60a5fa"
							segText="#fff"
							meta="24 compras · LTV R$ 21.700 · última há 33 dias"
							reasonIcon={TrendingDown}
							reason="Caiu de Campeões para risco — alto valor, sem contato."
							offer="Sugestão: Kit ferragens gaveteiro"
						/>
					</div>
				</div>

				<p className="mt-6 max-w-3xl text-[0.95rem] leading-relaxed text-neutral-600">
					A carteira é montada <strong className="font-bold text-neutral-900">automaticamente</strong> a partir das vendas recorrentes de cada loja. O
					gestor acompanha abordagens, conversões e vendas influenciadas por vendedor — sem planilha, sem cobrança no escuro.
				</p>
				<TakeawayStrip>uma equipe que sabe exatamente quem procurar todo dia — e um gestor que enxerga cada conversão.</TakeawayStrip>
			</div>
			<SheetFooter index="05 / 06" label="Pilar 03 · Rotina comercial" />
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
						<span className="rounded-full px-1.5 py-0.5 text-[0.5rem] font-black tracking-wide" style={{ backgroundColor: segBg, color: segText }}>
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
/*  6 · Investimento                                                           */
/* -------------------------------------------------------------------------- */

const INCLUDED = [
	"Ponto de Interação (cashback) em todas as 5 lojas",
	"Campanhas automáticas de reativação no WhatsApp",
	"Matriz RFM e base de clientes unificada da rede",
	"Carteiras e rotina comercial por vendedor",
	"Dashboard de BI, metas e ranking de equipe",
	"Onboarding, migração de dados e suporte dedicado",
];

function PricingSheet() {
	return (
		<Sheet>
			<div className="flex flex-1 flex-col px-14 pt-16">
				<Kicker>Investimento</Kicker>
				<h2 className="mt-4 max-w-2xl text-[2.9rem] font-black leading-[1.02] tracking-tight text-balance">
					Um plano por loja. <span style={{ color: BRAND.blue }}>Toda a rede conectada.</span>
				</h2>

				<div className="mt-10 grid grid-cols-[1.15fr_0.85fr] items-stretch gap-8">
					{/* Card preço */}
					<div className="relative flex flex-col justify-between overflow-hidden rounded-3xl p-9 text-white" style={{ backgroundColor: BRAND.blue }}>
						<div
							className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full opacity-35"
							style={{ background: `radial-gradient(circle, ${BRAND.gold} 0%, transparent 64%)` }}
						/>
						{/* Mensalidade por loja */}
						<div className="relative z-10">
							<span className="text-[0.7rem] font-black uppercase tracking-[0.22em] text-white/60">Mensalidade por loja</span>
							<div className="mt-3 flex items-end gap-1.5">
								<span className="text-2xl font-bold text-white/70">R$</span>
								<span className="text-6xl font-black leading-none tracking-tight">{PRICE_PER_STORE}</span>
								<span className="mb-1 text-sm font-semibold text-white/60">/mês</span>
							</div>
							<div className="mt-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[0.72rem] font-bold ring-1 ring-white/15">
								<Users className="h-3.5 w-3.5" /> {STORES} lojas · Total R$ {TOTAL_MONTHLY}/mês
							</div>
						</div>

						{/* Implementação por loja — pagamento único (total R$ 10.000 subentendido) */}
						<div className="relative z-10 mt-6 border-t border-white/15 pt-6">
							<span className="text-[0.7rem] font-black uppercase tracking-[0.22em] text-white/60">Implementação por loja · pagamento único</span>
							<div className="mt-2.5 flex items-end gap-1.5">
								<span className="text-xl font-bold text-white/70">R$</span>
								<span className="text-5xl font-black leading-none tracking-tight" style={{ color: BRAND.gold }}>
									{IMPLEMENTATION_PER_STORE}
								</span>
								<span className="mb-1 text-sm font-semibold text-white/60">por loja</span>
							</div>
							<p className="mt-2 text-[0.78rem] leading-snug text-white/55">
								Cobrada uma única vez, para as {STORES} lojas: onboarding, migração de dados e treinamento da equipe.
							</p>
						</div>

						{/* Recorrência */}
						<div className="relative z-10 mt-6 border-t border-white/15 pt-6">
							<div className="flex flex-nowrap items-baseline justify-between gap-2">
								<span className="text-[0.7rem] font-black uppercase tracking-[0.22em] text-white/60">Recorrência</span>
								<span className="whitespace-nowrap text-[1.6rem] font-black leading-none tracking-tight text-white">
									R$ {TOTAL_MONTHLY}
									<span className="text-sm font-semibold text-white/60">/mês</span>
								</span>
							</div>
							<p className="mt-2 text-[0.8rem] text-white/60">Após a implementação, só a mensalidade. Sem fidelidade — cancele quando quiser.</p>
						</div>
					</div>

					{/* Incluído */}
					<div className="flex flex-col gap-3.5">
						<h3 className="text-sm font-black uppercase tracking-wide text-neutral-900">Tudo isto incluído</h3>
						<ul className="flex flex-col gap-3">
							{INCLUDED.map((item) => (
								<li key={item} className="flex items-start gap-2.5">
									<span
										className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-white"
										style={{ backgroundColor: BRAND.blue }}
									>
										<Check className="h-3 w-3" strokeWidth={3.5} />
									</span>
									<span className="text-[0.92rem] leading-snug text-neutral-700">{item}</span>
								</li>
							))}
						</ul>
					</div>
				</div>

				{/* Closing CTA */}
				<div className="relative mt-11  overflow-hidden rounded-3xl px-8 py-7 text-white" style={heroGradient}>
					<div
						className="absolute inset-0 opacity-[0.12]"
						style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "16px 16px" }}
					/>
					<div className="absolute right-0 top-0 h-full w-2" style={{ backgroundColor: BRAND.blue }} />
					<div className="relative z-10 flex flex-col gap-4">
						<div className="flex items-center gap-2">
							<Star className="h-5 w-5" fill="currentColor" />
							<h2 className="text-xl font-black uppercase leading-tight tracking-tight">Vamos colocar as 5 lojas para vender mais</h2>
						</div>
						<p className="max-w-xl text-[0.82rem] leading-relaxed opacity-90">
							Cuidamos da implementação, migração de dados e treinamento — colocamos as {STORES} lojas no ar em poucos dias. É só chamar um de nós no
							WhatsApp para começar.
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
			<SheetFooter index="06 / 06" label="Investimento" />
		</Sheet>
	);
}
