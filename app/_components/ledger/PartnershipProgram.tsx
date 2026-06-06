import { ArrowRight, BadgeDollarSign, CalendarCheck, Handshake, Link2, ReceiptText, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Reveal } from "./_primitives/Reveal";

const PARTNER_LOGIN_HREF = "/auth/signin?redirectTo=%2Fpartner-dashboard";

const COMMISSION_ROWS = [
	{
		label: "Primeira mensalidade",
		value: "100%",
		helper: "confirmou pagamento, entrou no extrato.",
	},
	{
		label: "Mensalidades seguintes",
		value: "20%",
		helper: "recorrente enquanto o cliente continuar ativo.",
	},
	{
		label: "Payout",
		value: "mensal",
		helper: "apurado pelo financeiro com comprovante.",
	},
];

const FLOW_STEPS = [
	{ icon: Link2, title: "Link próprio", text: "Você compartilha seu código com lojistas do seu relacionamento." },
	{ icon: ReceiptText, title: "Onboarding rastreado", text: "O cliente informa o código ou chega pelo link de indicação." },
	{ icon: CalendarCheck, title: "Receita recorrente", text: "As comissões aparecem no painel depois da invoice paga." },
];

export function LedgerPartnershipProgram() {
	return (
		<section id="parcerias" className="relative overflow-hidden bg-[#f7f9fc] py-20 lg:py-28">
			<div className="absolute inset-x-0 top-0 h-px bg-[#24549c]/10" aria-hidden />
			<div className="mx-auto max-w-7xl px-5 lg:px-8">
				<Reveal>
					<div className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
						<div>
							<div className="mb-6 flex items-center gap-3">
								<span className="ledger-fade inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#24549c] text-[11px] font-extrabold text-white ledger-tabular">
									06
								</span>
								<span
									className="ledger-fade text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#24549c]"
									style={{ "--i": 1 } as React.CSSProperties}
									data-stagger
								>
									Programa de parcerias
								</span>
								<span className="ledger-fade h-px flex-1 bg-[#24549c]/15" style={{ "--i": 2 } as React.CSSProperties} data-stagger />
							</div>

							<div
								className="ledger-fade mb-5 inline-flex items-center gap-2 rounded-full border border-[#ffb900]/45 bg-[#ffb900]/20 px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#171717]"
								style={{ "--i": 2 } as React.CSSProperties}
								data-stagger
							>
								<Handshake className="h-3.5 w-3.5 text-[#24549c]" strokeWidth={2.5} />
								Para consultores, agências e especialistas em varejo
							</div>

							<h2 className="font-extrabold text-[#171717] tracking-[-0.02em] leading-[1.05] text-[34px] sm:text-[44px] lg:text-[60px] max-w-[18ch]">
								<span className="block ledger-write" style={{ "--i": 1 } as React.CSSProperties} data-stagger>
									Indique lojas.
								</span>
								<span className="block ledger-fade text-[#24549c]" style={{ "--i": 4 } as React.CSSProperties} data-stagger>
									Ganhe enquanto elas recompram.
								</span>
							</h2>

							<p
								className="ledger-fade mt-6 max-w-[58ch] text-[15px] leading-[1.65] text-[#171717]/70 lg:text-[17px]"
								style={{ "--i": 7 } as React.CSSProperties}
								data-stagger
							>
								Se você atende lojistas, ajuda negócios locais ou já recomenda ferramentas para vender mais, o RecompraCRM transforma essa indicação em uma
								receita acompanhável, com painel próprio e pagamentos mensais.
							</p>

							<div className="ledger-fade mt-8 flex flex-col gap-3 sm:flex-row" style={{ "--i": 9 } as React.CSSProperties} data-stagger>
								<Link
									href={PARTNER_LOGIN_HREF}
									className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-[#24549c] px-6 py-4 text-[14px] font-extrabold uppercase tracking-[0.04em] text-white shadow-[0_16px_40px_-12px_rgba(36,84,156,0.38),0_6px_12px_rgba(36,84,156,0.16)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#1a3d7a]"
								>
									Entrar no programa
									<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
								</Link>
								<Link
									href={PARTNER_LOGIN_HREF}
									className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#171717]/15 bg-white px-6 py-4 text-[14px] font-bold text-[#171717] transition-all duration-200 hover:border-[#24549c]/30 hover:bg-[#ffffff]"
								>
									Acessar painel de parceiro
								</Link>
							</div>
						</div>

						<div
							className="ledger-fade rounded-3xl border border-[#e5e5e5] bg-white shadow-[0_24px_60px_-28px_rgba(36,84,156,0.36),0_4px_10px_rgba(0,0,0,0.04)]"
							style={{ "--i": 5 } as React.CSSProperties}
							data-stagger
						>
							<div className="border-b border-[#e5e5e5] px-5 py-4 sm:px-6">
								<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
									<div>
										<p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#737373]">Extrato do parceiro</p>
										<p className="mt-1 text-[18px] font-extrabold text-[#171717]">Modelo de comissão</p>
									</div>
									<span className="inline-flex w-fit items-center gap-2 rounded-full bg-[#24549c]/10 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#24549c]">
										<ShieldCheck className="h-3.5 w-3.5" strokeWidth={2.5} />
										Restrito e seguro
									</span>
								</div>
							</div>

							<div className="grid gap-0 lg:grid-cols-[1fr_0.82fr]">
								<div className="divide-y divide-[#e5e5e5]">
									{COMMISSION_ROWS.map((row, index) => (
										<div key={row.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-5 sm:px-6">
											<div>
												<p className="text-[12px] font-extrabold uppercase tracking-[0.12em] text-[#737373]">{row.label}</p>
												<p className="mt-1 text-[13px] leading-snug text-[#171717]/65">{row.helper}</p>
											</div>
											<div
												className={`ledger-tabular rounded-2xl px-3.5 py-2 text-right text-[24px] font-extrabold leading-none ${
													index === 0 ? "bg-[#ffb900] text-[#171717]" : "bg-[#24549c]/10 text-[#24549c]"
												}`}
											>
												{row.value}
											</div>
										</div>
									))}
								</div>

								<div className="border-t border-[#e5e5e5] bg-[#f7f9fc] p-5 sm:p-6 lg:border-l lg:border-t-0">
									<div className="rounded-2xl border border-[#24549c]/15 bg-white p-4">
										<div className="flex items-center justify-between gap-3 border-b border-dashed border-[#e5e5e5] pb-3">
											<p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#737373]">Link de indicação</p>
											<BadgeDollarSign className="h-4 w-4 text-[#ffb900]" strokeWidth={2.5} />
										</div>
										<p className="mt-3 break-all rounded-xl bg-[#24549c] px-3 py-2 text-[12px] font-extrabold text-white ledger-tabular">
											recompracrm.com/r/seucodigo
										</p>
									</div>

									<div className="mt-5 space-y-3">
										{FLOW_STEPS.map((step) => (
											<div key={step.title} className="flex gap-3">
												<span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#24549c]/10 text-[#24549c]">
													<step.icon className="h-4 w-4" strokeWidth={2.5} />
												</span>
												<div>
													<p className="text-[13px] font-extrabold text-[#171717]">{step.title}</p>
													<p className="mt-0.5 text-[12px] leading-snug text-[#171717]/62">{step.text}</p>
												</div>
											</div>
										))}
									</div>
								</div>
							</div>
						</div>
					</div>
				</Reveal>
			</div>
		</section>
	);
}
