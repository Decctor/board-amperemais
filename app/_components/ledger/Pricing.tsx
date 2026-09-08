import { ArrowRight, CheckCircle2, MessageCircle } from "lucide-react";
import { Reveal } from "./_primitives/Reveal";
import { Stamp } from "./_primitives/Stamp";
import { TrackedAnchor, TrackedLink } from "./TrackedLink";

// Tudo que já vem na plataforma (ambos os caminhos incluem isto).
const PLATFORM_INCLUDED = [
	"Ponto de Interação (tablet + QR Code)",
	"Programa de cashback configurável",
	"WhatsApp automático ilimitado",
	"Campanhas com filtro de audiência",
	"Painel de clientes em risco (RFM)",
	"Business Intelligence de vendas",
	"Suporte humano incluso",
];

// O que muda quando a gente opera por você (done-for-you).
const CONSULTORIA_INCLUDED = [
	"Um gestor de crescimento dedicado ao seu negócio",
	"Importação e integração dos seus dados de venda",
	"Criação e gestão das suas campanhas, ponta a ponta",
	"Diagnóstico inicial com metas definidas junto com você",
	"Relatório de resultado e acompanhamento todo mês",
];

const GUARANTEES = ["Sem cartão de crédito", "Cancele quando quiser", "Sem taxa de setup", "LGPD · Dados protegidos"];

const CONSULTORIA_WHATSAPP =
	"https://wa.me/553499480791?text=" +
	encodeURIComponent("Olá! Quero agendar um diagnóstico e entender a gestão com gestor de crescimento dedicado do RecompraCRM.");

export function LedgerPricing() {
	return (
		<section id="saldo" className="ledger-canvas ledger-deferred relative py-20 lg:py-28 overflow-hidden">
			{/* Subtle brand glow */}
			<div
				className="ledger-ambient absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-[#24549c]/4 blur-[120px] pointer-events-none"
				aria-hidden
			/>

			<div className="relative mx-auto max-w-7xl px-5 lg:px-8">
				{/* Section header */}
				<Reveal className="mb-12 lg:mb-16 text-center">
					<div className="flex items-center justify-center gap-3 mb-6">
						<span className="ledger-fade inline-block h-1.5 w-1.5 rounded-full bg-[#ffb900]" aria-hidden />
						<span
							className="ledger-fade text-[11px] font-extrabold tracking-[0.16em] uppercase text-[#24549c]"
							style={{ "--i": 1 } as React.CSSProperties}
							data-stagger
						>
							Planos
						</span>
					</div>
					<h2 className="font-extrabold text-[#171717] tracking-[-0.02em] leading-[1.05] text-[34px] sm:text-[44px] lg:text-[60px] max-w-[20ch] mx-auto">
						<span className="block ledger-write" style={{ "--i": 1 } as React.CSSProperties} data-stagger>
							Você opera.
						</span>
						<span className="block ledger-fade text-[#24549c]" style={{ "--i": 3 } as React.CSSProperties} data-stagger>
							Ou a gente opera por você.
						</span>
					</h2>
					<p
						className="ledger-fade mt-5 text-[16px] lg:text-[18px] text-[#171717]/65 max-w-[48ch] mx-auto"
						style={{ "--i": 6 } as React.CSSProperties}
						data-stagger
					>
						Mesma plataforma completa nos dois. A diferença é quem coloca a mão na massa pra fazer o resultado acontecer.
					</p>
				</Reveal>

				<Reveal>
					<div className="grid lg:grid-cols-2 gap-6 lg:gap-8 items-stretch max-w-5xl mx-auto">
						{/* Caminho 1 — Plataforma (self-serve, modesto) */}
						<div
							className="ledger-fade flex flex-col rounded-3xl bg-white border border-[#e5e5e5] shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-6 lg:p-8"
							style={{ "--i": 2 } as React.CSSProperties}
							data-stagger
						>
							<p className="text-[11px] font-extrabold tracking-[0.18em] uppercase text-[#171717]/55 mb-1.5">Plataforma</p>
							<p className="text-[15px] font-bold text-[#171717] mb-6">Você no controle.</p>

							<div className="flex items-baseline gap-1 mb-1">
								<span className="text-[20px] font-extrabold text-[#171717]/55 ledger-tabular">R$</span>
								<span className="text-[56px] lg:text-[64px] font-extrabold text-[#171717] leading-none tracking-[-0.04em] ledger-tabular">
									399
								</span>
								<span className="text-[20px] lg:text-[24px] font-extrabold text-[#171717]/80 ledger-tabular align-baseline ml-0.5">,90</span>
							</div>
							<p className="text-[12px] uppercase tracking-[0.12em] font-bold text-[#171717]/45 mb-6">por mês · 15 dias grátis</p>

							<ul className="space-y-3 mb-8 flex-1">
								{PLATFORM_INCLUDED.map((item) => (
									<li key={item} className="flex items-center gap-3">
										<span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#24549c]/10 shrink-0">
											<CheckCircle2 className="w-3.5 h-3.5 text-[#24549c]" strokeWidth={2.5} />
										</span>
										<span className="flex-1 text-[14px] text-[#171717]/85">{item}</span>
									</li>
								))}
							</ul>

							<TrackedLink
								href="/auth/signup"
								event="landing_cta_clicked"
								controlEvent="lead"
								properties={{ cta_id: "pricing_comecar_agora", location: "pricing" }}
								className="group mt-auto flex items-center justify-center gap-2 bg-white hover:bg-[#fafaf7] text-[#171717] text-center px-6 py-4 rounded-2xl border border-[#171717]/15 hover:border-[#171717]/30 transition-all duration-200"
							>
								<span className="text-[15px] font-extrabold tracking-[0.04em] uppercase">Começar agora</span>
								<ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
							</TrackedLink>
						</div>

						{/* Caminho 2 — Plataforma + Gestor de Crescimento (hero, recomendado) */}
						<div className="relative">
							{/* Selo fora do card com overflow-hidden, para não ser cortado; recuado da borda para caber no mobile */}
							<div className="absolute -top-3 right-5 z-[25] lg:right-6">
								<Stamp variant="amber" size="md" rotate={6}>
									Recomendado
								</Stamp>
							</div>
							<div
								className="ledger-fade relative flex flex-col h-full rounded-3xl bg-gradient-to-br from-[#24549c] to-[#1a3d7a] text-white p-7 lg:p-8 shadow-[0_28px_60px_-20px_rgba(36,84,156,0.45),0_8px_16px_rgba(36,84,156,0.18)] overflow-hidden"
								style={{ "--i": 4 } as React.CSSProperties}
								data-stagger
							>
								{/* decorative blob */}
								<div
									className="ledger-ambient absolute -top-16 -right-16 w-[200px] h-[200px] rounded-full bg-[#ffb900]/15 blur-3xl pointer-events-none"
									aria-hidden
								/>

								<p className="relative text-[11px] font-extrabold tracking-[0.18em] uppercase text-white/65 mb-1.5">Plataforma + Gestor de Crescimento</p>
								<p className="relative text-[15px] font-bold text-white mb-6">A gente opera por você.</p>

								<div className="relative flex items-baseline gap-1 mb-1">
									<span className="text-[20px] lg:text-[24px] font-extrabold text-white/70 ledger-tabular">R$</span>
									<span className="text-[56px] lg:text-[72px] font-extrabold text-[#ffb900] leading-none tracking-[-0.04em] ledger-tabular">
										899
									</span>
									<span className="text-[20px] lg:text-[26px] font-extrabold text-[#ffb900]/85 ledger-tabular align-baseline ml-0.5">,90</span>
								</div>
								<p className="relative text-[12px] uppercase tracking-[0.12em] font-bold text-white/55 mb-6">por mês · plataforma + consultoria</p>

								<p className="relative text-[11px] font-bold tracking-[0.1em] uppercase text-white/50 mb-3">Tudo da Plataforma, mais:</p>
								<ul className="relative space-y-3 mb-8 flex-1">
									{CONSULTORIA_INCLUDED.map((item) => (
										<li key={item} className="flex items-center gap-3">
											<span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#ffb900]/20 shrink-0">
												<CheckCircle2 className="w-3.5 h-3.5 text-[#ffb900]" strokeWidth={2.5} />
											</span>
											<span className="flex-1 text-[14px] text-white/90">{item}</span>
										</li>
									))}
								</ul>

								<TrackedAnchor
									href={CONSULTORIA_WHATSAPP}
									target="_blank"
									rel="noopener noreferrer"
									event="landing_cta_clicked"
									controlEvent="contact"
									properties={{ cta_id: "pricing_agendar_diagnostico", location: "pricing" }}
									className="relative group mt-auto flex items-center justify-center gap-2 bg-[#ffb900] hover:bg-[#e6a700] text-[#171717] text-center px-6 py-4 rounded-2xl transition-all duration-200 shadow-[0_8px_18px_-4px_rgba(0,0,0,0.20)] hover:-translate-y-0.5"
								>
									<MessageCircle className="w-4 h-4" strokeWidth={2.5} />
									<span className="text-[15px] font-extrabold tracking-[0.04em] uppercase">Agendar diagnóstico</span>
								</TrackedAnchor>
								<p className="relative mt-3 text-center text-[11px] text-white/55">Começa com uma conversa. Vagas limitadas.</p>
							</div>
						</div>
					</div>
				</Reveal>

				{/* Garantias — valem para os dois caminhos */}
				<Reveal className="mt-10 lg:mt-12">
					<div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 max-w-3xl mx-auto">
						{GUARANTEES.map((g) => (
							<div key={g} className="flex items-center gap-2 text-[12px] text-[#171717]/65">
								<span className="text-[#24549c] font-extrabold">✓</span>
								<span>{g}</span>
							</div>
						))}
					</div>
					<p className="mt-6 text-center text-[12px] text-[#737373]">
						Atende redes ou precisa de integração com ERP?{" "}
						<TrackedAnchor
							href="https://wa.me/553499480791"
							event="landing_cta_clicked"
							controlEvent="contact"
							properties={{ cta_id: "pricing_falar_com_a_gente", location: "pricing" }}
							className="font-extrabold tracking-[0.04em] uppercase text-[#24549c] hover:text-[#1a3d7a] underline decoration-[#ffb900] decoration-2 underline-offset-4"
						>
							Falar com a gente
						</TrackedAnchor>
					</p>
				</Reveal>
			</div>
		</section>
	);
}
