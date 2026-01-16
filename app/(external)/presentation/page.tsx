"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import CardapioWebLogo from "@/utils/images/integrations/cardapio-web.png";
import OnlineSoftwareLogo from "@/utils/images/integrations/online-software-logo.png";
import LogoCompleteHorizontalColorful from "@/utils/svgs/logos/RECOMPRA - COMPLETE - HORIZONTAL- COLORFUL.svg";
import LogoCompleteVerticalColorful from "@/utils/svgs/logos/RECOMPRA - COMPLETE - VERTICAL - COLORFUL.svg";
import { AnimatePresence, motion } from "framer-motion";
import {
	BadgeDollarSign,
	BarChart3,
	Bot,
	Check,
	CheckCircle2,
	ChevronLeft,
	ChevronRight,
	CirclePlus,
	Coins,
	Crown,
	FileJson,
	Handshake,
	Layers,
	LayoutDashboard,
	LineChart,
	Lock,
	Megaphone,
	MessageCircle,
	Minus,
	Package,
	RefreshCw,
	ShoppingCart,
	Sparkles,
	Store,
	Tablet,
	Trophy,
	Users,
	Wallet,
	X,
	Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

// --- Mock Data ---

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

function AnalyticsSlideContent() {
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
		<div className="grid lg:grid-cols-2 gap-16 items-center mt-8 max-w-6xl w-full">
			<div>
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
							<BarChart3 className="w-6 h-6 text-purple-400" />
						</div>
						<div>
							<h4 className="font-semibold text-white">Performance de Produtos</h4>
							<p className="text-sm text-white/50">Saiba exatamente quais itens geram maior margem e volume.</p>
						</div>
					</div>
				</div>
				<p className="text-lg text-white/60 mb-8 mt-8 leading-relaxed">
					Tenha o controle total da sua operação. Acompanhe rankings de vendedores, desempenho de parceiros (afiliados) e vendas de produtos em dashboards
					intuitivos e detalhados.
				</p>
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
	);
}

// --- Types & Data ---

type SlideData = {
	id: string;
	type: "cover" | "text" | "columns" | "comparison" | "roadmap" | "cta";
	title?: string;
	subtitle?: string; // Additional subtitle for context
	content?: React.ReactNode;
};

const SLIDES: SlideData[] = [
	{
		id: "intro",
		type: "cover",
		title: "",
		subtitle: "",
		content: (
			<div className="flex flex-col items-center justify-center gap-10 mt-[-2rem] max-w-4xl mx-auto">
				{/* Brand Logo with Glow Effect */}
				<motion.div
					initial={{ scale: 0.8, opacity: 0 }}
					animate={{ scale: 1, opacity: 1 }}
					transition={{ duration: 0.8, ease: "easeOut" }}
					className="relative"
				>
					<div className="absolute inset-0 bg-blue-500/20 blur-[80px] rounded-full" />
					<Image src={LogoCompleteVerticalColorful} alt="RecompraCRM" width={180} height={180} className="relative z-10 drop-shadow-2xl" />
				</motion.div>

				<div className="text-center space-y-6">
					<motion.h1
						initial={{ y: 20, opacity: 0 }}
						animate={{ y: 0, opacity: 1 }}
						transition={{ delay: 0.3 }}
						className="text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-linear-to-b from-white to-white/70"
					>
						Acelerando negócios através da tecnologia
					</motion.h1>

					<motion.div
						initial={{ y: 20, opacity: 0 }}
						animate={{ y: 0, opacity: 1 }}
						transition={{ delay: 0.5 }}
						className="flex flex-col gap-4 items-center"
					>
						<p className="text-xl text-blue-100/60 max-w-2xl text-balance leading-relaxed">
							O <strong className="text-blue-400 font-semibold">RecompraCRM</strong> impulsiona suas vendas através da fidelização inteligente da base de
							clientes.
						</p>

						<div className="flex flex-wrap justify-center gap-3 mt-4">
							<div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-100 shadow-lg shadow-blue-900/10 backdrop-blur-sm">
								<div className="bg-yellow-500 rounded-full p-1">
									<Wallet className="w-3 h-3 text-black" fill="currentColor" />
								</div>
								<span className="text-sm font-medium tracking-wide">Programas de Cashback</span>
							</div>

							<div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-100 shadow-lg shadow-purple-900/10 backdrop-blur-sm">
								<div className="bg-green-500 rounded-full p-1">
									<MessageCircle className="w-3 h-3 text-black" fill="currentColor" />
								</div>
								<span className="text-sm font-medium tracking-wide">Automações de Reativação</span>
							</div>
						</div>
					</motion.div>
				</div>
			</div>
		),
	},
	{
		id: "comparison",
		type: "comparison",
		title: "O Padrão vs A Evolução",
		subtitle: "Onde o mercado se iguala e onde nós nos destacamos.",
		content: (
			<div className="w-full max-w-6xl mt-8">
				{/* Header Grid */}
				<div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4 text-sm font-medium text-white/40 uppercase tracking-widest px-4">
					<div className="md:col-span-4 pl-4">Funcionalidade</div>
					<div className="md:col-span-4 text-center">Fidelizi</div>
					<div className="md:col-span-4 text-center text-blue-400">RecompraCRM</div>
				</div>

				<div className="space-y-3">
					{/* Common Features */}
					<div className="bg-white/5 border border-white/5 rounded-xl p-4 grid md:grid-cols-12 gap-4 items-center group hover:bg-white/10 transition-colors">
						<div className="md:col-span-4 flex items-center gap-3">
							<div className="p-2 bg-zinc-800 rounded-lg text-yellow-500">
								<Trophy className="w-5 h-5" />
							</div>
							<span className="text-white font-medium">Programa de Pontos/Cashback</span>
						</div>
						<div className="md:col-span-4 flex justify-center">
							<CheckCircle2 className="w-6 h-6 text-green-500" />
						</div>
						<div className="md:col-span-4 flex justify-center">
							<CheckCircle2 className="w-6 h-6 text-green-500" />
						</div>
					</div>

					<div className="bg-white/5 border border-white/5 rounded-xl p-4 grid md:grid-cols-12 gap-4 items-center group hover:bg-white/10 transition-colors">
						<div className="md:col-span-4 flex items-center gap-3">
							<div className="p-2 bg-zinc-800 rounded-lg text-pink-500">
								<Users className="w-5 h-5" />
							</div>
							<span className="text-white font-medium">Cadastro de Clientes</span>
						</div>
						<div className="md:col-span-4 flex justify-center flex-col items-center">
							<CheckCircle2 className="w-6 h-6 text-green-500" />
							<span className="text-xs text-white/30 mt-1">Manual (Tablet)</span>
						</div>
						<div className="md:col-span-4 flex justify-center flex-col items-center">
							<CheckCircle2 className="w-6 h-6 text-blue-500" />
							<span className="text-xs text-blue-200/50 mt-1">Automático (ERP)</span>
						</div>
					</div>

					{/* Differentiators */}
					<div className="relative">
						<div className="absolute inset-0 bg-blue-500/5 rounded-xl border border-blue-500/20" />

						<div className="relative p-1 space-y-1">
							{/* Integração Total */}
							<div className="p-3 grid md:grid-cols-12 gap-4 items-center rounded-lg hover:bg-blue-500/10 transition-colors">
								<div className="md:col-span-4 flex items-center gap-3">
									<div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
										<Zap className="w-5 h-5" />
									</div>
									<span className="text-white font-medium">Integração Total (Sem Tablet)</span>
								</div>
								<div className="md:col-span-4 flex justify-center">
									<Minus className="w-6 h-6 text-white/20" />
								</div>
								<div className="md:col-span-4 flex justify-center">
									<div className="flex items-center gap-2 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg shadow-blue-500/20">
										EXCLUSIVO <Sparkles className="w-3 h-3" />
									</div>
								</div>
							</div>

							{/* Análise RFM */}
							<div className="p-3 grid md:grid-cols-12 gap-4 items-center rounded-lg hover:bg-blue-500/10 transition-colors">
								<div className="md:col-span-4 flex items-center gap-3">
									<div className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
										<Layers className="w-5 h-5" />
									</div>
									<div className="flex flex-col">
										<span className="text-white font-medium">Segmentação RFM</span>
										<span className="text-xs text-white/40">Classificação por comportamento</span>
									</div>
								</div>
								<div className="md:col-span-4 flex justify-center">
									<Minus className="w-6 h-6 text-white/20" />
								</div>
								<div className="md:col-span-4 flex justify-center">
									<CheckCircle2 className="w-6 h-6 text-blue-400" />
								</div>
							</div>

							{/* CRM Automatizado */}
							<div className="p-3 grid md:grid-cols-12 gap-4 items-center rounded-lg hover:bg-blue-500/10 transition-colors">
								<div className="md:col-span-4 flex items-center gap-3">
									<div className="p-2 bg-green-500/20 rounded-lg text-green-400">
										<Megaphone className="w-5 h-5" />
									</div>
									<div className="flex flex-col">
										<span className="text-white font-medium">CRM Automatizado</span>
										<span className="text-xs text-white/40">Primeira Compra, Mudança RFM, etc.</span>
									</div>
								</div>
								<div className="md:col-span-4 flex justify-center">
									<Minus className="w-6 h-6 text-white/20" />
								</div>
								<div className="md:col-span-4 flex justify-center">
									<CheckCircle2 className="w-6 h-6 text-blue-400" />
								</div>
							</div>

							{/* Performance Vendedores */}
							<div className="p-3 grid md:grid-cols-12 gap-4 items-center rounded-lg hover:bg-blue-500/10 transition-colors">
								<div className="md:col-span-4 flex items-center gap-3">
									<div className="p-2 bg-orange-500/20 rounded-lg text-orange-400">
										<LineChart className="w-5 h-5" />
									</div>
									<span className="text-white font-medium">Performance de Vendedores</span>
								</div>
								<div className="md:col-span-4 flex justify-center">
									<Minus className="w-6 h-6 text-white/20" />
								</div>
								<div className="md:col-span-4 flex justify-center">
									<CheckCircle2 className="w-6 h-6 text-blue-400" />
								</div>
							</div>

							{/* Performance Parceiros */}
							<div className="p-3 grid md:grid-cols-12 gap-4 items-center rounded-lg hover:bg-blue-500/10 transition-colors">
								<div className="md:col-span-4 flex items-center gap-3">
									<div className="p-2 bg-pink-500/20 rounded-lg text-pink-400">
										<Handshake className="w-5 h-5" />
									</div>
									<span className="text-white font-medium">Gestão de Parceiros/Influencers</span>
								</div>
								<div className="md:col-span-4 flex justify-center">
									<Minus className="w-6 h-6 text-white/20" />
								</div>
								<div className="md:col-span-4 flex justify-center">
									<CheckCircle2 className="w-6 h-6 text-blue-400" />
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		),
	},
	{
		id: "poi",
		type: "columns",
		title: "Ponto de Interação (POI)",
		subtitle: "Autoatendimento e Gamificação no Balcão.",
		content: (
			<div className="grid lg:grid-cols-2 gap-16 items-center mt-8 max-w-6xl w-full">
				<div>
					<div className="grid sm:grid-cols-2 gap-4 mb-8">
						<div className="p-4 rounded-xl bg-zinc-900/50 border border-white/5 hover:border-[#24549C]/30 transition-colors">
							<Users className="w-5 h-5 text-[#24549C] mb-2" />
							<h4 className="font-semibold text-white">Identificação Simples</h4>
							<p className="text-sm text-white/50">Cliente digita o WhatsApp e já acessa seu perfil e saldo.</p>
						</div>
						<div className="p-4 rounded-xl bg-zinc-900/50 border border-white/5 hover:border-[#24549C]/30 transition-colors">
							<Trophy className="w-5 h-5 text-[#24549C] mb-2" />
							<h4 className="font-semibold text-white">Gamificação</h4>
							<p className="text-sm text-white/50">Rankings em tempo real estimulam a competição saudável.</p>
						</div>
					</div>
					<p className="text-lg text-white/60 mb-8 leading-relaxed">
						Transforme o balcão em um ponto de experiência. Com o POI (Tablet), o cliente visualiza seu cashback, vê ofertas personalizadas e se engaja com
						a marca enquanto é atendido.
					</p>
				</div>

				<div className="relative">
					{/* Mock UI POI (Tablet) */}
					<div className="bg-black border-[8px] border-zinc-800 rounded-[2rem] p-2 shadow-2xl flex flex-col gap-4 aspect-[4/3] relative overflow-hidden group">
						{/* Status Bar */}
						<div className="absolute top-0 inset-x-0 h-6 bg-black z-20 flex justify-between px-6 items-center">
							<div className="text-[10px] text-white/50">9:41</div>
							<div className="flex gap-1">
								<div className="w-3 h-3 rounded-full bg-white/20" />
								<div className="w-3 h-3 rounded-full bg-white/20" />
							</div>
						</div>

						{/* POI App Content */}
						<div className="flex-1 bg-zinc-950 rounded-2xl overflow-hidden flex flex-col relative z-10 pt-8 px-6 pb-6">
							{/* Header */}
							<div className="flex flex-col items-center mb-6">
								<div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mb-2">
									<Store className="w-6 h-6 text-white" />
								</div>
								<div className="h-2 w-24 bg-white/20 rounded-full" />
							</div>

							{/* Main Actions */}
							<div className="flex gap-4 h-full">
								{/* Left: Cashier/Sale */}
								<div className="flex-1 bg-blue-600 rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-2 relative overflow-hidden group/card cursor-pointer">
									<div className="absolute inset-0 bg-white/10 opacity-0 group-hover/card:opacity-100 transition-opacity" />
									<div className="bg-white/20 p-3 rounded-full mb-1">
										<ShoppingCart className="w-6 h-6 text-white" />
									</div>
									<div className="font-black text-white text-lg leading-tight">
										GANHAR
										<br />
										CASHBACK
									</div>
								</div>

								{/* Right: Secondary */}
								<div className="flex flex-col gap-4 w-1/3">
									<div className="flex-1 bg-zinc-800 rounded-2xl p-2 flex flex-col items-center justify-center text-center gap-1 border border-white/5">
										<Coins className="w-5 h-5 text-yellow-400" />
										<div className="text-[10px] font-bold text-white/60">SALDO</div>
									</div>
									<div className="flex-1 bg-zinc-800 rounded-2xl p-2 flex flex-col items-center justify-center text-center gap-1 border border-white/5">
										<Trophy className="w-5 h-5 text-orange-400" />
										<div className="text-[10px] font-bold text-white/60">RANKING</div>
									</div>
								</div>
							</div>
						</div>
					</div>

					{/* Floating Hand/Touch Indicator (Optional) */}
					<div className="absolute bottom-10 right-10 w-12 h-12 bg-white/20 rounded-full animate-ping duration-[3000ms]" />
					<div className="absolute bottom-10 right-10 w-12 h-12 bg-white/30 backdrop-blur-md rounded-full border border-white/50 flex items-center justify-center shadow-lg">
						<div className="w-8 h-8 rounded-full bg-white/80" />
					</div>
				</div>
			</div>
		),
	},
	{
		id: "ia-triagem",
		type: "columns",
		title: "Triagem com IA",
		subtitle: "Filtra curiosos e entrega compradores.",
		content: (
			<div className="grid lg:grid-cols-2 gap-16 items-center mt-8 max-w-6xl w-full">
				<div>
					<div className="space-y-4 mb-8">
						<div className="flex items-start gap-4">
							<div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0 border border-green-500/20">
								<Bot className="w-5 h-5 text-green-500" />
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
								<p className="text-sm text-white/60">Detectou interesse em fechar? A IA alerta seu vendedor e transfere o atendimento com todo o contexto.</p>
							</div>
						</div>
					</div>
					<p className="text-lg text-white/60 mb-8 leading-relaxed">
						Sua equipe perde horas respondendo "tem disponível?" ou "qual o preço?". Nosso agente de IA assume a linha de frente: tira dúvidas técnicas,
						consulta estoque em tempo real e transfere para o humano apenas quando o cliente demonstra real intenção de compra.
					</p>
				</div>

				<div className="relative">
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
		),
	},
	{
		id: "automacao-ativa",
		type: "columns",
		title: "Fidelize no Automático",
		subtitle: "Recuperação de Inativos e Pós-Venda.",
		content: (
			<div className="grid lg:grid-cols-2 gap-16 items-center mt-8 max-w-6xl w-full">
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
					<div className="grid gap-6 mb-8">
						<div className="p-4 rounded-xl bg-zinc-900/50 border border-white/5 hover:border-blue-500/30 transition-colors">
							<h4 className="font-semibold text-white mb-2 flex items-center gap-2">
								<MessageCircle className="w-4 h-4 text-blue-400" /> Recuperação de Inativos
							</h4>
							<p className="text-sm text-white/60">O sistema identifica quem parou de comprar e envia ofertas automáticas para reativar o cliente.</p>
						</div>
						<div className="p-4 rounded-xl bg-zinc-900/50 border border-white/5 hover:border-blue-500/30 transition-colors">
							<h4 className="font-semibold text-white mb-2 flex items-center gap-2">
								<Trophy className="w-4 h-4 text-yellow-400" /> Pós-Venda Premium
							</h4>
							<p className="text-sm text-white/60">Mensagens de agradecimento, pesquisa de satisfação e avisos de cashback expirando.</p>
						</div>
					</div>
					<p className="text-lg text-white/60 mb-8 leading-relaxed">
						Enquanto sua equipe foca em vender, nossa automação cuida do relacionamento. Crie réguas de comunicação personalizadas que reagem ao
						comportamento de compra do cliente.
					</p>
				</div>
			</div>
		),
	},
	{
		id: "rfm",
		type: "columns",
		title: "Fidelização com Dados",
		subtitle: "Segmentação RFM e Cashback.",
		content: (
			<div className="grid lg:grid-cols-2 gap-16 items-center mt-8 max-w-6xl w-full">
				<div className="relative">
					{/* Mock UI RFM */}
					<div className="bg-black border border-white/10 rounded-2xl p-6 shadow-2xl">
						<div className="flex items-center gap-4 mb-8">
							<div className="p-3 bg-zinc-900 rounded-lg border border-white/10">
								<Layers className="w-6 h-6 text-[#FFB900]" />
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
							<ChevronRight className="w-4 h-4 text-white/40" />
						</div>
					</div>
				</div>

				<div>
					<div className="grid sm:grid-cols-2 gap-6 mb-8">
						<div className="p-4 rounded-xl bg-zinc-900/50 border border-white/5">
							<h4 className="font-semibold text-white mb-2 flex items-center gap-2">
								<Layers className="w-4 h-4 text-[#FFB900]" /> Análise RFM
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
					<p className="text-lg text-white/60 mb-8 leading-relaxed">
						Transforme dados brutos em estratégias de lealdade. Utilize nossa análise RFM para identificar quem são seus melhores clientes e crie programas
						de Cashback que incentivam o retorno imediato.
					</p>
				</div>
			</div>
		),
	},
	{
		id: "analytics",
		type: "columns",
		title: "Analytics Completo",
		subtitle: "Gestão visível e acionável.",
		content: <AnalyticsSlideContent />,
	},
	{
		id: "integrations",
		type: "columns",
		title: "Integração Profunda de Dados",
		subtitle: "Não recebemos apenas o valor total. Entendemos a venda.",
		content: (
			<div className="grid md:grid-cols-2 gap-8 mt-12 w-full max-w-6xl">
				{/* Online Software */}
				<div className="bg-zinc-900 border border-white/10 p-8 rounded-3xl flex flex-col hover:border-blue-500/30 transition-all group relative overflow-hidden h-[500px]">
					<div className="absolute top-0 right-0 p-4 opacity-50">
						<FileJson className="w-24 h-24 text-white/5" />
					</div>

					<div className="flex items-center gap-4 mb-6 z-10">
						<div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center p-2 shadow-lg">
							<Image src={OnlineSoftwareLogo} alt="Online Software" className="w-full h-auto object-contain" />
						</div>
						<div>
							<h3 className="text-xl font-bold text-white">Online Software</h3>
							<div className="flex items-center gap-2 text-xs text-blue-300">
								<RefreshCw className="w-3 h-3 animate-spin-slow" />
								Sync: 5 min
							</div>
						</div>
					</div>

					{/* Data Preview */}
					<div className="flex-1 bg-black/50 rounded-xl p-4 font-mono text-xs text-blue-100/70 overflow-hidden relative border border-white/5">
						<div className="absolute top-0 left-0 w-full h-8 bg-linear-to-b from-zinc-900 to-transparent z-10" />
						<div className="space-y-1 opacity-80">
							<p>
								<span className="text-pink-400">"cliente"</span>: <span className="text-green-300">"João da Silva"</span>,
							</p>
							<p>
								<span className="text-pink-400">"documento"</span>: <span className="text-green-300">"123.456.789-00"</span>,
							</p>
							<p>
								<span className="text-pink-400">"valor"</span>: <span className="text-yellow-300">150.00</span>,
							</p>
							<p>
								<span className="text-pink-400">"itens"</span>: [
							</p>
							<div className="pl-4 border-l border-white/10">
								<p>{"{"}</p>
								<p className="pl-4">
									<span className="text-pink-400">"codigo"</span>: <span className="text-green-300">"SKU-123"</span>,
								</p>
								<p className="pl-4">
									<span className="text-pink-400">"descricao"</span>: <span className="text-green-300">"Camisa Polo"</span>,
								</p>
								<p className="pl-4">
									<span className="text-pink-400">"vprod"</span>: <span className="text-yellow-300">75.00</span>,
								</p>
								<p className="pl-4">
									<span className="text-pink-400">"grupo"</span>: <span className="text-green-300">"Vestuário"</span>
								</p>
								<p>{"},"}</p>
								<p>{"..."}</p>
							</div>
							<p>]</p>
							<p>
								<span className="text-pink-400">"parceiro"</span>: <span className="text-green-300">"Influencer 01"</span>
							</p>
						</div>
						<div className="absolute bottom-0 left-0 w-full h-24 bg-linear-to-t from-zinc-900 via-zinc-900/80 to-transparent z-10 flex items-end justify-center pb-4">
							<span className="text-white/40 text-xs">Análise detalhada de Itens, Grupos e Parceiros</span>
						</div>
					</div>
				</div>

				{/* Cardápio Web */}
				<div className="bg-zinc-900 border border-white/10 p-8 rounded-3xl flex flex-col hover:border-green-500/30 transition-all group relative overflow-hidden h-[500px]">
					<div className="absolute top-0 right-0 p-4 opacity-50">
						<FileJson className="w-24 h-24 text-white/5" />
					</div>

					<div className="flex items-center gap-4 mb-6 z-10">
						<div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center p-2 shadow-lg">
							<Image src={CardapioWebLogo} alt="Cardápio Web" className="w-full h-auto object-contain" />
						</div>
						<div>
							<h3 className="text-xl font-bold text-white">Cardápio Web</h3>
							<div className="flex items-center gap-2 text-xs text-green-300">
								<RefreshCw className="w-3 h-3 animate-spin-slow" />
								Sync: 5 min
							</div>
						</div>
					</div>

					{/* Data Preview */}
					<div className="flex-1 bg-black/50 rounded-xl p-4 font-mono text-xs text-green-100/70 overflow-hidden relative border border-white/5">
						<div className="absolute top-0 left-0 w-full h-8 bg-linear-to-b from-zinc-900 to-transparent z-10" />
						<div className="space-y-1 opacity-80">
							<p>
								<span className="text-pink-400">"order_type"</span>: <span className="text-green-300">"takeout"</span>,
							</p>
							<p>
								<span className="text-pink-400">"payment_method"</span>: <span className="text-green-300">"pix"</span>,
							</p>
							<p>
								<span className="text-pink-400">"items"</span>: [
							</p>
							<div className="pl-4 border-l border-white/10">
								<p>{"{"}</p>
								<p className="pl-4">
									<span className="text-pink-400">"name"</span>: <span className="text-green-300">"Hamburguer"</span>,
								</p>
								<p className="pl-4">
									<span className="text-pink-400">"options"</span>: [
								</p>
								<div className="pl-4 border-l border-white/10 text-white/50">
									<p>{'{ "name": "Bacon" },'}</p>
									<p>{'{ "name": "Coca Cola" }'}</p>
								</div>
								<p className="pl-4">]</p>
								<p>{"},"}</p>
							</div>
							<p>]</p>
							<p>
								<span className="text-pink-400">"customer"</span>: <span className="text-green-300">"..."</span>
							</p>
						</div>
						<div className="absolute bottom-0 left-0 w-full h-24 bg-linear-to-t from-zinc-900 via-zinc-900/80 to-transparent z-10 flex items-end justify-center pb-4">
							<span className="text-white/40 text-xs">Preferências de sabor, Adicionais e Hábitos</span>
						</div>
					</div>
				</div>
			</div>
		),
	},
	{
		id: "roadmap",
		type: "roadmap",
		title: "Roadmap: Próximos 3 Meses",
		subtitle: "Construindo o futuro do varejo integrado.",
		content: (
			<div className="w-full max-w-5xl mt-12 bg-zinc-900/50 border border-white/10 rounded-3xl p-8 backdrop-blur-sm relative overflow-hidden">
				{/* Grid Background */}
				<div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:33.33%_100%] pointer-events-none" />

				{/* Header Months */}
				<div className="grid grid-cols-3 mb-8 relative z-10 text-center uppercase tracking-widest text-sm font-bold text-white/40">
					<div>Mês 1</div>
					<div>Mês 2</div>
					<div>Mês 3</div>
				</div>

				{/* Timeline Rows */}
				<div className="space-y-8 relative z-10">
					{/* ERP Row */}
					<div className="relative">
						<div className="flex items-center gap-4 mb-2">
							<div className="p-2 bg-purple-500/20 rounded-lg">
								<Store className="w-5 h-5 text-purple-400" />
							</div>
							<span className="font-bold text-white">ERP Varejo Completo</span>
						</div>
						{/* Bar Container */}
						<div className="h-12 w-full bg-white/5 rounded-full relative overflow-hidden flex items-center">
							{/* Active Bar - Spans 66% (2 months) */}
							<motion.div
								initial={{ width: 0 }}
								whileInView={{ width: "66.66%" }}
								transition={{ duration: 1, ease: "easeOut" }}
								className="h-full bg-linear-to-r from-purple-600 to-blue-600 rounded-l-full relative group"
							>
								<div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
								<div className="absolute top-1/2 -translate-y-1/2 right-4 text-xs font-bold text-white whitespace-nowrap drop-shadow-md">Entrega Fase 1</div>
							</motion.div>
						</div>
						{/* Subtasks */}
						<div className="flex justify-between w-[66%] px-4 mt-2 text-xs text-white/50">
							<span>PDV & Estoque</span>
							<span>Fiscal & Financeiro</span>
						</div>
					</div>

					{/* Agent Row */}
					<div className="relative">
						<div className="flex items-center gap-4 mb-2">
							<div className="p-2 bg-orange-500/20 rounded-lg">
								<Bot className="w-5 h-5 text-orange-400" />
							</div>
							<span className="font-bold text-white">Agente IA 2.0</span>
						</div>
						{/* Bar Container */}
						<div className="h-12 w-full bg-white/5 rounded-full relative overflow-hidden flex items-center">
							{/* Spacer for start delay (approx 1.5 months = 50%) */}
							<div className="w-[50%] h-full flex-shrink-0" />

							{/* Active Bar - Spans remaining */}
							<motion.div
								initial={{ width: 0 }}
								whileInView={{ width: "50%" }}
								transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
								className="h-full bg-linear-to-r from-orange-500 to-red-500 rounded-r-full relative group"
							>
								<div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
								<div className="absolute top-1/2 -translate-y-1/2 left-4 text-xs font-bold text-white whitespace-nowrap drop-shadow-md">Início Fase 2</div>
							</motion.div>
						</div>
						{/* Subtasks */}
						<div className="flex justify-end w-full px-4 mt-2 text-xs text-white/50 gap-16">
							<span>Treinamento RAG</span>
							<span>Autonomia Total</span>
						</div>
					</div>
				</div>

				{/* Current Status Line (Optional Decor) */}
				<div className="absolute top-0 bottom-0 left-[10%] w-0.5 bg-green-500 z-20 shadow-[0_0_10px_rgba(34,197,94,0.5)]">
					<div className="absolute top-4 left-1/2 -translate-x-1/2 bg-green-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full">HOJE</div>
				</div>
			</div>
		),
	},
];

export default function PresentationPage() {
	const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
	const [direction, setDirection] = useState(0);

	const nextSlide = useCallback(() => {
		setDirection(1);
		setCurrentSlideIndex((prev) => (prev + 1 < SLIDES.length ? prev + 1 : prev));
	}, []);

	const prevSlide = useCallback(() => {
		setDirection(-1);
		setCurrentSlideIndex((prev) => (prev - 1 >= 0 ? prev - 1 : prev));
	}, []);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "ArrowRight" || e.key === " ") {
				e.preventDefault();
				nextSlide();
			}
			if (e.key === "ArrowLeft") {
				e.preventDefault();
				prevSlide();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [nextSlide, prevSlide]);

	const currentSlide = SLIDES[currentSlideIndex];

	return (
		<div className="fixed inset-0 z-50 w-screen h-screen bg-black text-white overflow-hidden flex flex-col font-sans selection:bg-blue-500/30">
			{/* Header / Nav */}
			<div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-20">
				<div className="flex items-center gap-2 opacity-0 animate-in fade-in duration-1000 slide-in-from-top-4 fill-mode-forwards">
					<Image src={LogoCompleteHorizontalColorful} alt="Logo" width={140} height={40} className="w-auto h-8" />
					<div className="h-6 w-px bg-white/20 mx-2" />
					<span className="text-xs font-bold text-white/30 tracking-[0.2em] uppercase">Investor Deck</span>
				</div>
				<Link href="/">
					<Button variant="ghost" size="icon" className="rounded-full hover:bg-white/10 text-white transition-colors">
						<X className="w-5 h-5" />
					</Button>
				</Link>
			</div>

			{/* Main Content Area */}
			<div className="flex-1 relative flex items-center justify-center p-8 md:p-16">
				<AnimatePresence initial={false} mode="wait" custom={direction}>
					<motion.div
						key={currentSlide.id}
						custom={direction}
						initial={{ opacity: 0, x: direction > 0 ? 50 : -50, filter: "blur(10px)" }}
						animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
						exit={{ opacity: 0, x: direction > 0 ? -50 : 50, filter: "blur(10px)" }}
						transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
						className="w-full h-full flex flex-col items-center justify-center max-w-7xl mx-auto mb-16"
					>
						{/* Slide Header (Except for Intro) */}
						{currentSlide.type !== "cover" && (
							<div className="text-center mb-10 relative z-10 space-y-3">
								<motion.h2
									initial={{ opacity: 0, y: -20 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: 0.2 }}
									className="text-3xl md:text-5xl font-bold tracking-tight text-white"
								>
									{currentSlide.title}
								</motion.h2>
								{currentSlide.subtitle && (
									<motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="text-lg text-white/50 font-medium">
										{currentSlide.subtitle}
									</motion.p>
								)}
							</div>
						)}

						{/* Slide Content */}
						{currentSlide.content && (
							<motion.div
								initial={{ opacity: 0, scale: 0.98, y: 10 }}
								animate={{ opacity: 1, scale: 1, y: 0 }}
								transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
								className="w-full flex justify-center items-center"
							>
								{currentSlide.content}
							</motion.div>
						)}
					</motion.div>
				</AnimatePresence>
			</div>

			{/* Footer / Controls */}
			<div className="absolute bottom-0 left-0 w-full p-6 flex flex-col gap-4 z-20 bg-linear-to-t from-black via-black/80 to-transparent pt-20">
				{/* Progress Bar */}
				<div className="w-full h-0.5 bg-white/5 rounded-full overflow-hidden max-w-3xl mx-auto">
					<motion.div
						className="h-full bg-linear-to-r from-blue-500 to-purple-500 shadow-[0_0_15px_rgba(59,130,246,0.8)]"
						initial={{ width: 0 }}
						animate={{ width: `${((currentSlideIndex + 1) / SLIDES.length) * 100}%` }}
						transition={{ duration: 0.5, ease: "circOut" }}
					/>
				</div>

				<div className="flex justify-between items-center w-full max-w-7xl mx-auto">
					<div className="text-[10px] font-bold tracking-widest text-white/20 font-mono uppercase">
						{currentSlide.id} • {currentSlideIndex + 1}/{SLIDES.length}
					</div>

					<div className="flex gap-3">
						<Button
							variant="outline"
							size="icon"
							onClick={prevSlide}
							disabled={currentSlideIndex === 0}
							className="rounded-full w-12 h-12 bg-white/5 border-white/5 text-white hover:bg-white/10 hover:border-white/10 disabled:opacity-20 transition-all active:scale-95 backdrop-blur-sm"
						>
							<ChevronLeft className="w-5 h-5" />
						</Button>
						<Button
							variant="outline"
							size="icon"
							onClick={nextSlide}
							disabled={currentSlideIndex === SLIDES.length - 1}
							className="rounded-full w-12 h-12 bg-white/10 border-white/10 text-white hover:bg-white/20 hover:border-white/20 disabled:opacity-20 transition-all active:scale-95 backdrop-blur-sm shadow-xl shadow-black/50"
						>
							<ChevronRight className="w-5 h-5" />
						</Button>
					</div>
				</div>
			</div>

			{/* Background Ambient */}
			<div className="fixed inset-0 pointer-events-none z-0">
				<div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-blue-900/10 rounded-full blur-[180px] animate-pulse duration-[5000ms]" />
				<div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-indigo-900/10 rounded-full blur-[180px] animate-pulse duration-[7000ms]" />
				<div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay" />
			</div>
		</div>
	);
}
