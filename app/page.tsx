"use client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AppSubscriptionPlans } from "@/config";
import { formatToMoney } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import LogoCompleteHorizontalColorful from "@/utils/svgs/logos/RECOMPRA - COMPLETE - HORIZONTAL- COLORFUL.svg";
import {
	ArrowRight,
	BadgeDollarSign,
	BadgePercent,
	BarChart3,
	Bot,
	Box,
	Brain,
	CheckCircle2,
	ChevronDown,
	CirclePlus,
	Clock,
	Crown,
	FileSpreadsheet,
	Grid3X3,
	Handshake,
	Lightbulb,
	Lock,
	MessageCircle,
	MessageSquare,
	Package,
	PieChart,
	Search,
	Shield,
	ShoppingCart,
	Smartphone,
	Sparkles,
	TrendingUp,
	UserX,
	Users,
	Wallet,
	Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

// Mock data for the analytics section
const MOCK_SELLERS = [
	{ rank: 1, name: "Ana Silva", revenue: "R$ 45.200", sales: 120, ticket: "R$ 376", avatar: null, growth: "+12%" },
	{ rank: 2, name: "Roberto Santos", revenue: "R$ 38.900", sales: 98, ticket: "R$ 396", avatar: null, growth: "+8%" },
	{ rank: 3, name: "Carla Dias", revenue: "R$ 32.100", sales: 85, ticket: "R$ 377", avatar: null, growth: "+15%" },
	{ rank: 4, name: "Marcos Lima", revenue: "R$ 28.500", sales: 72, ticket: "R$ 395", avatar: null, growth: "+5%" },
	{ rank: 5, name: "Juliana Costa", revenue: "R$ 25.400", sales: 65, ticket: "R$ 390", avatar: null, growth: "+3%" },
];

const MOCK_PARTNERS = [
	{ rank: 1, name: "Influenciador A", revenue: "R$ 12.500", sales: 45, ticket: "R$ 277", avatar: null, growth: "+22%" },
	{ rank: 2, name: "Blog Parceiro", revenue: "R$ 8.900", sales: 32, ticket: "R$ 278", avatar: null, growth: "+10%" },
	{ rank: 3, name: "Afiliado Top", revenue: "R$ 5.100", sales: 18, ticket: "R$ 283", avatar: null, growth: "+5%" },
	{ rank: 4, name: "Canal Tech", revenue: "R$ 4.200", sales: 15, ticket: "R$ 280", avatar: null, growth: "+4%" },
	{ rank: 5, name: "Review Site", revenue: "R$ 3.800", sales: 12, ticket: "R$ 316", avatar: null, growth: "+2%" },
];

const MOCK_PRODUCTS = [
	{ rank: 1, name: "Kit Skin Care Premium", revenue: "R$ 15.200", sales: 150, ticket: "R$ 101", avatar: null, growth: "+18%" },
	{ rank: 2, name: "Serum Vitamina C", revenue: "R$ 12.800", sales: 128, ticket: "R$ 100", avatar: null, growth: "+12%" },
	{ rank: 3, name: "Hidratante Facial", revenue: "R$ 9.500", sales: 95, ticket: "R$ 100", avatar: null, growth: "+7%" },
	{ rank: 4, name: "Protetor Solar FPS 70", revenue: "R$ 8.200", sales: 82, ticket: "R$ 100", avatar: null, growth: "+9%" },
	{ rank: 5, name: "Tônico Renovador", revenue: "R$ 6.100", sales: 61, ticket: "R$ 100", avatar: null, growth: "+5%" },
];

// Problem cards data
const PROBLEM_CARDS = [
	{
		icon: UserX,
		title: "Cliente comprou uma vez e nunca mais voltou",
		description: "Você sabe que ele existe, mas não tem como trazê-lo de volta de forma automática.",
	},
	{
		icon: Clock,
		title: "Horas perdidas mandando mensagem por mensagem",
		description: "Copiar, colar, enviar. Repetir 50 vezes. E ainda assim esquece de alguém.",
	},
	{
		icon: FileSpreadsheet,
		title: "Dados espalhados em 5 planilhas diferentes",
		description: "Vendas aqui, clientes ali, cashback em outro lugar. Impossível ter visão do todo.",
	},
];

// Benefits data for "Por que RecompraCRM?" section
const BENEFITS = [
	{
		icon: Zap,
		title: "Comece em minutos",
		description: "Sem integração obrigatória. Cadastre sua primeira venda hoje.",
	},
	{
		icon: Smartphone,
		title: "Tablet no balcão",
		description: "Interface de Ponto de Interação inclusa. Cliente vê o saldo na hora.",
	},
	{
		icon: MessageCircle,
		title: "WhatsApp automático",
		description: "Campanhas de reativação que rodam sozinhas.",
	},
	{
		icon: Brain,
		title: "IA que sugere ações",
		description: "Receba dicas baseadas nos seus dados. Não em achismo.",
	},
	{
		icon: BarChart3,
		title: "Dashboard completo",
		description: "Vendas, produtos, vendedores. Tudo em uma tela.",
	},
	{
		icon: Shield,
		title: "Sem surpresas",
		description: "Preço fixo mensal. Cancele quando quiser.",
	},
];

// FAQ data
const FAQ_ITEMS = [
	{
		question: "Preciso de integração com meu sistema?",
		answer:
			"Não. O RecompraCRM funciona de forma independente. Você pode começar hoje mesmo usando nosso Ponto de Interação (tablet no balcão). Se quiser, integramos com seu ERP depois — mas não é obrigatório.",
	},
	{
		question: "Quanto tempo leva pra ver resultado?",
		answer:
			"Depende do seu volume. Lojas que cadastram vendas diariamente costumam ver os primeiros clientes reativados em 2-3 semanas. O cashback funciona como gatilho: o cliente volta pra usar o saldo.",
	},
	{
		question: "E se eu já tiver um programa de cashback?",
		answer:
			"Você pode migrar ou rodar os dois em paralelo. O diferencial do RecompraCRM é a automação: identificamos inativos e enviamos cashback pelo WhatsApp automaticamente. Não é só um sistema de pontos.",
	},
	{
		question: "Funciona pra qual tipo de loja?",
		answer:
			"Varejo físico com vendas recorrentes: cosméticos, pet shops, materiais de construção, farmácias, óticas. Se você tem clientes que deveriam voltar mas não voltam, o RecompraCRM ajuda.",
	},
	{
		question: "E se eu não gostar?",
		answer: "15 dias grátis para testar. Sem cartão de crédito. Se não fizer sentido pro seu negócio, você cancela sem burocracia.",
	},
];

// RFM Segment tooltips
const RFM_TOOLTIPS = {
	campeoes: "Compram frequentemente, gastam muito e compraram recentemente. Seus melhores clientes.",
	leais: "Compram com regularidade e têm bom ticket médio. Merecem atenção especial.",
	em_risco: "Já foram bons clientes, mas estão ficando inativos. Hora de reativar.",
	novos: "Compraram recentemente pela primeira vez. Momento de criar relacionamento.",
};

export default function LandingPage() {
	const [rankingTab, setRankingTab] = useState<"sellers" | "partners" | "products">("sellers");
	const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">("monthly");
	const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

	const currentRankingData = rankingTab === "sellers" ? MOCK_SELLERS : rankingTab === "partners" ? MOCK_PARTNERS : MOCK_PRODUCTS;

	const getRankingLabel = () => {
		switch (rankingTab) {
			case "sellers":
				return "Top Vendedores";
			case "partners":
				return "Top Parceiros";
			case "products":
				return "Top Produtos";
		}
	};

	return (
		<div className="min-h-screen bg-black text-white antialiased">
			{/* Navbar */}
			<header className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/5 transition-all duration-300">
				<div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
					<div className="flex items-center justify-between h-20">
						{/* Logo */}
						<Link href="/" className="flex items-center gap-2 group">
							<div className="relative w-24 h-12">
								<Image src={LogoCompleteHorizontalColorful} alt="RecompraCRM" fill className="object-contain" priority />
							</div>
						</Link>

						{/* Menu Center */}
						<nav className="hidden lg:flex items-center gap-8">
							<Link href="#cashback" className="text-sm font-medium text-white/70 hover:text-white transition-colors">
								Cashback
							</Link>
							<Link href="#campanhas" className="text-sm font-medium text-white/70 hover:text-white transition-colors">
								Automação
							</Link>
							<Link href="#analytics" className="text-sm font-medium text-white/70 hover:text-white transition-colors">
								Analytics
							</Link>
							<Link href="#pricing" className="text-sm font-medium text-white/70 hover:text-white transition-colors">
								Planos
							</Link>
						</nav>

						{/* Right Actions */}
						<div className="flex items-center gap-4">
							<Link href="/auth/signin" className="text-sm font-medium text-white/70 hover:text-white transition-colors hidden sm:block">
								Entrar
							</Link>
							<Link href="/auth/signin" target="_blank" rel="noopener noreferrer">
								<Button
									size="sm"
									className="bg-[#24549C] hover:bg-[#1e4682] text-white rounded-full font-medium px-6 h-10 shadow-2xl shadow-blue-600/30 hover:shadow-blue-600/40 transition-all hover:-translate-y-0.5"
								>
									Ver como funciona (15 min)
								</Button>
							</Link>
						</div>
					</div>
				</div>
			</header>

			{/* Hero Section */}
			<section className="relative min-h-[85vh] flex items-center justify-center py-20 overflow-hidden">
				{/* Background Elements */}
				<div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none">
					{/* Main Glow - removed animate-pulse-slow */}
					<div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[#24549C]/20 rounded-full blur-[120px] opacity-40 mix-blend-screen" />
					{/* Secondary Accent */}
					<div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[100px] opacity-30 mix-blend-screen" />
				</div>
				<div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
					<div className="text-center max-w-5xl mx-auto">
						{/* Badge */}
						<div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-10 backdrop-blur-md hover:bg-white/10 transition-colors cursor-default group">
							<span className="relative flex h-2.5 w-2.5">
								<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FFD600] opacity-75" />
								<span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#FFD600]" />
							</span>
							<span className="text-sm font-medium text-white/90 tracking-wide">Cashback + WhatsApp + BI em uma só plataforma</span>
						</div>

						{/* Headline */}
						<h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-white mb-8 leading-[1.05]">
							Traga de volta o cliente <br className="hidden md:block" />
							<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF4D00] via-[#FF8700] to-[#E7000B] drop-shadow-sm">que sumiu.</span>
						</h1>

						{/* Subheadline */}
						<p className="text-lg md:text-2xl text-white/60 mb-12 max-w-3xl mx-auto leading-relaxed font-light">
							Identifique quem parou de comprar, envie <span className="text-white font-medium">cashback automático</span> pelo WhatsApp e acompanhe tudo em
							um dashboard. <span className="text-white/80">Sem planilhas, sem trabalho manual.</span>
						</p>

						{/* CTA Buttons */}
						<div className="flex flex-col sm:flex-row items-center justify-center gap-5">
							<a
								href="https://wa.me/553499480791?text=Gostaria%20de%20ver%20como%20o%20RecompraCRM%20funciona!"
								target="_blank"
								rel="noopener noreferrer"
								className="w-full sm:w-auto"
							>
								<Button className="w-full sm:w-auto bg-[#24549C] hover:bg-[#1e4682] text-white rounded-full px-10 h-14 text-lg font-bold shadow-2xl shadow-blue-600/30 hover:shadow-blue-600/50 hover:-translate-y-1 transition-all duration-300">
									Ver como funciona (15 min) <ArrowRight className="w-5 h-5 ml-2" />
								</Button>
							</a>
							<Link href="/auth/signin" className="w-full sm:w-auto">
								<Button
									variant="outline"
									className="w-full sm:w-auto border-white/10 bg-white/5 hover:bg-white/10 text-white rounded-full px-10 h-14 text-lg font-semibold hover:border-white/20 hover:text-white transition-all duration-300"
								>
									Acessar plataforma
								</Button>
							</Link>
						</div>
					</div>
				</div>
			</section>

			{/* Problem Section (NEW) */}
			<section className="py-20 bg-zinc-950 border-y border-white/5">
				<div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
					<div className="text-center mb-16">
						<h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Reconhece esse cenário?</h2>
						<p className="text-lg text-white/60">Problemas comuns no varejo que custam dinheiro todo mês.</p>
					</div>

					<div className="grid md:grid-cols-3 gap-6">
						{PROBLEM_CARDS.map((problem, idx) => (
							<div key={idx.toString()} className="bg-zinc-900/50 border border-white/5 rounded-xl p-6 hover:border-red-500/30 transition-colors group">
								<div className="w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center mb-4 group-hover:bg-red-500/20 transition-colors">
									<problem.icon className="w-6 h-6 text-red-400" />
								</div>
								<h3 className="font-semibold text-white mb-2 text-lg">{problem.title}</h3>
								<p className="text-sm text-white/60 leading-relaxed">{problem.description}</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Feature: Cashback / POI */}
			<section id="cashback" className="py-20 bg-black relative overflow-hidden">
				<div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#24549C]/50 to-transparent" />
				<div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
					<div className="grid lg:grid-cols-2 gap-16 items-center">
						<div>
							<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-6 backdrop-blur-sm">
								<ShoppingCart className="w-4 h-4" />
								Programa de Cashback
							</div>
							<h2 className="text-3xl md:text-5xl font-bold mb-6 text-white">
								Cashback que você controla. <br />
								<span className="text-white/50">Até o centavo.</span>
							</h2>
							<p className="text-lg text-white/60 mb-8 leading-relaxed">
								Configure quanto devolver (2%, 5%, 10%), defina validade (30, 60, 90 dias) e acompanhe em tempo real quem resgatou. Tudo em uma interface
								simples.
							</p>

							<div className="grid sm:grid-cols-2 gap-4 mb-8">
								<div className="p-4 rounded-xl bg-zinc-900/50 border border-white/5 hover:border-[#24549C]/40 transition-colors">
									<Search className="w-5 h-5 text-[#24549C] mb-2" />
									<h4 className="font-semibold text-white">Tablet no balcão</h4>
									<p className="text-sm text-white/50">Cliente vê o saldo na hora da compra. Interface Kiosk inclusa.</p>
								</div>
								<div className="p-4 rounded-xl bg-zinc-900/50 border border-white/5 hover:border-[#24549C]/40 transition-colors">
									<Box className="w-5 h-5 text-[#24549C] mb-2" />
									<h4 className="font-semibold text-white">Resgate instantâneo</h4>
									<p className="text-sm text-white/50">Entrada de venda em poucos cliques. Resgate com CPF na hora.</p>
								</div>
							</div>
						</div>

						<div className="relative">
							{/* Mock UI POS/POI */}
							<div className="bg-black border border-white/10 rounded-2xl p-4 shadow-2xl flex flex-col gap-4 aspect-video relative overflow-hidden group">
								<div className="absolute inset-x-0 top-0 h-10 bg-zinc-900 border-b border-white/5 flex items-center px-4 gap-2">
									<div className="w-2 h-2 rounded-full bg-red-500/50" />
									<div className="w-2 h-2 rounded-full bg-yellow-500/50" />
									<div className="w-2 h-2 rounded-full bg-green-500/50" />
									<div className="ml-4 h-4 w-32 bg-white/10 rounded-full" />
								</div>

								<div className="mt-8 flex gap-4 h-full">
									{/* Sidebar Groups */}
									<div className="w-1/4 h-full space-y-2 hidden sm:block">
										<div className="h-8 bg-white/5 rounded w-full" />
										<div className="h-8 bg-[#24549C]/20 border border-[#24549C]/30 rounded w-full" />
										<div className="h-8 bg-white/5 rounded w-full" />
										<div className="h-8 bg-white/5 rounded w-full" />
									</div>

									{/* Grid */}
									<div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-2">
										{[1, 2, 3, 4, 5, 6].map((i) => (
											<div
												key={i}
												className="aspect-square bg-zinc-900 rounded-lg border border-white/5 p-2 flex flex-col justify-between hover:border-[#24549C]/50 transition-colors"
											>
												<div className="w-full aspect-video bg-white/5 rounded" />
												<div className="h-2 w-2/3 bg-white/10 rounded" />
											</div>
										))}
									</div>

									{/* Cart */}
									<div className="w-1/3 h-full bg-zinc-900 rounded-lg border border-white/5 p-3 flex flex-col">
										<div className="flex-1 space-y-2">
											<div className="h-10 bg-white/5 rounded flex items-center p-2 gap-2">
												<div className="w-6 h-6 bg-white/10 rounded" />
												<div className="flex-1 h-2 bg-white/10 rounded" />
											</div>
											<div className="h-10 bg-white/5 rounded flex items-center p-2 gap-2">
												<div className="w-6 h-6 bg-white/10 rounded" />
												<div className="flex-1 h-2 bg-white/10 rounded" />
											</div>
										</div>
										<div className="mt-auto pt-2 border-t border-white/5">
											<div className="flex justify-between mb-2">
												<div className="h-2 w-10 bg-white/20 rounded" />
												<div className="h-2 w-10 bg-white/20 rounded" />
											</div>
											<div className="h-8 bg-green-600 rounded w-full" />
										</div>
									</div>
								</div>
							</div>

							{/* Floating Badge - removed animate-bounce */}
							<div className="absolute -right-4 top-10 bg-zinc-900 border border-white/10 p-3 rounded-lg shadow-xl flex items-center gap-3 backdrop-blur-sm">
								<div className="bg-green-500/20 p-2 rounded-full">
									<Zap className="w-4 h-4 text-green-500" />
								</div>
								<div>
									<div className="text-xs text-white/50">Cashback Gerado</div>
									<div className="text-sm font-bold text-white">R$ 15,00</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Feature: Campanhas */}
			<section id="campanhas" className="py-20 bg-zinc-950 border-y border-white/5 relative overflow-hidden">
				<div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
					<div className="grid lg:grid-cols-2 gap-16 items-center">
						<div className="relative order-1">
							<div className="relative z-10 w-full max-w-md mx-auto">
								{/* Automation Flow Visual */}
								<div className="flex flex-col gap-4">
									{/* Trigger Card */}
									<div className="bg-zinc-900/80 border border-white/10 p-4 rounded-xl backdrop-blur-sm transform translate-x-4">
										<div className="flex items-center justify-between mb-2">
											<div className="text-xs font-bold text-blue-400 uppercase tracking-wider">Gatilho: Cliente Inativo (30 dias)</div>
											<Zap className="w-4 h-4 text-blue-400" />
										</div>
										<div className="text-sm text-white/60">Cliente Maria não compra há 30 dias</div>
									</div>

									{/* Arrow */}
									<div className="flex justify-center -my-2 z-0">
										<div className="h-8 w-px bg-gradient-to-b from-white/20 to-white/0" />
									</div>

									{/* Action Card */}
									<div className="bg-[#24549C] p-6 rounded-2xl shadow-2xl transform -rotate-1 hover:rotate-0 transition-transform duration-300">
										<div className="flex items-center gap-3 mb-4">
											<div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
												<MessageCircle className="w-4 h-4 text-white" />
											</div>
											<div className="text-sm font-medium text-white/80">Mensagem Enviada</div>
										</div>
										<p className="text-white text-lg font-medium leading-snug">
											"Oi Maria! 🌟 Sentimos sua falta. Estou liberando <span className="text-yellow-300 font-bold">R$ 25,00</span> de cashback extra para você
											voltar!"
										</p>
									</div>
								</div>
							</div>
							<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-blue-500/10 blur-3xl -z-10 rounded-full" />
						</div>

						<div className="order-2">
							<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-6 backdrop-blur-sm">
								<Zap className="w-4 h-4" />
								Campanhas de Reativação
							</div>
							<h2 className="text-3xl md:text-5xl font-bold mb-6 text-white">
								Cliente sumiu? <br />
								<span className="text-white/50">O sistema traz de volta.</span>
							</h2>
							<p className="text-lg text-white/60 mb-8 leading-relaxed">
								Defina: "cliente inativo há 30 dias recebe R$ 15 de cashback + mensagem no WhatsApp". O resto é automático. Você configura uma vez e funciona
								para sempre.
							</p>

							<div className="grid gap-6 mb-8">
								<div className="p-4 rounded-xl bg-zinc-900/50 border border-white/5 hover:border-blue-500/40 transition-colors">
									<h4 className="font-semibold text-white mb-2 flex items-center gap-2">
										<MessageSquare className="w-4 h-4 text-blue-400" /> Reativação Automática
									</h4>
									<p className="text-sm text-white/60">O sistema identifica quem parou de comprar e dispara cashback + mensagem. Sem você precisar lembrar.</p>
								</div>
								<div className="p-4 rounded-xl bg-zinc-900/50 border border-white/5 hover:border-blue-500/40 transition-colors">
									<h4 className="font-semibold text-white mb-2 flex items-center gap-2">
										<Crown className="w-4 h-4 text-yellow-400" /> Datas Comemorativas
									</h4>
									<p className="text-sm text-white/60">Aniversário do cliente, Black Friday, datas especiais. Configure uma vez, roda todo ano.</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Feature: Whatsapp Hub */}
			<section id="whatsapp-hub" className="py-20 bg-black relative overflow-hidden">
				<div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
					<div className="grid lg:grid-cols-2 gap-16 items-center">
						<div className="order-2 lg:order-1">
							<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium mb-6 backdrop-blur-sm">
								<Bot className="w-4 h-4" />
								Whatsapp Hub (Beta)
							</div>
							<h2 className="text-3xl md:text-5xl font-bold mb-6 text-white">
								IA responde as dúvidas. <br />
								<span className="text-white/50">Você fecha a venda.</span>
							</h2>
							<div className="mb-6">
								<span className="inline-flex items-center rounded-md bg-purple-400/10 px-2 py-1 text-xs font-medium text-purple-400 ring-1 ring-inset ring-purple-400/20">
									Early Access
								</span>
							</div>
							<p className="text-lg text-white/60 mb-8 leading-relaxed">
								O cliente pergunta "qual a voltagem?" às 23h. A IA responde. Quando ele diz "quero comprar", você recebe um alerta com todo o histórico. Só
								entra quando vale a pena.
							</p>
							<div className="space-y-4 mb-8">
								<div className="flex items-start gap-4">
									<div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0 border border-green-500/20">
										<MessageCircle className="w-5 h-5 text-green-500" />
									</div>
									<div>
										<h4 className="text-white font-semibold mb-1">Atendimento 24/7</h4>
										<p className="text-sm text-white/60">A IA responde perguntas básicas (voltagem, medidas, disponibilidade) mesmo de madrugada.</p>
									</div>
								</div>
								<div className="flex items-start gap-4">
									<div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0 border border-green-500/20">
										<Bot className="w-5 h-5 text-green-500" />
									</div>
									<div>
										<h4 className="text-white font-semibold mb-1">Transferência Inteligente</h4>
										<p className="text-sm text-white/60">Detectou interesse em fechar? A IA alerta seu vendedor e transfere com todo o contexto.</p>
									</div>
								</div>
							</div>
						</div>

						<div className="order-1 lg:order-2 relative">
							<div className="relative z-10 w-full max-w-md mx-auto">
								<div className="bg-zinc-900 border border-white/10 rounded-3xl p-6 shadow-2xl">
									<div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
										<div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
											<Bot className="w-5 h-5 text-green-500" />
										</div>
										<div>
											<div className="font-semibold text-white">Assistente Virtual</div>
											<div className="text-xs text-white/40">Triagem Automática</div>
										</div>
									</div>
									<div className="space-y-4 font-sans text-sm">
										{/* Customer Message */}
										<div className="flex justify-end">
											<div className="bg-[#24549C] text-white py-2 px-4 rounded-2xl rounded-tr-sm max-w-[85%]">Qual a voltagem do ventilador?</div>
										</div>

										{/* Bot Response */}
										<div className="flex justify-start">
											<div className="bg-zinc-800 text-white/90 py-2 px-4 rounded-2xl rounded-tl-sm max-w-[85%] border border-white/5">
												O Ventilador Turbo está disponível em 110V e 220V! Qual você precisa? 🌀
											</div>
										</div>

										{/* Customer Message */}
										<div className="flex justify-end">
											<div className="bg-[#24549C] text-white py-2 px-4 rounded-2xl rounded-tr-sm max-w-[85%]">220V. Quero comprar.</div>
										</div>

										{/* Bot Transfer */}
										<div className="flex justify-start">
											<div className="bg-zinc-800 text-white/90 py-2 px-4 rounded-2xl rounded-tl-sm max-w-[85%] border border-white/5">
												Perfeito! Vou chamar um de nossos atendentes para finalizar sua compra. 🎯
											</div>
										</div>

										{/* System Message */}
										<div className="flex justify-center my-4">
											<span className="text-xs text-green-400 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
												⚡ Transferido para: Carlos (Vendas)
											</span>
										</div>
									</div>
								</div>
							</div>
							<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-green-500/10 blur-3xl -z-10 rounded-full" />
						</div>
					</div>
				</div>
			</section>

			{/* Analytics Deep Dive Section (NEW) */}
			<section className="py-24 bg-zinc-950 border-y border-white/5 relative overflow-hidden">
				<div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
					<div className="text-center mb-16 max-w-3xl mx-auto">
						<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm font-medium mb-6 backdrop-blur-sm">
							<BarChart3 className="w-4 h-4" />
							Analytics em Profundidade
						</div>
						<h2 className="text-3xl md:text-5xl font-bold mb-6 text-white">
							Decisões baseadas em dados. <br />
							<span className="text-white/50">Não em achismo.</span>
						</h2>
						<p className="text-lg text-white/60">Pare de abrir 5 planilhas. Um dashboard mostra tudo.</p>
					</div>

					{/* Metrics Grid */}
					<div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-12">
						<div className="bg-zinc-900/50 border border-white/5 rounded-xl p-6 hover:border-purple-500/40 transition-colors">
							<div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4">
								<TrendingUp className="w-5 h-5 text-blue-400" />
							</div>
							<h3 className="font-semibold text-white mb-2">Vendas em Tempo Real</h3>
							<p className="text-sm text-white/60">Acompanhe o faturamento do dia sem esperar o fechamento do caixa.</p>
						</div>
						<div className="bg-zinc-900/50 border border-white/5 rounded-xl p-6 hover:border-purple-500/40 transition-colors">
							<div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center mb-4">
								<BarChart3 className="w-5 h-5 text-yellow-400" />
							</div>
							<h3 className="font-semibold text-white mb-2">Ticket Médio por Período</h3>
							<p className="text-sm text-white/60">Detecte quedas antes que virem problema. Compare semanas e meses.</p>
						</div>
						<div className="bg-zinc-900/50 border border-white/5 rounded-xl p-6 hover:border-purple-500/40 transition-colors">
							<div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center mb-4">
								<PieChart className="w-5 h-5 text-green-400" />
							</div>
							<h3 className="font-semibold text-white mb-2">Curva ABC de Produtos</h3>
							<p className="text-sm text-white/60">Saiba quais 20% dos produtos geram 80% do faturamento.</p>
						</div>
						<div className="bg-zinc-900/50 border border-white/5 rounded-xl p-6 hover:border-purple-500/40 transition-colors">
							<div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center mb-4">
								<Users className="w-5 h-5 text-purple-400" />
							</div>
							<h3 className="font-semibold text-white mb-2">Performance da Equipe</h3>
							<p className="text-sm text-white/60">Veja quem bateu a meta e quem precisa de apoio.</p>
						</div>
					</div>

					{/* Impact Statement */}
					<div className="max-w-2xl mx-auto">
						<div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-white/10 rounded-2xl p-8 text-center">
							<p className="text-lg text-white/80 font-medium">
								Todas as informações que você precisa para decidir rápido. <span className="text-white">Em uma tela só.</span>
							</p>
						</div>
					</div>
				</div>
			</section>

			{/* Feature: BI - RFM */}
			<section id="bi" className="py-20 bg-black border-y border-white/5">
				<div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
					<div className="grid lg:grid-cols-2 gap-16 items-center">
						<div className="relative">
							{/* Mock UI RFM */}
							<div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 shadow-2xl">
								<div className="flex items-center gap-4 mb-8">
									<div className="p-3 bg-zinc-800 rounded-lg border border-white/10">
										<Grid3X3 className="w-6 h-6 text-[#FFB900]" />
									</div>
									<div>
										<h4 className="font-bold text-white text-lg">Matriz RFM em Tempo Real</h4>
										<p className="text-sm text-white/40">Segmentação automática da sua base</p>
									</div>
								</div>
								<TooltipProvider>
									<div className="grid grid-cols-2 gap-3">
										<Tooltip>
											<TooltipTrigger asChild>
												<div className="bg-zinc-800/50 p-4 rounded-xl border border-white/5 text-center hover:border-[#FFB900]/50 transition-colors cursor-pointer group">
													<div className="text-2xl font-bold text-white mb-1 group-hover:text-[#FFB900]">128</div>
													<div className="text-xs font-semibold text-green-400 bg-green-400/10 py-1 px-2 rounded-full inline-block">CAMPEÕES</div>
												</div>
											</TooltipTrigger>
											<TooltipContent side="top" className="max-w-xs">
												<p>{RFM_TOOLTIPS.campeoes}</p>
											</TooltipContent>
										</Tooltip>
										<Tooltip>
											<TooltipTrigger asChild>
												<div className="bg-zinc-800/50 p-4 rounded-xl border border-white/5 text-center hover:border-[#FFB900]/50 transition-colors cursor-pointer group">
													<div className="text-2xl font-bold text-white mb-1 group-hover:text-[#FFB900]">450</div>
													<div className="text-xs font-semibold text-blue-400 bg-blue-400/10 py-1 px-2 rounded-full inline-block">LEAIS</div>
												</div>
											</TooltipTrigger>
											<TooltipContent side="top" className="max-w-xs">
												<p>{RFM_TOOLTIPS.leais}</p>
											</TooltipContent>
										</Tooltip>
										<Tooltip>
											<TooltipTrigger asChild>
												<div className="bg-zinc-800/50 p-4 rounded-xl border border-white/5 text-center hover:border-[#FFB900]/50 transition-colors cursor-pointer group">
													<div className="text-2xl font-bold text-white mb-1 group-hover:text-[#FFB900]">89</div>
													<div className="text-xs font-semibold text-yellow-400 bg-yellow-400/10 py-1 px-2 rounded-full inline-block">EM RISCO</div>
												</div>
											</TooltipTrigger>
											<TooltipContent side="top" className="max-w-xs">
												<p>{RFM_TOOLTIPS.em_risco}</p>
											</TooltipContent>
										</Tooltip>
										<Tooltip>
											<TooltipTrigger asChild>
												<div className="bg-zinc-800/50 p-4 rounded-xl border border-white/5 text-center hover:border-[#FFB900]/50 transition-colors cursor-pointer group">
													<div className="text-2xl font-bold text-white mb-1 group-hover:text-[#FFB900]">312</div>
													<div className="text-xs font-semibold text-purple-400 bg-purple-400/10 py-1 px-2 rounded-full inline-block">NOVOS</div>
												</div>
											</TooltipTrigger>
											<TooltipContent side="top" className="max-w-xs">
												<p>{RFM_TOOLTIPS.novos}</p>
											</TooltipContent>
										</Tooltip>
									</div>
								</TooltipProvider>
								<div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between">
									<div className="flex items-center gap-2 text-sm text-white/60">
										<Zap className="w-4 h-4 text-[#FFB900]" />
										<span>Clique em um segmento para criar campanha</span>
									</div>
									<ArrowRight className="w-4 h-4 text-white/40" />
								</div>
							</div>
						</div>

						<div>
							<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFB900]/10 border border-[#FFB900]/20 text-[#FFB900] text-sm font-medium mb-6 backdrop-blur-sm">
								<BadgePercent className="w-4 h-4" />
								Business Intelligence
							</div>
							<h2 className="text-3xl md:text-5xl font-bold mb-6 text-white">
								Saiba exatamente quem <br />
								<span className="text-white/50">merece seu tempo.</span>
							</h2>
							<p className="text-lg text-white/60 mb-8 leading-relaxed">
								A Matriz RFM classifica sua base automaticamente. Você vê quem são seus campeões (cuide bem deles), quem está em risco (hora de reativar) e
								quem é novo (crie relacionamento).
							</p>
							<div className="grid sm:grid-cols-2 gap-6 mb-8">
								<div className="p-4 rounded-xl bg-zinc-900/50 border border-white/5">
									<h4 className="font-semibold text-white mb-2 flex items-center gap-2">
										<Grid3X3 className="w-4 h-4 text-[#FFB900]" /> Segmentação Automática
									</h4>
									<p className="text-sm text-white/60">Sem fórmulas. Sem planilhas. A análise roda sozinha.</p>
								</div>
								<div className="p-4 rounded-xl bg-zinc-900/50 border border-white/5">
									<h4 className="font-semibold text-white mb-2 flex items-center gap-2">
										<Wallet className="w-4 h-4 text-[#FFB900]" /> Ação com 1 Clique
									</h4>
									<p className="text-sm text-white/60">Viu 89 clientes em risco? Crie uma campanha direto da tela.</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Feature: AI-Hints */}
			<section className="py-24 bg-zinc-950 border-t border-white/5 relative overflow-hidden">
				<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/20 via-zinc-950/0 to-zinc-950/0" />

				<div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
					<div className="text-center mb-16 max-w-3xl mx-auto">
						<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm font-medium mb-6 backdrop-blur-sm">
							<Lightbulb className="w-4 h-4" />
							Insights Proativos
						</div>
						<h2 className="text-3xl md:text-5xl font-bold mb-6 text-white">
							A IA avisa. Você age. <br />
							<span className="text-white/50">O caixa sente.</span>
						</h2>
						<p className="text-lg text-white/60">
							Receba alertas práticos baseados nos seus dados. Não perca tempo analisando relatórios: a informação chega pronta para agir.
						</p>
					</div>

					<div className="relative max-w-4xl mx-auto">
						{/* Background Glow */}
						<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-blue-500/5 blur-3xl rounded-full -z-10" />

						{/* Hints Grid */}
						<div className="grid md:grid-cols-2 gap-6">
							{/* Hint 1: Product Trend */}
							<div className="bg-zinc-900/80 backdrop-blur-md border-l-4 border-l-red-500 border-y border-r border-[#ffffff1a] p-6 rounded-r-xl shadow-lg transform hover:-translate-y-1 transition-transform duration-300">
								<div className="flex items-start gap-4">
									<div className="p-3 rounded-full bg-red-500/10">
										<TrendingUp className="w-6 h-6 text-red-500 rotate-180" />
									</div>
									<div>
										<h4 className="font-bold text-white mb-1">Queda de Vendas</h4>
										<p className="text-sm text-white/70 leading-relaxed mb-3">
											O produto <strong className="text-white">Shampoo X</strong> está com vendas <span className="text-red-400">40% abaixo</span> da média
											histórica nesta semana.
										</p>
										<div className="bg-red-500/10 rounded-lg p-2 border border-red-500/20">
											<p className="text-xs text-red-300">
												<strong>Ação sugerida:</strong> Verificar estoque e considerar promoção relâmpago.
											</p>
										</div>
									</div>
								</div>
							</div>

							{/* Hint 2: Association Analysis */}
							<div className="bg-zinc-900/80 backdrop-blur-md border-l-4 border-l-yellow-500 border-y border-r border-[#ffffff1a] p-6 rounded-r-xl shadow-lg transform hover:-translate-y-1 transition-transform duration-300 md:translate-y-8">
								<div className="flex items-start gap-4">
									<div className="p-3 rounded-full bg-yellow-500/10">
										<Lightbulb className="w-6 h-6 text-yellow-500" />
									</div>
									<div>
										<h4 className="font-bold text-white mb-1">Padrão de Compra</h4>
										<p className="text-sm text-white/70 leading-relaxed mb-3">
											85% dos clientes que levam <strong className="text-white">Condicionador Y</strong> acabam levando a
											<strong className="text-white"> Máscara Z</strong> em até 7 dias.
										</p>
										<div className="bg-yellow-500/10 rounded-lg p-2 border border-yellow-500/20">
											<p className="text-xs text-yellow-300">
												<strong>Ação sugerida:</strong> Criar kit combo ou sugerir na venda do condicionador.
											</p>
										</div>
									</div>
								</div>
							</div>

							{/* Hint 3: Seller Performance */}
							<div className="bg-zinc-900/80 backdrop-blur-md border-l-4 border-l-purple-500 border-y border-r border-[#ffffff1a] p-6 rounded-r-xl shadow-lg transform hover:-translate-y-1 transition-transform duration-300">
								<div className="flex items-start gap-4">
									<div className="p-3 rounded-full bg-purple-500/10">
										<Users className="w-6 h-6 text-purple-500" />
									</div>
									<div>
										<h4 className="font-bold text-white mb-1">Performance de Equipe</h4>
										<p className="text-sm text-white/70 leading-relaxed mb-3">
											Vendedores <strong className="text-white">Ana e Carlos</strong> geralmente têm performance menor na 1ª quinzena.
										</p>
										<div className="bg-purple-500/10 rounded-lg p-2 border border-purple-500/20">
											<p className="text-xs text-purple-300">
												<strong>Ação sugerida:</strong> Criar mini-campanha de incentivo no início do mês.
											</p>
										</div>
									</div>
								</div>
							</div>

							{/* Hint 4: Campaign Suggestion */}
							<div className="bg-zinc-900/80 backdrop-blur-md border-l-4 border-l-blue-400 border-y border-r border-[#ffffff1a] p-6 rounded-r-xl shadow-lg transform hover:-translate-y-1 transition-transform duration-300 md:translate-y-8">
								<div className="flex items-start gap-4">
									<div className="p-3 rounded-full bg-blue-400/10">
										<Sparkles className="w-6 h-6 text-blue-400" />
									</div>
									<div>
										<h4 className="font-bold text-white mb-1">Reativação Urgente</h4>
										<p className="text-sm text-white/70 leading-relaxed mb-3">
											Seus clientes VIPs não compram há <strong className="text-white">45 dias</strong>. No seu nicho, o risco de churn aumenta após 50 dias.
										</p>
										<div className="bg-blue-400/10 rounded-lg p-2 border border-blue-400/20">
											<p className="text-xs text-blue-300">
												<strong>Ação sugerida:</strong> Enviar R$ 20 de cashback antes que virem inativos.
											</p>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Feature: BI - Performance */}
			<section id="analytics" className="py-20 bg-black overflow-hidden">
				<div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
					<div className="grid lg:grid-cols-2 gap-16 items-center">
						<div>
							<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-6 backdrop-blur-sm">
								<BarChart3 className="w-4 h-4" />
								Performance Comercial
							</div>
							<h2 className="text-3xl md:text-5xl font-bold mb-6 text-white">
								Quem vende mais? <br />
								<span className="text-white/50">A resposta na tela.</span>
							</h2>
							<p className="text-lg text-white/60 mb-8 leading-relaxed">
								Ranking atualizado em tempo real. Mostre na TV da loja e veja a competição saudável começar. Também funciona para parceiros e produtos.
							</p>
							<div className="flex flex-col gap-4">
								<div className="flex items-center gap-4 p-4 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5 cursor-default">
									<div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
										<Users className="w-6 h-6 text-blue-400" />
									</div>
									<div>
										<h4 className="font-semibold text-white">Gamificação Natural</h4>
										<p className="text-sm text-white/50">O ranking cria competição saudável. Sem você precisar cobrar.</p>
									</div>
								</div>
								<div className="flex items-center gap-4 p-4 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5 cursor-default">
									<div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
										<PieChart className="w-6 h-6 text-purple-400" />
									</div>
									<div>
										<h4 className="font-semibold text-white">Curva ABC de Produtos</h4>
										<p className="text-sm text-white/50">Saiba exatamente quais itens não podem faltar no estoque.</p>
									</div>
								</div>
							</div>
						</div>

						<div className="relative">
							{/* Mock UI Analytics */}
							<div className="bg-zinc-900 border border-white/10 rounded-2xl p-4 shadow-2xl flex flex-col gap-4">
								<div className="flex flex-wrap items-center justify-between gap-4">
									<h4 className="font-bold text-white">{getRankingLabel()}</h4>
									<div className="flex bg-zinc-800 rounded-lg p-1 gap-1">
										<TooltipProvider>
											<Tooltip>
												<TooltipTrigger asChild>
													<Button
														variant={rankingTab === "sellers" ? "default" : "ghost"}
														size="icon"
														className={cn(
															"h-8 w-8 rounded-md",
															rankingTab === "sellers" ? "bg-[#24549C] text-white" : "text-white/60 hover:text-white hover:bg-white/10",
														)}
														onClick={() => setRankingTab("sellers")}
													>
														<Users className="w-4 h-4" />
													</Button>
												</TooltipTrigger>
												<TooltipContent>
													<p>Vendedores</p>
												</TooltipContent>
											</Tooltip>
											<Tooltip>
												<TooltipTrigger asChild>
													<Button
														variant={rankingTab === "partners" ? "default" : "ghost"}
														size="icon"
														className={cn(
															"h-8 w-8 rounded-md",
															rankingTab === "partners" ? "bg-[#24549C] text-white" : "text-white/60 hover:text-white hover:bg-white/10",
														)}
														onClick={() => setRankingTab("partners")}
													>
														<Handshake className="w-4 h-4" />
													</Button>
												</TooltipTrigger>
												<TooltipContent>
													<p>Parceiros</p>
												</TooltipContent>
											</Tooltip>
											<Tooltip>
												<TooltipTrigger asChild>
													<Button
														variant={rankingTab === "products" ? "default" : "ghost"}
														size="icon"
														className={cn(
															"h-8 w-8 rounded-md",
															rankingTab === "products" ? "bg-[#24549C] text-white" : "text-white/60 hover:text-white hover:bg-white/10",
														)}
														onClick={() => setRankingTab("products")}
													>
														<Package className="w-4 h-4" />
													</Button>
												</TooltipTrigger>
												<TooltipContent>
													<p>Produtos</p>
												</TooltipContent>
											</Tooltip>
										</TooltipProvider>
									</div>
								</div>

								<div className="flex flex-col gap-2 max-h-[360px] overflow-auto scrollbar-none">
									{currentRankingData.map((item) => (
										<div
											key={item.rank}
											className={cn(
												"bg-black/40 border border-white/5 flex w-full flex-col sm:flex-row gap-2 rounded-xl px-3 py-3 items-center",
												item.rank === 1 && "border-yellow-500/20 bg-yellow-500/5",
												item.rank === 2 && "border-gray-400/20 bg-gray-400/5",
												item.rank === 3 && "border-orange-600/20 bg-orange-600/5",
											)}
										>
											<div className="w-full flex items-center justify-between gap-2 flex-wrap">
												<div className="flex items-center gap-3">
													{item.rank <= 3 ? (
														<Crown
															className={cn(
																"w-5 h-5 min-w-5 min-h-5",
																item.rank === 1 && "text-yellow-500",
																item.rank === 2 && "text-gray-400",
																item.rank === 3 && "text-orange-600",
															)}
														/>
													) : (
														<div className="w-6 h-6 min-w-6 min-h-6 rounded-full bg-white/10 flex items-center justify-center">
															<span className="text-xs font-bold text-white/60">{item.rank}</span>
														</div>
													)}
													<Avatar className="w-8 h-8 min-w-8 min-h-8 hidden lg:block border border-white/10">
														<AvatarFallback className="bg-zinc-800 text-xs text-white">{item.name.slice(0, 2).toUpperCase()}</AvatarFallback>
													</Avatar>
													<div className="flex items-start flex-col">
														<h1 className="text-sm font-bold tracking-tight text-white">{item.name}</h1>
													</div>
												</div>
												<div className="flex items-center gap-2">
													<div className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[0.65rem] font-bold bg-[#24549C]/10 text-[#24549C] border border-[#24549C]/20">
														<BadgeDollarSign className="w-3 min-w-3 h-3 min-h-3" />
														<p className="text-xs font-bold tracking-tight uppercase text-white">{item.revenue}</p>
													</div>
													{rankingTab !== "products" && (
														<div className="hidden sm:flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[0.65rem] font-bold bg-zinc-800/50 text-white/60 border border-white/5">
															<CirclePlus className="w-3 min-w-3 h-3 min-h-3" />
															<p className="text-xs font-bold tracking-tight uppercase">{item.sales}</p>
														</div>
													)}
												</div>
											</div>
										</div>
									))}
								</div>
							</div>
							<div className="absolute -inset-4 bg-[#24549C]/20 blur-3xl -z-10 rounded-full opacity-30" />
						</div>
					</div>
				</div>
			</section>

			{/* Why RecompraCRM Section (replaces testimonials) */}
			<section className="py-20 bg-zinc-950 border-y border-white/5">
				<div className="container mx-auto max-w-6xl px-4">
					<div className="text-center mb-16">
						<h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Por que escolher o RecompraCRM?</h2>
						<p className="text-lg text-white/60">Tudo que você precisa para aumentar recompra. Em uma só plataforma.</p>
					</div>
					<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
						{BENEFITS.map((benefit, idx) => (
							<div key={idx.toString()} className="bg-zinc-900/50 border border-white/5 rounded-xl p-6 hover:border-[#24549C]/40 transition-colors">
								<div className="w-10 h-10 rounded-lg bg-[#24549C]/10 flex items-center justify-center mb-4">
									<benefit.icon className="w-5 h-5 text-[#24549C]" />
								</div>
								<h3 className="font-semibold text-white mb-2">{benefit.title}</h3>
								<p className="text-sm text-white/60">{benefit.description}</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Feature: Pricing */}
			<section id="pricing" className="py-24 bg-black relative overflow-hidden border-t border-white/5">
				<div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
					<div className="text-center mb-16 max-w-3xl mx-auto">
						<span className="text-[#24549C] font-semibold text-sm tracking-wider uppercase mb-2 block">Planos e Preços</span>
						<h2 className="text-3xl md:text-5xl font-bold mb-6 text-white">
							Simples e <br />
							<span className="text-white/50">transparente.</span>
						</h2>
						<p className="text-lg text-white/60">Sem taxa de setup. Sem surpresas. Cancele quando quiser.</p>
					</div>

					{/* Billing Toggle */}
					<div className="flex justify-center mb-12">
						<div className="relative flex items-center bg-zinc-900 border border-white/10 p-1.5 rounded-full">
							<button
								type="button"
								onClick={() => setBillingInterval("monthly")}
								className={cn(
									"relative z-10 box-border w-32 rounded-full py-2.5 text-center text-sm font-bold transition-colors duration-300",
									billingInterval === "monthly" ? "text-white" : "text-white/40 hover:text-white/60",
								)}
							>
								MENSAL
							</button>
							<button
								type="button"
								onClick={() => setBillingInterval("yearly")}
								className={cn(
									"relative z-10 box-border w-32 rounded-full py-2.5 text-center text-sm font-bold transition-colors duration-300",
									billingInterval === "yearly" ? "text-white" : "text-white/40 hover:text-white/60",
								)}
							>
								ANUAL
							</button>
							<div
								className={cn(
									"absolute top-1.5 bottom-1.5 w-32 rounded-full bg-[#24549C] shadow-lg shadow-blue-500/20 transition-all duration-300 ease-in-out",
									billingInterval === "monthly" ? "left-1.5" : "left-[calc(100%-8.35rem)]",
								)}
							/>
						</div>
					</div>

					{/* Plans Grid */}
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-start max-w-7xl mx-auto">
						{(Object.keys(AppSubscriptionPlans) as Array<keyof typeof AppSubscriptionPlans>).map((planKey) => {
							const plan = AppSubscriptionPlans[planKey];
							const pricing = plan.pricing[billingInterval];
							const isPopular = planKey === "CRESCIMENTO";

							// Calculate discount
							const monthlyPrice = plan.pricing.monthly.price;
							const yearlyPrice = plan.pricing.yearly.price;
							const discountPercentage = Math.round(((monthlyPrice * 12 - yearlyPrice) / (monthlyPrice * 12)) * 100);

							return (
								<div
									key={planKey}
									className={cn(
										"relative flex flex-col rounded-3xl p-8 transition-all duration-300 border bg-zinc-900/40 backdrop-blur-md",
										isPopular ? "border-[#24549C] shadow-2xl shadow-blue-500/10 scale-105 z-10" : "border-white/5 hover:border-white/10 hover:bg-zinc-900/60",
									)}
								>
									{isPopular && (
										<div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#24549C] text-white px-4 py-1 rounded-full text-xs font-bold tracking-wide uppercase shadow-lg">
											Mais Popular
										</div>
									)}

									{/* Discount Badge for Yearly */}
									{billingInterval === "yearly" && (
										<div className="absolute top-4 right-4 bg-green-500/20 border border-green-500/30 text-green-400 px-2 py-1 rounded-md text-xs font-bold tracking-wide">
											-{discountPercentage}% OFF
										</div>
									)}

									{/* Header */}
									<div className="mb-6">
										<h3 className="font-bold text-2xl text-white mb-2">{plan.name}</h3>
										<p className="text-white/50 text-sm leading-relaxed min-h-[40px]">{plan.description}</p>
									</div>

									{/* Pricing */}
									<div className="mb-8 pb-8 border-b border-white/5">
										<div className="flex items-baseline gap-1">
											<span className="text-sm text-white/40 font-medium">R$</span>
											<span className="font-bold text-4xl text-white tracking-tight">{formatToMoney(pricing.price).split(",")[0].replace("R$", "")}</span>
											<span className="text-2xl font-bold text-white">,{formatToMoney(pricing.price).split(",")[1]}</span>
											<span className="text-white/40 font-medium ml-2 text-sm">{billingInterval === "monthly" ? "/mês" : "/ano"}</span>
										</div>
										{billingInterval === "yearly" && (
											<div className="mt-2 text-xs text-green-400 font-medium">Economize {formatToMoney(monthlyPrice * 12 - yearlyPrice)} por ano</div>
										)}
									</div>

									{/* Features */}
									<ul className="space-y-4 mb-8 flex-1">
										{plan.pricingTableFeatures.map((feature, idx) => (
											<li key={idx.toString()} className="flex items-start gap-3">
												<div className={cn("mt-0.5 rounded-full p-0.5", feature.checked ? "bg-green-500/20 text-green-500" : "bg-white/5 text-white/20")}>
													<CheckCircle2 className="h-3.5 w-3.5" />
												</div>
												<span className={cn("text-sm leading-snug", feature.checked ? "text-white/80" : "text-white/40 line-through")}>{feature.label}</span>
											</li>
										))}
									</ul>

									{/* CTA */}
									<Link href="/auth/signup" className="mt-auto">
										<Button
											className={cn(
												"w-full rounded-xl py-6 text-base font-bold transition-all duration-300",
												isPopular
													? "bg-[#24549C] hover:bg-[#1e4682] text-white shadow-2xl shadow-blue-600/30"
													: "bg-white/5 hover:bg-white/10 text-white border border-white/10",
											)}
										>
											Testar 15 dias grátis
										</Button>
									</Link>
								</div>
							);
						})}
					</div>

					{/* Guarantee Text */}
					<div className="mt-12 text-center">
						<p className="text-white/60 text-base font-medium">15 dias grátis para testar. Sem cartão de crédito.</p>
					</div>

					<div className="mt-8 text-center">
						<p className="text-white/40 text-sm">
							Precisa de um plano customizado para grandes redes?{" "}
							<a
								href="https://wa.me/553499480791"
								target="_blank"
								rel="noopener noreferrer"
								className="text-[#24549C] hover:text-blue-400 font-medium border-b border-[#24549C]/30 hover:border-blue-400 transition-colors"
							>
								Fale com nossos especialistas
							</a>
						</p>
					</div>
				</div>
			</section>

			{/* FAQ Section (NEW) */}
			<section className="py-20 bg-zinc-950 border-y border-white/5">
				<div className="container mx-auto max-w-3xl px-4">
					<div className="text-center mb-16">
						<h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Perguntas Frequentes</h2>
						<p className="text-lg text-white/60">Tire suas dúvidas antes de começar.</p>
					</div>

					<div className="space-y-4">
						{FAQ_ITEMS.map((faq, idx) => (
							<div key={idx.toString()} className="bg-zinc-900/50 border border-white/5 rounded-xl overflow-hidden">
								<button
									type="button"
									onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
									className="w-full flex items-center justify-between p-6 text-left hover:bg-white/5 transition-colors"
								>
									<span className="font-semibold text-white pr-4">{faq.question}</span>
									<ChevronDown className={cn("w-5 h-5 text-white/60 transition-transform flex-shrink-0", openFaqIndex === idx && "rotate-180")} />
								</button>
								{openFaqIndex === idx && (
									<div className="px-6 pb-6">
										<p className="text-white/60 leading-relaxed">{faq.answer}</p>
									</div>
								)}
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Final CTA Section (NEW) */}
			<section className="py-24 bg-gradient-to-b from-[#24549C]/20 to-black">
				<div className="container mx-auto max-w-4xl px-4 text-center">
					<h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Pronto pra trazer seus clientes de volta?</h2>
					<p className="text-xl text-white/60 mb-10">15 dias grátis. Sem cartão de crédito. Setup em menos de 1 hora.</p>
					<div className="flex flex-col sm:flex-row items-center justify-center gap-4">
						<Link href="/auth/signup">
							<Button className="bg-[#24549C] hover:bg-[#1e4682] text-white rounded-full px-10 h-14 text-lg font-bold shadow-2xl shadow-blue-600/30 hover:shadow-blue-600/50 hover:-translate-y-1 transition-all duration-300">
								Começar teste grátis <ArrowRight className="w-5 h-5 ml-2" />
							</Button>
						</Link>
						<a href="https://wa.me/553499480791?text=Gostaria%20de%20ver%20como%20o%20RecompraCRM%20funciona!" target="_blank" rel="noopener noreferrer">
							<Button
								variant="outline"
								className="border-white/10 bg-white/5 hover:bg-white/10 text-white rounded-full px-10 h-14 text-lg font-semibold hover:border-white/20 transition-all duration-300"
							>
								Falar com especialista
							</Button>
						</a>
					</div>
				</div>
			</section>

			{/* Footer */}
			<footer className="bg-black border-t border-white/10">
				<div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
					<div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
						<div>
							<h3 className="font-bold text-lg mb-3 text-white">RecompraCRM</h3>
							<p className="text-sm text-white/60">Plataforma de recompra para varejo físico.</p>
						</div>

						<div>
							<h4 className="font-semibold mb-3 text-white">Produtos</h4>
							<ul className="space-y-2 text-sm text-white/60">
								<li>Cashback e Pontos</li>
								<li>Campanhas Automáticas</li>
								<li>WhatsApp Hub</li>
								<li>Business Intelligence</li>
							</ul>
						</div>

						<div>
							<h4 className="font-semibold mb-3 text-white">Sobre</h4>
							<ul className="space-y-2 text-sm text-white/60">
								<li>
									<Link href="/legal" className="hover:text-white transition-colors">
										Termos e Políticas
									</Link>
								</li>
								<li>Privacidade</li>
								<li>Contato</li>
							</ul>
						</div>
					</div>

					{/* Trust Indicators */}
					<div className="flex flex-wrap items-center justify-center gap-6 py-6 border-t border-white/5 mb-6">
						<div className="flex items-center gap-2 text-sm text-white/50">
							<Lock className="w-4 h-4" />
							<span>Dados protegidos (LGPD)</span>
						</div>
						<div className="flex items-center gap-2 text-sm text-white/50">
							<Shield className="w-4 h-4" />
							<span>Pagamento seguro (Stripe)</span>
						</div>
						<div className="flex items-center gap-2 text-sm text-white/50">
							<MessageCircle className="w-4 h-4" />
							<span>Suporte em horário comercial</span>
						</div>
					</div>

					<div className="pt-6 border-t border-white/10 text-center text-sm text-white/60">
						© {new Date().getFullYear()} RecompraCRM. Todos os direitos reservados.
					</div>
				</div>
			</footer>
		</div>
	);
}
