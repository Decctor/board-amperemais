import { formatToMoney } from "@/lib/formatting";
import { ArrowRight, Handshake, ShieldCheck, Sparkles } from "lucide-react";
import { TrackedAnchor, TrackedLink } from "@/app/_components/ledger/TrackedLink";
import { Reveal } from "@/app/_components/ledger/_primitives/Reveal";
import {
	COMMISSIONABLE_MONTHLY_BASE,
	FIRST_YEAR_PAYOUT,
	FIRST_INVOICE_PERCENT,
	FIRST_MONTH_PAYOUT,
	PARTNER_LOGIN_HREF,
	RECURRING_MONTH_PAYOUT,
	SUBSEQUENT_INVOICE_PERCENT,
	THIRD_INVOICE_PERCENT,
	THIRD_MONTH_PAYOUT,
} from "./program-facts";

const HERO_TRUST = ["Painel próprio de acompanhamento", "Pagamento mensal via PIX", "Sem custo para participar"];

// Linhas do extrato ilustrativo: o 1º mês é o bônus cheio, os seguintes são recorrência.
const STATEMENT_ROWS = [
	{ month: "1º mês", detail: `${FIRST_INVOICE_PERCENT}% da mensalidade`, value: FIRST_MONTH_PAYOUT, highlight: true },
	{ month: "2º mês", detail: `${SUBSEQUENT_INVOICE_PERCENT}% recorrente`, value: RECURRING_MONTH_PAYOUT, highlight: false },
	{ month: "3º mês", detail: `${THIRD_INVOICE_PERCENT}% bônus de permanência`, value: THIRD_MONTH_PAYOUT, highlight: true },
	{ month: "4º mês", detail: `${SUBSEQUENT_INVOICE_PERCENT}% recorrente`, value: RECURRING_MONTH_PAYOUT, highlight: false },
];

export function PartnersHero() {
	const firstYearPerStore = FIRST_YEAR_PAYOUT;

	return (
		<section className="ledger-canvas-tinted relative overflow-hidden pt-28 pb-16 sm:pt-32 lg:pt-36 lg:pb-24">
			<div className="ledger-dot-grid absolute inset-0 pointer-events-none" aria-hidden />
			<div className="absolute -top-40 -left-24 h-[560px] w-[560px] rounded-full bg-[#24549c]/8 blur-[130px] pointer-events-none" aria-hidden />
			<div className="absolute top-10 -right-28 h-[440px] w-[440px] rounded-full bg-[#ffb900]/12 blur-[120px] pointer-events-none" aria-hidden />

			<div className="relative mx-auto max-w-7xl px-5 lg:px-8">
				<Reveal>
					<div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
						{/* Coluna de texto */}
						<div>
							<div
								className="ledger-fade mb-6 inline-flex items-center gap-2 rounded-full border border-[#ffb900]/45 bg-[#ffb900]/20 px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#171717]"
								data-stagger
							>
								<Handshake className="h-3.5 w-3.5 text-[#24549c]" strokeWidth={2.5} />
								Programa de parcerias
							</div>

							<h1 className="font-extrabold text-[#171717] tracking-[-0.025em] leading-[1.02] text-[38px] sm:text-[52px] lg:text-[68px] max-w-[15ch]">
								<span className="block ledger-write" style={{ "--i": 1 } as React.CSSProperties} data-stagger>
									Indique lojas.
								</span>
								<span className="block ledger-fade text-[#24549c]" style={{ "--i": 4 } as React.CSSProperties} data-stagger>
									Ganhe enquanto
								</span>
								<span className="block ledger-fade text-[#24549c]" style={{ "--i": 5 } as React.CSSProperties} data-stagger>
									elas recompram.
								</span>
							</h1>

							<p
								className="ledger-fade mt-6 max-w-[52ch] text-[16px] leading-[1.6] text-[#171717]/70 lg:text-[18px]"
								style={{ "--i": 7 } as React.CSSProperties}
								data-stagger
							>
								Se você atende lojistas, presta consultoria ou já recomenda ferramentas pra vender mais, o RecompraCRM transforma cada indicação em receita
								recorrente, com painel próprio e pagamento mensal.
							</p>

							<div className="ledger-fade mt-8 flex flex-col gap-3 sm:flex-row" style={{ "--i": 9 } as React.CSSProperties} data-stagger>
								<TrackedLink
									href={PARTNER_LOGIN_HREF}
									event="partner_program_cta_clicked"
									controlEvent="lead"
									properties={{ cta_id: "hero_entrar_no_programa", location: "partner_hero" }}
									className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-[#24549c] px-6 py-4 text-[14px] font-extrabold uppercase tracking-[0.04em] text-white shadow-[0_16px_40px_-12px_rgba(36,84,156,0.45),0_6px_12px_rgba(36,84,156,0.22)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#1a3d7a]"
								>
									Entrar no programa
									<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
								</TrackedLink>
								<TrackedAnchor
									href="#como-funciona-parceria"
									event="partner_program_cta_clicked"
									properties={{ cta_id: "hero_ver_como_funciona", location: "partner_hero" }}
									className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#171717]/15 bg-white px-6 py-4 text-[14px] font-bold text-[#171717] transition-all duration-200 hover:border-[#24549c]/30"
								>
									Ver como funciona
								</TrackedAnchor>
							</div>

							<ul
								className="ledger-fade mt-7 flex flex-wrap gap-x-5 gap-y-2 text-[13px] font-semibold text-[#171717]/55"
								style={{ "--i": 11 } as React.CSSProperties}
								data-stagger
							>
								{HERO_TRUST.map((item) => (
									<li key={item} className="flex items-center gap-1.5">
										<span className="text-[#24549c]" aria-hidden>
											✓
										</span>
										{item}
									</li>
								))}
							</ul>
						</div>

						{/* Coluna do extrato ilustrativo */}
						<div
							className="ledger-fade rounded-3xl border border-[#e5e5e5] bg-white shadow-[0_28px_70px_-30px_rgba(36,84,156,0.4),0_4px_10px_rgba(0,0,0,0.04)]"
							style={{ "--i": 6 } as React.CSSProperties}
							data-stagger
						>
							<div className="flex items-center justify-between border-b border-[#e5e5e5] px-6 py-5">
								<div>
									<p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#737373]">Extrato do parceiro</p>
									<p className="mt-1 text-[17px] font-extrabold text-[#171717]">Uma loja indicada</p>
								</div>
								<span className="inline-flex items-center gap-1.5 rounded-full bg-[#24549c]/10 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#24549c]">
									<ShieldCheck className="h-3.5 w-3.5" strokeWidth={2.5} />
									Recorrente
								</span>
							</div>

							<div className="divide-y divide-[#e5e5e5]">
								{STATEMENT_ROWS.map((row) => (
									<div key={row.month} className="flex items-center justify-between px-6 py-4">
										<div>
											<p className="text-[13px] font-extrabold text-[#171717]">{row.month}</p>
											<p className="text-[12px] text-[#171717]/55">{row.detail}</p>
										</div>
										<span
											className={`ledger-tabular rounded-xl px-3 py-1.5 text-[15px] font-extrabold ${
												row.highlight ? "bg-[#ffb900] text-[#171717]" : "text-[#24549c]"
											}`}
										>
											{formatToMoney(row.value)}
										</span>
									</div>
								))}
								<div className="flex items-center justify-between bg-[#f7f9fc] px-6 py-4">
									<div className="flex items-center gap-2">
										<Sparkles className="h-4 w-4 text-[#ffb900]" strokeWidth={2.5} />
										<p className="text-[12px] font-extrabold uppercase tracking-[0.1em] text-[#171717]/70">No 1º ano</p>
									</div>
									<span className="ledger-tabular text-[20px] font-extrabold text-[#171717]">{formatToMoney(firstYearPerStore)}</span>
								</div>
							</div>

							<p className="px-6 py-3 text-[11px] leading-snug text-[#737373]">
								Estimativa por loja ativa sobre a base de {formatToMoney(COMMISSIONABLE_MONTHLY_BASE)}/mês. Multiplique pelo número de lojas que você indicar.
							</p>
						</div>
					</div>
				</Reveal>
			</div>
		</section>
	);
}
