import { Reveal } from "./_primitives/Reveal";
import { HowItWorksFlow } from "./_primitives/HowItWorksFlow";

export function LedgerHowItWorks() {
	return (
		<section id="como-funciona" className="ledger-canvas-soft relative py-20 lg:py-28">
			<div className="mx-auto max-w-7xl px-5 lg:px-8">
				{/* Section header */}
				<Reveal className="mb-12 lg:mb-16">
					<div className="flex items-center gap-3 mb-6">
						<span className="ledger-fade inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#24549c] text-white text-[11px] font-extrabold ledger-tabular">
							02
						</span>
						<span
							className="ledger-fade text-[11px] font-extrabold tracking-[0.16em] uppercase text-[#24549c]"
							style={{ "--i": 1 } as React.CSSProperties}
							data-stagger
						>
							Como funciona
						</span>
						<span className="ledger-fade flex-1 h-px bg-[#24549c]/15" style={{ "--i": 2 } as React.CSSProperties} data-stagger />
					</div>
					<h2 className="font-extrabold text-[#171717] tracking-[-0.02em] leading-[1.05] text-[34px] sm:text-[42px] lg:text-[56px] max-w-[20ch]">
						<span className="block ledger-write" style={{ "--i": 1 } as React.CSSProperties} data-stagger>
							Dados entram.
						</span>
						<span className="block text-[#171717]/55 ledger-fade mt-1" style={{ "--i": 4 } as React.CSSProperties} data-stagger>
							O CRM transforma em recompra.
						</span>
					</h2>
				</Reveal>

				{/* 30 / 70 — stepper sincronizado com o motor de campanhas */}
				<Reveal>
					<HowItWorksFlow />
				</Reveal>
			</div>
		</section>
	);
}
