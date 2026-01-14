"use client";

import { Button } from "@/components/ui/button";
import CardapioWebLogo from "@/utils/images/integrations/cardapio-web.png";
import OnlineSoftwareLogo from "@/utils/images/integrations/online-software-logo.png";
import LogoCompleteHorizontalColorful from "@/utils/svgs/logos/RECOMPRA - COMPLETE - HORIZONTAL- COLORFUL.svg";
import LogoCompleteVerticalColorful from "@/utils/svgs/logos/RECOMPRA - COMPLETE - VERTICAL - COLORFUL.svg";
import { AnimatePresence, motion } from "framer-motion";
import {
	BarChart3,
	Bot,
	Check,
	CheckCircle2,
	ChevronLeft,
	ChevronRight,
	FileJson,
	Handshake,
	Layers,
	LayoutDashboard,
	LineChart,
	Lock,
	Megaphone,
	Minus,
	RefreshCw,
	Sparkles,
	Store,
	Trophy,
	Users,
	Wallet,
	MessageCircle,
	X,
	Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

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
					<Image
						src={LogoCompleteVerticalColorful}
						alt="RecompraCRM"
						width={180}
						height={180}
						className="relative z-10 drop-shadow-2xl"
					/>
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
							O <strong className="text-blue-400 font-semibold">RecompraCRM</strong> impulsiona suas vendas através da fidelização inteligente da base de clientes.
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
							<p><span className="text-pink-400">"cliente"</span>: <span className="text-green-300">"João da Silva"</span>,</p>
							<p><span className="text-pink-400">"documento"</span>: <span className="text-green-300">"123.456.789-00"</span>,</p>
							<p><span className="text-pink-400">"valor"</span>: <span className="text-yellow-300">150.00</span>,</p>
							<p><span className="text-pink-400">"itens"</span>: [</p>
							<div className="pl-4 border-l border-white/10">
								<p>{"{"}</p>
								<p className="pl-4"><span className="text-pink-400">"codigo"</span>: <span className="text-green-300">"SKU-123"</span>,</p>
								<p className="pl-4"><span className="text-pink-400">"descricao"</span>: <span className="text-green-300">"Camisa Polo"</span>,</p>
								<p className="pl-4"><span className="text-pink-400">"vprod"</span>: <span className="text-yellow-300">75.00</span>,</p>
								<p className="pl-4"><span className="text-pink-400">"grupo"</span>: <span className="text-green-300">"Vestuário"</span></p>
								<p>{"},"}</p>
								<p>{"..."}</p>
							</div>
							<p>]</p>
							<p><span className="text-pink-400">"parceiro"</span>: <span className="text-green-300">"Influencer 01"</span></p>
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
							<p><span className="text-pink-400">"order_type"</span>: <span className="text-green-300">"takeout"</span>,</p>
							<p><span className="text-pink-400">"payment_method"</span>: <span className="text-green-300">"pix"</span>,</p>
							<p><span className="text-pink-400">"items"</span>: [</p>
							<div className="pl-4 border-l border-white/10">
								<p>{"{"}</p>
								<p className="pl-4"><span className="text-pink-400">"name"</span>: <span className="text-green-300">"Hamburguer"</span>,</p>
								<p className="pl-4"><span className="text-pink-400">"options"</span>: [</p>
								<div className="pl-4 border-l border-white/10 text-white/50">
									<p>{"{ \"name\": \"Bacon\" },"}</p>
									<p>{"{ \"name\": \"Coca Cola\" }"}</p>
								</div>
								<p className="pl-4">]</p>
								<p>{"},"}</p>
							</div>
							<p>]</p>
							<p><span className="text-pink-400">"customer"</span>: <span className="text-green-300">"..."</span></p>
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
			<div className="grid md:grid-cols-2 gap-8 mt-10 w-full max-w-6xl">
				{/* ERP Varejo */}
				<div className="relative group">
					<div className="absolute inset-0 bg-purple-500/10 blur-xl rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
					<div className="relative bg-zinc-900/90 border border-white/10 p-8 rounded-2xl space-y-6 hover:border-purple-500/30 transition-colors h-full">
						<div className="flex items-center justify-between mb-2">
							<div className="p-3 bg-purple-500/20 rounded-xl inline-block">
								<Store className="w-8 h-8 text-purple-400" />
							</div>
							<div className="text-xs font-bold text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full uppercase tracking-wider">
								Mês 1-2
							</div>
						</div>
						
						<div>
							<h3 className="text-2xl font-bold text-white">ERP Varejo Completo</h3>
							<p className="text-white/40 text-sm mt-1">Pronto para assumir a operação</p>
						</div>

						<div className="space-y-3 pt-4 border-t border-white/5">
							{[
								{ label: "PDV (Frente de Caixa)", icon: LayoutDashboard },
								{ label: "Controle de Estoque", icon: Layers },
								{ label: "Fiscal / Contábil / Financeiro", icon: BarChart3 },
								{ label: "Controle de Mesas e Comandas", icon: Users }
							].map((item, i) => (
								<div key={i} className="flex items-center gap-3 text-sm text-white/80">
									<div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center shrink-0">
										<item.icon className="w-3 h-3 text-purple-300" />
									</div>
									<span className="font-medium">{item.label}</span>
								</div>
							))}
						</div>
					</div>
				</div>

				{/* Agente atendimento */}
				<div className="relative group">
					<div className="absolute inset-0 bg-orange-500/10 blur-xl rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
					<div className="relative bg-zinc-900/90 border border-white/10 p-8 rounded-2xl space-y-6 hover:border-orange-500/30 transition-colors h-full">
						<div className="flex items-center justify-between mb-2">
							<div className="p-3 bg-orange-500/20 rounded-xl inline-block">
								<Bot className="w-8 h-8 text-orange-400" />
							</div>
							<div className="text-xs font-bold text-orange-400 bg-orange-500/10 px-3 py-1 rounded-full uppercase tracking-wider">
								Mês 3
							</div>
						</div>

						<div>
							<h3 className="text-2xl font-bold text-white">Agente de Atendimento 2.0</h3>
							<p className="text-white/40 text-sm mt-1">IA com autonomia total</p>
						</div>

						<div className="grid gap-3 pt-4 border-t border-white/5">
							<div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-2 hover:bg-white/10 transition-colors">
								<div className="flex items-center gap-2 text-orange-300 font-bold text-sm">
									<Layers className="w-4 h-4" />
									Base de Conhecimento RAG
								</div>
								<p className="text-xs text-white/50 leading-relaxed">
									A IA "aprende" sobre sua empresa lendo manuais, diretrizes e histórico de conversas.
								</p>
							</div>
							<div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-2 hover:bg-white/10 transition-colors">
								<div className="flex items-center gap-2 text-orange-300 font-bold text-sm">
									<Zap className="w-4 h-4" />
									Fechamento Autônomo
								</div>
								<p className="text-xs text-white/50 leading-relaxed">
									Capacidade de negociar, gerar links de pagamento e finalizar vendas sem humano.
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		),
	}
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
									<motion.p
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										transition={{ delay: 0.3 }}
										className="text-lg text-white/50 font-medium"
									>
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
