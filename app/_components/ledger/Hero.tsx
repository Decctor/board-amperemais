import Link from "next/link";
import Image, { type StaticImageData } from "next/image";
import { ArrowRight, Repeat, Zap } from "lucide-react";
import { Reveal } from "./_primitives/Reveal";
import { WhatsappIcon } from "@/components/icons";
import BlingLogo from "@/utils/images/integrations/bling-logo.png";
import CardapioWebLogo from "@/utils/images/integrations/cardapio-web.png";
import IfoodLogo from "@/utils/images/integrations/ifood-logo.png";
import NuvemshopLogo from "@/utils/images/integrations/nuvemshop-logo.png";
import OnlineSoftwareLogo from "@/utils/images/integrations/online-software-logo.png";

const HERO_PROOF = [
	{ icon: Zap, label: "Configure uma vez e pronto" },
	{ icon: WhatsappIcon, label: "WhatsApp com a cara da loja" },
	{ icon: Repeat, label: "Gatilhos de venda e retenção" },
];

const INTEGRATIONS: { name: string; logo: StaticImageData }[] = [
	{ name: "Online Software", logo: OnlineSoftwareLogo },
	{ name: "Cardápio Web", logo: CardapioWebLogo },
	{ name: "Nuvem Shop", logo: NuvemshopLogo },
	{ name: "iFood", logo: IfoodLogo },
	{ name: "Bling", logo: BlingLogo },
];

export function LedgerHero() {
	return (
		<section className="ledger-canvas-tinted relative pt-28 pb-20 lg:pt-36 lg:pb-28 overflow-hidden">
			{/* dot grid pattern */}
			<div className="ledger-dot-grid absolute inset-0 pointer-events-none" aria-hidden />

			{/* soft brand glow blobs */}
			<div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[760px] h-[560px] rounded-full bg-[#24549c]/8 blur-[130px] pointer-events-none" aria-hidden />
			<div className="absolute top-10 -right-32 w-[460px] h-[460px] rounded-full bg-[#ffb900]/10 blur-[110px] pointer-events-none" aria-hidden />

			<Reveal className="relative mx-auto max-w-3xl px-5 lg:px-8 flex flex-col items-center text-center">
				{/* Eyebrow */}
				<div className="ledger-fade flex items-center gap-2.5 mb-7" style={{ "--i": 0 } as React.CSSProperties} data-stagger>
					<span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#24549c] text-white text-[11px] font-extrabold ledger-tabular">
						01
					</span>
					<span className="text-[11px] font-extrabold tracking-[0.16em] uppercase text-[#24549c]">CRM de recorrência</span>
				</div>

				<h1 className="font-extrabold text-[#171717] tracking-[-0.025em] leading-[1.0] text-[44px] sm:text-[60px] lg:text-[76px]">
					<span className="block ledger-write" style={{ "--i": 1 } as React.CSSProperties} data-stagger>
						Cada venda vira
					</span>
					<span className="block ledger-fade text-[#24549c] mt-2 lg:mt-3" style={{ "--i": 3 } as React.CSSProperties} data-stagger>
						a próxima compra.
					</span>
				</h1>

				<p
					className="ledger-fade mt-7 lg:mt-8 text-[17px] lg:text-[19px] leading-[1.55] text-[#171717]/70 max-w-[60ch]"
					style={{ "--i": 6 } as React.CSSProperties}
					data-stagger
				>
					O RecompraCRM transforma dados de compra em campanhas automáticas de venda, retenção e reativação. Funciona com ponto de interação, QR Code e
					integrações como iFood, Nuvem Shop e outras que conectam o varejo ao relacionamento certo.
				</p>

				{/* CTAs */}
				<div className="ledger-fade mt-9 lg:mt-10 flex flex-wrap items-center justify-center gap-4" style={{ "--i": 8 } as React.CSSProperties} data-stagger>
					<Link
						href="/auth/signup"
						className="group inline-flex items-center gap-2 bg-[#24549c] hover:bg-[#1a3d7a] text-white px-7 py-4 rounded-2xl text-[14px] font-extrabold tracking-[0.04em] uppercase shadow-[0_16px_40px_-12px_rgba(36,84,156,0.45),0_6px_12px_rgba(36,84,156,0.22)] hover:shadow-[0_22px_48px_-10px_rgba(36,84,156,0.55),0_8px_16px_rgba(36,84,156,0.28)] hover:-translate-y-0.5 transition-all duration-200"
					>
						Testar 15 dias grátis
						<ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
					</Link>
					<a
						href="#como-funciona"
						className="inline-flex items-center gap-2 bg-white hover:bg-[#f5f8fd] border border-[#e5e5e5] hover:border-[#24549c]/30 text-[#171717] px-6 py-4 rounded-2xl text-[14px] font-bold tracking-[0.02em] transition-all duration-200"
					>
						Ver como funciona
					</a>
				</div>

				{/* Proof row */}
				<div
					className="ledger-fade mt-12 lg:mt-14 grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-3xl"
					style={{ "--i": 10 } as React.CSSProperties}
					data-stagger
				>
					{HERO_PROOF.map((p) => (
						<div
							key={p.label}
							className="flex items-start gap-3 rounded-2xl bg-white/85 backdrop-blur-sm border border-[#e5e5e5] px-4 py-3 text-left shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
						>
							<span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-[#24549c]/8 text-[#24549c] shrink-0">
								<p.icon className="w-4 h-4" />
							</span>
							<p className="text-[12px] leading-snug font-semibold text-[#171717]/85">{p.label}</p>
						</div>
					))}
				</div>

				{/* Funciona com — integrações */}
				<div className="ledger-fade mt-12 lg:mt-14 flex flex-col items-center gap-5" style={{ "--i": 12 } as React.CSSProperties} data-stagger>
					<div className="flex items-center gap-3">
						<span className="h-px w-8 bg-[#171717]/15" aria-hidden />
						<span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#171717]/40">Funciona com</span>
						<span className="h-px w-8 bg-[#171717]/15" aria-hidden />
					</div>
					<ul className="flex flex-wrap items-center justify-center gap-x-7 gap-y-4 sm:gap-x-9">
						{INTEGRATIONS.map((integration) => (
							<li key={integration.name}>
								<Image
									src={integration.logo}
									alt={integration.name}
									className="h-7 w-auto max-w-[104px] object-contain opacity-50 transition-opacity duration-200 hover:opacity-80 sm:h-8 sm:max-w-[120px]"
								/>
							</li>
						))}
					</ul>
				</div>
			</Reveal>

			{/* Bottom hairline */}
			<div className="relative mx-auto max-w-7xl px-5 lg:px-8 mt-20 lg:mt-28">
				<div className="h-px bg-gradient-to-r from-transparent via-[#24549c]/15 to-transparent" />
			</div>
		</section>
	);
}
