import { Reveal } from "./_primitives/Reveal";
import { Stamp } from "./_primitives/Stamp";
import { TickerNumber } from "./_primitives/TickerNumber";

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

export function LedgerCase() {
	return (
		<section id="movimento" className="ledger-canvas relative py-20 lg:py-28 overflow-hidden">
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
					<p className="ledger-fade mt-5 text-[17px] text-[#171717]/65 max-w-[48ch]" style={{ "--i": 6 } as React.CSSProperties} data-stagger>
						Um número real vale mais que qualquer feature. Este é o demonstrativo de 30 dias em uma loja que já usa o RecompraCRM.
					</p>
				</Reveal>

				{/* Blue brand certificate panel */}
				<Reveal>
					<div className="relative ledger-fade rounded-3xl bg-gradient-to-br from-[#24549c] to-[#1a3d7a] text-white shadow-[0_28px_60px_-20px_rgba(36,84,156,0.45),0_8px_16px_rgba(36,84,156,0.18)] overflow-hidden">
						{/* decorative blobs */}
						<div className="absolute -top-20 -right-20 w-[280px] h-[280px] rounded-full bg-[#ffb900]/12 blur-3xl pointer-events-none" aria-hidden />
						<div className="absolute -bottom-32 -left-20 w-[320px] h-[320px] rounded-full bg-white/6 blur-3xl pointer-events-none" aria-hidden />

						{/* Header */}
						<div className="relative px-6 lg:px-10 py-4 border-b border-white/15 flex items-center justify-between flex-wrap gap-3">
							<div className="flex items-center gap-3">
								<span className="ledger-pulse-dot inline-block w-1.5 h-1.5 rounded-full bg-[#ffb900]" />
								<p className="text-[10px] font-extrabold tracking-[0.16em] uppercase text-white/85">Demonstrativo · 30 dias</p>
							</div>
							<p className="text-[10px] font-bold tracking-[0.1em] uppercase text-white/55 ledger-tabular">Período 04 · 2026</p>
						</div>

						{/* Metrics */}
						<div className="relative grid md:grid-cols-3 px-6 lg:px-10 py-10 lg:py-14 gap-y-10 gap-x-4 lg:divide-x divide-white/15">
							<div className="md:px-6 first:md:pl-0">
								<p className="text-[10px] font-extrabold tracking-[0.18em] uppercase text-white/60 mb-3">Receita extra</p>
								<p className="font-extrabold text-[#ffb900] text-[48px] lg:text-[60px] leading-none tracking-[-0.025em] mb-3">
									<span className="text-[28px] lg:text-[36px] align-top mr-0.5">+R$</span>
									<TickerNumber value={17482} durationMs={1600} />
								</p>
								<p className="text-[13px] leading-snug text-white/70 max-w-[22ch]">gerada por campanhas automatizadas no WhatsApp</p>
							</div>
							<div className="md:px-6">
								<p className="text-[10px] font-extrabold tracking-[0.18em] uppercase text-white/60 mb-3">Ticket médio</p>
								<p className="font-extrabold text-[#ffb900] text-[48px] lg:text-[60px] leading-none tracking-[-0.025em] mb-3">
									<TickerNumber value={46} durationMs={1400} prefix="+" suffix="%" />
								</p>
								<p className="text-[13px] leading-snug text-white/70 max-w-[24ch]">de aumento médio nos clientes que voltaram pela campanha</p>
							</div>
							<div className="md:px-6">
								<p className="text-[10px] font-extrabold tracking-[0.18em] uppercase text-white/60 mb-3">Ciclo de recompra</p>
								<p className="font-extrabold text-[#ffb900] text-[48px] lg:text-[60px] leading-none tracking-[-0.025em] mb-3">
									<TickerNumber value={17} durationMs={1300} prefix="−" /> <span className="text-[24px] lg:text-[30px] align-baseline ml-1">dias</span>
								</p>
								<p className="text-[13px] leading-snug text-white/70 max-w-[24ch]">de antecipação no retorno ao balcão vs. comportamento orgânico</p>
							</div>
						</div>

						{/* Testimonial */}
						<div className="relative border-t border-white/15 px-6 lg:px-10 py-8 lg:py-10">
							<blockquote className="max-w-[62ch]">
								<p className="text-[18px] lg:text-[22px] leading-[1.5] text-white/95 font-medium">
									<span className="text-[#ffb900] font-extrabold mr-1">&ldquo;</span>
									Nenhum anúncio novo. Nenhum desconto agressivo. Só a mensagem certa, para quem já conhecia a loja, no momento certo.
									<span className="text-[#ffb900] font-extrabold ml-1">&rdquo;</span>
								</p>
							</blockquote>
							<div className="mt-5 flex items-center gap-4">
								<div className="h-px w-10 bg-[#ffb900]" />
								<p className="text-[11px] font-extrabold tracking-[0.12em] uppercase text-white/85">
									Ampère Mais · Loja de materiais elétricos · Ituiutaba/MG
								</p>
							</div>
						</div>
					</div>
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
