import Link from "next/link";
import { ArrowRight, MessageCircle, Repeat, Zap } from "lucide-react";
import { CampaignFlow } from "./_primitives/CampaignFlow";
import { Reveal } from "./_primitives/Reveal";
import { Stamp } from "./_primitives/Stamp";
import { WhatsappIcon } from "@/components/icons";

const HERO_PROOF = [
	{ icon: Zap, label: "Configure uma vez, o sistema cuida do resto" },
	{ icon: WhatsappIcon, label: "WhatsApp da própria loja, com a identidade dela" },
	{ icon: Repeat, label: "Gatilhos para vender, reter e reativar" },
];

export function LedgerHero() {
	return (
		<section className="ledger-canvas-tinted relative pt-28 pb-16 lg:pt-32 lg:pb-24 overflow-hidden">
			{/* soft brand glow blobs */}
			<div className="absolute -top-32 -left-40 w-[600px] h-[600px] rounded-full bg-[#24549c]/8 blur-[120px] pointer-events-none" aria-hidden />
			<div className="absolute -bottom-40 -right-32 w-[500px] h-[500px] rounded-full bg-[#ffb900]/10 blur-[100px] pointer-events-none" aria-hidden />

			<div className="relative mx-auto max-w-7xl px-5 lg:px-8 grid lg:grid-cols-[1.35fr_1fr] gap-12 lg:gap-16 items-start">
				{/* Left — text */}
				<Reveal>
					<div className="flex items-center gap-3 mb-7">
						<span className="ledger-fade inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#24549c] text-white text-[11px] font-extrabold ledger-tabular">
							01
						</span>
						<span
							className="ledger-fade text-[11px] font-extrabold tracking-[0.16em] uppercase text-[#24549c]"
							style={{ "--i": 1 } as React.CSSProperties}
							data-stagger
						>
							CRM de recorrência
						</span>
						<span className="ledger-fade flex-1 h-px bg-[#24549c]/15" style={{ "--i": 2 } as React.CSSProperties} data-stagger />
					</div>

					<h1 className="font-extrabold text-[#171717] tracking-[-0.025em] leading-[1.0] text-[44px] sm:text-[58px] lg:text-[72px]">
						<span className="block ledger-write" style={{ "--i": 1 } as React.CSSProperties} data-stagger>
							Cada venda vira
						</span>
						<span className="block ledger-fade text-[#24549c] mt-2 lg:mt-3" style={{ "--i": 3 } as React.CSSProperties} data-stagger>
							a próxima compra.
						</span>
					</h1>

					<p
						className="ledger-fade mt-7 lg:mt-8 text-[17px] lg:text-[19px] leading-[1.55] text-[#171717]/70 max-w-[58ch]"
						style={{ "--i": 6 } as React.CSSProperties}
						data-stagger
					>
						O RecompraCRM transforma dados de compra em campanhas automáticas de venda, retenção e reativação. Funciona com ponto de interação, QR Code e
						integrações como iFood, Nuvem Shop e outras que conectam o varejo ao relacionamento certo.
					</p>

					{/* CTAs */}
					<div className="ledger-fade mt-8 lg:mt-10 flex flex-wrap items-center gap-4" style={{ "--i": 8 } as React.CSSProperties} data-stagger>
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
					<div className="ledger-fade mt-10 lg:mt-12 grid grid-cols-1 sm:grid-cols-3 gap-3" style={{ "--i": 10 } as React.CSSProperties} data-stagger>
						{HERO_PROOF.map((p) => (
							<div
								key={p.label}
								className="flex items-start gap-3 rounded-2xl bg-white border border-[#e5e5e5] px-4 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
							>
								<span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-[#24549c]/8 text-[#24549c] shrink-0">
									<p.icon className="w-4 h-4" />
								</span>
								<p className="text-[12px] leading-snug font-semibold text-[#171717]/85">{p.label}</p>
							</div>
						))}
					</div>
				</Reveal>

				{/* Right — campaign flow */}
				<Reveal className="relative lg:sticky lg:top-28">
					<div className="relative max-w-[420px] mx-auto lg:mx-0 lg:ml-auto">
						<div className="ledger-fade" style={{ "--i": 3 } as React.CSSProperties} data-stagger>
							<CampaignFlow />
						</div>

						{/* Floating loyalty badge */}
						<div className="absolute -top-3 -left-3 sm:-left-5 z-10 ledger-fade" style={{ "--i": 6 } as React.CSSProperties} data-stagger>
							<Stamp variant="amber" size="md" rotate={-4}>
								<span className="ledger-pulse-dot inline-block w-1.5 h-1.5 rounded-full bg-[#171717]" />
								Campanha em ação
							</Stamp>
						</div>
					</div>
				</Reveal>
			</div>

			{/* Bottom hairline */}
			<div className="relative mx-auto max-w-7xl px-5 lg:px-8 mt-20 lg:mt-28">
				<div className="h-px bg-gradient-to-r from-transparent via-[#24549c]/15 to-transparent" />
			</div>
		</section>
	);
}
