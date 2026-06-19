import { ArrowRight } from "lucide-react";
import { TrackedLink } from "@/app/_components/ledger/TrackedLink";
import { Reveal } from "@/app/_components/ledger/_primitives/Reveal";
import { PARTNER_LOGIN_HREF } from "./program-facts";

export function PartnersClosingCTA() {
	return (
		<section className="relative overflow-hidden bg-gradient-to-br from-[#24549c] to-[#1a3d7a] py-20 text-white lg:py-28">
			<div className="absolute -top-32 -right-32 h-[500px] w-[500px] rounded-full bg-[#ffb900]/12 blur-[120px] pointer-events-none" aria-hidden />
			<div className="absolute -bottom-40 -left-32 h-[400px] w-[400px] rounded-full bg-white/6 blur-[100px] pointer-events-none" aria-hidden />

			<div className="relative mx-auto max-w-5xl px-5 text-center lg:px-8">
				<Reveal>
					<div className="mb-7 inline-flex items-center justify-center gap-3 rounded-full border border-white/20 bg-white/12 px-4 py-1.5">
						<span className="ledger-pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-[#ffb900]" />
						<span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-white/90">Participar é gratuito</span>
					</div>

					<h2 className="mx-auto max-w-[18ch] font-extrabold tracking-[-0.025em] leading-[1.0] text-[38px] sm:text-[52px] lg:text-[66px]">
						<span className="block ledger-write" style={{ "--i": 1 } as React.CSSProperties} data-stagger>
							Sua rede já existe.
						</span>
						<span className="mt-2 block ledger-fade text-[#ffb900]" style={{ "--i": 4 } as React.CSSProperties} data-stagger>
							Comece a ganhar com ela.
						</span>
					</h2>

					<p
						className="ledger-fade mx-auto mt-7 max-w-[50ch] text-[15px] text-white/75 lg:text-[18px]"
						style={{ "--i": 7 } as React.CSSProperties}
						data-stagger
					>
						Entre no programa, pegue seu link de indicação e acompanhe cada comissão pelo painel do parceiro.
					</p>

					<div className="ledger-fade mt-10 flex justify-center" style={{ "--i": 9 } as React.CSSProperties} data-stagger>
						<TrackedLink
							href={PARTNER_LOGIN_HREF}
							event="partner_program_cta_clicked"
							controlEvent="lead"
							properties={{ cta_id: "closing_entrar_no_programa", location: "partner_closing" }}
							className="group inline-flex items-center gap-2 rounded-2xl bg-[#ffb900] px-7 py-4 text-[14px] font-extrabold uppercase tracking-[0.04em] text-[#171717] shadow-[0_16px_40px_-12px_rgba(255,185,0,0.5),0_6px_12px_rgba(0,0,0,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#e6a700]"
						>
							Entrar no programa
							<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
						</TrackedLink>
					</div>
				</Reveal>
			</div>
		</section>
	);
}
