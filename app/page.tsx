"use client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import LogoCompleteHorizontalColorful from "@/utils/svgs/logos/RECOMPRA - COMPLETE - HORIZONTAL- COLORFUL.svg";
import { ArrowRight, ArrowUp, BadgePercent, BarChart3, Brain, CheckCircle2, ChevronDown, Grid3X3, MessageCircle, TrendingUp, X } from "lucide-react";
import Image from "next/image"; // ✅ ADICIONAR
import Link from "next/link";
export default function LandingPage() {
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
							<Image
								src={LogoCompleteHorizontalColorful} // ✅ troque pelo nome do seu arquivo
								alt="RecompraCRM"
								width={200}
								height={80}
								priority
							/>
							{/* Se quiser manter o texto ao lado, descomente: */}
							{/* <span className="text-xl font-bold tracking-tight text-white">recompracrm</span> */}
							<ArrowUp className="w-3 h-3 text-[#FFB900] opacity-0 group-hover:opacity-100 transition-opacity" />
						</Link>

						{/* Menu Center - Hidden em mobile */}
						<nav className="hidden lg:flex items-center gap-8">
							<Link href="#" className="flex items-center gap-1 text-sm text-white/80 hover:text-white transition-colors group">
								Produtos
								<ChevronDown className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity" />
							</Link>
							<Link href="#" className="flex items-center gap-1 text-sm text-white/80 hover:text-white transition-colors group">
								Soluções
								<ChevronDown className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity" />
							</Link>
							<Link href="#" className="flex items-center gap-1 text-sm text-white/80 hover:text-white transition-colors group">
								Cases
								<ChevronDown className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity" />
							</Link>
							<Link href="#" className="flex items-center gap-1 text-sm text-white/80 hover:text-white transition-colors group">
								Parceiros
								<ChevronDown className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity" />
							</Link>
							<Link href="#" className="text-sm text-white/80 hover:text-white transition-colors">
								Blog
							</Link>
							<Link href="#" className="text-sm text-white/80 hover:text-white transition-colors">
								Sobre nós
							</Link>
						</nav>

						{/* Botões à direita */}
						<div className="flex items-center gap-3">
							<a
								href="https://wa.me/5534999480791?text=Quero%20conhecer%20o%20RecompraCRM"
								target="_blank"
								rel="noopener noreferrer"
								className="flex items-center justify-center h-9 w-9 rounded-full bg-green-500 hover:bg-green-600 transition-colors"
							>
								<MessageCircle className="w-5 h-5 text-white" />
							</a>
							<Link href="/agenda-reuniao">
								<Button variant="outline" size="sm" className="!border-white/20 !text-white hover:!bg-white/10 hover:!border-white/30 !bg-transparent">
									<span className="text-white">Suporte</span>
								</Button>
							</Link>
							<Link href="/agenda-reuniao">
								<Button size="sm" className="!bg-[#24549C] hover:!bg-[#1e4682] !text-white !border-0 !shadow-lg">
									<span className="text-white">Agendar reunião</span>
								</Button>
							</Link>
						</div>
					</div>
				</div>
			</header>
			{/* Hero Section */}
			<section className="relative py-14 md:py- overflow-hidden">
				{/* Background Gradient */}
				<div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#1a0f08] to-[#0a0a0a]" />

				{/* Decorative background (simples e original) */}
				<div className="absolute inset-0 overflow-hidden pointer-events-none">
					{/* Glow suave azul */}
					<div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-[#24549C]/20 blur-3xl rounded-full" />

					{/* Grade bem sutil */}
					<div className="absolute inset-0 opacity-[0.06] bg-[linear-gradient(to_right,rgba(255,255,255,0.15)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.15)_1px,transparent_1px)] bg-[length:72px_72px]" />

					{/* Dois círculos de borda suave (mantém sua identidade) */}
					<div className="absolute top-1/4 left-1/4 w-96 h-96 border border-[#24549C]/20 rounded-full blur-3xl" />
					<div className="absolute bottom-1/4 right-1/4 w-96 h-96 border border-[#24549C]/20 rounded-full blur-3xl" />
				</div>
				<div className="relative container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center z-10">
					<h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6 text-white">
						Crie campanhas de cashback.
						<br />
						<span className="bg-gradient-to-r from-[#FFB900] to-[#E7000B] bg-clip-text text-transparent">Aumente sua taxa de Recompra.</span>
					</h1>
					<p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto mb-10">
						Da atração à conversão: soluções para a jornada do cliente no varejo — em um só lugar
					</p>

					<div className="flex flex-col sm:flex-row justify-center gap-4">
						<Link href="/agenda-reuniao">
							<Button size="lg" className="!bg-[#24549C] hover:!bg-[#1e4682] !text-white !border-0 !shadow-xl px-8 h-14 text-base font-semibold">
								<span className="text-white">Agende uma reunião</span>
								<ArrowRight className="ml-2 w-5 h-5 text-white" />
							</Button>
						</Link>
						<Link href="/agenda-reuniao">
							<Button
								size="lg"
								variant="outline"
								className="!border-[#24549C]/50 !text-white hover:!bg-[#24549C]/10 hover:!border-[#24549C] !bg-transparent px-8 h-14 text-base font-semibold"
							>
								<span className="text-white">Descubra cases de sucesso</span>
							</Button>
						</Link>
					</div>
				</div>
			</section>
			{/* Seção de Logos de Clientes */}
			<section className="py-12 bg-black border-y border-white/5">
				<div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
					<div className="overflow-hidden">
						<div className="flex w-max animate-marquee gap-16">
							{[
								"CONGELATTE",
								"AMPERE+",
								"FARMACIAS CRUZEIRO",
								"ESTEIO RURAL",
								"VIVA COMUNICAÇÃO",
								"LOJAS EDUARDO",
								"CRUZEIRO MANIPULAÇÃO",

								// DUPLICADO (pra ficar infinito)
								"CONGELATTE",
								"AMPERE+",
								"FARMACIAS CRUZEIRO",
								"ESTEIO RURAL",
								"VIVA COMUNICAÇÃO",
								"LOJAS EDUARDO",
								"CRUZEIRO MANIPULAÇÃO",
							].map((logo, idx) => (
								<div
									key={logo}
									className="text-white/40 hover:text-white/60 transition-colors text-sm md:text-base font-semibold uppercase tracking-wider whitespace-nowrap cursor-pointer"
								>
									{logo}
								</div>
							))}
						</div>
					</div>
				</div>
			</section>
			{/* Como Funciona */}
			<section className="py-20 md:py-28 bg-black">
				<div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
					<h2 className="text-3xl md:text-4xl font-bold text-center mb-16 text-white">Como funciona</h2>

					<div className="grid md:grid-cols-3 gap-10">
						<div className="space-y-4 text-center">
							<div className="mx-auto w-16 h-16 flex items-center justify-center rounded-full bg-[#24549C]/10 border border-[#24549C]/20">
								<CheckCircle2 className="w-8 h-8 text-[#FFB900]" />
							</div>
							<h3 className="text-xl md:text-2xl font-semibold text-white">1. Conecte seus dados</h3>
							<p className="text-white/60 leading-relaxed">Importe suas bases e integre seus canais de vendas e atendimento em minutos.</p>
						</div>

						<div className="space-y-4 text-center">
							<div className="mx-auto w-16 h-16 flex items-center justify-center rounded-full bg-[#24549C]/10 border border-[#24549C]/20">
								<BarChart3 className="w-8 h-8 text-[#FFB900]" />
							</div>
							<h3 className="text-xl md:text-2xl font-semibold text-white">2. Analise com clareza</h3>
							<p className="text-white/60 leading-relaxed">Tenha visão completa das suas vendas, funil e performance comercial.</p>
						</div>

						<div className="space-y-4 text-center">
							<div className="mx-auto w-16 h-16 flex items-center justify-center rounded-full bg-[#24549C]/10 border border-[#24549C]/20">
								<TrendingUp className="w-8 h-8 text-[#FFB900]" />
							</div>
							<h3 className="text-xl md:text-2xl font-semibold text-white">3. Automatize ações</h3>
							<p className="text-white/60 leading-relaxed">Crie fluxos automáticos de resposta e campanhas inteligentes com IA.</p>
						</div>
					</div>
				</div>
			</section>
			{/* Recursos Principais */}
			<section className="py-20 md:py-28 bg-zinc-950">
				<div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
					<h2 className="text-3xl md:text-4xl font-bold text-center mb-16 text-white">Recursos Principais</h2>

					<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
						<Card className="bg-black border-white/10 hover:border-[#24549C]/50 transition-colors">
							<div className="p-6 space-y-3">
								<BarChart3 className="w-6 h-6 text-[#FFB900]" />
								<h4 className="font-semibold text-lg text-white">Business Intelligence</h4>
								<p className="text-sm text-white/60">Dashboards e insights para decisões rápidas.</p>
							</div>
						</Card>

						<Card className="bg-zinc-900 border-white/10 hover:border-[#24549C]/50 transition-colors">
							<div className="p-6 space-y-3">
								<MessageCircle className="w-6 h-6 text-[#FFB900]" />
								<h4 className="font-semibold text-lg text-white">WhatsApp Hub</h4>
								<p className="text-sm text-white/60">Atendimento unificado e automações inteligentes.</p>
							</div>
						</Card>

						<Card className="bg-zinc-900 border-white/10 hover:border-[#24549C]/50 transition-colors">
							<div className="p-6 space-y-3">
								<Brain className="w-6 h-6 text-[#FFB900]" />
								<h4 className="font-semibold text-lg text-white">IA para Atendimento</h4>
								<p className="text-sm text-white/60">Assistente inteligente com histórico e entrega personalizada.</p>
							</div>
						</Card>

						<Card className="bg-zinc-900 border-white/10 hover:border-[#24549C]/50 transition-colors">
							<div className="p-6 space-y-3">
								<Grid3X3 className="w-6 h-6 text-[#FFB900]" />
								<h4 className="font-semibold text-lg text-white">Análise RFM</h4>
								<p className="text-sm text-white/60">Segmentação inteligente de clientes.</p>
							</div>
						</Card>

						<Card className="bg-zinc-900 border-white/10 hover:border-[#24549C]/50 transition-colors">
							<div className="p-6 space-y-3">
								<BadgePercent className="w-6 h-6 text-[#FFB900]" />
								<h4 className="font-semibold text-lg text-white">Programas de Cashback</h4>
								<p className="text-sm text-white/60">Acúmulo e regras personalizadas.</p>
							</div>
						</Card>

						<Card className="bg-zinc-900 border-white/10 hover:border-[#24549C]/50 transition-colors">
							<div className="p-6 space-y-3">
								<TrendingUp className="w-6 h-6 text-[#FFB900]" />
								<h4 className="font-semibold text-lg text-white">Relatórios Avançados</h4>
								<p className="text-sm text-white/60">Exportação, análise detalhada e insights estratégicos.</p>
							</div>
						</Card>
					</div>
				</div>
			</section>
			{/* Depoimentos */}
			<section className="py-20 md:py-28 bg-black">
				<div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
					<h2 className="text-3xl md:text-4xl font-bold text-center mb-16 text-white">O que nossos clientes dizem</h2>

					<div className="grid md:grid-cols-2 gap-8">
						<blockquote className="p-8 rounded-xl border border-white/10 bg-zinc-900 hover:border-[#24549C]/50 transition-colors">
							<p className="text-lg italic text-white/90 leading-relaxed">
								"RecompraCRM simplificou nossa rotina comercial e acelerou resultados em semanas."
							</p>
							<footer className="mt-6 font-semibold text-sm text-white/60">— Empresas do varejo</footer>
						</blockquote>

						<blockquote className="p-8 rounded-xl border border-white/10 bg-zinc-900 hover:border-[#24549C]/50 transition-colors">
							<p className="text-lg italic text-white/90 leading-relaxed">
								"Automatizamos processos que antes levavam dias em minutos. Excelente plataforma!"
							</p>
							<footer className="mt-6 font-semibold text-sm text-white/60">— Times comerciais</footer>
						</blockquote>
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
						<Link href="/auth/signin">
							<Button size="lg" className="!bg-[#24549C] hover:!bg-[#1e4682] !text-white !border-0 !shadow-xl px-8 h-14 text-base font-semibold">
								<span className="text-white">Agende uma demo</span>
							</Button>
						</Link>
						<Link href="/auth/signin">
							<Button
								size="lg"
								variant="outline"
								className="!border-[#24549C]/50 !text-white hover:!bg-[#24549C]/10 hover:!border-[#24549C] !bg-transparent px-8 h-14 text-base font-semibold"
							>
								<span className="text-white">Abra sua conta</span>
							</Button>
						</Link>
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

				{/* Cookie Bar */}
				<div className="border-t border-white/10 bg-zinc-900">
					<div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
						<div className="flex flex-col sm:flex-row items-center justify-between gap-4">
							<p className="text-sm text-white/80 text-center sm:text-left">A RecompraCRM agora é uma parceira Wake! Saiba mais sobre no nosso blog.</p>
							<div className="flex items-center gap-3">
								<Button variant="outline" size="sm" className="!border-white/20 !text-white hover:!bg-white/10 !bg-transparent">
									<span className="text-white">Solicitar suporte</span>
								</Button>
								<Button size="sm" className="!bg-[#24549C] hover:!bg-[#1e4682] !text-white !border-0">
									<span className="text-white">Agendar reunião</span>
								</Button>
								<button type="button" className="p-1 hover:bg-white/10 rounded transition-colors" aria-label="Fechar">
									<X className="w-4 h-4 text-white/60" />
								</button>
							</div>
						</div>
					</div>
				</div>
			</footer>
		</div>
	);
}
