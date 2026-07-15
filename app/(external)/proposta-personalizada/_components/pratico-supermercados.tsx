// Proposta comercial de uso único — Prático Supermercados.
// Solução personalizada (Hub de Clientes integrado ao ERPFlex) — não é o RecompraCRM,
// mas a proposta vive aqui pela qualidade do design system.
// Renderizada dentro do shell de impressão em ../page.tsx (A4). Não faz parte do produto.
//
// Estrutura (6 folhas):
//   01 · Cenário, solução e escopo
//   02 · Pilar 01 — Cadastro via QR Code (principal interesse do cliente)
//   03 · Pilar 02 — Integração com o ERPFlex (CPF no PDV)
//   04 · Pilar 03 — Fidelização com cashback + Matriz RFM
//   05 · Pilar 04 — Reativação automática no WhatsApp
//   06 · Investimento, caminho e fechamento

import { ARTHUR_WHATSAPP_NUMBER, LUCAS_WHATSAPP_NUMBER } from "@/config/internal-coms";
import {
	ArrowRight,
	BarChart3,
	Check,
	Contact,
	Database,
	DoorOpen,
	Gift,
	LayoutDashboard,
	type LucideIcon,
	Megaphone,
	Plug,
	QrCode,
	RefreshCw,
	Rocket,
	ScanLine,
	ShieldCheck,
	ShoppingCart,
	Sparkles,
	Star,
	Users,
	Wallet,
} from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
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
		icon: QrCode,
		title: "Cadastro via QR Code",
		body: "O cliente aponta a câmera e se cadastra na hora — na loja, no encarte ou nas redes. Sem precisar comprar nada.",
	},
	{
		icon: Plug,
		title: "Compra vinculada por CPF",
		body: "Integrado ao ERPFlex: o cliente informa o CPF no PDV e cada compra entra no histórico do cadastro, automaticamente.",
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
	"Homem / Mulher",
	"Tem filhos",
	"Moradores na residência",
	"Consentimento LGPD",
];

const DELIVERABLES = [
	{
		icon: QrCode,
		title: "QR Code de cadastro",
		body: "Formulário com a cara do Prático, aberto pela câmera do celular — cadastro completo mesmo sem compra.",
	},
	{
		icon: Plug,
		title: "Integração com o ERPFlex",
		body: "Nossa API conectada ao ERPFlex: o CPF informado no PDV vincula cada compra ao cadastro.",
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
		body: "Cadastro via QR Code + compras por CPF no ERPFlex. A fundação de tudo.",
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
		body: "Reativação automática no WhatsApp pelo perfil e comportamento de compra.",
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
			<QrCodeSheet />
			<ErpFlexSheet />
			<LoyaltySheet />
			<ReactivationSheet />
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
			<div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: hexToRgba(BRAND.green, 0.1), color: BRAND.green }}>
				<Icon className="h-[18px] w-[18px]" />
			</div>
			<h2 className="text-lg font-black uppercase leading-none tracking-tight text-neutral-900">{text}</h2>
		</div>
	);
}

function PillarHeader({ n, icon: Icon, title, lead, badge }: { n: string; icon: LucideIcon; title: string; lead: string; badge?: string }) {
	return (
		<div className="flex items-start gap-5">
			<div
				className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl text-white shadow-lg"
				style={{ backgroundColor: BRAND.green, boxShadow: `0 12px 28px -10px ${hexToRgba(BRAND.green, 0.5)}` }}
			>
				<Icon className="h-7 w-7" />
			</div>
			<div className="min-w-0">
				<div className="flex items-center gap-2.5">
					<span className="text-[0.68rem] font-black uppercase tracking-[0.25em]" style={{ color: BRAND.limeText }}>
						Pilar {n}
					</span>
					{badge ? (
						<span
							className="rounded-full px-2.5 py-0.5 text-[0.55rem] font-black uppercase tracking-wider"
							style={{ backgroundColor: BRAND.lime, color: BRAND.greenDeep }}
						>
							{badge}
						</span>
					) : null}
				</div>
				<h2 className="mt-1 text-[2.1rem] font-black leading-none tracking-tight text-neutral-900">{title}</h2>
				<p className="mt-2 max-w-xl text-[0.9rem] leading-relaxed text-neutral-600">{lead}</p>
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
			<span className="text-[0.85rem] leading-snug text-neutral-700">{children}</span>
		</li>
	);
}

/* Faixa de fechamento — ancora o pé de cada pilar com o resultado prático. */
function TakeawayStrip({ children }: { children: ReactNode }) {
	return (
		<div className="mt-auto flex items-center gap-3.5 rounded-2xl px-6 py-4" style={{ backgroundColor: hexToRgba(BRAND.green, 0.06) }}>
			<span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-white" style={{ backgroundColor: BRAND.green }}>
				<ArrowRight className="h-5 w-5" />
			</span>
			<p className="text-[0.9rem] leading-snug text-neutral-700">
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
								<QrCode className="h-3.5 w-3.5" />
								Cadastro via QR Code · compras por CPF, integrado ao ERPFlex
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
						aí que entramos: começando por conhecer até quem ainda nem passou pelo caixa.
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
								O hub é a fundação. Com a base formada e as compras rastreadas, os próximos passos — cashback, campanhas, e-commerce — já nascem com
								clientes conhecidos, sem começar do zero. As próximas páginas mostram cada peça em detalhe.
							</p>
						</div>
					</div>
				</div>
			</div>
			<SheetFooter index="01 / 06" label="Proposta · Prático Supermercados" />
		</Sheet>
	);
}

/* -------------------------------------------------------------------------- */
/*  2 · Pilar 01 — Cadastro via QR Code                                        */
/* -------------------------------------------------------------------------- */

function QrCodeSheet() {
	return (
		<Sheet>
			<div className="flex flex-1 flex-col px-11 pt-10 pb-8">
				<PillarHeader
					n="01"
					icon={QrCode}
					title="Cadastro via QR Code"
					badge="Principal interesse · começa aqui"
					lead="Um QR Code espalhado pelas lojas, encartes e redes sociais. O cliente aponta a câmera, preenche o perfil e entra para a base do Prático — mesmo sem comprar nada."
				/>

				<div className="mt-7 grid grid-cols-[1.05fr_0.95fr] items-start gap-8">
					{/* Coluna texto */}
					<div className="flex flex-col gap-5 pt-1">
						<div>
							<h3 className="mb-2.5 text-sm font-black uppercase tracking-wide text-neutral-900">Como funciona</h3>
							<ul className="flex flex-col gap-2.5">
								<BenefitRow>QR Code em gôndolas, caixas, encarte e redes sociais — onde o cliente estiver.</BenefitRow>
								<BenefitRow>Aponta a câmera e o formulário abre direto no navegador — sem baixar aplicativo.</BenefitRow>
								<BenefitRow>Perfil completo preenchido em menos de um minuto, com consentimento LGPD.</BenefitRow>
								<BenefitRow>O cadastro cai na base na hora — sem depender de compra ou de fila no caixa.</BenefitRow>
							</ul>
						</div>

						<div className="rounded-2xl border border-dashed p-5" style={{ borderColor: hexToRgba(BRAND.lime, 0.8), backgroundColor: hexToRgba(BRAND.lime, 0.1) }}>
							<div className="mb-1.5 flex items-center gap-2">
								<Sparkles className="h-4 w-4" style={{ color: BRAND.limeText }} />
								<span className="text-[0.7rem] font-black uppercase tracking-wider" style={{ color: BRAND.limeText }}>
									Cadastro sem compra
								</span>
							</div>
							<p className="text-[0.85rem] leading-relaxed text-neutral-700">
								Quem ainda não é cliente também entra na base: o QR Code transforma <strong className="font-extrabold">visitantes, seguidores e curiosos
								em contatos identificados</strong> — prontos para receber ofertas e virar compradores.
							</p>
						</div>

						<div>
							<h3 className="mb-2.5 text-sm font-black uppercase tracking-wide text-neutral-900">Todos os dados que o Prático pediu</h3>
							<div className="flex flex-wrap gap-1.5">
								{PROFILE_FIELDS.map((field) => (
									<span
										key={field}
										className="rounded-full px-2.5 py-1 text-[0.68rem] font-bold"
										style={{ backgroundColor: hexToRgba(BRAND.green, 0.08), color: BRAND.green }}
									>
										{field}
									</span>
								))}
							</div>
						</div>
					</div>

					{/* Coluna mockup — display com QR Code */}
					<div className="flex flex-col items-center gap-3">
						<QrDisplayMock />
						<span className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-neutral-500">Display no caixa, na gôndola e no encarte</span>
					</div>
				</div>

				{/* Formulário — o que o cliente preenche */}
				<RegistrationFormMock />

				<TakeawayStrip>uma base que cresce todos os dias — dentro e fora da loja — com o perfil completo de cada contato.</TakeawayStrip>
			</div>
			<SheetFooter index="02 / 06" label="Pilar 01 · Cadastro via QR Code" />
		</Sheet>
	);
}

/* QR Code estilizado (decorativo) — matriz 21×21 com padrões de localização. */
const QR_MATRIX = [
	"111111101011001111111",
	"100000100101001000001",
	"101110101100101011101",
	"101110100011101011101",
	"101110101010001011101",
	"100000100110101000001",
	"111111101010101111111",
	"000000001101000000000",
	"110101111001010111010",
	"011010001110110010011",
	"101011110100101101110",
	"010110010011010110100",
	"111001101101011010011",
	"000000001011010110011",
	"111111100110101011010",
	"100000101001110110100",
	"101110100111010010111",
	"101110101100110101001",
	"101110100010101110110",
	"100000101101001010011",
	"111111100110110101101",
];

function QrCodeMock({ className = "" }: { className?: string }) {
	return (
		<div className={`grid aspect-square ${className}`} style={{ gridTemplateColumns: "repeat(21, 1fr)" }}>
			{QR_MATRIX.flatMap((row, r) =>
				row.split("").map((cell, c) => (
					// Matriz estática decorativa — índice como key é estável aqui
					<div key={`${r}-${c}`} style={{ backgroundColor: cell === "1" ? BRAND.greenDeep : "transparent" }} />
				)),
			)}
		</div>
	);
}

function QrDisplayMock() {
	return (
		<div
			className="w-full max-w-[300px] overflow-hidden rounded-[24px] shadow-2xl"
			style={{ backgroundColor: "#0f172a", boxShadow: "0 30px 60px -25px rgba(15,23,42,0.6)", padding: "10px" }}
		>
			<div className="overflow-hidden rounded-[16px] bg-white">
				{/* topo com a marca */}
				<div className="flex items-center gap-2.5 px-5 py-3.5 text-white" style={heroGradient}>
					<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 text-[0.72rem] font-black">PS</div>
					<div className="flex flex-col leading-none">
						<span className="text-[0.82rem] font-extrabold">Prático Supermercados</span>
						<span className="text-[0.6rem] font-medium text-white/65">Clube de vantagens</span>
					</div>
				</div>

				{/* QR Code */}
				<div className="flex flex-col items-center gap-3 px-6 py-5">
					<div className="rounded-2xl border-2 p-3.5" style={{ borderColor: hexToRgba(BRAND.green, 0.2) }}>
						<QrCodeMock className="w-[168px]" />
					</div>
					<div className="text-center">
						<p className="text-[0.95rem] font-black uppercase leading-tight tracking-tight" style={{ color: BRAND.greenDeep }}>
							Aponte a câmera
							<br />e cadastre-se
						</p>
						<p className="mt-1 text-[0.68rem] leading-snug text-neutral-500">Leva menos de 1 minuto — e não precisa comprar nada.</p>
					</div>
				</div>

				{/* faixa lime */}
				<div className="px-4 py-2.5 text-center text-[0.62rem] font-black uppercase tracking-wider" style={{ backgroundColor: BRAND.lime, color: BRAND.greenDeep }}>
					Vantagens exclusivas para quem faz parte
				</div>
			</div>
		</div>
	);
}

/* Mock do formulário — mostra exatamente os campos pedidos pelo cliente. */
function FormFieldMock({ label, value, wide }: { label: string; value: ReactNode; wide?: boolean }) {
	return (
		<div className={`flex flex-col gap-1 ${wide ? "col-span-2" : ""}`}>
			<span className="text-[0.58rem] font-black uppercase tracking-wide text-neutral-500">{label}</span>
			<div className="flex min-h-[30px] items-center rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5">{value}</div>
		</div>
	);
}

function ChoiceChips({ options, selected }: { options: string[]; selected: string }) {
	return (
		<div className="flex flex-wrap gap-1">
			{options.map((option) => (
				<span
					key={option}
					className="rounded-md px-2 py-0.5 text-[0.62rem] font-bold"
					style={
						option === selected
							? { backgroundColor: BRAND.green, color: "#fff" }
							: { backgroundColor: "#f5f5f5", color: "#737373" }
					}
				>
					{option}
				</span>
			))}
		</div>
	);
}

function RegistrationFormMock() {
	return (
		<div className="mt-6 rounded-2xl border border-neutral-200 bg-neutral-50/70 p-5">
			<div className="mb-3 flex items-center gap-2">
				<span className="flex h-7 w-7 items-center justify-center rounded-lg text-white" style={{ backgroundColor: BRAND.green }}>
					<QrCode className="h-4 w-4" />
				</span>
				<span className="text-[0.74rem] font-black uppercase tracking-wide text-neutral-800">O formulário que o QR Code abre</span>
				<span className="ml-auto rounded-full bg-white px-2.5 py-1 text-[0.6rem] font-bold text-neutral-500 ring-1 ring-neutral-200">
					cadastro.praticosupermercados.com.br
				</span>
			</div>
			<div className="grid grid-cols-6 gap-3">
				<FormFieldMock wide label="Nome completo" value={<span className="text-[0.72rem] font-semibold text-neutral-800">Maria Souza</span>} />
				<FormFieldMock wide label="Telefone / WhatsApp" value={<span className="text-[0.72rem] font-semibold tabular-nums text-neutral-800">(34) 99912-4478</span>} />
				<FormFieldMock wide label="CPF" value={<span className="text-[0.72rem] font-semibold tabular-nums text-neutral-800">123.456.789-00</span>} />
				<FormFieldMock wide label="Você é" value={<ChoiceChips options={["Homem", "Mulher"]} selected="Mulher" />} />
				<FormFieldMock wide label="Tem filhos?" value={<ChoiceChips options={["Sim", "Não"]} selected="Sim" />} />
				<FormFieldMock wide label="Quantas pessoas moram na sua casa?" value={<ChoiceChips options={["1", "2", "3", "4", "5+"]} selected="4" />} />
			</div>
			<div className="mt-3 flex items-center gap-2 rounded-lg bg-white px-3 py-2 ring-1 ring-neutral-200">
				<span className="flex h-4 w-4 items-center justify-center rounded" style={{ backgroundColor: BRAND.green }}>
					<Check className="h-3 w-3 text-white" strokeWidth={3.5} />
				</span>
				<span className="text-[0.66rem] text-neutral-600">Autorizo o Prático a me enviar ofertas e novidades pelo WhatsApp — de acordo com a LGPD.</span>
			</div>
		</div>
	);
}

/* -------------------------------------------------------------------------- */
/*  3 · Pilar 02 — Integração com o ERPFlex                                    */
/* -------------------------------------------------------------------------- */

const ERP_FLOW = [
	{
		icon: QrCode,
		title: "Cadastro pelo QR Code",
		body: "O cliente entra na base com nome, CPF e perfil completo.",
	},
	{
		icon: ScanLine,
		title: "CPF no PDV",
		body: "Na hora de pagar, o cliente informa o CPF — hábito que já existe.",
	},
	{
		icon: RefreshCw,
		title: "ERPFlex → nossa API",
		body: "A venda sai do ERPFlex e chega na plataforma automaticamente.",
	},
	{
		icon: BarChart3,
		title: "Histórico completo",
		body: "Frequência, ticket e recorrência somando no perfil do cliente.",
	},
];

function ErpFlexSheet() {
	return (
		<Sheet>
			<div className="flex flex-1 flex-col px-11 pt-10 pb-8">
				<PillarHeader
					n="02"
					icon={Plug}
					title="Integração com o ERPFlex"
					badge="Junto com o QR Code"
					lead="Nossa API conectada ao ERP que o Prático já usa. O cliente informa o CPF no PDV — como já faz pela nota — e cada compra é vinculada ao cadastro feito no QR Code."
				/>

				{/* Fluxo em 4 passos */}
				<div className="mt-7 grid grid-cols-4 gap-3">
					{ERP_FLOW.map((step, i) => (
						<div key={step.title} className="relative flex flex-col gap-2 rounded-2xl border border-neutral-200 bg-white p-4">
							{i < ERP_FLOW.length - 1 ? (
								<span
									className="absolute -right-2.5 top-1/2 z-10 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-white"
									style={{ backgroundColor: BRAND.lime, color: BRAND.greenDeep }}
								>
									<ArrowRight className="h-3 w-3" strokeWidth={3} />
								</span>
							) : null}
							<div className="flex items-center gap-2">
								<span
									className="flex h-6 w-6 items-center justify-center rounded-full text-[0.66rem] font-black text-white"
									style={{ backgroundColor: BRAND.green }}
								>
									{i + 1}
								</span>
								<step.icon className="h-4 w-4" style={{ color: BRAND.limeText }} />
							</div>
							<h4 className="text-[0.74rem] font-black uppercase leading-tight tracking-tight text-neutral-900">{step.title}</h4>
							<p className="text-[0.68rem] leading-snug text-neutral-600">{step.body}</p>
						</div>
					))}
				</div>

				<div className="mt-7 grid grid-cols-[1fr_1fr] items-start gap-8">
					{/* Coluna texto */}
					<div className="flex flex-col gap-5 pt-1">
						<div>
							<h3 className="mb-2.5 text-sm font-black uppercase tracking-wide text-neutral-900">O que isso destrava</h3>
							<ul className="flex flex-col gap-2.5">
								<BenefitRow>Todo cadastro do QR Code vira um cliente rastreável no caixa — dali em diante, cada compra conta.</BenefitRow>
								<BenefitRow>Visão de recorrência real: quem compra toda semana, quem está sumindo, quem nunca voltou.</BenefitRow>
								<BenefitRow>Segmentação por comportamento de compra + perfil familiar — não por achismo.</BenefitRow>
								<BenefitRow>A fundação pronta para cashback, campanhas e clube de fidelidade, sem retrabalho.</BenefitRow>
							</ul>
						</div>

						<div
							className="rounded-2xl border border-dashed p-5"
							style={{ borderColor: hexToRgba(BRAND.green, 0.35), backgroundColor: hexToRgba(BRAND.green, 0.05) }}
						>
							<div className="mb-1.5 flex items-center gap-2">
								<ShieldCheck className="h-4 w-4" style={{ color: BRAND.green }} />
								<span className="text-[0.7rem] font-black uppercase tracking-wider" style={{ color: BRAND.green }}>
									Sem mudar a operação
								</span>
							</div>
							<p className="text-[0.85rem] leading-relaxed text-neutral-700">
								Nada muda para a equipe de caixa: o fluxo do PDV continua o mesmo do ERPFlex. A vinculação acontece{" "}
								<strong className="font-extrabold">nos bastidores, via API</strong> — sem sistema paralelo, sem redigitação.
							</p>
						</div>
					</div>

					{/* Coluna mockup — perfil com compras vinculadas */}
					<div className="flex flex-col items-center gap-3">
						<CustomerProfileMock />
						<span className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-neutral-500">Perfil do cliente · compras chegando do PDV</span>
					</div>
				</div>

				<TakeawayStrip>cada CPF digitado no PDV vira histórico de compra no perfil do cliente — sem nenhum trabalho manual da equipe.</TakeawayStrip>
			</div>
			<SheetFooter index="03 / 06" label="Pilar 02 · Integração ERPFlex" />
		</Sheet>
	);
}

const LINKED_PURCHASES = [
	{ date: "12 jul", store: "Loja Matriz", value: "R$ 214,90" },
	{ date: "05 jul", store: "Loja 02", value: "R$ 187,40" },
	{ date: "28 jun", store: "Loja Matriz", value: "R$ 96,20" },
];

function CustomerProfileMock() {
	return (
		<div
			className="w-full max-w-[360px] rounded-[24px] p-3 shadow-2xl"
			style={{ backgroundColor: "#0f172a", boxShadow: "0 30px 60px -25px rgba(15,23,42,0.6)" }}
		>
			<div className="overflow-hidden rounded-[16px] bg-white">
				{/* cabeçalho do perfil */}
				<div className="flex items-center gap-3 px-5 py-4" style={{ backgroundColor: hexToRgba(BRAND.green, 0.06) }}>
					<div
						className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-black"
						style={{ backgroundColor: hexToRgba(BRAND.green, 0.12), color: BRAND.green }}
					>
						MS
					</div>
					<div className="flex min-w-0 flex-col leading-tight">
						<span className="text-[0.9rem] font-extrabold tracking-tight text-neutral-900">Maria Souza</span>
						<span className="text-[0.66rem] tabular-nums text-neutral-500">CPF •••.456.789-•• · (34) 99912-4478</span>
					</div>
				</div>

				{/* origem do cadastro */}
				<div className="flex flex-wrap items-center gap-1.5 px-5 pt-3">
					<span
						className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.56rem] font-black uppercase tracking-wide"
						style={{ backgroundColor: BRAND.lime, color: BRAND.greenDeep }}
					>
						<QrCode className="h-2.5 w-2.5" /> Cadastro via QR Code
					</span>
					<span className="rounded-full px-2 py-0.5 text-[0.56rem] font-bold uppercase tracking-wide" style={{ backgroundColor: "#f5f5f5", color: "#737373" }}>
						Mulher · tem filhos · 4 na residência
					</span>
				</div>

				{/* compras vinculadas */}
				<div className="flex flex-col gap-2 px-5 py-4">
					<span className="text-[0.6rem] font-black uppercase tracking-[0.18em] text-neutral-400">Compras vinculadas pelo ERPFlex</span>
					{LINKED_PURCHASES.map((purchase) => (
						<div key={`${purchase.date}-${purchase.value}`} className="flex items-center gap-2.5 rounded-xl border border-neutral-200 px-3 py-2">
							<span
								className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg"
								style={{ backgroundColor: hexToRgba(BRAND.green, 0.08), color: BRAND.green }}
							>
								<ShoppingCart className="h-3.5 w-3.5" />
							</span>
							<div className="flex min-w-0 flex-1 flex-col leading-tight">
								<span className="text-[0.72rem] font-bold text-neutral-800">{purchase.store}</span>
								<span className="text-[0.62rem] text-neutral-500">{purchase.date} · CPF identificado no PDV</span>
							</div>
							<span className="text-[0.78rem] font-black tabular-nums text-neutral-900">{purchase.value}</span>
						</div>
					))}
				</div>

				{/* estatísticas */}
				<div className="grid grid-cols-3 divide-x divide-neutral-100 border-t border-neutral-100">
					{[
						{ value: "26", label: "compras" },
						{ value: "R$ 168", label: "ticket médio" },
						{ value: "8 dias", label: "ciclo médio" },
					].map((stat) => (
						<div key={stat.label} className="flex flex-col items-center gap-0.5 px-2 py-3">
							<span className="text-[0.92rem] font-black tabular-nums leading-none" style={{ color: BRAND.green }}>
								{stat.value}
							</span>
							<span className="text-[0.56rem] font-bold uppercase tracking-wide text-neutral-400">{stat.label}</span>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

/* -------------------------------------------------------------------------- */
/*  4 · Pilar 03 — Fidelização com cashback                                    */
/* -------------------------------------------------------------------------- */

function LoyaltySheet() {
	return (
		<Sheet>
			<div className="flex flex-1 flex-col px-11 pt-10 pb-8">
				<PillarHeader
					n="03"
					icon={Wallet}
					title="Fidelização com cashback"
					badge="Evolução · sobre a mesma base"
					lead="Com a base formada e as compras rastreadas, o passo seguinte é dar um motivo para voltar: o cliente acumula cashback a cada compra e resgata direto no caixa."
				/>

				<div className="mt-7 grid grid-cols-[0.98fr_1.02fr] items-start gap-8">
					{/* Coluna texto */}
					<div className="flex flex-col gap-5 pt-1">
						<div>
							<h3 className="mb-2.5 text-sm font-black uppercase tracking-wide text-neutral-900">Como funciona no caixa</h3>
							<ul className="flex flex-col gap-2.5">
								<BenefitRow>O cliente informa o CPF ou telefone no caixa — o mesmo fluxo da integração.</BenefitRow>
								<BenefitRow>O cashback é calculado sobre a compra e creditado na hora.</BenefitRow>
								<BenefitRow>O saldo é resgatado em compras futuras — motivo real para voltar ao Prático.</BenefitRow>
								<BenefitRow>Percentuais e regras definidos por você, por loja e por período.</BenefitRow>
							</ul>
						</div>

						<div className="rounded-2xl border border-dashed p-5" style={{ borderColor: hexToRgba(BRAND.lime, 0.8), backgroundColor: hexToRgba(BRAND.lime, 0.1) }}>
							<div className="mb-1.5 flex items-center gap-2">
								<Gift className="h-4 w-4" style={{ color: BRAND.limeText }} />
								<span className="text-[0.7rem] font-black uppercase tracking-wider" style={{ color: BRAND.limeText }}>
									O ativo que fica com você
								</span>
							</div>
							<p className="text-[0.85rem] leading-relaxed text-neutral-700">
								O cashback é a isca. O que fica é a <strong className="font-extrabold">base de clientes do Prático</strong>, pronta para campanhas — e
								segmentada automaticamente pela Matriz RFM.
							</p>
						</div>

						<RfmMiniMatrix />
					</div>

					{/* Coluna mockup — tablet Ponto de Interação */}
					<div className="flex flex-col items-center gap-3">
						<PointOfInteractionMock />
						<span className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-neutral-500">Ponto de Interação · tablet no caixa</span>
					</div>
				</div>

				<TakeawayStrip>clientes com um motivo concreto para escolher o Prático — e uma base que se segmenta sozinha a cada compra.</TakeawayStrip>
			</div>
			<SheetFooter index="04 / 06" label="Pilar 03 · Fidelização" />
		</Sheet>
	);
}

function PointOfInteractionMock() {
	return (
		<div
			className="w-full max-w-[350px] rounded-[24px] p-3 shadow-2xl"
			style={{ backgroundColor: "#0f172a", boxShadow: "0 30px 60px -25px rgba(15,23,42,0.6)" }}
		>
			<div className="overflow-hidden rounded-[16px] bg-white">
				{/* barra da loja */}
				<div className="flex items-center justify-between px-5 py-3.5 text-white" style={{ backgroundColor: BRAND.green }}>
					<div className="flex items-center gap-2">
						<div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 text-[0.7rem] font-black">PS</div>
						<div className="flex flex-col leading-none">
							<span className="text-[0.8rem] font-extrabold">Prático Supermercados</span>
							<span className="text-[0.6rem] font-medium text-white/60">Loja Matriz</span>
						</div>
					</div>
					<span className="rounded-full bg-white/15 px-2.5 py-1 text-[0.58rem] font-bold uppercase tracking-wide">Pontuar</span>
				</div>

				{/* perfil do cliente */}
				<div className="flex flex-col gap-3.5 px-5 py-4">
					<div className="flex items-center gap-3">
						<div
							className="flex h-11 w-11 items-center justify-center rounded-full text-base font-black"
							style={{ backgroundColor: hexToRgba(BRAND.green, 0.12), color: BRAND.green }}
						>
							MS
						</div>
						<div className="flex flex-col leading-tight">
							<span className="text-[0.92rem] font-extrabold tracking-tight text-neutral-900">Maria Souza</span>
							<span className="text-[0.7rem] text-neutral-500">(34) 99912-4478 · 26 compras</span>
						</div>
						<span className="ml-auto rounded-full px-2.5 py-1 text-[0.56rem] font-black tracking-wide text-gray-950" style={{ backgroundColor: "#4ade80" }}>
							CLIENTE LEAL
						</span>
					</div>

					{/* saldo de cashback */}
					<div className="rounded-2xl px-5 py-3.5 text-center" style={{ backgroundColor: hexToRgba(BRAND.lime, 0.18) }}>
						<span className="text-[0.6rem] font-black uppercase tracking-[0.2em]" style={{ color: BRAND.limeText }}>
							Cashback disponível
						</span>
						<p className="mt-1 text-3xl font-black tabular-nums" style={{ color: BRAND.greenDeep }}>
							R$ 23,50
						</p>
					</div>

					{/* valor da venda */}
					<div className="flex items-center justify-between rounded-xl border border-neutral-200 px-4 py-2.5">
						<span className="text-[0.72rem] font-semibold text-neutral-500">Valor da venda</span>
						<span className="text-lg font-black tabular-nums text-neutral-900">R$ 214,90</span>
					</div>

					{/* botões */}
					<div className="grid grid-cols-2 gap-2.5">
						<div
							className="flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-[0.76rem] font-extrabold uppercase text-white"
							style={{ backgroundColor: BRAND.green }}
						>
							<Sparkles className="h-4 w-4" /> Pontuar
						</div>
						<div
							className="flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-[0.76rem] font-extrabold uppercase"
							style={{ backgroundColor: BRAND.lime, color: BRAND.greenDeep }}
						>
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
							className="w-fit rounded-full px-2 py-0.5 text-[0.56rem] font-black uppercase tracking-wide"
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
/*  5 · Pilar 04 — Reativação automática                                       */
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
			<div className="flex flex-1 flex-col px-11 pt-10 pb-8">
				<PillarHeader
					n="04"
					icon={Megaphone}
					title="Reativação automática"
					badge="Evolução · sobre a mesma base"
					lead="Quando um cliente entra em risco de sumir, a plataforma dispara a mensagem certa no WhatsApp — com cashback de presente para trazê-lo de volta às compras."
				/>

				<div className="mt-7 grid grid-cols-[1.02fr_0.98fr] items-start gap-8">
					{/* Mockup WhatsApp */}
					<div className="flex flex-col items-center gap-3">
						<WhatsappCampaignMock />
						<span className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-neutral-500">Campanha automática · gatilho “Em risco”</span>
					</div>

					{/* Funil + texto */}
					<div className="flex flex-col gap-5 pt-1">
						<div>
							<h3 className="mb-3 text-sm font-black uppercase tracking-wide text-neutral-900">Funil da campanha</h3>
							<div className="flex flex-col gap-2.5">
								{FUNNEL.map((step, i) => (
									<div key={step.label} className="flex flex-col gap-1">
										<div className="flex items-center justify-between text-[0.76rem]">
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
													backgroundColor: i === FUNNEL.length - 1 ? BRAND.lime : BRAND.green,
													opacity: i === FUNNEL.length - 1 ? 1 : 1 - i * 0.12,
												}}
											/>
										</div>
									</div>
								))}
							</div>
							<div className="mt-4 flex items-center gap-2.5 rounded-xl px-4 py-3" style={{ backgroundColor: hexToRgba(BRAND.lime, 0.18) }}>
								<span className="text-2xl font-black tabular-nums" style={{ color: BRAND.greenDeep }}>
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
							<h3 className="mb-2.5 text-sm font-black uppercase tracking-wide text-neutral-900">Dispara sozinho quando</h3>
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
			<SheetFooter index="05 / 06" label="Pilar 04 · Reativação" />
		</Sheet>
	);
}

function WhatsappCampaignMock() {
	return (
		<div
			className="w-full max-w-[340px] overflow-hidden rounded-[24px] p-3 shadow-2xl"
			style={{ backgroundColor: "#0f172a", boxShadow: "0 30px 60px -25px rgba(15,23,42,0.6)" }}
		>
			<div className="overflow-hidden rounded-[16px]" style={{ backgroundColor: "#e6ddd4" }}>
				{/* header whatsapp */}
				<div className="flex items-center gap-3 px-4 py-3 text-white" style={{ backgroundColor: "#075E54" }}>
					<div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-[0.7rem] font-black">PS</div>
					<div className="flex flex-col leading-none">
						<span className="text-[0.85rem] font-bold">Prático Supermercados</span>
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
						<p className="text-[0.8rem] leading-snug text-neutral-800">
							Oi, Maria! 👋 Sentimos sua falta aqui no <strong>Prático</strong>.
						</p>
						<p className="mt-2 text-[0.8rem] leading-snug text-neutral-800">
							Separamos <strong>R$ 15 de cashback</strong> pra você usar nas compras do mês — tá te esperando! 🎁
						</p>
						<span className="mt-1.5 block text-right text-[0.58rem] text-neutral-500">09:14 ✓✓</span>
					</div>

					<div className="max-w-[85%] self-start rounded-2xl rounded-tl-sm px-3.5 py-2.5 shadow-sm" style={{ backgroundColor: "#dcf8c6" }}>
						<p className="text-[0.8rem] leading-snug text-neutral-800">Oba! Sábado passo aí pra fazer o rancho do mês 🙌</p>
						<span className="mt-1.5 block text-right text-[0.58rem] text-neutral-500">09:31 ✓✓</span>
					</div>

					{/* etiqueta convertido */}
					<div
						className="mt-1 self-center rounded-full px-3 py-1 text-[0.6rem] font-black uppercase tracking-wide text-white shadow"
						style={{ backgroundColor: BRAND.green }}
					>
						Convertido · compra de R$ 214,90
					</div>
				</div>
			</div>
		</div>
	);
}

/* -------------------------------------------------------------------------- */
/*  6 · Investimento, caminho e fechamento                                     */
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
							"Hub de cadastro via QR Code personalizado",
							"Integração da nossa API com o ERPFlex",
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
						Cada etapa usa a mesma base de clientes construída no hub — nada se refaz, tudo se soma. Os pilares 03 e 04 desta proposta mostram as etapas 2
						e 3 já funcionando.
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
							A operação já roda no ERPFlex. O que falta é a camada de relacionamento — e ela começa com um QR Code que qualquer cliente pode escanear
							hoje. Chame a gente no WhatsApp e colocamos o hub de pé.
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
			<SheetFooter index="06 / 06" label="Investimento" />
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
