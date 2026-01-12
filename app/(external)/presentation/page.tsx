"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import LogoCompleteHorizontalColorful from "@/utils/svgs/logos/RECOMPRA - COMPLETE - HORIZONTAL- COLORFUL.svg";
import { AnimatePresence, motion } from "framer-motion";
import {
	ArrowRight,
	BarChart3,
	Bot,
	CheckCircle2,
	ChevronLeft,
	ChevronRight,
	Clock,
	DollarSign,
	Grid3X3,
	LayoutDashboard,
	MessageCircle,
	MessageSquare,
	PieChart,
	ShoppingCart,
	Target,
	TrendingUp,
	Users,
	Wallet,
	X,
	Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

// --- Types & Data ---

type SlideData = {
	id: string;
	type: "cover" | "problem" | "concept" | "feature" | "proof" | "cta";
	title?: string;
	subtitle?: string;
	content?: React.ReactNode;
	bgClass?: string;
};

const SLIDES: SlideData[] = [
	{
		id: "intro",
		type: "cover",
		title: "A Revolução do Varejo",
		subtitle: "Gestão, Inteligência e Fidelização em uma única plataforma.",
	},
	{
		id: "problem",
		type: "problem",
		title: "O Varejo Tradicional está Quebrado",
		subtitle: "Você perde dinheiro todos os dias e nem percebe.",
		content: (
			<div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12 w-full max-w-5xl">
				<div className="bg-red-500/10 border border-red-500/20 p-8 rounded-2xl flex flex-col items-center text-center">
					<div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
						<Clock className="w-8 h-8 text-red-500" />
					</div>
					<h3 className="text-xl font-bold text-white mb-2">Tempo Perdido</h3>
					<p className="text-white/60">Sua equipe gasta 80% do tempo respondendo curiosos no WhatsApp em vez de vender.</p>
				</div>
				<div className="bg-red-500/10 border border-red-500/20 p-8 rounded-2xl flex flex-col items-center text-center">
					<div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
						<Users className="w-8 h-8 text-red-500" />
					</div>
					<h3 className="text-xl font-bold text-white mb-2">Clientes Esquecidos</h3>
					<p className="text-white/60">Sem fidelização ativa, 70% dos clientes nunca mais voltam após a primeira compra.</p>
				</div>
				<div className="bg-red-500/10 border border-red-500/20 p-8 rounded-2xl flex flex-col items-center text-center">
					<div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
						<DollarSign className="w-8 h-8 text-red-500" />
					</div>
					<h3 className="text-xl font-bold text-white mb-2">Dados Isolados</h3>
					<p className="text-white/60">Seu PDV não fala com seu Marketing. Você vende no escuro, sem saber quem é quem.</p>
				</div>
			</div>
		),
	},
	{
		id: "solution",
		type: "concept",
		title: "A Solução: Ecossistema Integrado",
		subtitle: "Tudo o que você precisa para crescer, conectado.",
		content: (
			<div className="relative flex items-center justify-center mt-12 w-full max-w-4xl h-[400px]">
				{/* Central Hub */}
				<div className="absolute z-20 bg-zinc-900 border border-white/10 p-8 rounded-full shadow-2xl w-64 h-64 flex flex-col items-center justify-center text-center animate-pulse">
					<Image src={LogoCompleteHorizontalColorful} alt="RecompraCRM" width={160} height={60} className="mb-2" />
					<span className="text-xs text-blue-400 font-bold tracking-widest">CORE</span>
				</div>

				{/* Satellites */}
				<div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-12 flex flex-col items-center gap-2">
					<div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center border border-blue-500/40">
						<ShoppingCart className="w-8 h-8 text-blue-400" />
					</div>
					<span className="text-white font-bold">PDV Ágil</span>
				</div>

				<div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-12 flex flex-col items-center gap-2">
					<div className="w-16 h-16 bg-green-500/20 rounded-2xl flex items-center justify-center border border-green-500/40">
						<Bot className="w-8 h-8 text-green-400" />
					</div>
					<span className="text-white font-bold">IA & Triagem</span>
				</div>

				<div className="absolute left-0 top-1/2 -translate-x-12 -translate-y-1/2 flex flex-col items-center gap-2">
					<div className="w-16 h-16 bg-yellow-500/20 rounded-2xl flex items-center justify-center border border-yellow-500/40">
						<Wallet className="w-8 h-8 text-yellow-400" />
					</div>
					<span className="text-white font-bold">Cashback</span>
				</div>

				<div className="absolute right-0 top-1/2 translate-x-12 -translate-y-1/2 flex flex-col items-center gap-2">
					<div className="w-16 h-16 bg-purple-500/20 rounded-2xl flex items-center justify-center border border-purple-500/40">
						<BarChart3 className="w-8 h-8 text-purple-400" />
					</div>
					<span className="text-white font-bold">BI & Dados</span>
				</div>

				{/* Connecting Lines */}
				<svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
					<title>Connection Lines</title>
					<circle cx="50%" cy="50%" r="180" fill="none" stroke="white" strokeWidth="1" strokeDasharray="4 4" />
				</svg>
			</div>
		),
	},
	{
		id: "pos",
		type: "feature",
		title: "1. Frente de Caixa (PDV)",
		subtitle: "Venda sem sair da tela. Orçamentos em segundos.",
		content: (
			<div className="grid lg:grid-cols-2 gap-12 mt-8 items-center w-full max-w-6xl">
				<div className="space-y-6">
					<div className="flex items-start gap-4">
						<div className="p-2 bg-blue-500/10 rounded-lg">
							<LayoutDashboard className="w-6 h-6 text-blue-400" />
						</div>
						<div>
							<h4 className="text-xl font-bold text-white">Interface Visual</h4>
							<p className="text-white/60">Esqueça códigos complexos. Navegue por categorias e fotos.</p>
						</div>
					</div>
					<div className="flex items-start gap-4">
						<div className="p-2 bg-blue-500/10 rounded-lg">
							<ShoppingCart className="w-6 h-6 text-blue-400" />
						</div>
						<div>
							<h4 className="text-xl font-bold text-white">Carrinho Inteligente</h4>
							<p className="text-white/60">Monte kits, adicione descontos e feche vendas com poucos cliques.</p>
						</div>
					</div>
					<div className="flex items-start gap-4">
						<div className="p-2 bg-blue-500/10 rounded-lg">
							<Zap className="w-6 h-6 text-blue-400" />
						</div>
						<div>
							<h4 className="text-xl font-bold text-white">Integrado ao Cliente</h4>
							<p className="text-white/60">O sistema já sabe quem é o cliente e quanto ele tem de cashback.</p>
						</div>
					</div>
				</div>
				<div className="relative h-[400px] bg-zinc-900 border border-white/10 rounded-xl overflow-hidden shadow-2xl">
					<div className="absolute top-0 left-0 w-1/4 h-full border-r border-white/5 bg-zinc-950 p-4 space-y-2">
						{[1, 2, 3, 4].map((i) => (
							<div key={i} className="h-10 bg-white/5 rounded w-full" />
						))}
					</div>
					<div className="absolute top-0 right-0 w-3/4 h-full p-4 grid grid-cols-3 gap-2 overflow-auto">
						{[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
							<div key={i} className="aspect-square bg-zinc-800 rounded flex flex-col p-2 gap-2">
								<div className="flex-1 bg-white/5 rounded" />
								<div className="h-2 w-2/3 bg-white/10 rounded" />
							</div>
						))}
					</div>
				</div>
			</div>
		),
	},
	{
		id: "ai",
		type: "feature",
		title: "2. Triagem com Inteligência Artificial",
		subtitle: "Filtra curiosos e entrega compradores prontos.",
		content: (
			<div className="flex flex-col md:flex-row gap-12 mt-8 items-center w-full max-w-6xl">
				<div className="flex-1 space-y-6 order-2 md:order-1">
					<div className="bg-zinc-900 border border-white/10 p-6 rounded-2xl">
						<h4 className="text-lg font-bold text-green-400 mb-4 flex items-center gap-2">
							<Bot className="w-5 h-5" /> O que a IA faz:
						</h4>
						<ul className="space-y-3">
							<li className="flex items-center gap-2 text-white/80">
								<CheckCircle2 className="w-4 h-4 text-green-500" /> Responde dúvidas técnicas 24/7
							</li>
							<li className="flex items-center gap-2 text-white/80">
								<CheckCircle2 className="w-4 h-4 text-green-500" /> Consulta estoque em tempo real
							</li>
							<li className="flex items-center gap-2 text-white/80">
								<CheckCircle2 className="w-4 h-4 text-green-500" /> Transfere para humano ao detectar compra
							</li>
						</ul>
					</div>
				</div>
				<div className="flex-1 order-1 md:order-2 w-full max-w-md">
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
							<div className="flex justify-end">
								<div className="bg-[#24549C] text-white py-2 px-4 rounded-2xl rounded-tr-sm max-w-[85%]">Vocês tem disjuntor de 40A?</div>
							</div>
							<div className="flex justify-start">
								<div className="bg-zinc-800 text-white/90 py-2 px-4 rounded-2xl rounded-tl-sm max-w-[85%] border border-white/5">
									Sim! Temos o modelo DIN da Siemens. Precisa de algo mais? ⚡
								</div>
							</div>
							<div className="flex justify-end">
								<div className="bg-[#24549C] text-white py-2 px-4 rounded-2xl rounded-tr-sm max-w-[85%]">Qual o preço?</div>
							</div>
							<div className="flex justify-start">
								<div className="bg-zinc-800 text-white/90 py-2 px-4 rounded-2xl rounded-tl-sm max-w-[85%] border border-white/5">
									Vou transferir para um vendedor passar a cotação! Só um instante! 👨‍💼
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		),
	},
	{
		id: "loyalty",
		type: "feature",
		title: "3. Fidelização Automática",
		subtitle: "Transforme clientes pontuais em fãs recorrentes.",
		content: (
			<div className="grid md:grid-cols-3 gap-6 mt-12 w-full max-w-6xl">
				<div className="bg-zinc-900/50 border border-white/10 p-6 rounded-xl hover:border-yellow-500/30 transition-colors">
					<div className="w-12 h-12 rounded-lg bg-yellow-500/20 flex items-center justify-center mb-4">
						<Wallet className="w-6 h-6 text-yellow-500" />
					</div>
					<h3 className="text-lg font-bold text-white mb-2">Cashback</h3>
					<p className="text-sm text-white/60">Devolva uma parte do valor como crédito para a próxima compra. O incentivo perfeito para o retorno.</p>
				</div>
				<div className="bg-zinc-900/50 border border-white/10 p-6 rounded-xl hover:border-blue-500/30 transition-colors">
					<div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center mb-4">
						<MessageSquare className="w-6 h-6 text-blue-500" />
					</div>
					<h3 className="text-lg font-bold text-white mb-2">Recuperação</h3>
					<p className="text-sm text-white/60">Identificou cliente inativo? O sistema envia uma oferta automática no WhatsApp para trazê-lo de volta.</p>
				</div>
				<div className="bg-zinc-900/50 border border-white/10 p-6 rounded-xl hover:border-purple-500/30 transition-colors">
					<div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center mb-4">
						<Grid3X3 className="w-6 h-6 text-purple-500" />
					</div>
					<h3 className="text-lg font-bold text-white mb-2">Segmentação RFM</h3>
					<p className="text-sm text-white/60">Saiba exatamente quem são seus clientes Campeões, Leais e Em Risco.</p>
				</div>
			</div>
		),
	},
	{
		id: "proof",
		type: "proof",
		title: "Resultados que Falam",
		subtitle: "O impacto real na operação de nossos parceiros.",
		content: (
			<div className="grid md:grid-cols-3 gap-6 mt-12 w-full max-w-6xl">
				<div className="bg-zinc-900 border border-white/10 p-8 rounded-2xl flex flex-col items-center text-center">
					<span className="text-4xl font-bold text-green-500 mb-2">+28%</span>
					<span className="text-white font-medium">Aumento na Recorrência</span>
					<p className="text-sm text-white/40 mt-2">Clientes voltam mais vezes por causa do Cashback.</p>
				</div>
				<div className="bg-zinc-900 border border-white/10 p-8 rounded-2xl flex flex-col items-center text-center">
					<span className="text-4xl font-bold text-blue-500 mb-2">40h</span>
					<span className="text-white font-medium">Economizadas/Mês</span>
					<p className="text-sm text-white/40 mt-2">A IA assume a triagem inicial e libera a equipe.</p>
				</div>
				<div className="bg-zinc-900 border border-white/10 p-8 rounded-2xl flex flex-col items-center text-center">
					<span className="text-4xl font-bold text-yellow-500 mb-2">3x</span>
					<span className="text-white font-medium">Mais Ágil no Balcão</span>
					<p className="text-sm text-white/40 mt-2">PDV visual acelera orçamentos complexos.</p>
				</div>
			</div>
		),
	},
	{
		id: "cta",
		type: "cta",
		title: "Pronto para evoluir?",
		subtitle: "Não deixe seu varejo parado no tempo.",
		content: (
			<div className="flex flex-col items-center gap-8 mt-12">
				<Link href="/auth/signin">
					<Button className="bg-[#24549C]! hover:bg-[#1e4682]! text-white! h-16 px-12 text-xl rounded-full shadow-xl shadow-blue-900/20 transform hover:scale-105 transition-all">
						Criar Conta Grátis <ArrowRight className="ml-3 w-6 h-6" />
					</Button>
				</Link>
				<p className="text-white/40 text-sm">Sem cartão de crédito • Setup em 5 minutos</p>
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
				e.preventDefault(); // Prevent scroll
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
		<div className="fixed inset-0 z-50 w-screen h-screen bg-black text-white overflow-hidden flex flex-col">
			{/* Header / Nav */}
			<div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-20">
				<div className="flex items-center gap-2">
					<Image src={LogoCompleteHorizontalColorful} alt="Logo" width={140} height={40} />
					<div className="h-6 w-px bg-white/20 mx-2" />
					<span className="text-xs font-medium text-white/40 tracking-widest uppercase">Apresentação Comercial</span>
				</div>
				<Link href="/">
					<Button variant="ghost" size="icon" className="rounded-full hover:bg-white/10 text-white">
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
						initial={{ opacity: 0, x: direction > 0 ? 100 : -100 }}
						animate={{ opacity: 1, x: 0 }}
						exit={{ opacity: 0, x: direction > 0 ? -100 : 100 }}
						transition={{ duration: 0.4, ease: "easeInOut" }}
						className="w-full h-full flex flex-col items-center justify-center max-w-7xl mx-auto"
					>
						{/* Slide Header */}
						<div className="text-center mb-8">
							{currentSlide.type === "cover" ? (
								<motion.div
									initial={{ opacity: 0, y: 20 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: 0.2 }}
									className="flex flex-col items-center gap-6"
								>
									<Image src={LogoCompleteHorizontalColorful} alt="RecompraCRM" width={160} height={60} className="mb-2" />
									<h1 className="text-5xl md:text-7xl font-bold bg-clip-text text-transparent bg-linear-to-r from-white via-white to-white/50 tracking-tight">
										{currentSlide.title}
									</h1>
									<p className="text-xl md:text-2xl text-blue-200/80 font-light max-w-2xl">{currentSlide.subtitle}</p>
								</motion.div>
							) : (
								<>
									<motion.h2 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-3xl md:text-5xl font-bold mb-4">
										{currentSlide.title}
									</motion.h2>
									<motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="text-lg md:text-xl text-white/60">
										{currentSlide.subtitle}
									</motion.p>
								</>
							)}
						</div>

						{/* Slide Content */}
						{currentSlide.content && (
							<motion.div
								initial={{ opacity: 0, scale: 0.95 }}
								animate={{ opacity: 1, scale: 1 }}
								transition={{ delay: 0.2, duration: 0.4 }}
								className="w-full flex justify-center"
							>
								{currentSlide.content}
							</motion.div>
						)}
					</motion.div>
				</AnimatePresence>
			</div>

			{/* Footer / Controls */}
			<div className="absolute bottom-0 left-0 w-full p-6 flex flex-col gap-4 z-20 bg-linear-to-t from-black to-transparent">
				{/* Progress Bar */}
				<div className="w-full h-1 bg-white/10 rounded-full overflow-hidden max-w-xl mx-auto">
					<motion.div
						className="h-full bg-[#24549C]"
						initial={{ width: 0 }}
						animate={{ width: `${((currentSlideIndex + 1) / SLIDES.length) * 100}%` }}
						transition={{ duration: 0.3 }}
					/>
				</div>

				<div className="flex justify-between items-center w-full max-w-7xl mx-auto">
					<div className="text-xs text-white/30 font-mono">
						SLIDE {currentSlideIndex + 1} / {SLIDES.length}
					</div>

					<div className="flex gap-2">
						<Button
							variant="outline"
							size="icon"
							onClick={prevSlide}
							disabled={currentSlideIndex === 0}
							className="rounded-full bg-white/5 border-white/10 text-white hover:bg-white/10 disabled:opacity-30"
						>
							<ChevronLeft className="w-5 h-5" />
						</Button>
						<Button
							variant="outline"
							size="icon"
							onClick={nextSlide}
							disabled={currentSlideIndex === SLIDES.length - 1}
							className="rounded-full bg-white/5 border-white/10 text-white hover:bg-white/10 disabled:opacity-30"
						>
							<ChevronRight className="w-5 h-5" />
						</Button>
					</div>
				</div>
			</div>

			{/* Background Ambient */}
			<div className="fixed inset-0 pointer-events-none z-0">
				<div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#24549C]/10 rounded-full blur-[120px]" />
				<div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-500/5 rounded-full blur-[120px]" />
			</div>
		</div>
	);
}
