"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import LogoCompleteHorizontalColorful from "@/utils/svgs/logos/RECOMPRA - COMPLETE - HORIZONTAL- COLORFUL.svg";
import {
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
	MessageCircle,
	MessageSquare,
	Package,
	PieChart,
	Search,
	ShoppingCart,
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
			{/* Banner Topo */}
			<div className="bg-[#24549C] text-center py-2 px-4 text-sm font-medium text-white">
				<span>RecompraCRM — Plataforma completa para o varejo </span>
			</div>
			{/* Navbar */}
			<header className="sticky top-0 z-50 bg-black/95 backdrop-blur-sm border-b border-white/10">
				<div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
					<div className="flex items-center justify-between h-16">
						{/* Logo */}
						<Link href="/" className="flex items-center gap-3 group">
							<Image src={LogoCompleteHorizontalColorful} alt="RecompraCRM" width={200} height={80} priority />
							<ArrowUp className="w-3 h-3 text-[#FFB900] opacity-0 group-hover:opacity-100 transition-opacity" />
						</Link>

						{/* Menu Center - Hidden em mobile */}
						<nav className="hidden lg:flex items-center gap-8">
							<Link href="#vendas" className="text-sm text-white/80 hover:text-white transition-colors">
								PDV
							</Link>
							<Link href="#ia" className="text-sm text-white/80 hover:text-white transition-colors">
								IA
							</Link>
							<Link href="#automacao" className="text-sm text-white/80 hover:text-white transition-colors">
								Automação
							</Link>
							<Link href="#analytics" className="text-sm text-white/80 hover:text-white transition-colors">
								Analytics
							</Link>
							<Link href="#depoimentos" className="text-sm text-white/80 hover:text-white transition-colors">
								Depoimentos
							</Link>
						</nav>

						{/* Botões à direita */}
						<div className="flex items-center gap-3">
							<Link href="/auth/signin" className="text-sm text-white/80 hover:text-white transition-colors mr-2">
								Entrar
							</Link>
							<a
								href="https://wa.me/553499480791?text=Gostaria%20de%20saber%20mais%20sobre%20o%20RecompraCRM%20!"
								target="_blank"
								rel="noopener noreferrer"
								className="flex items-center justify-center h-9 w-9 rounded-full bg-green-500 hover:bg-green-600 transition-all hover:scale-110 shadow-lg shadow-green-500/20"
							>
								<FaWhatsapp className="w-5 h-5 text-white" />
							</a>
							<a href="https://wa.me/553499480791?text=Gostaria%20de%20saber%20mais%20sobre%20o%20RecompraCRM%20!" target="_blank" rel="noopener noreferrer">
								<Button size="sm" className="!bg-[#24549C] hover:!bg-[#1e4682] !text-white !border-0 !shadow-lg rounded-full px-5">
									<span className="text-white">Agendar demonstração</span>
								</Button>
							</a>
						</div>
					</div>
				</div>
			</header>
			{/* Hero Section */}
			<section className="relative py-20 md:py-32 overflow-hidden">
				{/* Background Gradient */}
				<div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#1a0f08] to-[#0a0a0a]" />

				{/* Decorative background */}
				<div className="absolute inset-0 overflow-hidden pointer-events-none">
					<div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-[#24549C]/20 blur-3xl rounded-full" />
					<div className="absolute inset-0 opacity-[0.06] bg-[linear-gradient(to_right,rgba(255,255,255,0.15)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.15)_1px,transparent_1px)] bg-[length:72px_72px]" />
					<div className="absolute top-1/4 left-1/4 w-96 h-96 border border-[#24549C]/20 rounded-full blur-3xl" />
					<div className="absolute bottom-1/4 right-1/4 w-96 h-96 border border-[#24549C]/20 rounded-full blur-3xl" />
				</div>

				<div className="relative container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center z-10">
					<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-white/80 mb-8 backdrop-blur-sm">
						<span className="flex h-2 w-2 rounded-full bg-[#FFB900] animate-pulse" />
						Aumente suas vendas com Inteligência Artificial
					</div>
					<h1 className="text-4xl md:text-5xl lg:text-7xl font-bold leading-tight mb-8 text-white tracking-tight">
						RecompraCRM é a inteligência
						<br />
						<span className="bg-gradient-to-r from-[#FFB900] via-[#FFD700] to-[#E7000B] bg-clip-text text-transparent">que o seu varejo precisa.</span>
					</h1>
					<p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed">
						Uma plataforma completa que une Cashback, Automação de WhatsApp e Business Intelligence para transformar clientes pontuais em fãs leais.
					</p>

					<div className="flex flex-col sm:flex-row justify-center gap-4">
						<a
							href="https://wa.me/553499480791?text=Gostaria%20de%20saber%20mais%20sobre%20o%20RecompraCRM%20!"
							target="_blank"
							rel="noopener noreferrer"
							className="w-full sm:w-auto"
						>
							<Button
								size="lg"
								className="!bg-[#24549C] hover:!bg-[#1e4682] !text-white !border-0 !shadow-xl px-8 h-14 text-base font-semibold rounded-full w-full"
							>
								<span className="text-white">Agendar demonstração</span>
								<ArrowRight className="ml-2 w-5 h-5 text-white" />
							</Button>
						</a>
						<Link href="/auth/signin">
							<Button
								size="lg"
								variant="outline"
								className="!border-[#24549C]/50 !text-white hover:!bg-[#24549C]/10 hover:!border-[#24549C] !bg-transparent px-8 h-14 text-base font-semibold rounded-full w-full sm:w-auto"
							>
								<span className="text-white">Acessar plataforma</span>
							</Button>
						</Link>
					</div>
				</div>
			</section>

			{/* Feature: POS / Sales (NEW) */}
			<section id="vendas" className="py-20 bg-zinc-950 border-y border-white/5 relative overflow-hidden">
				<div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#24549C]/50 to-transparent" />
				<div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
					<div className="grid lg:grid-cols-2 gap-16 items-center">
						<div>
							<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-6">
								<ShoppingCart className="w-4 h-4" />
								Frente de Caixa (PDV)
							</div>
							<h2 className="text-3xl md:text-5xl font-bold mb-6 text-white">
								Venda direto do CRM. <br />
								<span className="text-white/50">Sem trocar de tela.</span>
							</h2>
							<p className="text-lg text-white/60 mb-8 leading-relaxed">
								Esqueça a troca de abas. O RecompraCRM possui um PDV completo integrado. Monte orçamentos, consulte estoque e finalize vendas enquanto analisa
								o perfil do cliente.
							</p>

							<div className="grid sm:grid-cols-2 gap-4 mb-8">
								<div className="p-4 rounded-xl bg-zinc-900/50 border border-white/5 hover:border-[#24549C]/30 transition-colors">
									<Search className="w-5 h-5 text-[#24549C] mb-2" />
									<h4 className="font-semibold text-white">Busca Inteligente</h4>
									<p className="text-sm text-white/50">Encontre produtos por nome, código ou grupo instantaneamente.</p>
								</div>
								<div className="p-4 rounded-xl bg-zinc-900/50 border border-white/5 hover:border-[#24549C]/30 transition-colors">
									<Box className="w-5 h-5 text-[#24549C] mb-2" />
									<h4 className="font-semibold text-white">Construtor de Produtos</h4>
									<p className="text-sm text-white/50">Configure itens complexos, grades e adicionais no momento da venda.</p>
								</div>
							</div>

							<Button className="!bg-[#24549C] hover:!bg-[#1e4682] !text-white rounded-full">Ver o PDV em ação</Button>
						</div>

						<div className="relative">
							{/* Mock UI POS */}
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
									<div className="text-xs text-white/50">Venda finalizada</div>
									<div className="text-sm font-bold text-white">4.2s</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Feature 1: Automation */}
			<section className="py-20 bg-black relative overflow-hidden">
				<div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
					<div className="grid lg:grid-cols-2 gap-16 items-center">
						<div className="order-2 lg:order-1">
							<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium mb-6">
								<Bot className="w-4 h-4" />
								Triagem com Inteligência Artificial
							</div>
							<h2 className="text-3xl md:text-5xl font-bold mb-6 text-white">
								IA que filtra curiosos e <br />
								<span className="text-white/50">entrega compradores.</span>
							</h2>
							<p className="text-lg text-white/60 mb-8 leading-relaxed">
								Sua equipe perde horas respondendo "tem disponível?" ou "qual o preço?". Nosso agente de IA assume a linha de frente: tira dúvidas técnicas,
								consulta estoque em tempo real e transfere para o humano apenas quando o cliente demonstra real intenção de compra.
							</p>
							<div className="space-y-4 mb-8">
								<div className="flex items-start gap-4">
									<div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0 border border-green-500/20">
										<Brain className="w-5 h-5 text-green-500" />
									</div>
									<div>
										<h4 className="text-white font-semibold mb-1">Conhecimento Técnico</h4>
										<p className="text-sm text-white/60">Treinada com seu catálogo, a IA responde dúvidas sobre voltagem, dimensões e compatibilidade.</p>
									</div>
								</div>
								<div className="flex items-start gap-4">
									<div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0 border border-green-500/20">
										<CheckCircle2 className="w-5 h-5 text-green-500" />
									</div>
									<div>
										<h4 className="text-white font-semibold mb-1">Passagem de Bastão</h4>
										<p className="text-sm text-white/60">
											Detectou interesse em fechar? A IA alerta seu vendedor e transfere o atendimento com todo o contexto.
										</p>
									</div>
								</div>
							</div>
							<Button className="!bg-white !text-black hover:!bg-white/90 rounded-full">Conhecer a Triagem IA</Button>
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
											<div className="bg-[#24549C] text-white py-2 px-4 rounded-2xl rounded-tr-sm max-w-[85%]">Vocês tem disjuntor bipolar de 40A?</div>
										</div>

										{/* Bot Response */}
										<div className="flex justify-start">
											<div className="bg-zinc-800 text-white/90 py-2 px-4 rounded-2xl rounded-tl-sm max-w-[85%] border border-white/5">
												Sim! Temos o modelo DIN da Siemens em estoque. Precisa de algo mais para o quadro? ⚡
											</div>
										</div>

										{/* Customer Message */}
										<div className="flex justify-end">
											<div className="bg-[#24549C] text-white py-2 px-4 rounded-2xl rounded-tr-sm max-w-[85%]">Qual o preço? Quero 10 unidades.</div>
										</div>

										{/* Bot Transfer */}
										<div className="flex justify-start">
											<div className="bg-zinc-800 text-white/90 py-2 px-4 rounded-2xl rounded-tl-sm max-w-[85%] border border-white/5">
												Perfeito! Para cotações e negociações, vou chamar um especialista agora mesmo. Só um instante! 👨‍💼
											</div>
										</div>

										{/* System Message */}
										<div className="flex justify-center my-4">
											<span className="text-xs text-green-400 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
												Transferido para: Roberto (Vendedor)
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

			{/* Feature 2: Active Automation */}
			<section id="automacao" className="py-20 bg-zinc-950 border-y border-white/5 relative overflow-hidden">
				<div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
					<div className="grid lg:grid-cols-2 gap-16 items-center">
						<div className="relative order-1">
							<div className="relative z-10 w-full max-w-md mx-auto">
								{/* Automation Flow Visual */}
								<div className="flex flex-col gap-4">
									{/* Trigger Card */}
									<div className="bg-zinc-900/80 border border-white/10 p-4 rounded-xl backdrop-blur-sm transform translate-x-4">
										<div className="flex items-center justify-between mb-2">
											<div className="text-xs font-bold text-blue-400 uppercase tracking-wider">Gatilho: Compra Realizada</div>
											<Zap className="w-4 h-4 text-blue-400" />
										</div>
										<div className="text-sm text-white/60">Cliente João comprou R$ 1.200,00</div>
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
											"Olá João! Parabéns pela compra. 🚀 Como você é um cliente VIP, liberamos <span className="text-yellow-300 font-bold">R$ 50,00</span> de
											cashback para usar até semana que vem!"
										</p>
									</div>
								</div>
							</div>
							<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-blue-500/10 blur-3xl -z-10 rounded-full" />
						</div>

						<div className="order-2">
							<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-6">
								<Zap className="w-4 h-4" />
								Automação Ativa e Fidelização
							</div>
							<h2 className="text-3xl md:text-5xl font-bold mb-6 text-white">
								Fidelize no automático. <br />
								<span className="text-white/50">Sem esforço manual.</span>
							</h2>
							<p className="text-lg text-white/60 mb-8 leading-relaxed">
								Enquanto sua equipe foca em vender, nossa automação cuida do relacionamento. Crie réguas de comunicação personalizadas que reagem ao
								comportamento de compra do cliente.
							</p>

							<div className="grid gap-6 mb-8">
								<div className="p-4 rounded-xl bg-zinc-900/50 border border-white/5 hover:border-blue-500/30 transition-colors">
									<h4 className="font-semibold text-white mb-2 flex items-center gap-2">
										<MessageSquare className="w-4 h-4 text-blue-400" /> Recuperação de Inativos
									</h4>
									<p className="text-sm text-white/60">O sistema identifica quem parou de comprar e envia ofertas automáticas para reativar o cliente.</p>
								</div>
								<div className="p-4 rounded-xl bg-zinc-900/50 border border-white/5 hover:border-blue-500/30 transition-colors">
									<h4 className="font-semibold text-white mb-2 flex items-center gap-2">
										<Crown className="w-4 h-4 text-yellow-400" /> Pós-Venda Premium
									</h4>
									<p className="text-sm text-white/60">Mensagens de agradecimento, pesquisa de satisfação e avisos de cashback expirando.</p>
								</div>
							</div>

							<Button className="!bg-[#24549C] hover:!bg-[#1e4682] !text-white rounded-full">Ver Automações</Button>
						</div>
					</div>
				</div>
			</section>

			{/* Feature 2: Loyalty (RFM + Cashback) */}
			<section id="fidelizacao" className="py-20 bg-zinc-950 border-y border-white/5">
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
								Fidelização e Retenção
							</div>
							<h2 className="text-3xl md:text-5xl font-bold mb-6 text-white">
								Fidelize com inteligência <br />
								<span className="text-white/50">de dados.</span>
							</h2>
							<p className="text-lg text-white/60 mb-8 leading-relaxed">
								Transforme dados brutos em estratégias de lealdade. Utilize nossa análise RFM para identificar quem são seus melhores clientes e crie
								programas de Cashback que incentivam o retorno imediato.
							</p>
							<div className="grid sm:grid-cols-2 gap-6 mb-8">
								<div className="p-4 rounded-xl bg-zinc-900/50 border border-white/5">
									<h4 className="font-semibold text-white mb-2 flex items-center gap-2">
										<Grid3X3 className="w-4 h-4 text-[#FFB900]" /> Análise RFM
									</h4>
									<p className="text-sm text-white/60">Segmente clientes por Recência, Frequência e Valor Monetário automaticamente.</p>
								</div>
								<div className="p-4 rounded-xl bg-zinc-900/50 border border-white/5">
									<h4 className="font-semibold text-white mb-2 flex items-center gap-2">
										<Wallet className="w-4 h-4 text-[#FFB900]" /> Cashback Flexível
									</h4>
									<p className="text-sm text-white/60">Configure regras de acúmulo fixo ou percentual para diferentes perfis.</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Feature 3: Analytics */}
			<section id="analytics" className="py-20 bg-black overflow-hidden">
				<div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
					<div className="grid lg:grid-cols-2 gap-16 items-center">
						<div>
							<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-6">
								<BarChart3 className="w-4 h-4" />
								Analytics Completo
							</div>
							<h2 className="text-3xl md:text-5xl font-bold mb-6 text-white">
								Gestão comercial <br />
								<span className="text-white/50">visível e acionável.</span>
							</h2>
							<p className="text-lg text-white/60 mb-8 leading-relaxed">
								Tenha o controle total da sua operação. Acompanhe rankings de vendedores, desempenho de parceiros (afiliados) e vendas de produtos em
								dashboards intuitivos e detalhados.
							</p>
							<div className="flex flex-col gap-4">
								<div className="flex items-center gap-4 p-4 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5 cursor-default">
									<div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
										<Users className="w-6 h-6 text-blue-400" />
									</div>
									<div>
										<h4 className="font-semibold text-white">Ranking de Vendedores</h4>
										<p className="text-sm text-white/50">Gamificação e acompanhamento de metas em tempo real.</p>
									</div>
								</div>
								<div className="flex items-center gap-4 p-4 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5 cursor-default">
									<div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
										<PieChart className="w-6 h-6 text-purple-400" />
									</div>
									<div>
										<h4 className="font-semibold text-white">Performance de Produtos</h4>
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

			{/* Depoimentos */}
			<section id="depoimentos" className="py-24 bg-black relative overflow-hidden border-t border-white/5">
				<div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
					<div className="text-center mb-16 max-w-3xl mx-auto">
						<span className="text-[#24549C] font-semibold text-sm tracking-wider uppercase mb-2 block">Depoimentos</span>
						<h2 className="text-3xl md:text-5xl font-bold mb-6 text-white">Mais de 100+ empresas confiam</h2>
						<p className="text-lg text-white/60">Veja como diferentes perfis do varejo utilizam nossas ferramentas para vender mais.</p>
					</div>

					<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
						{TESTIMONIALS.map((testimonial, index) => (
							<div
								key={index.toString()}
								className="bg-zinc-950/50 border border-white/10 p-6 rounded-xl hover:border-[#24549C]/30 transition-colors duration-300 flex flex-col gap-4"
							>
								{/* Stars */}
								<div className="flex gap-1">
									{[1, 2, 3, 4, 5].map((star) => (
										<Star key={star} className="w-4 h-4 text-yellow-500 fill-yellow-500" />
									))}
								</div>

								{/* Text */}
								<p className="text-white/80 text-sm leading-relaxed flex-1">"{testimonial.text}"</p>

								{/* User */}
								<div className="flex items-center gap-3 pt-2">
									<div
										className={cn("w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br", testimonial.color)}
									>
										{testimonial.initials}
									</div>
									<div>
										<h4 className="font-bold text-white text-sm">{testimonial.role}</h4>
										<p className="text-xs text-white/40">Varejo & Atacado</p>
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			</section>
			{/* CTA Final */}
			<section className="relative py-20 md:py-28 bg-gradient-to-b from-[#1a0f08] to-[#0a0a0a] overflow-hidden">
				<div className="absolute inset-0 opacity-10">
					<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-[#24549C]/20 rounded-full blur-3xl" />
				</div>
				<div className="relative container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center z-10">
					<h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">Pronto para crescer?</h2>
					<p className="text-lg text-white/70 mb-10 max-w-2xl mx-auto">Experimente a plataforma que transforma a gestão comercial.</p>

					<div className="flex flex-col sm:flex-row justify-center gap-4">
						<a href="https://wa.me/553499480791?text=Gostaria%20de%20saber%20mais%20sobre%20o%20RecompraCRM%20!" target="_blank" rel="noopener noreferrer">
							<Button
								size="lg"
								className="!bg-[#24549C] hover:!bg-[#1e4682] !text-white !border-0 !shadow-xl px-8 h-14 text-base font-semibold rounded-full"
							>
								<span className="text-white">Agendar uma demo</span>
							</Button>
						</a>
						<a href="https://wa.me/553499480791?text=Gostaria%20de%20saber%20mais%20sobre%20o%20RecompraCRM%20!" target="_blank" rel="noopener noreferrer">
							<Button
								size="lg"
								variant="outline"
								className="!border-[#24549C]/50 !text-white hover:!bg-[#24549C]/10 hover:!border-[#24549C] !bg-transparent px-8 h-14 text-base font-semibold rounded-full"
							>
								<span className="text-white">Abra sua conta</span>
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
