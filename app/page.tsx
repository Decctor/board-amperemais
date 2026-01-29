"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AppSubscriptionPlans } from "@/config";
import { formatToMoney } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import LogoCompleteHorizontalColorful from "@/utils/svgs/logos/RECOMPRA - COMPLETE - HORIZONTAL- COLORFUL.svg";
import {
	AlertTriangle,
	ArrowRight,
	ArrowUp,
	BadgeDollarSign,
	BadgePercent,
	BarChart3,
	Bot,
	Box,
	Brain,
	CheckCircle2,
	ChevronDown,
	CirclePlus,
	Crown,
	Grid3X3,
	Handshake,
	LayoutDashboard,
	Lightbulb,
	MessageCircle,
	MessageSquare,
	Package,
	PieChart,
	Search,
	ShoppingCart,
	Sparkles,
	Star,
	TrendingUp,
	Users,
	Wallet,
	X,
	Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { FaWhatsapp } from "react-icons/fa6";

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

const TESTIMONIALS = [
	{
		role: "Gestor de Vendas",
		text:
			"O ranking de vendedores criou uma competição saudável na equipe. Acompanhar a meta em tempo real na TV da loja mudou completamente nossa rotina e motivação.",
		initials: "GV",
		color: "from-blue-500 to-cyan-500",
	},
	{
		role: "Analista de Compras",
		text:
			"A curva ABC de produtos me ajuda a não deixar faltar o que mais vende. O dashboard de produtos é essencial para meu planejamento de reposição semanal.",
		initials: "AC",
		color: "from-purple-500 to-pink-500",
	},
	{
		role: "Time Comercial",
		text:
			"A automação de WhatsApp recuperou clientes que eu nem lembrava. Vendi para inativos sem precisar mandar nenhuma mensagem manual. Simplesmente funciona.",
		initials: "TC",
		color: "from-green-500 to-emerald-500",
	},
	{
		role: "Supervisor de Loja",
		text:
			"O PDV é muito rápido. Consigo montar orçamentos com foto e enviar pro cliente na hora. O cliente visualiza o produto e fechamos muito mais rápido.",
		initials: "SL",
		color: "from-orange-500 to-red-500",
	},
	{
		role: "Diretor Comercial",
		text:
			"A visão completa do funil e a triagem por IA reduziram nosso custo operacional. Minha equipe agora foca apenas em quem realmente quer comprar.",
		initials: "DC",
		color: "from-indigo-500 to-violet-500",
	},
	{
		role: "Atendimento",
		text: "A triagem da IA responde as perguntas básicas de voltagem e medidas que tomavam meu tempo. Só recebo o cliente pronto para passar o cartão.",
		initials: "AT",
		color: "from-yellow-500 to-orange-500",
	},
];

export default function LandingPage() {
	const [rankingTab, setRankingTab] = useState<"sellers" | "partners" | "products">("sellers");
	const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">("monthly");

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
							<Link href="#vendas" className="text-sm font-medium text-white/70 hover:text-white transition-colors">
								PDV
							</Link>
							<Link href="#ia" className="text-sm font-medium text-white/70 hover:text-white transition-colors">
								IA
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
							<a
								href="https://wa.me/553499480791?text=Gostaria%20de%20agendar%20uma%20demonstração%20do%20RecompraCRM!"
								target="_blank"
								rel="noopener noreferrer"
							>
								<Button
									size="sm"
									className="bg-[#24549C] hover:bg-[#1e4682] text-white rounded-full font-medium px-6 h-10 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all hover:-translate-y-0.5"
								>
									Agendar demonstração
								</Button>
							</a>
						</div>
					</div>
				</div>
			</header>

			{/* Hero Section */}
			<section className="relative min-h-[calc(100vh-5rem)] flex items-center justify-center py-20 overflow-hidden">
				{/* Background Elements */}
				<div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none">
					{/* Main Glow */}
					<div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[#24549C]/20 rounded-full blur-[120px] opacity-40 mix-blend-screen animate-pulse-slow" />
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
							<span className="text-sm font-medium text-white/90 tracking-wide uppercase group-hover:text-white transition-colors">
								Aumente suas vendas com Inteligência Artificial
							</span>
						</div>

						{/* Headline */}
						<h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-white mb-8 leading-[1.05]">
							RecompraCRM é a inteligência <br className="hidden md:block" />
							<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF4D00] via-[#FF8700] to-[#E7000B] drop-shadow-sm">
								que o seu varejo precisa.
							</span>
						</h1>

						{/* Subheadline */}
						<p className="text-lg md:text-2xl text-white/60 mb-12 max-w-3xl mx-auto leading-relaxed font-light">
							Uma plataforma completa que une <span className="text-white font-medium">Cashback</span>,{" "}
							<span className="text-white font-medium">Automação de WhatsApp</span> e <span className="text-white font-medium">Business Intelligence</span>{" "}
							para transformar clientes pontuais em fãs leais.
						</p>

						{/* CTA Buttons */}
						<div className="flex flex-col sm:flex-row items-center justify-center gap-5">
							<a
								href="https://wa.me/553499480791?text=Gostaria%20de%20agendar%20uma%20demonstração%20do%20RecompraCRM!"
								target="_blank"
								rel="noopener noreferrer"
								className="w-full sm:w-auto"
							>
								<Button className="w-full sm:w-auto bg-[#24549C] hover:bg-[#1e4682] text-white rounded-full px-10 h-14 text-lg font-bold shadow-xl shadow-blue-500/20 hover:shadow-blue-500/40 hover:-translate-y-1 transition-all duration-300">
									Agendar demonstração <ArrowRight className="w-5 h-5 ml-2" />
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

			{/* Feature: Cashback / POI */}
			<section id="cashback" className="py-20 bg-zinc-950 border-y border-white/5 relative overflow-hidden">
				<div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#24549C]/50 to-transparent" />
				<div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
					<div className="grid lg:grid-cols-2 gap-16 items-center">
						<div>
							<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-6">
								<ShoppingCart className="w-4 h-4" />
								Programa de Cashback
							</div>
							<h2 className="text-3xl md:text-5xl font-bold mb-6 text-white">
								Gestão completa de <br />
								<span className="text-white/50">Cashback e Pontos.</span>
							</h2>
							<p className="text-lg text-white/60 mb-8 leading-relaxed">
								Oferecemos uma plataforma robusta para gestão de programas de cashback com configuração flexível. Engaje seus clientes no ponto de venda com
								nossa interface exclusiva para tablets.
							</p>

							<div className="grid sm:grid-cols-2 gap-4 mb-8">
								<div className="p-4 rounded-xl bg-zinc-900/50 border border-white/5 hover:border-[#24549C]/30 transition-colors">
									<Search className="w-5 h-5 text-[#24549C] mb-2" />
									<h4 className="font-semibold text-white">Point of Interaction (POI)</h4>
									<p className="text-sm text-white/50">Interface "Kiosk" otimizada para tablets, ideal para balcão.</p>
								</div>
								<div className="p-4 rounded-xl bg-zinc-900/50 border border-white/5 hover:border-[#24549C]/30 transition-colors">
									<Box className="w-5 h-5 text-[#24549C] mb-2" />
									<h4 className="font-semibold text-white">Vendas e Resgate</h4>
									<p className="text-sm text-white/50">Entrada de vendas simplificada e resgate de pontos em segundos.</p>
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
											<div className="h-8 bg-green-600 rounded w-full animate-pulse" />
										</div>
									</div>
								</div>
							</div>

							{/* Floating Badge */}
							<div className="absolute -right-4 top-10 bg-zinc-900 border border-white/10 p-3 rounded-lg shadow-xl flex items-center gap-3 animate-bounce duration-[3000ms]">
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

			{/* Feature: Whatsapp Hub (Beta) */}
			<section id="whatsapp-hub" className="py-20 bg-black relative overflow-hidden">
				<div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
					<div className="grid lg:grid-cols-2 gap-16 items-center">
						<div className="order-2 lg:order-1">
							<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium mb-6">
								<Bot className="w-4 h-4" />
								Whatsapp Hub (Beta)
							</div>
							<h2 className="text-3xl md:text-5xl font-bold mb-6 text-white">
								Gestão de atendimentos <br />
								<span className="text-white/50">com Inteligência Artificial.</span>
							</h2>
							<div className="mb-6">
								<span className="inline-flex items-center rounded-md bg-purple-400/10 px-2 py-1 text-xs font-medium text-purple-400 ring-1 ring-inset ring-purple-400/20">
									Early Access
								</span>
							</div>
							<p className="text-lg text-white/60 mb-8 leading-relaxed">
								Centralize seus atendimentos. Conecte números via API Oficial ou Não Oficial (Coexistence). Nossa IA realiza a triagem inicial, qualifica o
								lead e transfere para o vendedor ideal no momento certo.
							</p>
							<div className="space-y-4 mb-8">
								<div className="flex items-start gap-4">
									<div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0 border border-green-500/20">
										<MessageCircle className="w-5 h-5 text-green-500" />
									</div>
									<div>
										<h4 className="text-white font-semibold mb-1">Múltiplos Canais</h4>
										<p className="text-sm text-white/60">Conecte toda sua equipe. Suporte a API Oficial (Meta) e API Não Oficial em implementação.</p>
									</div>
								</div>
								<div className="flex items-start gap-4">
									<div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0 border border-green-500/20">
										<Bot className="w-5 h-5 text-green-500" />
									</div>
									<div>
										<h4 className="text-white font-semibold mb-1">Triagem Automática</h4>
										<p className="text-sm text-white/60">
											Detectou interesse em fechar? A IA alerta seu vendedor e transfere o atendimento com todo o contexto.
										</p>
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
											<div className="bg-[#24549C] text-white py-2 px-4 rounded-2xl rounded-tr-sm max-w-[85%]">Quero saber sobre o status do meu pedido.</div>
										</div>

										{/* Bot Response */}
										<div className="flex justify-start">
											<div className="bg-zinc-800 text-white/90 py-2 px-4 rounded-2xl rounded-tl-sm max-w-[85%] border border-white/5">
												Seu pedido #1234 está em separação! 📦 Posso ajudar com mais alguma coisa?
											</div>
										</div>

										{/* Customer Message */}
										<div className="flex justify-end">
											<div className="bg-[#24549C] text-white py-2 px-4 rounded-2xl rounded-tr-sm max-w-[85%]">Quero falar com um atendente.</div>
										</div>

										{/* Bot Transfer */}
										<div className="flex justify-start">
											<div className="bg-zinc-800 text-white/90 py-2 px-4 rounded-2xl rounded-tl-sm max-w-[85%] border border-white/5">
												Entendido. Transferindo para nossa equipe de suporte agora mesmo. 🎧
											</div>
										</div>

										{/* System Message */}
										<div className="flex justify-center my-4">
											<span className="text-xs text-green-400 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
												Transferido para: Julia (Suporte)
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

			{/* Feature: AI-Hints */}
			<section className="py-24 bg-zinc-950 border-t border-white/5 relative overflow-hidden">
				<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/20 via-zinc-950/0 to-zinc-950/0" />

				<div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
					<div className="text-center mb-16 max-w-3xl mx-auto">
						<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm font-medium mb-6">
							<Lightbulb className="w-4 h-4" />
							Insights Proativos
						</div>
						<h2 className="text-3xl md:text-5xl font-bold mb-6 text-white">
							Insights que geram <br />
							<span className="text-white/50">lucro imediato.</span>
						</h2>
						<p className="text-lg text-white/60">
							Nossa IA analisa seus dados sugere ações práticas. Não perca tempo analisando relatórios: receba a informação pronta para agir.
						</p>
					</div>

					<div className="relative max-w-4xl mx-auto">
						{/* Background Glow */}
						<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-blue-500/10 blur-3xl rounded-full -z-10" />

						{/* Hints Grid */}
						<div className="grid md:grid-cols-2 gap-6">
							{/* Hint 1: Product Trend (was Stock) */}
							<div className="bg-zinc-900/80 backdrop-blur-md border-l-4 border-l-red-500 border-y border-r border-[#ffffff1a] p-6 rounded-r-xl shadow-lg transform hover:-translate-y-1 transition-transform duration-300">
								<div className="flex items-start gap-4">
									<div className="p-3 rounded-full bg-red-500/10">
										<TrendingUp className="w-6 h-6 text-red-500 rotate-180" />
									</div>
									<div>
										<h4 className="font-bold text-white mb-1">Queda de Vendas</h4>
										<p className="text-sm text-white/70 leading-relaxed">
											O produto <strong className="text-white">Shampoo X</strong> está com vendas <span className="text-red-400">40% abaixo</span> da média
											histórica nesta semana.
										</p>
										<Button size="sm" variant="link" className="px-0 text-red-400 h-auto mt-2 hover:text-red-300">
											Ver detalhes do produto →
										</Button>
									</div>
								</div>
							</div>

							{/* Hint 2: Association Analysis (was Kit) */}
							<div className="bg-zinc-900/80 backdrop-blur-md border-l-4 border-l-yellow-500 border-y border-r border-[#ffffff1a] p-6 rounded-r-xl shadow-lg transform hover:-translate-y-1 transition-transform duration-300 md:translate-y-8">
								<div className="flex items-start gap-4">
									<div className="p-3 rounded-full bg-yellow-500/10">
										<Lightbulb className="w-6 h-6 text-yellow-500" />
									</div>
									<div>
										<h4 className="font-bold text-white mb-1">Padrão de Compra</h4>
										<p className="text-sm text-white/70 leading-relaxed">
											Análise de Cesta: 85% dos clientes que levam <strong>Condicionador Y</strong> acabam levando a<strong> Máscara Z</strong> em até 7 dias.
										</p>
										<Button size="sm" variant="link" className="px-0 text-yellow-400 h-auto mt-2 hover:text-yellow-300">
											Ver dados de correlação →
										</Button>
									</div>
								</div>
							</div>

							{/* Hint 3: Seller Performance (was Success) */}
							<div className="bg-zinc-900/80 backdrop-blur-md border-l-4 border-l-purple-500 border-y border-r border-[#ffffff1a] p-6 rounded-r-xl shadow-lg transform hover:-translate-y-1 transition-transform duration-300">
								<div className="flex items-start gap-4">
									<div className="p-3 rounded-full bg-purple-500/10">
										<Users className="w-6 h-6 text-purple-500" />
									</div>
									<div>
										<h4 className="font-bold text-white mb-1">Performance de Equipe</h4>
										<p className="text-sm text-white/70 leading-relaxed">
											Vendedores <strong>Ana e Carlos</strong> geralmente têm performance menor na 1ª quinzena. Considere uma campanha de incentivo.
										</p>
										<Button size="sm" variant="link" className="px-0 text-purple-400 h-auto mt-2 hover:text-purple-300">
											Ver dados de performance →
										</Button>
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
										<h4 className="font-bold text-white mb-1">Sugestão de Campanha</h4>
										<p className="text-sm text-white/70 leading-relaxed">
											Seus clientes VIPs não compram há 45 dias. No seu nicho, o risco de churn aumenta após 50 dias.
										</p>
										<Button size="sm" variant="link" className="px-0 text-blue-400 h-auto mt-2 hover:text-blue-300">
											Criar campanha de reativação →
										</Button>
									</div>
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
							<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-6">
								<Zap className="w-4 h-4" />
								Campanhas de Engajamento
							</div>
							<h2 className="text-3xl md:text-5xl font-bold mb-6 text-white">
								Crie interações automatizadas <br />
								<span className="text-white/50">para WhatsApp.</span>
							</h2>
							<p className="text-lg text-white/60 mb-8 leading-relaxed">
								Configure campanhas para uma gama de eventos. Automatize a geração de cashback para estimular reativação e engajamento dos clientes. Suporte
								para API Oficial e Não Oficial (em implementação).
							</p>

							<div className="grid gap-6 mb-8">
								<div className="p-4 rounded-xl bg-zinc-900/50 border border-white/5 hover:border-blue-500/30 transition-colors">
									<h4 className="font-semibold text-white mb-2 flex items-center gap-2">
										<MessageSquare className="w-4 h-4 text-blue-400" /> Reativação Automática
									</h4>
									<p className="text-sm text-white/60">O sistema identifica inatividade e envia ofertas personalizadas para trazer o cliente de volta.</p>
								</div>
								<div className="p-4 rounded-xl bg-zinc-900/50 border border-white/5 hover:border-blue-500/30 transition-colors">
									<h4 className="font-semibold text-white mb-2 flex items-center gap-2">
										<Crown className="w-4 h-4 text-yellow-400" /> Campanhas Configuráveis
									</h4>
									<p className="text-sm text-white/60">Defina gatilhos, regras de cashback e mensagens para datas comemorativas e eventos.</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Feature: BI - RFM */}
			<section id="bi" className="py-20 bg-zinc-950 border-y border-white/5">
				<div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
					<div className="grid lg:grid-cols-2 gap-16 items-center">
						<div className="relative">
							{/* Mock UI RFM */}
							<div className="bg-black border border-white/10 rounded-2xl p-6 shadow-2xl">
								<div className="flex items-center gap-4 mb-8">
									<div className="p-3 bg-zinc-900 rounded-lg border border-white/10">
										<Grid3X3 className="w-6 h-6 text-[#FFB900]" />
									</div>
									<div>
										<h4 className="font-bold text-white text-lg">Matriz RFM em Tempo Real</h4>
										<p className="text-sm text-white/40">Segmentação automática da sua base</p>
									</div>
								</div>
								<div className="grid grid-cols-2 gap-3">
									<div className="bg-zinc-900/50 p-4 rounded-xl border border-white/5 text-center hover:border-[#FFB900]/50 transition-colors cursor-pointer group">
										<div className="text-2xl font-bold text-white mb-1 group-hover:text-[#FFB900]">128</div>
										<div className="text-xs font-semibold text-green-400 bg-green-400/10 py-1 px-2 rounded-full inline-block">CAMPEÕES</div>
									</div>
									<div className="bg-zinc-900/50 p-4 rounded-xl border border-white/5 text-center hover:border-[#FFB900]/50 transition-colors cursor-pointer group">
										<div className="text-2xl font-bold text-white mb-1 group-hover:text-[#FFB900]">450</div>
										<div className="text-xs font-semibold text-blue-400 bg-blue-400/10 py-1 px-2 rounded-full inline-block">LEAIS</div>
									</div>
									<div className="bg-zinc-900/50 p-4 rounded-xl border border-white/5 text-center hover:border-[#FFB900]/50 transition-colors cursor-pointer group">
										<div className="text-2xl font-bold text-white mb-1 group-hover:text-[#FFB900]">89</div>
										<div className="text-xs font-semibold text-yellow-400 bg-yellow-400/10 py-1 px-2 rounded-full inline-block">EM RISCO</div>
									</div>
									<div className="bg-zinc-900/50 p-4 rounded-xl border border-white/5 text-center hover:border-[#FFB900]/50 transition-colors cursor-pointer group">
										<div className="text-2xl font-bold text-white mb-1 group-hover:text-[#FFB900]">312</div>
										<div className="text-xs font-semibold text-purple-400 bg-purple-400/10 py-1 px-2 rounded-full inline-block">NOVOS</div>
									</div>
								</div>
								<div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between">
									<div className="flex items-center gap-2 text-sm text-white/60">
										<Zap className="w-4 h-4 text-[#FFB900]" />
										<span>Ações sugeridas disponíveis</span>
									</div>
									<ArrowRight className="w-4 h-4 text-white/40" />
								</div>
							</div>
						</div>

						<div>
							<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFB900]/10 border border-[#FFB900]/20 text-[#FFB900] text-sm font-medium mb-6">
								<BadgePercent className="w-4 h-4" />
								Business Intelligence
							</div>
							<h2 className="text-3xl md:text-5xl font-bold mb-6 text-white">
								Análise de Comportamento <br />
								<span className="text-white/50">de Compra.</span>
							</h2>
							<p className="text-lg text-white/60 mb-8 leading-relaxed">
								Entenda a jornada do seu cliente. Nossa Matriz RFM segmenta sua base automaticamente para que você possa agir com precisão, oferecendo os
								incentivos certos para cada perfil.
							</p>
							<div className="grid sm:grid-cols-2 gap-6 mb-8">
								<div className="p-4 rounded-xl bg-zinc-900/50 border border-white/5">
									<h4 className="font-semibold text-white mb-2 flex items-center gap-2">
										<Grid3X3 className="w-4 h-4 text-[#FFB900]" /> Segmentação Automática
									</h4>
									<p className="text-sm text-white/60">Identifique clientes Campeões, Leais e Em Risco em tempo real.</p>
								</div>
								<div className="p-4 rounded-xl bg-zinc-900/50 border border-white/5">
									<h4 className="font-semibold text-white mb-2 flex items-center gap-2">
										<Wallet className="w-4 h-4 text-[#FFB900]" /> Ações Direcionadas
									</h4>
									<p className="text-sm text-white/60">Crie estratégias de Cashback específicas para reter e rentabilizar cada grupo.</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Feature: BI - Performance */}
			<section id="analytics" className="py-20 bg-black overflow-hidden start">
				<div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
					<div className="grid lg:grid-cols-2 gap-16 items-center">
						<div>
							<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-6">
								<BarChart3 className="w-4 h-4" />
								Performance Comercial
							</div>
							<h2 className="text-3xl md:text-5xl font-bold mb-6 text-white">
								Gestão de Vendedores <br />
								<span className="text-white/50">e Parceiros.</span>
							</h2>
							<p className="text-lg text-white/60 mb-8 leading-relaxed">
								Acompanhe rankings de vendedores, performance de afiliados e produtos mais vendidos em dashboards intuitivos. Tenha visibilidade total sobre
								quem traz mais resultado para sua operação.
							</p>
							<div className="flex flex-col gap-4">
								<div className="flex items-center gap-4 p-4 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5 cursor-default">
									<div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
										<Users className="w-6 h-6 text-blue-400" />
									</div>
									<div>
										<h4 className="font-semibold text-white">Ranking de Vendedores e Parceiros</h4>
										<p className="text-sm text-white/50">Gamificação e acompanhamento de metas em tempo real.</p>
									</div>
								</div>
								<div className="flex items-center gap-4 p-4 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5 cursor-default">
									<div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
										<PieChart className="w-6 h-6 text-purple-400" />
									</div>
									<div>
										<h4 className="font-semibold text-white">Curva ABC de Produtos</h4>
										<p className="text-sm text-white/50">Saiba exatamente quais itens geram maior margem e volume.</p>
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

			{/* Feature: Pricing */}
			<section id="pricing" className="py-24 bg-black relative overflow-hidden border-t border-white/5">
				<div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
					<div className="text-center mb-16 max-w-3xl mx-auto">
						<span className="text-[#24549C] font-semibold text-sm tracking-wider uppercase mb-2 block">Planos e Preços</span>
						<h2 className="text-3xl md:text-5xl font-bold mb-6 text-white">
							Invista no crescimento <br />
							<span className="text-white/50">do seu negócio.</span>
						</h2>
						<p className="text-lg text-white/60">Escolha o plano ideal para a sua fase atual. Upgrade ou downgrade a qualquer momento.</p>
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
													? "bg-[#24549C] hover:bg-[#1e4682] text-white shadow-lg shadow-blue-500/20"
													: "bg-white/5 hover:bg-white/10 text-white border border-white/10",
											)}
										>
											Começar Agora
										</Button>
									</Link>
								</div>
							);
						})}
					</div>

					<div className="mt-16 text-center">
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

			{/* Footer */}
			<footer className="bg-black border-t border-white/10">
				<div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
					<div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
						<div>
							<h3 className="font-bold text-lg mb-3 text-white">RecompraCRM</h3>
							<p className="text-sm text-white/60">Plataforma de otimização de vendas integrada.</p>
						</div>

						<div>
							<h4 className="font-semibold mb-3 text-white">Produtos</h4>
							<ul className="space-y-2 text-sm text-white/60">
								<li>CRM e Automação</li>
								<li>Business Intelligence</li>
								<li>WhatsApp Hub</li>
								<li>Relatórios Avançados</li>
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

					<div className="pt-8 border-t border-white/10 text-center text-sm text-white/60">
						© {new Date().getFullYear()} RecompraCRM. Todos os direitos reservados.
					</div>
				</div>
			</footer>
		</div>
	);
}
