import { BrandLogo } from "@/components/Brand/BrandLogo";
// Documento institucional — Recompra no Varejo · Plano Anual.
// Apresentação da empresa, dos produtos (CRM, ERP e Enterprise), estudos de caso
// e do modelo de parceria comercial (Executivo de Contas e Representante).
// Renderizado dentro do shell de impressão em ../page.tsx (A4). Não faz parte do produto.

import { ARTHUR_WHATSAPP_NUMBER, LUCAS_WHATSAPP_NUMBER } from "@/config/internal-coms";
import {
	ArrowRight,
	BarChart3,
	Building2,
	CalendarCheck,
	Check,
	Gift,
	Globe,
	Handshake,
	LayoutGrid,
	type LucideIcon,
	Megaphone,
	Receipt,
	RefreshCw,
	ScanLine,
	ShoppingCart,
	Sparkles,
	Star,
	Store,
	Tablet,
	TrendingDown,
	Users,
	UtensilsCrossed,
	Wallet,
} from "lucide-react";
import type { ReactNode } from "react";
import { FaWhatsapp } from "react-icons/fa6";
import { BRAND, heroGradient, Kicker, Sheet, SheetFooter } from "../../proposta-personalizada/_components/_shared";

/* -------------------------------------------------------------------------- */
/*  Dados do documento                                                         */
/* -------------------------------------------------------------------------- */

const TOTAL_PAGES = "10";

const SUPPORT_CONTACTS = [
	{ name: "Lucas Fernandes", phone: "34 99662-6855", whatsapp: LUCAS_WHATSAPP_NUMBER },
	{ name: "Arthur Carvalho", phone: "34 99948-0791", whatsapp: ARTHUR_WHATSAPP_NUMBER },
] as const;

// Premissas da simulação de ganhos da parceria (valores ilustrativos).
const SIM_AVG_PLAN = "599";
const SIM_IMPLEMENTATION = "2.000";

/* -------------------------------------------------------------------------- */
/*  Documento                                                                  */
/* -------------------------------------------------------------------------- */

export function VarejoPlanoAnualDocument() {
	return (
		<>
			<CoverSheet />
			<MarketSheet />
			<EcosystemSheet />
			<CrmBaseSheet />
			<CrmEngineSheet />
			<ErpFrontSheet />
			<ErpOpsSheet />
			<CasesSheet />
			<PlansSheet />
			<PartnershipSheet />
		</>
	);
}

/* -------------------------------------------------------------------------- */
/*  Primitivos locais                                                          */
/* -------------------------------------------------------------------------- */

function SectionHeader({ kicker, icon: Icon, title, lead }: { kicker: string; icon: LucideIcon; title: string; lead: string }) {
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
					{kicker}
				</span>
				<h2 className="mt-1 text-[2.3rem] font-black leading-none tracking-tight">{title}</h2>
				<p className="mt-2.5 max-w-2xl text-[0.96rem] leading-relaxed text-neutral-600">{lead}</p>
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
			<span className="text-[0.9rem] leading-snug text-neutral-700">{children}</span>
		</li>
	);
}

/* Faixa de fechamento — ancora o pé de cada seção com o resultado prático. */
function TakeawayStrip({ children }: { children: ReactNode }) {
	return (
		<div className="mt-auto mb-2 flex items-center gap-3.5 rounded-2xl px-6 py-4" style={{ backgroundColor: "rgba(36,84,156,0.06)" }}>
			<span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-white" style={{ backgroundColor: BRAND.blue }}>
				<ArrowRight className="h-5 w-5" />
			</span>
			<p className="text-[0.95rem] leading-snug text-neutral-700">
				<strong className="font-black text-neutral-900">O resultado:</strong> {children}
			</p>
		</div>
	);
}

/* -------------------------------------------------------------------------- */
/*  01 · Capa                                                                  */
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
							Apresentação institucional
						</span>
						<span className="text-[0.68rem] font-semibold tracking-wide text-white/60">Plano Anual · 2026 / 2027</span>
					</div>
				</div>

				{/* centro */}
				<div className="relative z-10 max-w-2xl">
					<Kicker tone="white">Nossa visão de entrada no varejo</Kicker>
					<h1 className="mt-4 text-[4.2rem] font-black leading-[0.92] tracking-tight text-balance">
						RECOMPRA
						<br />
						NO VAREJO
					</h1>
					<div className="mt-6 flex items-center gap-3">
						<span
							className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-extrabold uppercase tracking-wide"
							style={{ backgroundColor: BRAND.gold, color: BRAND.ink }}
						>
							<Store className="h-4 w-4" /> CRM · ERP · Enterprise
						</span>
					</div>
					<p className="mt-8 max-w-xl text-lg font-medium leading-relaxed text-white/85">
						O plano para colocar o varejo físico brasileiro para <strong className="font-extrabold text-white">vender de novo</strong> — com fidelização
						operada de ponta a ponta, gestão que pensa junto e um <strong className="font-extrabold text-white">modelo de parceria</strong> para quem
						quer crescer com a gente.
					</p>
				</div>

				{/* rodapé */}
				<div className="relative z-10 flex items-end justify-between">
					<div className="flex flex-col gap-1">
						<span className="text-[0.7rem] font-bold uppercase tracking-[0.25em] text-white/50">O que este documento apresenta</span>
						<div className="flex items-center gap-2 text-sm font-extrabold">
							<span className="rounded-md bg-white/10 px-3 py-1.5">Produtos</span>
							<span className="text-white/40">·</span>
							<span className="rounded-md bg-white/10 px-3 py-1.5">Estudos de caso</span>
							<span className="text-white/40">·</span>
							<span className="rounded-md bg-white/10 px-3 py-1.5">Planos</span>
							<span className="text-white/40">·</span>
							<span className="rounded-md bg-white/10 px-3 py-1.5">Parceria comercial</span>
						</div>
					</div>
					<span className="text-[0.7rem] font-semibold tabular-nums text-white/40">recompracrm.com.br</span>
				</div>
			</div>
		</Sheet>
	);
}

/* -------------------------------------------------------------------------- */
/*  02 · O mercado — a tese                                                    */
/* -------------------------------------------------------------------------- */

const MARKET_STATS = [
	{ value: "5–7×", label: "mais caro conquistar um cliente novo do que fazer um antigo voltar", icon: RefreshCw },
	{ value: "70%", label: "dos clientes de varejo de balcão compram uma vez e nunca mais voltam", icon: TrendingDown },
	{ value: "9 em 10", label: "brasileiros conectados usam WhatsApp — o canal onde o seu cliente já está", icon: Users },
];

const POSITIONING = [
	{
		title: "Planilhas e sistemas legados",
		tone: "muted" as const,
		rows: ["Guardam a venda, não o cliente", "Nenhuma automação de relacionamento", "Fidelização manual — quando existe"],
	},
	{
		title: "Recompra",
		tone: "brand" as const,
		rows: [
			"Feito para o varejo físico brasileiro",
			"WhatsApp nativo, do cadastro à campanha",
			"Integra ao ERP que a loja já usa",
			"Operação assistida de ponta a ponta",
		],
	},
	{
		title: "Plataformas enterprise",
		tone: "muted" as const,
		rows: ["Feitas para e-commerce e grandes redes", "Implantação de meses e preço de vitrine", "A loja vira um número no chamado"],
	},
];

function MarketSheet() {
	return (
		<Sheet>
			<div className="flex flex-1 flex-col px-14 pt-14">
				<Kicker>Por que o varejo físico, por que agora</Kicker>
				<h2 className="mt-4 max-w-3xl text-[2.7rem] font-black leading-[1.02] tracking-tight text-balance">
					O varejo conhece pouco quem compra. <span style={{ color: BRAND.blue }}>É aí que entramos.</span>
				</h2>
				<p className="mt-4 max-w-2xl text-[1rem] leading-relaxed text-neutral-600">
					Supermercados, lojas de balcão, food service — todo dia passam centenas de clientes pelo caixa e quase nada disso vira relacionamento. O
					problema do varejo brasileiro não é atrair. É <strong className="font-bold text-neutral-900">não deixar o cliente escorrer pelo ralo</strong>{" "}
					depois que a venda termina.
				</p>

				<div className="mt-7 grid grid-cols-3 gap-4">
					{MARKET_STATS.map((stat) => (
						<div key={stat.label} className="flex flex-col gap-2.5 rounded-2xl border border-neutral-200 bg-white p-5">
							<div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: "rgba(36,84,156,0.10)", color: BRAND.blue }}>
								<stat.icon className="h-5 w-5" />
							</div>
							<span className="text-[2rem] font-black leading-none tracking-tight" style={{ color: BRAND.ink }}>
								{stat.value}
							</span>
							<span className="text-[0.82rem] leading-snug text-neutral-500">{stat.label}</span>
						</div>
					))}
				</div>

				{/* posicionamento */}
				<div className="mt-8">
					<h3 className="mb-3 text-sm font-black uppercase tracking-wide text-neutral-900">Onde nos posicionamos</h3>
					<div className="grid grid-cols-3 gap-4">
						{POSITIONING.map((col) => (
							<div
								key={col.title}
								className="flex flex-col gap-3 rounded-2xl p-5"
								style={
									col.tone === "brand"
										? { backgroundColor: BRAND.blue, color: "#fff", boxShadow: "0 16px 36px -16px rgba(36,84,156,0.55)" }
										: { backgroundColor: BRAND.surface }
								}
							>
								<span
									className="text-[0.72rem] font-black uppercase tracking-wider"
									style={{ color: col.tone === "brand" ? BRAND.gold : "#737373" }}
								>
									{col.title}
								</span>
								<ul className="flex flex-col gap-2">
									{col.rows.map((row) => (
										<li key={row} className="flex items-start gap-2">
											<span
												className="mt-[7px] h-1.5 w-1.5 flex-shrink-0 rounded-full"
												style={{ backgroundColor: col.tone === "brand" ? BRAND.gold : "#a3a3a3" }}
											/>
											<span
												className="text-[0.84rem] leading-snug"
												style={{ color: col.tone === "brand" ? "rgba(255,255,255,0.92)" : "#525252" }}
											>
												{row}
											</span>
										</li>
									))}
								</ul>
							</div>
						))}
					</div>
				</div>

				<p className="mt-7 max-w-3xl text-[0.96rem] leading-relaxed text-neutral-600">
					Nosso posicionamento é ocupar o espaço entre esses dois mundos:{" "}
					<strong className="font-bold text-neutral-900">tecnologia de gente grande, entregue e operada no tamanho do lojista</strong> — sem projeto de
					seis meses, sem depender de time de TI do cliente, com resultado visível no caixa desde as primeiras semanas.
				</p>
			</div>
			<SheetFooter index={`02 / ${TOTAL_PAGES}`} label="O mercado" />
		</Sheet>
	);
}

/* -------------------------------------------------------------------------- */
/*  03 · O ecossistema — três linhas de produto                                */
/* -------------------------------------------------------------------------- */

const PRODUCTS = [
	{
		icon: Wallet,
		name: "RecompraCRM",
		tagline: "Fidelização e relacionamento",
		price: "R$ 299 a R$ 899",
		priceSuffix: "/mês por loja",
		status: "Disponível hoje",
		statusTone: "green" as const,
		rows: [
			"Cashback, pontos e sorteios no caixa",
			"Matriz RFM e base de clientes própria",
			"Campanhas automáticas no WhatsApp",
			"Rotina comercial, metas e BI da equipe",
		],
	},
	{
		icon: ShoppingCart,
		name: "RecompraERP",
		tagline: "Gestão e frente de loja",
		price: "R$ 199 a R$ 1.899",
		priceSuffix: "/mês por loja",
		status: "Em rollout",
		statusTone: "gold" as const,
		rows: [
			"PDV com sugestão de cross-sell",
			"Fechamento automático de caixa",
			"Kanban de pedidos / KDS",
			"Loja digital integrada à mesma base",
		],
	},
	{
		icon: Building2,
		name: "Enterprise",
		tagline: "Soluções sob demanda",
		price: "Sob consulta",
		priceSuffix: "implementação + mensalidade",
		status: "Sob medida",
		statusTone: "blue" as const,
		rows: [
			"Sistemas de gestão e CRM sob medida",
			"Ecossistemas multi-CNPJ com base única",
			"Integrações dedicadas com o ERP do grupo",
			"Squad próprio, do desenho à operação",
		],
	},
];

function EcosystemSheet() {
	return (
		<Sheet>
			<div className="flex flex-1 flex-col px-14 pt-14">
				<Kicker>O ecossistema Recompra</Kicker>
				<h2 className="mt-4 max-w-3xl text-[2.7rem] font-black leading-[1.02] tracking-tight text-balance">
					Três linhas de produto. <span style={{ color: BRAND.blue }}>Uma base só.</span>
				</h2>
				<p className="mt-4 max-w-2xl text-[1rem] leading-relaxed text-neutral-600">
					Do balcão único ao grupo com vários CNPJs, o cliente entra pela porta que fizer sentido — e tudo roda sobre o mesmo cadastro, a mesma
					integração e o mesmo suporte.
				</p>

				<div className="mt-8 grid grid-cols-3 items-stretch gap-4">
					{PRODUCTS.map((product) => (
						<div key={product.name} className="flex flex-col gap-4 rounded-3xl border border-neutral-200 bg-white p-6">
							<div className="flex items-center justify-between">
								<div
									className="flex h-11 w-11 items-center justify-center rounded-xl text-white"
									style={{ backgroundColor: BRAND.blue, boxShadow: "0 10px 22px -10px rgba(36,84,156,0.5)" }}
								>
									<product.icon className="h-5 w-5" />
								</div>
								<span
									className="rounded-full px-2.5 py-1 text-[0.55rem] font-black uppercase tracking-wider"
									style={
										product.statusTone === "green"
											? { backgroundColor: "rgba(22,163,74,0.12)", color: "#15803d" }
											: product.statusTone === "gold"
												? { backgroundColor: "rgba(255,185,0,0.16)", color: BRAND.goldText }
												: { backgroundColor: "rgba(36,84,156,0.10)", color: BRAND.blue }
									}
								>
									{product.status}
								</span>
							</div>
							<div>
								<h3 className="text-xl font-black tracking-tight text-neutral-900">{product.name}</h3>
								<span className="text-[0.78rem] font-semibold text-neutral-500">{product.tagline}</span>
							</div>
							<div className="rounded-2xl px-4 py-3" style={{ backgroundColor: BRAND.surface }}>
								<span className="block text-[1.05rem] font-black leading-tight tracking-tight" style={{ color: BRAND.blue }}>
									{product.price}
								</span>
								<span className="text-[0.66rem] font-semibold uppercase tracking-wide text-neutral-500">{product.priceSuffix}</span>
							</div>
							<ul className="flex flex-col gap-2">
								{product.rows.map((row) => (
									<li key={row} className="flex items-start gap-2">
										<span
											className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full"
											style={{ backgroundColor: "rgba(36,84,156,0.10)", color: BRAND.blue }}
										>
											<Check className="h-2.5 w-2.5" strokeWidth={3.5} />
										</span>
										<span className="text-[0.8rem] leading-snug text-neutral-700">{row}</span>
									</li>
								))}
							</ul>
						</div>
					))}
				</div>

				{/* uma base só */}
				<div className="mt-7 overflow-hidden rounded-2xl" style={{ backgroundColor: BRAND.surface }}>
					<div className="grid grid-cols-[1.1fr_auto_1.1fr] items-stretch">
						<div className="flex flex-col justify-center gap-2 p-7">
							<span className="text-[0.7rem] font-extrabold uppercase tracking-[0.2em] text-neutral-500">O ERP vende</span>
							<p className="text-[1rem] font-bold leading-snug text-neutral-600">
								Cada venda do PDV identifica o cliente e alimenta o perfil — sem redigitação, sem sistema paralelo.
							</p>
						</div>
						<div className="flex items-center justify-center px-2" style={{ backgroundColor: "rgba(36,84,156,0.06)" }}>
							<div className="flex h-11 w-11 items-center justify-center rounded-full text-white" style={{ backgroundColor: BRAND.blue }}>
								<RefreshCw className="h-5 w-5" />
							</div>
						</div>
						<div className="flex flex-col justify-center gap-2 p-7" style={{ backgroundColor: "rgba(255,185,0,0.10)" }}>
							<span className="text-[0.7rem] font-extrabold uppercase tracking-[0.2em]" style={{ color: BRAND.goldText }}>
								O CRM traz de volta
							</span>
							<p className="text-[1rem] font-extrabold leading-snug text-neutral-900">
								A fidelização e as campanhas devolvem o cliente ao caixa — e a próxima venda começa o ciclo de novo.
							</p>
						</div>
					</div>
				</div>
			</div>
			<SheetFooter index={`03 / ${TOTAL_PAGES}`} label="O ecossistema" />
		</Sheet>
	);
}

/* -------------------------------------------------------------------------- */
/*  04 · RecompraCRM — a base de clientes                                      */
/* -------------------------------------------------------------------------- */

function CrmBaseSheet() {
	return (
		<Sheet>
			<div className="flex flex-1 flex-col px-14 pt-12 pb-5">
				<SectionHeader
					kicker="RecompraCRM · Parte 1"
					icon={Users}
					title="Toda venda vira um cliente conhecido"
					lead="A base de clientes nasce de todos os lados da operação — do QR Code na gôndola ao CPF digitado no PDV — e vira um ativo da loja: própria, rica e segmentável."
				/>

				<div className="mt-6 grid grid-cols-[1fr_0.95fr] items-start gap-9">
					{/* coluna texto */}
					<div className="flex flex-col gap-5 pt-1">
						<div>
							<h3 className="mb-3 text-sm font-black uppercase tracking-wide text-neutral-900">Como a base cresce</h3>
							<ul className="flex flex-col gap-2.5">
								<BenefitRow>
									<strong className="font-bold">Cadastro via QR Code</strong> — na gôndola, no encarte e nas redes. Perfil completo em menos de um
									minuto, mesmo sem compra.
								</BenefitRow>
								<BenefitRow>
									<strong className="font-bold">Ponto de Interação no caixa</strong> — o operador digita o telefone e o cadastro nasce sozinho, com
									senha do vendedor para cada pontuação.
								</BenefitRow>
								<BenefitRow>
									<strong className="font-bold">Integração com o ERP da loja</strong> — o CPF informado no PDV vincula cada compra ao perfil,
									automaticamente, sem mudar a operação.
								</BenefitRow>
								<BenefitRow>
									<strong className="font-bold">LGPD by design</strong> — consentimento no cadastro, opt-out e boas práticas de dados desde o
									primeiro dia.
								</BenefitRow>
							</ul>
						</div>

						<div className="rounded-2xl border border-dashed p-4" style={{ borderColor: "rgba(255,185,0,0.55)", backgroundColor: "rgba(255,185,0,0.07)" }}>
							<div className="mb-1.5 flex items-center gap-2">
								<Gift className="h-4 w-4" style={{ color: BRAND.goldText }} />
								<span className="text-[0.7rem] font-black uppercase tracking-wider" style={{ color: BRAND.goldText }}>
									O ativo que fica com a loja
								</span>
							</div>
							<p className="text-[0.9rem] leading-relaxed text-neutral-700">
								Cada cadastro é um ativo do lojista — uma <strong className="font-extrabold">base própria e segmentável</strong>, independente de
								qualquer plataforma, com LTV, ciclo de compra e produtos preferidos de cada cliente.
							</p>
						</div>

						<RfmMiniMatrix />
					</div>

					{/* coluna mockup — perfil do cliente */}
					<div className="flex flex-col items-center gap-3">
						<ClientProfileMock />
						<span className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-neutral-500">Perfil do cliente · compras chegando do PDV</span>
					</div>
				</div>

				<TakeawayStrip>uma base que cresce todos os dias, dentro e fora da loja — e se segmenta sozinha a cada compra.</TakeawayStrip>
			</div>
			<SheetFooter index={`04 / ${TOTAL_PAGES}`} label="RecompraCRM · A base" />
		</Sheet>
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
			<h3 className="mb-2.5 text-sm font-black uppercase tracking-wide text-neutral-900">Sua base, já segmentada — Matriz RFM</h3>
			<div className="grid grid-cols-3 gap-2">
				{RFM_SEGMENTS.map((seg) => (
					<div key={seg.label} className="flex flex-col gap-1 rounded-xl border border-neutral-200 px-3 py-2">
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

function ClientProfileMock() {
	return (
		<div
			className="w-full max-w-[340px] rounded-[26px] p-3 shadow-2xl"
			style={{ backgroundColor: "#0f172a", boxShadow: "0 30px 60px -25px rgba(15,23,42,0.6)" }}
		>
			<div className="flex flex-col gap-3.5 overflow-hidden rounded-[18px] bg-white px-4 py-4">
				{/* cabeçalho do perfil */}
				<div className="flex items-center gap-3">
					<div
						className="flex h-12 w-12 items-center justify-center rounded-full text-base font-black"
						style={{ backgroundColor: "rgba(36,84,156,0.12)", color: BRAND.blue }}
					>
						MS
					</div>
					<div className="flex flex-col leading-tight">
						<span className="text-[0.95rem] font-extrabold tracking-tight text-neutral-900">Maria Souza</span>
						<span className="text-[0.7rem] text-neutral-500">CPF •••.456.789-•• · (34) 99912-4478</span>
					</div>
				</div>

				<div className="flex flex-wrap gap-1.5">
					<span className="rounded-full px-2 py-0.5 text-[0.56rem] font-black uppercase tracking-wide" style={{ backgroundColor: "rgba(36,84,156,0.10)", color: BRAND.blue }}>
						Cadastro via QR Code
					</span>
					<span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[0.56rem] font-black uppercase tracking-wide text-neutral-600">
						Mulher · tem filhos · 4 na residência
					</span>
				</div>

				{/* compras vinculadas */}
				<div className="flex flex-col gap-1.5">
					<span className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-neutral-500">Compras vinculadas pelo ERP</span>
					{[
						{ store: "Loja Matriz", date: "12 jul · CPF identificado no PDV", value: "R$ 214,90" },
						{ store: "Loja 02", date: "05 jul · CPF identificado no PDV", value: "R$ 187,40" },
						{ store: "Loja Matriz", date: "28 jun · CPF identificado no PDV", value: "R$ 96,20" },
					].map((purchase) => (
						<div key={purchase.date} className="flex items-center justify-between rounded-xl border border-neutral-200 px-3.5 py-2">
							<div className="flex flex-col leading-tight">
								<span className="text-[0.76rem] font-extrabold text-neutral-800">{purchase.store}</span>
								<span className="text-[0.62rem] text-neutral-500">{purchase.date}</span>
							</div>
							<span className="text-[0.82rem] font-black tabular-nums text-neutral-900">{purchase.value}</span>
						</div>
					))}
				</div>

				{/* estatísticas */}
				<div className="grid grid-cols-3 gap-2">
					{[
						{ value: "26", label: "compras" },
						{ value: "R$ 168", label: "ticket médio" },
						{ value: "8 dias", label: "ciclo médio" },
					].map((stat) => (
						<div key={stat.label} className="flex flex-col items-center gap-0.5 rounded-xl px-2 py-2.5" style={{ backgroundColor: BRAND.surface }}>
							<span className="text-[0.95rem] font-black tabular-nums leading-none text-neutral-900">{stat.value}</span>
							<span className="text-[0.56rem] font-bold uppercase tracking-wide text-neutral-500">{stat.label}</span>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

/* -------------------------------------------------------------------------- */
/*  05 · RecompraCRM — o motor de recompra                                     */
/* -------------------------------------------------------------------------- */

const FUNNEL = [
	{ label: "Enviados", value: "1.240", pct: 100 },
	{ label: "Entregues", value: "1.198", pct: 96 },
	{ label: "Lidos", value: "812", pct: 65 },
	{ label: "Convertidos", value: "187", pct: 15 },
];

function CrmEngineSheet() {
	return (
		<Sheet>
			<div className="flex flex-1 flex-col px-14 pt-14 pb-6">
				<SectionHeader
					kicker="RecompraCRM · Parte 2"
					icon={Megaphone}
					title="Um motor que trabalha sozinho"
					lead="Sobre a base formada, a plataforma fideliza, reativa e organiza a rotina da equipe — no piloto automático, com cada real de retorno atribuído à campanha que o gerou."
				/>

				<div className="mt-8 grid grid-cols-2 gap-5">
					{/* Campanhas automáticas */}
					<div className="flex flex-col gap-3.5 rounded-3xl border border-neutral-200 bg-white p-6">
						<FeatureCardHeader icon={Megaphone} title="Campanhas automáticas no WhatsApp" />
						<ul className="flex flex-col gap-2">
							<MiniRow>Disparo por gatilho: cliente sumindo, segmento de risco, aniversário, primeira compra.</MiniRow>
							<MiniRow>Cashback de presente junto da mensagem — motivo concreto para voltar.</MiniRow>
						</ul>
						<div className="mt-1 flex flex-col gap-1.5">
							{FUNNEL.map((step, i) => (
								<div key={step.label} className="flex items-center gap-2.5">
									<span className="w-20 text-[0.66rem] font-bold text-neutral-600">{step.label}</span>
									<div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100">
										<div
											className="h-full rounded-full"
											style={{
												width: `${step.pct}%`,
												backgroundColor: i === FUNNEL.length - 1 ? BRAND.gold : BRAND.blue,
												opacity: i === FUNNEL.length - 1 ? 1 : 1 - i * 0.12,
											}}
										/>
									</div>
									<span className="w-12 text-right text-[0.66rem] font-black tabular-nums text-neutral-900">{step.value}</span>
								</div>
							))}
						</div>
						<div className="flex items-center gap-2 rounded-xl px-3.5 py-2.5" style={{ backgroundColor: "rgba(255,185,0,0.12)" }}>
							<span className="text-lg font-black tabular-nums" style={{ color: BRAND.ink }}>
								R$ 31.460
							</span>
							<span className="text-[0.7rem] font-semibold leading-tight text-neutral-600">
								em vendas recuperadas
								<br />
								de uma única campanha
							</span>
						</div>
					</div>

					{/* Cashback, pontos e sorteios */}
					<div className="flex flex-col gap-3.5 rounded-3xl border border-neutral-200 bg-white p-6">
						<FeatureCardHeader icon={Wallet} title="Cashback, pontos, vale-compras e sorteios" />
						<ul className="flex flex-col gap-2">
							<MiniRow>Cashback creditado na hora, no caixa — percentuais e regras por loja e por período.</MiniRow>
							<MiniRow>Modo pontos: cada real vira ponto, pontos viram vale-compras digital no WhatsApp.</MiniRow>
							<MiniRow>Campanhas geram números da sorte auditáveis para sorteios — por compra, cliente e loja.</MiniRow>
							<MiniRow>Resgate como desconto direto ou troca por prêmios definidos pela loja.</MiniRow>
						</ul>
						<div className="mt-auto flex items-center justify-between rounded-xl border border-neutral-200 px-4 py-3">
							<div className="flex items-center gap-2">
								<Tablet className="h-4 w-4" style={{ color: BRAND.blue }} />
								<span className="text-[0.72rem] font-bold text-neutral-600">Ponto de Interação · tablet no caixa</span>
							</div>
							<span className="rounded-full px-2.5 py-1 text-[0.58rem] font-black uppercase tracking-wide text-white" style={{ backgroundColor: BRAND.blue }}>
								Sem app · sem atrito
							</span>
						</div>
					</div>

					{/* Rotina comercial */}
					<div className="flex flex-col gap-3.5 rounded-3xl border border-neutral-200 bg-white p-6">
						<FeatureCardHeader icon={CalendarCheck} title="Rotina comercial da equipe" />
						<ul className="flex flex-col gap-2">
							<MiniRow>Cada vendedor abre o dia com a fila pronta: quem contatar, por quê e o que oferecer.</MiniRow>
							<MiniRow>Carteiras montadas automaticamente a partir das vendas recorrentes.</MiniRow>
							<MiniRow>Metas por vendedor com acompanhamento em tempo real e ranking da equipe.</MiniRow>
							<MiniRow>O gestor enxerga abordagens, conversões e vendas influenciadas — sem planilha.</MiniRow>
						</ul>
					</div>

					{/* BI */}
					<div className="flex flex-col gap-3.5 rounded-3xl border border-neutral-200 bg-white p-6">
						<FeatureCardHeader icon={BarChart3} title="BI do varejo" />
						<ul className="flex flex-col gap-2">
							<MiniRow>Faturamento, margem, ticket médio e itens por venda — com comparativo de períodos.</MiniRow>
							<MiniRow>Giro de estoque, alerta de estoque baixo e receita por produto.</MiniRow>
							<MiniRow>Atribuição de campanha: quanto cada disparo devolveu em vendas.</MiniRow>
							<MiniRow>Visão consolidada da rede, loja a loja — ou do grupo inteiro.</MiniRow>
						</ul>
					</div>
				</div>

				<TakeawayStrip>fidelização, reativação e rotina comercial rodando juntas — e cada real de retorno rastreado até a campanha que o gerou.</TakeawayStrip>
			</div>
			<SheetFooter index={`05 / ${TOTAL_PAGES}`} label="RecompraCRM · O motor" />
		</Sheet>
	);
}

function FeatureCardHeader({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
	return (
		<div className="flex items-center gap-2.5">
			<span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-white" style={{ backgroundColor: BRAND.blue }}>
				<Icon className="h-4.5 w-4.5" />
			</span>
			<h3 className="text-[0.95rem] font-black leading-tight tracking-tight text-neutral-900">{title}</h3>
		</div>
	);
}

function MiniRow({ children }: { children: ReactNode }) {
	return (
		<li className="flex items-start gap-2">
			<span
				className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full"
				style={{ backgroundColor: "rgba(36,84,156,0.10)", color: BRAND.blue }}
			>
				<Check className="h-2.5 w-2.5" strokeWidth={3.5} />
			</span>
			<span className="text-[0.82rem] leading-snug text-neutral-700">{children}</span>
		</li>
	);
}

/* -------------------------------------------------------------------------- */
/*  06 · RecompraERP — a frente de loja                                        */
/* -------------------------------------------------------------------------- */

function ErpFrontSheet() {
	return (
		<Sheet>
			<div className="flex flex-1 flex-col px-14 pt-14 pb-6">
				<SectionHeader
					kicker="RecompraERP · Parte 1"
					icon={ScanLine}
					title="A frente de loja que pensa junto"
					lead="O PDV deixa de ser um registrador de vendas e vira um vendedor a mais: sugere o item que falta na cesta, analisa cada cupom e fecha o caixa sozinho."
				/>

				<div className="mt-8 grid grid-cols-2 items-start gap-8">
					{/* PDV inteligente */}
					<div className="flex flex-col gap-4">
						<h3 className="text-sm font-black uppercase tracking-wide text-neutral-900">PDV com sugestão de cross-sell</h3>
						<PdvMock />
						<ul className="flex flex-col gap-2">
							<MiniRow>
								Sugestão de <strong className="font-bold">cross-sell na venda</strong>: com base na cesta e no histórico do cliente, o PDV indica o item
								complementar na hora.
							</MiniRow>
							<MiniRow>
								<strong className="font-bold">Análise automática de cupom</strong>: cada cupom é lido e analisado — itens, margem e oportunidades que
								ficaram na gôndola.
							</MiniRow>
							<MiniRow>Cliente identificado por CPF ou telefone — a venda alimenta o CRM na mesma hora.</MiniRow>
						</ul>
					</div>

					{/* Fechamento de caixa */}
					<div className="flex flex-col gap-4">
						<h3 className="text-sm font-black uppercase tracking-wide text-neutral-900">Fechamento automático de caixa</h3>
						<CashClosingMock />
						<ul className="flex flex-col gap-2">
							<MiniRow>Conferência automática por forma de pagamento — dinheiro, cartão e Pix batidos sozinhos.</MiniRow>
							<MiniRow>Divergências apontadas na hora, com trilha auditável de cada sessão de caixa.</MiniRow>
							<MiniRow>O fechamento que tomava o fim do expediente sai em minutos — sem planilha, sem conferência manual.</MiniRow>
						</ul>
					</div>
				</div>

				<TakeawayStrip>um PDV que vende mais a cada cupom — e um caixa que se fecha sozinho, com cada centavo conferido.</TakeawayStrip>
			</div>
			<SheetFooter index={`06 / ${TOTAL_PAGES}`} label="RecompraERP · Frente de loja" />
		</Sheet>
	);
}

function PdvMock() {
	return (
		<div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-lg">
			{/* barra */}
			<div className="flex items-center justify-between px-4 py-2.5 text-white" style={{ backgroundColor: BRAND.blue }}>
				<div className="flex items-center gap-2">
					<ScanLine className="h-4 w-4" />
					<span className="text-[0.72rem] font-extrabold">PDV · Caixa 01</span>
				</div>
				<span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[0.56rem] font-bold uppercase tracking-wide">Venda em andamento</span>
			</div>
			<div className="flex flex-col gap-2.5 px-4 py-4">
				{[
					{ item: "Verniz Marítimo 900ml", qty: "1 un", value: "R$ 89,90" },
					{ item: "Lixa d'água 220 (pacote)", qty: "2 un", value: "R$ 18,40" },
				].map((row) => (
					<div key={row.item} className="flex items-center justify-between rounded-xl border border-neutral-200 px-3.5 py-2">
						<div className="flex flex-col leading-tight">
							<span className="text-[0.76rem] font-extrabold text-neutral-800">{row.item}</span>
							<span className="text-[0.6rem] text-neutral-500">{row.qty}</span>
						</div>
						<span className="text-[0.8rem] font-black tabular-nums text-neutral-900">{row.value}</span>
					</div>
				))}
				{/* sugestão de cross-sell */}
				<div className="flex items-center gap-2.5 rounded-xl border border-dashed px-3.5 py-2.5" style={{ borderColor: "rgba(255,185,0,0.6)", backgroundColor: "rgba(255,185,0,0.08)" }}>
					<Sparkles className="h-4 w-4 flex-shrink-0" style={{ color: BRAND.goldText }} />
					<div className="flex flex-col leading-tight">
						<span className="text-[0.62rem] font-black uppercase tracking-wide" style={{ color: BRAND.goldText }}>
							Sugestão para esta cesta
						</span>
						<span className="text-[0.74rem] font-bold text-neutral-800">Quem leva verniz leva Thinner 500ml — oferecer?</span>
					</div>
					<span
						className="ml-auto rounded-md px-2.5 py-1.5 text-[0.58rem] font-extrabold uppercase"
						style={{ backgroundColor: BRAND.gold, color: BRAND.ink }}
					>
						Adicionar
					</span>
				</div>
				<div className="flex items-center justify-between rounded-xl px-3.5 py-2.5" style={{ backgroundColor: BRAND.surface }}>
					<span className="text-[0.66rem] font-bold uppercase tracking-wide text-neutral-500">Total</span>
					<span className="text-base font-black tabular-nums text-neutral-900">R$ 108,30</span>
				</div>
			</div>
		</div>
	);
}

function CashClosingMock() {
	return (
		<div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-lg">
			<div className="flex items-center justify-between px-4 py-2.5 text-white" style={{ backgroundColor: BRAND.blue }}>
				<div className="flex items-center gap-2">
					<Receipt className="h-4 w-4" />
					<span className="text-[0.72rem] font-extrabold">Fechamento · Caixa 01</span>
				</div>
				<span className="rounded-full px-2.5 py-0.5 text-[0.56rem] font-black uppercase tracking-wide" style={{ backgroundColor: "#4ade80", color: "#0a0a0a" }}>
					Conferido
				</span>
			</div>
			<div className="flex flex-col gap-2.5 px-4 py-4">
				{[
					{ label: "Dinheiro", expected: "R$ 842,50", ok: true },
					{ label: "Cartão (débito + crédito)", expected: "R$ 3.218,00", ok: true },
					{ label: "Pix", expected: "R$ 1.104,90", ok: true },
				].map((row) => (
					<div key={row.label} className="flex items-center justify-between rounded-xl border border-neutral-200 px-3.5 py-2">
						<span className="text-[0.74rem] font-bold text-neutral-700">{row.label}</span>
						<div className="flex items-center gap-2">
							<span className="text-[0.78rem] font-black tabular-nums text-neutral-900">{row.expected}</span>
							<span className="flex h-4 w-4 items-center justify-center rounded-full" style={{ backgroundColor: "rgba(22,163,74,0.15)", color: "#15803d" }}>
								<Check className="h-2.5 w-2.5" strokeWidth={4} />
							</span>
						</div>
					</div>
				))}
				<div className="flex items-center justify-between rounded-xl px-3.5 py-2.5" style={{ backgroundColor: "rgba(22,163,74,0.10)" }}>
					<span className="text-[0.66rem] font-black uppercase tracking-wide" style={{ color: "#15803d" }}>
						Divergência
					</span>
					<span className="text-base font-black tabular-nums" style={{ color: "#15803d" }}>
						R$ 0,00
					</span>
				</div>
				<p className="text-center text-[0.62rem] text-neutral-500">
					Sessão fechada em <strong className="font-bold text-neutral-600">4 minutos</strong> · trilha completa no histórico
				</p>
			</div>
		</div>
	);
}

/* -------------------------------------------------------------------------- */
/*  07 · RecompraERP — operação e canais                                       */
/* -------------------------------------------------------------------------- */

const KANBAN_COLUMNS = [
	{ title: "Recebido", orders: [{ code: "#482", desc: "Mesa 12 · 2 itens" }, { code: "#483", desc: "Balcão · 1 item" }] },
	{ title: "Em preparo", orders: [{ code: "#480", desc: "Delivery · 4 itens" }, { code: "#481", desc: "Mesa 07 · 3 itens" }] },
	{ title: "Pronto", orders: [{ code: "#479", desc: "Balcão · 2 itens" }] },
	{ title: "Entregue", orders: [{ code: "#476", desc: "Delivery · 3 itens" }, { code: "#477", desc: "Mesa 03 · 5 itens" }] },
];

function ErpOpsSheet() {
	return (
		<Sheet>
			<div className="flex flex-1 flex-col px-14 pt-14 pb-6">
				<SectionHeader
					kicker="RecompraERP · Parte 2"
					icon={LayoutGrid}
					title="Da cozinha ao digital, o pedido no controle"
					lead="Todo pedido — do balcão, do delivery ou da loja digital — entra no mesmo fluxo visual, com tempo por etapa e a mesma base de clientes do CRM."
				/>

				{/* Kanban / KDS */}
				<div className="mt-8">
					<h3 className="mb-3 text-sm font-black uppercase tracking-wide text-neutral-900">Kanban de pedidos / KDS</h3>
					<div className="rounded-3xl border border-neutral-200 bg-neutral-50/60 p-5">
						<div className="grid grid-cols-4 gap-3">
							{KANBAN_COLUMNS.map((col, i) => (
								<div key={col.title} className="flex flex-col gap-2">
									<div className="flex items-center justify-between rounded-lg bg-white px-3 py-2 ring-1 ring-neutral-200">
										<span className="text-[0.62rem] font-black uppercase tracking-wide text-neutral-700">{col.title}</span>
										<span
											className="flex h-5 w-5 items-center justify-center rounded-full text-[0.58rem] font-black text-white"
											style={{ backgroundColor: i === 2 ? "#16a34a" : BRAND.blue }}
										>
											{col.orders.length}
										</span>
									</div>
									{col.orders.map((order) => (
										<div key={order.code} className="flex flex-col gap-0.5 rounded-xl border border-neutral-200 bg-white px-3 py-2.5 shadow-sm">
											<span className="text-[0.74rem] font-black tabular-nums text-neutral-900">{order.code}</span>
											<span className="text-[0.62rem] text-neutral-500">{order.desc}</span>
										</div>
									))}
								</div>
							))}
						</div>
					</div>
					<ul className="mt-3.5 grid grid-cols-2 gap-x-8 gap-y-2">
						<MiniRow>Tela dedicada para cozinha e expedição — o pedido avança com um toque.</MiniRow>
						<MiniRow>Tempo por etapa e alerta de atraso — o gargalo aparece antes da reclamação.</MiniRow>
						<MiniRow>Pedidos do balcão, do delivery e da loja digital no mesmo quadro.</MiniRow>
						<MiniRow>Histórico completo por pedido, cliente e período.</MiniRow>
					</ul>
				</div>

				{/* Loja digital + roadmap */}
				<div className="mt-7 grid grid-cols-2 gap-5">
					<div className="flex flex-col gap-3 rounded-3xl border border-neutral-200 bg-white p-6">
						<FeatureCardHeader icon={Globe} title="Loja digital integrada" />
						<ul className="flex flex-col gap-2">
							<MiniRow>Catálogo online com a cara da loja — o cliente pede pelo celular, sem app.</MiniRow>
							<MiniRow>O pedido cai direto no kanban da operação, sem redigitação.</MiniRow>
							<MiniRow>Mesma base do CRM: cliente identificado, cashback valendo também no digital.</MiniRow>
						</ul>
					</div>
					<div
						className="flex flex-col gap-3 rounded-3xl border border-dashed p-6"
						style={{ borderColor: "rgba(255,185,0,0.55)", backgroundColor: "rgba(255,185,0,0.06)" }}
					>
						<div className="flex items-center justify-between">
							<FeatureCardHeader icon={UtensilsCrossed} title="Gestão de comandas" />
							<span className="rounded-full px-2.5 py-1 text-[0.55rem] font-black uppercase tracking-wider" style={{ backgroundColor: BRAND.gold, color: BRAND.ink }}>
								No roadmap
							</span>
						</div>
						<ul className="flex flex-col gap-2">
							<MiniRow>Mesas e comandas para food service, sobre o mesmo motor de pedidos.</MiniRow>
							<MiniRow>Consumo acumulado por comanda, fechamento no caixa e cliente identificado.</MiniRow>
							<MiniRow>O próximo passo natural para bares, restaurantes e espetinhos da base.</MiniRow>
						</ul>
					</div>
				</div>

				<TakeawayStrip>uma operação inteira — caixa, cozinha, delivery e digital — enxergando o mesmo pedido e o mesmo cliente.</TakeawayStrip>
			</div>
			<SheetFooter index={`07 / ${TOTAL_PAGES}`} label="RecompraERP · Operação" />
		</Sheet>
	);
}

/* -------------------------------------------------------------------------- */
/*  08 · Projetos & estudos de caso                                            */
/* -------------------------------------------------------------------------- */

const CASES = [
	{
		initials: "GD",
		name: "Grupo Dutra",
		segment: "Grupo multi-CNPJ · 5 unidades",
		challenge:
			"Dois supermercados, uma indústria de alimentos, um espetinho e uma ferragista — o mesmo cliente circulando entre os negócios, invisível para o grupo.",
		solution:
			"Ecossistema Enterprise com base única: cadastro reconhecido em qualquer unidade, cashback que circula entre os negócios e integração com o ERP do grupo.",
		tags: ["Enterprise", "Base única do grupo", "Integração ERP"],
	},
	{
		initials: "PS",
		name: "Prático Supermercados",
		segment: "Rede de supermercados",
		challenge: "Milhares de vendas por dia no ERPFlex — e nenhum relacionamento construído com quem passa no caixa.",
		solution:
			"Hub de clientes com cadastro via QR Code, compras vinculadas por CPF no PDV e clube de pontos com vale-compras digital e sorteios auditáveis.",
		tags: ["RecompraCRM", "Integração ERPFlex", "Pontos & sorteios"],
	},
	{
		initials: "CM",
		name: "Casa do Marceneiro",
		segment: "Rede de 5 lojas de balcão",
		challenge: "Centenas de clientes recorrentes por semana — marceneiros e reformadores — sem cadastro, sem retorno programado.",
		solution:
			"Cashback no balcão via Ponto de Interação, reativação automática no WhatsApp e rotina comercial com fila de abordagens por vendedor.",
		tags: ["RecompraCRM", "Cashback", "Rotina comercial"],
	},
];

function CasesSheet() {
	return (
		<Sheet>
			<div className="flex flex-1 flex-col px-14 pt-14 pb-6">
				<Kicker>Projetos & estudos de caso</Kicker>
				<h2 className="mt-4 max-w-3xl text-[2.7rem] font-black leading-[1.02] tracking-tight text-balance">
					A tese, <span style={{ color: BRAND.blue }}>na prática.</span>
				</h2>
				<p className="mt-4 max-w-2xl text-[1rem] leading-relaxed text-neutral-600">
					Projetos desenhados com varejistas reais — do balcão único ao grupo com cinco CNPJs. A mesma plataforma, o escopo que cada operação precisa.
				</p>

				<div className="mt-7 flex flex-col gap-4">
					{CASES.map((c) => (
						<div key={c.name} className="grid grid-cols-[auto_1fr_1fr] gap-5 rounded-3xl border border-neutral-200 bg-white p-6">
							<div className="flex flex-col items-center gap-2">
								<div
									className="flex h-14 w-14 items-center justify-center rounded-2xl text-lg font-black text-white"
									style={{ backgroundColor: BRAND.blue, boxShadow: "0 10px 24px -10px rgba(36,84,156,0.5)" }}
								>
									{c.initials}
								</div>
							</div>
							<div className="flex flex-col gap-1.5">
								<div className="flex flex-wrap items-center gap-2">
									<h3 className="text-lg font-black tracking-tight text-neutral-900">{c.name}</h3>
									<span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[0.58rem] font-black uppercase tracking-wide text-neutral-500">
										{c.segment}
									</span>
								</div>
								<span className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-neutral-400">O desafio</span>
								<p className="text-[0.84rem] leading-snug text-neutral-600">{c.challenge}</p>
							</div>
							<div className="flex flex-col gap-1.5 rounded-2xl p-4" style={{ backgroundColor: "rgba(36,84,156,0.05)" }}>
								<span className="text-[0.62rem] font-black uppercase tracking-[0.16em]" style={{ color: BRAND.blue }}>
									A solução desenhada
								</span>
								<p className="text-[0.84rem] leading-snug text-neutral-700">{c.solution}</p>
								<div className="mt-auto flex flex-wrap gap-1.5 pt-1">
									{c.tags.map((tag) => (
										<span
											key={tag}
											className="rounded-full px-2 py-0.5 text-[0.56rem] font-black uppercase tracking-wide"
											style={{ backgroundColor: "rgba(36,84,156,0.10)", color: BRAND.blue }}
										>
											{tag}
										</span>
									))}
								</div>
							</div>
						</div>
					))}
				</div>

				<TakeawayStrip>a mesma fundação atendendo formatos completamente diferentes de varejo — é isso que torna a entrada no mercado escalável.</TakeawayStrip>
			</div>
			<SheetFooter index={`08 / ${TOTAL_PAGES}`} label="Estudos de caso" />
		</Sheet>
	);
}

/* -------------------------------------------------------------------------- */
/*  09 · Planos                                                                */
/* -------------------------------------------------------------------------- */

const PLAN_CARDS = [
	{
		name: "RecompraCRM",
		tagline: "Fidelização e relacionamento",
		priceLow: "299",
		priceHigh: "899",
		featured: true,
		rows: [
			"Ponto de Interação com cashback ou pontos",
			"Matriz RFM e perfil 360º do cliente",
			"Campanhas automáticas no WhatsApp",
			"Rotina comercial, metas e ranking",
			"Dashboard de BI e atribuição de campanha",
			"Integração com o ERP da loja",
		],
	},
	{
		name: "RecompraERP",
		tagline: "Gestão e frente de loja",
		priceLow: "199",
		priceHigh: "1.899",
		featured: false,
		rows: [
			"PDV com sugestão de cross-sell",
			"Análise automática de cupom",
			"Fechamento automático de caixa",
			"Kanban de pedidos / KDS",
			"Loja digital integrada",
			"Gestão de comandas (roadmap)",
		],
	},
];

function PlansSheet() {
	return (
		<Sheet>
			<div className="flex flex-1 flex-col px-14 pt-14 pb-6">
				<Kicker>Planos</Kicker>
				<h2 className="mt-4 max-w-3xl text-[2.7rem] font-black leading-[1.02] tracking-tight text-balance">
					Um plano para cada <span style={{ color: BRAND.blue }}>tamanho de operação.</span>
				</h2>
				<p className="mt-4 max-w-2xl text-[1rem] leading-relaxed text-neutral-600">
					O valor dentro de cada faixa acompanha o número de lojas, os módulos ativos e o volume da operação. A implementação é cobrada uma única vez,
					por projeto — e todo plano inclui suporte dedicado por WhatsApp.
				</p>

				<div className="mt-8 grid grid-cols-2 gap-5">
					{PLAN_CARDS.map((plan) => (
						<div
							key={plan.name}
							className="relative flex flex-col gap-4 overflow-hidden rounded-3xl p-7"
							style={
								plan.featured
									? { backgroundColor: BRAND.blue, color: "#fff", boxShadow: "0 20px 44px -18px rgba(36,84,156,0.6)" }
									: { backgroundColor: "#fff", border: `1px solid ${BRAND.border}` }
							}
						>
							{plan.featured ? (
								<div
									className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-35"
									style={{ background: `radial-gradient(circle, ${BRAND.gold} 0%, transparent 64%)` }}
								/>
							) : null}
							<div className="relative z-10">
								<h3 className="text-2xl font-black tracking-tight">{plan.name}</h3>
								<span className="text-[0.78rem] font-semibold" style={{ color: plan.featured ? "rgba(255,255,255,0.7)" : "#737373" }}>
									{plan.tagline}
								</span>
							</div>
							<div className="relative z-10 flex items-end gap-1">
								<span className="text-base font-bold" style={{ color: plan.featured ? "rgba(255,255,255,0.7)" : "#737373" }}>
									R$
								</span>
								<span className="text-4xl font-black leading-none tracking-tight">{plan.priceLow}</span>
								<span className="pb-0.5 text-base font-bold" style={{ color: plan.featured ? "rgba(255,255,255,0.7)" : "#737373" }}>
									a
								</span>
								<span className="text-4xl font-black leading-none tracking-tight" style={plan.featured ? { color: BRAND.gold } : undefined}>
									{plan.priceHigh}
								</span>
								<span className="whitespace-nowrap pb-0.5 text-xs font-semibold" style={{ color: plan.featured ? "rgba(255,255,255,0.6)" : "#a3a3a3" }}>
									/mês por loja
								</span>
							</div>
							<ul className="relative z-10 flex flex-col gap-2.5">
								{plan.rows.map((row) => (
									<li key={row} className="flex items-start gap-2.5">
										<span
											className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full"
											style={
												plan.featured
													? { backgroundColor: "rgba(255,255,255,0.15)", color: "#fff" }
													: { backgroundColor: "rgba(36,84,156,0.10)", color: BRAND.blue }
											}
										>
											<Check className="h-3 w-3" strokeWidth={3.5} />
										</span>
										<span className="text-[0.88rem] leading-snug" style={{ color: plan.featured ? "rgba(255,255,255,0.9)" : "#404040" }}>
											{row}
										</span>
									</li>
								))}
							</ul>
						</div>
					))}
				</div>

				{/* Enterprise */}
				<div className="mt-5 flex items-center gap-5 rounded-3xl border border-neutral-200 bg-white p-6">
					<div
						className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl text-white"
						style={{ backgroundColor: BRAND.blueDeep, boxShadow: "0 10px 24px -10px rgba(26,61,122,0.55)" }}
					>
						<Building2 className="h-7 w-7" />
					</div>
					<div className="flex-1">
						<div className="flex items-center gap-2.5">
							<h3 className="text-xl font-black tracking-tight text-neutral-900">Enterprise</h3>
							<span className="rounded-full px-2.5 py-1 text-[0.55rem] font-black uppercase tracking-wider" style={{ backgroundColor: "rgba(36,84,156,0.10)", color: BRAND.blue }}>
								Sob consulta
							</span>
						</div>
						<p className="mt-1 text-[0.88rem] leading-snug text-neutral-600">
							Criação de soluções sob demanda de sistemas de gestão e CRM: ecossistemas multi-CNPJ, integrações dedicadas e módulos exclusivos —
							precificados por escopo, com implementação única + mensalidade.
						</p>
					</div>
					<div className="flex flex-shrink-0 flex-col items-end gap-0.5 text-right">
						<span className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-neutral-400">Referência de projeto</span>
						<span className="text-lg font-black tabular-nums text-neutral-900">Grupo Dutra</span>
						<span className="text-[0.7rem] font-semibold text-neutral-500">5 unidades · base única</span>
					</div>
				</div>

				<TakeawayStrip>faixas claras, implementação única e a mesma régua de suporte em todos os planos — fácil de propor, fácil de fechar.</TakeawayStrip>
			</div>
			<SheetFooter index={`09 / ${TOTAL_PAGES}`} label="Planos" />
		</Sheet>
	);
}

/* -------------------------------------------------------------------------- */
/*  10 · Parceria comercial                                                    */
/* -------------------------------------------------------------------------- */

const SIMULATION_ROWS = [
	{ stores: "10 lojas", execOnce: "R$ 6.000", execMonthly: "R$ 1.198/mês", repOnce: "R$ 4.000", repMonthly: "R$ 299/mês" },
	{ stores: "25 lojas", execOnce: "R$ 15.000", execMonthly: "R$ 2.995/mês", repOnce: "R$ 10.000", repMonthly: "R$ 748/mês" },
	{ stores: "50 lojas", execOnce: "R$ 30.000", execMonthly: "R$ 5.990/mês", repOnce: "R$ 20.000", repMonthly: "R$ 1.497/mês" },
];

function PartnershipSheet() {
	return (
		<Sheet>
			<div className="flex flex-1 flex-col px-14 pt-10 pb-5">
				<Kicker>Parceria comercial</Kicker>
				<h2 className="mt-3 max-w-3xl text-[2.4rem] font-black leading-[1.02] tracking-tight text-balance">
					Venda o varejo inteligente <span style={{ color: BRAND.blue }}>com a gente.</span>
				</h2>
				<p className="mt-3 max-w-2xl text-[0.95rem] leading-relaxed text-neutral-600">
					Quem conhece o varejo da sua região vale ouro. Dois formatos para entrar no time:{" "}
					<strong className="font-bold text-neutral-900">você vende e lidera o relacionamento — nós operamos o produto.</strong>
				</p>

				<div className="mt-5 grid grid-cols-2 items-stretch gap-5">
					{/* Executivo de contas */}
					<div className="relative flex flex-col gap-3.5 overflow-hidden rounded-3xl p-6 text-white" style={{ backgroundColor: BRAND.blue }}>
						<div
							className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-35"
							style={{ background: `radial-gradient(circle, ${BRAND.gold} 0%, transparent 64%)` }}
						/>
						<div className="relative z-10 flex items-center gap-3">
							<span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
								<Star className="h-5 w-5" fill="currentColor" />
							</span>
							<div>
								<h3 className="text-xl font-black tracking-tight">Executivo de Contas</h3>
								<span className="text-[0.72rem] font-semibold text-white/60">Dono da carteira · líder do cliente</span>
							</div>
						</div>
						<div className="relative z-10 grid grid-cols-2 gap-3">
							<div className="rounded-2xl bg-white/10 px-4 py-2.5 ring-1 ring-white/15">
								<span className="block text-2xl font-black tabular-nums leading-none" style={{ color: BRAND.gold }}>
									30%
								</span>
								<span className="text-[0.62rem] font-bold uppercase tracking-wide text-white/70">do valor da implementação</span>
							</div>
							<div className="rounded-2xl bg-white/10 px-4 py-2.5 ring-1 ring-white/15">
								<span className="block text-2xl font-black tabular-nums leading-none" style={{ color: BRAND.gold }}>
									20%
								</span>
								<span className="text-[0.62rem] font-bold uppercase tracking-wide text-white/70">da recorrência, todo mês</span>
							</div>
						</div>
						<ul className="relative z-10 flex flex-col gap-2">
							{[
								"Capta o cliente e lidera a relação de ponta a ponta",
								"É o contato do cliente na implementação e na recorrência",
								"Acompanha resultados e destrava novas oportunidades na conta",
								"A operação do RecompraCRM é nossa — você cuida do relacionamento",
							].map((row) => (
								<li key={row} className="flex items-start gap-2">
									<span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-white/15">
										<Check className="h-2.5 w-2.5" strokeWidth={3.5} />
									</span>
									<span className="text-[0.8rem] leading-snug text-white/90">{row}</span>
								</li>
							))}
						</ul>
					</div>

					{/* Representante */}
					<div className="flex flex-col gap-3.5 rounded-3xl border border-neutral-200 bg-white p-6">
						<div className="flex items-center gap-3">
							<span className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundColor: "rgba(36,84,156,0.10)", color: BRAND.blue }}>
								<Handshake className="h-5 w-5" />
							</span>
							<div>
								<h3 className="text-xl font-black tracking-tight text-neutral-900">Representante</h3>
								<span className="text-[0.72rem] font-semibold text-neutral-500">Indica e abre portas · nós conduzimos</span>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-3">
							<div className="rounded-2xl px-4 py-2.5" style={{ backgroundColor: BRAND.surface }}>
								<span className="block text-2xl font-black tabular-nums leading-none" style={{ color: BRAND.blue }}>
									20%
								</span>
								<span className="text-[0.62rem] font-bold uppercase tracking-wide text-neutral-500">do valor da implementação</span>
							</div>
							<div className="rounded-2xl px-4 py-2.5" style={{ backgroundColor: BRAND.surface }}>
								<span className="block text-2xl font-black tabular-nums leading-none" style={{ color: BRAND.blue }}>
									5%
								</span>
								<span className="text-[0.62rem] font-bold uppercase tracking-wide text-neutral-500">da recorrência, todo mês</span>
							</div>
						</div>
						<ul className="flex flex-col gap-2">
							{[
								"Indica o varejista e apresenta a gente para o decisor",
								"Nós conduzimos a venda, a implementação e a operação",
								"Ganhos recorrentes enquanto o cliente estiver ativo",
								"Formato ideal para quem já atende lojistas todo dia",
							].map((row) => (
								<MiniRow key={row}>{row}</MiniRow>
							))}
						</ul>
					</div>
				</div>

				{/* simulação */}
				<div className="mt-5">
					<div className="flex items-baseline justify-between">
						<h3 className="text-sm font-black uppercase tracking-wide text-neutral-900">Quanto dá para ganhar</h3>
						<span className="text-[0.64rem] font-semibold text-neutral-400">
							Simulação ilustrativa · plano médio de R$ {SIM_AVG_PLAN}/mês e implementação de R$ {SIM_IMPLEMENTATION} por loja
						</span>
					</div>
					<div className="mt-2.5 overflow-hidden rounded-2xl border border-neutral-200">
						<table className="w-full text-left">
							<thead>
								<tr style={{ backgroundColor: BRAND.surface }}>
									<th className="px-5 py-2.5 text-[0.62rem] font-black uppercase tracking-wide text-neutral-500">Carteira</th>
									<th className="px-5 py-2.5 text-[0.62rem] font-black uppercase tracking-wide" style={{ color: BRAND.blue }}>
										Executivo · na implementação
									</th>
									<th className="px-5 py-2.5 text-[0.62rem] font-black uppercase tracking-wide" style={{ color: BRAND.blue }}>
										Executivo · todo mês
									</th>
									<th className="px-5 py-2.5 text-[0.62rem] font-black uppercase tracking-wide text-neutral-500">Representante · na implementação</th>
									<th className="px-5 py-2.5 text-[0.62rem] font-black uppercase tracking-wide text-neutral-500">Representante · todo mês</th>
								</tr>
							</thead>
							<tbody>
								{SIMULATION_ROWS.map((row, i) => (
									<tr key={row.stores} className={i > 0 ? "border-t border-neutral-200" : ""}>
										<td className="whitespace-nowrap px-5 py-2 text-[0.82rem] font-black text-neutral-900">{row.stores}</td>
										<td className="whitespace-nowrap px-5 py-2 text-[0.82rem] font-bold tabular-nums text-neutral-800">{row.execOnce}</td>
										<td className="whitespace-nowrap px-5 py-2 text-[0.82rem] font-black tabular-nums" style={{ color: BRAND.blue }}>
											{row.execMonthly}
										</td>
										<td className="whitespace-nowrap px-5 py-2 text-[0.82rem] font-bold tabular-nums text-neutral-600">{row.repOnce}</td>
										<td className="whitespace-nowrap px-5 py-2 text-[0.82rem] font-bold tabular-nums text-neutral-600">{row.repMonthly}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>

				{/* CTA final */}
				<div className="relative mt-5 overflow-hidden rounded-3xl px-8 py-5 text-white" style={heroGradient}>
					<div
						className="absolute inset-0 opacity-[0.12]"
						style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "16px 16px" }}
					/>
					<div className="relative z-10 flex items-center justify-between gap-6">
						<div className="flex flex-col gap-1.5">
							<div className="flex items-center gap-2">
								<Star className="h-4 w-4" fill="currentColor" />
								<h2 className="text-base font-black uppercase leading-tight tracking-tight">Vamos construir o varejo inteligente juntos</h2>
							</div>
							<p className="max-w-md text-[0.78rem] leading-relaxed opacity-90">
								Cliente para indicar, carteira para montar ou projeto sob medida — chame a gente no WhatsApp e começamos essa conversa.
							</p>
						</div>
						<div className="flex flex-shrink-0 flex-col gap-2">
							{SUPPORT_CONTACTS.map((contact) => (
								<a
									key={contact.name}
									href={`https://wa.me/${contact.whatsapp}?text=${encodeURIComponent("Olá! Quero conversar sobre o Recompra no Varejo.")}`}
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
			<SheetFooter index={`10 / ${TOTAL_PAGES}`} label="Parceria comercial" />
		</Sheet>
	);
}
