import { ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Reveal } from "./_primitives/Reveal";
import { Stamp } from "./_primitives/Stamp";
import { TickerNumber } from "./_primitives/TickerNumber";

const INCLUDED = [
	"Ponto de Interação (tablet + QR Code)",
	"Programa de cashback configurável",
	"WhatsApp automático ilimitado",
	"Campanhas com filtro de audiência",
	"Painel de clientes em risco (RFM)",
	"Business Intelligence de vendas",
	"Suporte humano incluso",
];

const GUARANTEES = ["Sem cartão de crédito", "Cancele quando quiser", "Sem taxa de setup", "LGPD · Dados protegidos"];

export function LedgerPricing() {
	return (
		<section id="saldo" className="ledger-canvas relative py-20 lg:py-28 overflow-hidden">
			{/* Subtle brand glow */}
			<div
				className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-[#24549c]/4 blur-[120px] pointer-events-none"
				aria-hidden
			/>

			<div className="relative mx-auto max-w-7xl px-5 lg:px-8">
				{/* Section header */}
				<Reveal className="mb-12 lg:mb-16 text-center">
					<div className="flex items-center justify-center gap-3 mb-6">
						<span className="ledger-fade inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#24549c] text-white text-[11px] font-extrabold ledger-tabular">
							05
						</span>
						<span
							className="ledger-fade text-[11px] font-extrabold tracking-[0.16em] uppercase text-[#24549c]"
							style={{ "--i": 1 } as React.CSSProperties}
							data-stagger
						>
							Plano único
						</span>
					</div>
					<h2 className="font-extrabold text-[#171717] tracking-[-0.02em] leading-[1.05] text-[34px] sm:text-[44px] lg:text-[60px] max-w-[20ch] mx-auto">
						<span className="block ledger-write" style={{ "--i": 1 } as React.CSSProperties} data-stagger>
							Um plano.
						</span>
						<span className="block ledger-fade text-[#24549c]" style={{ "--i": 3 } as React.CSSProperties} data-stagger>
							Tudo incluído.
						</span>
					</h2>
					<p
						className="ledger-fade mt-5 text-[16px] lg:text-[18px] text-[#171717]/65 max-w-[48ch] mx-auto"
						style={{ "--i": 6 } as React.CSSProperties}
						data-stagger
					>
						Sem tier básico que trava você. Sem surpresa na fatura. Tudo que sua loja precisa desde o primeiro dia.
					</p>
				</Reveal>

				<Reveal>
					<div className="grid lg:grid-cols-12 gap-6 lg:gap-8 items-stretch max-w-5xl mx-auto">
						{/* Inclusions */}
						<div
							className="lg:col-span-7 ledger-fade rounded-3xl bg-white border border-[#e5e5e5] shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-6 lg:p-8"
							style={{ "--i": 2 } as React.CSSProperties}
							data-stagger
						>
							<div className="flex items-center justify-between mb-6">
								<p className="text-[11px] font-extrabold tracking-[0.16em] uppercase text-[#171717]">Inclui no plano</p>
								<p className="text-[10px] font-bold tracking-[0.1em] uppercase text-[#737373] ledger-tabular">07 itens</p>
							</div>
							<ul className="space-y-3">
								{INCLUDED.map((item) => (
									<li key={item} className="flex items-center gap-3">
										<span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#24549c]/10 shrink-0">
											<CheckCircle2 className="w-4 h-4 text-[#24549c]" strokeWidth={2.5} />
										</span>
										<span className="flex-1 text-[15px] text-[#171717]/90">{item}</span>
									</li>
								))}
							</ul>
							<div className="mt-6 pt-5 border-t border-dashed border-[#e5e5e5] flex items-center justify-between gap-3 flex-wrap">
								<p className="text-[12px] text-[#737373]">Atende redes ou precisa de integração com ERP?</p>
								<a
									href="https://wa.me/553499480791"
									className="text-[12px] font-extrabold tracking-[0.04em] uppercase text-[#24549c] hover:text-[#1a3d7a] underline decoration-[#ffb900] decoration-2 underline-offset-4"
								>
									Falar com a gente
								</a>
							</div>
						</div>

						{/* Price card */}
						<div className="lg:col-span-5 relative">
							<div
								className="ledger-fade relative rounded-3xl bg-gradient-to-br from-[#24549c] to-[#1a3d7a] text-white p-7 lg:p-8 shadow-[0_28px_60px_-20px_rgba(36,84,156,0.45),0_8px_16px_rgba(36,84,156,0.18)] overflow-hidden"
								style={{ "--i": 4 } as React.CSSProperties}
								data-stagger
							>
								{/* decorative blob */}
								<div className="absolute -top-16 -right-16 w-[200px] h-[200px] rounded-full bg-[#ffb900]/15 blur-3xl pointer-events-none" aria-hidden />

								{/* Floating stamp */}
								<div className="absolute -top-3 -right-2 z-[25]">
									<Stamp variant="amber" size="md" rotate={6}>
										15 dias grátis
									</Stamp>
								</div>

								<p className="relative text-[11px] font-extrabold tracking-[0.18em] uppercase text-white/65 mb-2">Plano crescimento</p>
								<p className="relative text-[10px] font-bold tracking-[0.12em] uppercase text-white/50 mb-7">Cobrado mensalmente · sem fidelidade</p>

								<div className="relative flex items-baseline gap-1 mb-1.5">
									<span className="text-[22px] lg:text-[26px] font-extrabold text-white/70 ledger-tabular">R$</span>
									<span className="text-[76px] lg:text-[92px] font-extrabold text-[#ffb900] leading-none tracking-[-0.04em] ledger-tabular">
										<TickerNumber value={399} durationMs={1400} />
									</span>
									<span className="text-[24px] lg:text-[30px] font-extrabold text-[#ffb900]/85 ledger-tabular align-baseline ml-1">,90</span>
								</div>
								<p className="relative text-[12px] uppercase tracking-[0.12em] font-bold text-white/55 mb-8">por mês</p>

								<Link
									href="/auth/signup"
									className="relative group flex items-center justify-center gap-2 bg-[#ffb900] hover:bg-[#e6a700] text-[#171717] text-center px-6 py-4 rounded-2xl transition-all duration-200 shadow-[0_8px_18px_-4px_rgba(0,0,0,0.20)] hover:-translate-y-0.5"
								>
									<span className="text-[15px] font-extrabold tracking-[0.04em] uppercase">Começar agora</span>
									<ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
								</Link>

								<div className="relative mt-6 pt-5 border-t border-white/15">
									<p className="text-[10px] font-bold tracking-[0.14em] uppercase text-white/55 mb-2.5">Garantias</p>
									<ul className="space-y-1.5">
										{GUARANTEES.map((g) => (
											<li key={g} className="flex items-center gap-2 text-[12px] text-white/80">
												<span className="text-[#ffb900] font-extrabold">✓</span>
												<span>{g}</span>
											</li>
										))}
									</ul>
								</div>
							</div>
						</div>
					</div>
				</Reveal>
			</div>
		</section>
	);
}
