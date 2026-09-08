import Image, { type StaticImageData } from "next/image";
import { ArrowRight, Cake, CheckCircle2, Coins } from "lucide-react";
import { Reveal } from "./_primitives/Reveal";
import { ArtChip, LandingArt } from "./_primitives/LandingArt";
import BlingLogo from "@/utils/images/integrations/bling-logo.png";
import CardapioWebLogo from "@/utils/images/integrations/cardapio-web.png";
import IfoodLogo from "@/utils/images/integrations/ifood-logo.png";
import NuvemshopLogo from "@/utils/images/integrations/nuvemshop-logo.png";
import OnlineSoftwareLogo from "@/utils/images/integrations/online-software-logo.png";
import { TrackedAnchor, TrackedLink } from "./TrackedLink";

const HERO_TRUST = ["Sem cartão de crédito", "Configuração em um dia", "Suporte humano"];

const INTEGRATIONS: { name: string; logo: StaticImageData }[] = [
	{ name: "Online Software", logo: OnlineSoftwareLogo },
	{ name: "Cardápio Web", logo: CardapioWebLogo },
	{ name: "Nuvem Shop", logo: NuvemshopLogo },
	{ name: "iFood", logo: IfoodLogo },
	{ name: "Bling", logo: BlingLogo },
];

export function LedgerHero() {
	return (
		<section id="top" className="ledger-canvas-tinted relative overflow-hidden pt-24 pb-10 sm:pt-28 sm:pb-14 lg:pt-32 lg:pb-16">
			<div className="ledger-dot-grid pointer-events-none absolute inset-0" aria-hidden />
			<div className="ledger-hero-ambient pointer-events-none absolute inset-0" aria-hidden />

			<div className="relative mx-auto w-full max-w-7xl px-5 lg:px-8">
				<Reveal className="grid items-center gap-10 lg:grid-cols-[1.02fr_0.98fr] lg:gap-14">
					{/* Copy */}
					<div className="max-w-[600px]">
						<p
							className="ledger-fade mb-5 inline-flex items-center gap-2 rounded-full border border-[#24549c]/15 bg-white/70 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#24549c]"
							style={{ "--i": 0 } as React.CSSProperties}
							data-stagger
						>
							<span className="inline-block h-1.5 w-1.5 rounded-full bg-[#ffb900]" aria-hidden />
							CRM de recompra para o varejo
						</p>
						<h1 className="text-balance font-extrabold leading-[1.02] tracking-[-0.025em] text-[#171717] text-[36px] sm:text-[48px] lg:text-[56px]">
							<span className="ledger-write block" style={{ "--i": 1 } as React.CSSProperties} data-stagger>
								Seus clientes já compraram uma vez.
							</span>
							<span className="ledger-fade mt-1 block sm:mt-2" style={{ "--i": 3 } as React.CSSProperties} data-stagger>
								Faça eles voltarem{" "}
								<span className="box-decoration-clone rounded-lg bg-[#ffb900] px-2 text-[#171717]">no automático.</span>
							</span>
						</h1>

						<p
							className="ledger-fade mt-5 max-w-[50ch] text-[15px] leading-[1.55] text-[#171717]/70 sm:text-[16px] lg:mt-6 lg:text-[18px]"
							style={{ "--i": 5 } as React.CSSProperties}
							data-stagger
						>
							O RecompraCRM registra a venda, percebe quem está sumindo e manda a mensagem certa pelo WhatsApp da sua própria loja.
							Cashback, campanhas e clientes em risco em um só lugar.
						</p>

						<div className="ledger-fade mt-6 lg:mt-8" style={{ "--i": 7 } as React.CSSProperties} data-stagger>
							<div className="flex flex-wrap items-center gap-3">
								<TrackedLink
									href="/auth/signup"
									event="landing_cta_clicked"
									controlEvent="lead"
									properties={{ cta_id: "hero_testar_15_dias", location: "hero" }}
									className="group inline-flex items-center gap-2 rounded-2xl bg-[#24549c] px-6 py-3 text-[13px] font-extrabold uppercase tracking-[0.04em] text-white shadow-[0_16px_40px_-12px_rgba(36,84,156,0.45),0_6px_12px_rgba(36,84,156,0.22)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#1a3d7a] hover:shadow-[0_22px_48px_-10px_rgba(36,84,156,0.55),0_8px_16px_rgba(36,84,156,0.28)] sm:px-7 sm:py-3.5 sm:text-[14px]"
								>
									Testar 15 dias grátis
									<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
								</TrackedLink>
								<TrackedAnchor
									href="#como-funciona"
									event="landing_cta_clicked"
									properties={{ cta_id: "hero_ver_como_funciona", location: "hero" }}
									className="inline-flex items-center gap-2 rounded-2xl border border-[#e5e5e5] bg-white px-5 py-3 text-[13px] font-bold tracking-[0.02em] text-[#171717] transition-all duration-200 hover:border-[#24549c]/30 hover:bg-[#f5f8fd] sm:px-6 sm:py-3.5 sm:text-[14px]"
								>
									VER COMO FUNCIONA
								</TrackedAnchor>
							</div>

							<ul className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] font-semibold text-[#171717]/50 sm:gap-x-5 sm:text-[13px]">
								{HERO_TRUST.map((item) => (
									<li key={item} className="flex items-center gap-1.5">
										<span className="text-[#24549c]" aria-hidden>
											•
										</span>
										{item}
									</li>
								))}
							</ul>
						</div>
					</div>

					{/* Art */}
					<div className="ledger-fade mx-auto w-full max-w-[460px] lg:max-w-none" style={{ "--i": 4 } as React.CSSProperties} data-stagger>
						<LandingArt src="/images/landing/hero-return-loop.png" aspect="wide" sizes="(max-width: 1023px) 92vw, 46vw" priority>
							<ArtChip className="left-[1%] top-[8%]" tone="white" icon={<CheckCircle2 className="text-[#16a34a]" />} delayMs={400}>
								Maria voltou · 3ª compra
							</ArtChip>
							<ArtChip className="right-[0%] top-[36%] hidden sm:inline-flex" tone="blue" icon={<Cake />} delayMs={1100}>
								Aniversário · 12 mensagens enviadas
							</ArtChip>
							<ArtChip className="bottom-[6%] left-[24%]" tone="amber" icon={<Coins />} delayMs={1800}>
								Cashback disponível · R$ 28,50
							</ArtChip>
						</LandingArt>
					</div>
				</Reveal>

				{/* Integrações */}
				<Reveal className="mt-10 border-t border-[#171717]/8 pt-6 sm:mt-12 lg:mt-14">
					<div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between sm:gap-6">
						<p
							className="ledger-fade max-w-[28ch] text-center text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#171717]/40 sm:max-w-[22ch] sm:text-left sm:text-[11px] sm:tracking-[0.16em]"
							style={{ "--i": 0 } as React.CSSProperties}
							data-stagger
						>
							Funciona com o que sua loja já usa
						</p>
						<ul
							className="ledger-fade flex flex-wrap items-center justify-center gap-x-5 gap-y-3 sm:justify-end sm:gap-x-6"
							style={{ "--i": 1 } as React.CSSProperties}
							data-stagger
						>
							{INTEGRATIONS.map((integration) => (
								<li key={integration.name}>
									<Image
										src={integration.logo}
										alt={integration.name}
										sizes="100px"
										className="h-6 w-auto max-w-[88px] object-contain opacity-45 transition-opacity duration-200 hover:opacity-75 sm:h-7 sm:max-w-[100px]"
									/>
								</li>
							))}
						</ul>
					</div>
				</Reveal>
			</div>

			<div className="relative mx-auto mt-8 w-full max-w-7xl px-5 sm:mt-10 lg:mt-12 lg:px-8">
				<div className="h-px bg-gradient-to-r from-transparent via-[#24549c]/15 to-transparent" />
			</div>
		</section>
	);
}
