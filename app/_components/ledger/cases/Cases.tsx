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
						<span className="ledger-fade inline-block h-1.5 w-1.5 rounded-full bg-[#ffb900]" aria-hidden />
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
							Com nome, cidade e número.
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

				{/* Cidades em operação */}
				<Reveal className="mt-12 lg:mt-16">
					<div className="ledger-fade rounded-3xl border border-[#e5e5e5] bg-[#f7f9fc] px-6 py-6 lg:px-8" style={{ "--i": 1 } as React.CSSProperties} data-stagger>
						<div className="mb-3 flex items-center gap-2">
							<span className="ledger-pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-[#24549c]" />
							<p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#737373]">
								Lojas em operação · {CITIES.length} cidades do Triângulo Mineiro e Alto Paranaíba
							</p>
						</div>
						<ul className="flex flex-wrap items-center gap-x-3 gap-y-2">
							{CITIES.map((city, index) => (
								<li key={city} className="inline-flex items-center gap-3 text-[13px] font-extrabold tracking-[0.04em] text-[#171717]/70 sm:text-[14px]">
									{city}
									{index < CITIES.length - 1 ? (
										<span className="text-[11px] text-[#ffb900]" aria-hidden>
											✦
										</span>
									) : null}
								</li>
							))}
						</ul>
					</div>
				</Reveal>
			</div>
		</section>
	);
}
