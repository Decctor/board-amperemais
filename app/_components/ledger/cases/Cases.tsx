import { Reveal } from "../_primitives/Reveal";
import { CaseShowcase } from "./CaseShowcase";

const CITIES = [
	"PATOS DE MINAS",
	"ITUIUTABA",
	"UBERLÂNDIA",
	"ARAXÁ",
	"MONTE CARMELO",
	"COROMANDEL",
	"PRATA",
	"FRUTAL",
	"ITURAMA",
	"CAMPINA VERDE",
	"PEDRINÓPOLIS",
	"PAINS",
	"SACRAMENTO",
	"PRESIDENTE OLEGÁRIO",
];

export function LedgerCases() {
	return (
		<section id="movimento" className="ledger-canvas ledger-deferred relative py-20 lg:py-28 overflow-hidden">
			<div className="mx-auto max-w-7xl px-5 lg:px-8">
				{/* Section header */}
				<Reveal className="mb-12 lg:mb-16">
					<div className="flex items-center gap-3 mb-6">
						<span className="ledger-fade inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#24549c] text-white text-[11px] font-extrabold ledger-tabular">
							03
						</span>
						<span
							className="ledger-fade text-[11px] font-extrabold tracking-[0.16em] uppercase text-[#24549c]"
							style={{ "--i": 1 } as React.CSSProperties}
							data-stagger
						>
							Resultado comprovado
						</span>
						<span className="ledger-fade flex-1 h-px bg-[#24549c]/15" style={{ "--i": 2 } as React.CSSProperties} data-stagger />
					</div>
					<h2 className="font-extrabold text-[#171717] tracking-[-0.02em] leading-[1.05] text-[34px] sm:text-[42px] lg:text-[56px] max-w-[20ch]">
						<span className="block ledger-write" style={{ "--i": 1 } as React.CSSProperties} data-stagger>
							Sem achismo.
						</span>
						<span className="block ledger-write" style={{ "--i": 3 } as React.CSSProperties} data-stagger>
							Sem promessa vazia.
						</span>
					</h2>
					<p className="ledger-fade mt-5 text-[17px] text-[#171717]/65 max-w-[52ch]" style={{ "--i": 6 } as React.CSSProperties} data-stagger>
						Cases reais, com nome, cidade e número. Lojas que já operam com o RecompraCRM contam — em dados e na própria voz — o que
						mudou.
					</p>
				</Reveal>

				<Reveal>
					<CaseShowcase />
				</Reveal>

				{/* City marquee */}
				<div className="mt-12 lg:mt-16 -mx-5 lg:-mx-8 relative overflow-hidden">
					<div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
					<div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
					<div className="flex items-center gap-2 mb-3 px-5 lg:px-8">
						<span className="ledger-pulse-dot inline-block w-1.5 h-1.5 rounded-full bg-[#24549c]" />
						<p className="text-[11px] font-extrabold tracking-[0.16em] uppercase text-[#737373]">Lojas em operação · Triângulo Mineiro e Alto Paranaíba</p>
					</div>
					<div className="overflow-hidden">
						<div className="ledger-marquee-track flex whitespace-nowrap will-change-transform">
							{[...CITIES, ...CITIES].map((city, i) => (
								<span
									key={`${city}-${i}`}
									className="inline-flex items-center text-[24px] lg:text-[32px] font-extrabold tracking-[-0.01em] text-[#171717]/85 mx-6 lg:mx-10"
								>
									{city}
									<span className="ml-6 lg:ml-10 text-[#ffb900] text-[18px]">✦</span>
								</span>
							))}
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
