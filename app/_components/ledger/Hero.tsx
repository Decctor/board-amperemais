import Image, { type StaticImageData } from "next/image";
import { ArrowRight } from "lucide-react";
import { Reveal } from "./_primitives/Reveal";
import BlingLogo from "@/utils/images/integrations/bling-logo.png";
import CardapioWebLogo from "@/utils/images/integrations/cardapio-web.png";
import IfoodLogo from "@/utils/images/integrations/ifood-logo.png";
import NuvemshopLogo from "@/utils/images/integrations/nuvemshop-logo.png";
import OnlineSoftwareLogo from "@/utils/images/integrations/online-software-logo.png";
import { TrackedAnchor, TrackedLink } from "./TrackedLink";

const HERO_TRUST = ["Sem cartão de crédito", "Configuração simples", "Suporte humano"];

const INTEGRATIONS: { name: string; logo: StaticImageData }[] = [
	{ name: "Online Software", logo: OnlineSoftwareLogo },
	{ name: "Cardápio Web", logo: CardapioWebLogo },
	{ name: "Nuvem Shop", logo: NuvemshopLogo },
	{ name: "iFood", logo: IfoodLogo },
	{ name: "Bling", logo: BlingLogo },
];

export function LedgerHero() {
	return (
		<section className="ledger-canvas-tinted relative flex min-h-[calc(100dvh-4rem)] flex-col overflow-hidden pt-24 pb-10 sm:min-h-0 sm:pt-28 sm:pb-14 lg:pt-32 lg:pb-16">
			{/* dot grid pattern */}
			<div className="ledger-dot-grid absolute inset-0 pointer-events-none" aria-hidden />

			{/* soft brand glow blobs */}
			<div
				className="absolute -top-40 left-1/2 -translate-x-1/2 w-[760px] h-[560px] rounded-full bg-[#24549c]/8 blur-[130px] pointer-events-none"
				aria-hidden
			/>
			<div className="absolute top-10 -right-32 w-[460px] h-[460px] rounded-full bg-[#ffb900]/10 blur-[110px] pointer-events-none" aria-hidden />

			<div className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-5 lg:px-8">
				<Reveal className="flex flex-col items-center text-center">
					<h1 className="max-w-[18ch] font-black uppercase text-[#171717] tracking-[-0.01em] leading-[1.08] text-[30px] sm:max-w-none sm:text-[44px] lg:text-[60px]">
						<span className="block ledger-write" style={{ "--i": 1 } as React.CSSProperties} data-stagger>
							Atrair clientes é caro.
						</span>
						<span className="block ledger-fade mt-1 sm:mt-1.5" style={{ "--i": 2 } as React.CSSProperties} data-stagger>
							Não fazê-los voltar é prejuízo.
						</span>
						<span
							className="block ledger-fade mt-1 sm:mt-1.5 bg-[#24549c] text-white px-2 py-1 rounded-lg w-fit mx-auto"
							style={{ "--i": 3 } as React.CSSProperties}
							data-stagger
						>
							Gere recompras
						</span>
						<span
							className="block ledger-fade mt-1 sm:mt-1.5 bg-[#ffb900] text-[#171717] px-2 py-1 rounded-lg w-fit mx-auto"
							style={{ "--i": 4 } as React.CSSProperties}
							data-stagger
						>
							no automático.
						</span>
					</h1>

					<p
						className="ledger-fade mt-4 max-w-[52ch] text-[15px] leading-[1.5] text-[#171717]/70 sm:mt-5 sm:text-[16px] lg:mt-6 lg:text-[17px] lg:leading-[1.55]"
						style={{ "--i": 6 } as React.CSSProperties}
						data-stagger
					>
						O RecompraCRM transforma dados em receita recorrente.
					</p>

					{/* CTAs + trust */}
					<div className="ledger-fade mt-5 w-full sm:mt-6 lg:mt-7" style={{ "--i": 8 } as React.CSSProperties} data-stagger>
						<div className="flex flex-wrap items-center justify-center gap-3">
							<TrackedLink
								href="/auth/signup"
								event="landing_cta_clicked"
								controlEvent="lead"
								properties={{ cta_id: "hero_testar_15_dias", location: "hero" }}
								className="group inline-flex items-center gap-2 bg-[#24549c] hover:bg-[#1a3d7a] text-white px-6 py-3 rounded-2xl text-[13px] font-extrabold tracking-[0.04em] uppercase shadow-[0_16px_40px_-12px_rgba(36,84,156,0.45),0_6px_12px_rgba(36,84,156,0.22)] hover:shadow-[0_22px_48px_-10px_rgba(36,84,156,0.55),0_8px_16px_rgba(36,84,156,0.28)] hover:-translate-y-0.5 transition-all duration-200 sm:px-7 sm:py-3.5 sm:text-[14px]"
							>
								Testar 15 dias grátis
								<ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
							</TrackedLink>
							<TrackedAnchor
								href="#como-funciona"
								event="landing_cta_clicked"
								properties={{ cta_id: "hero_ver_como_funciona", location: "hero" }}
								className="inline-flex items-center gap-2 bg-white hover:bg-[#f5f8fd] border border-[#e5e5e5] hover:border-[#24549c]/30 text-[#171717] px-5 py-3 rounded-2xl text-[13px] font-bold tracking-[0.02em] transition-all duration-200 sm:px-6 sm:py-3.5 sm:text-[14px]"
							>
								VER COMO FUNCIONA
							</TrackedAnchor>
						</div>

						<ul className="mt-3.5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[12px] font-semibold text-[#171717]/50 sm:gap-x-5 sm:text-[13px]">
							{HERO_TRUST.map((item) => (
								<li key={item} className="flex items-center gap-1">
									<span className="text-[#24549c]" aria-hidden>
										•
									</span>
									{item}
								</li>
							))}
						</ul>
					</div>
				</Reveal>

				{/* Integrações — faixa horizontal compacta */}
				<Reveal className="mt-8 border-t border-[#171717]/8 pt-6 sm:mt-10 lg:mt-12">
					<div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between sm:gap-6">
						<p
							className="ledger-fade max-w-[28ch] text-center text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#171717]/40 sm:max-w-[22ch] sm:text-left sm:text-[11px] sm:tracking-[0.16em]"
							style={{ "--i": 0 } as React.CSSProperties}
							data-stagger
						>
							Integra com as plataformas que sua operação já usa
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

			{/* Bottom hairline */}
			<div className="relative mx-auto mt-8 w-full max-w-7xl px-5 sm:mt-10 lg:mt-12 lg:px-8">
				<div className="h-px bg-gradient-to-r from-transparent via-[#24549c]/15 to-transparent" />
			</div>
		</section>
	);
}
