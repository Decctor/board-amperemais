"use client";

import { formatToMoney } from "@/lib/formatting";
import { ArrowRight, Minus, Plus, Store } from "lucide-react";
import { useMemo, useState } from "react";
import { TrackedLink } from "@/app/_components/ledger/TrackedLink";
import { Reveal } from "@/app/_components/ledger/_primitives/Reveal";
import { SectionEyebrow } from "./SectionEyebrow";
import { FIRST_MONTH_PAYOUT, PARTNER_LOGIN_HREF, RECURRING_MONTH_PAYOUT } from "./program-facts";

const MIN_STORES = 1;
const MAX_STORES = 30;

export function PartnersCalculator() {
	const [stores, setStores] = useState(5);

	const { activation, recurring, firstYear } = useMemo(
		() => ({
			activation: stores * FIRST_MONTH_PAYOUT,
			recurring: stores * RECURRING_MONTH_PAYOUT,
			firstYear: stores * (FIRST_MONTH_PAYOUT + RECURRING_MONTH_PAYOUT * 11),
		}),
		[stores],
	);

	const clamp = (value: number) => Math.min(MAX_STORES, Math.max(MIN_STORES, value));

	return (
		<section id="calculadora" className="ledger-canvas relative py-20 lg:py-28">
			<div className="mx-auto max-w-7xl px-5 lg:px-8">
				<Reveal className="max-w-3xl">
					<SectionEyebrow index="03" label="Calculadora de ganhos" />
					<h2 className="font-extrabold text-[#171717] tracking-[-0.02em] leading-[1.05] text-[32px] sm:text-[42px] lg:text-[52px]">
						<span className="block ledger-write" style={{ "--i": 1 } as React.CSSProperties} data-stagger>
							Quanto a sua rede
						</span>
						<span className="block ledger-fade text-[#24549c]" style={{ "--i": 3 } as React.CSSProperties} data-stagger>
							pode te render?
						</span>
					</h2>
				</Reveal>

				<Reveal className="mt-12 lg:mt-16">
					<div
						className="ledger-fade overflow-hidden rounded-3xl border border-[#e5e5e5] bg-white shadow-[0_24px_60px_-30px_rgba(36,84,156,0.32)] lg:grid lg:grid-cols-[0.92fr_1.08fr]"
						data-stagger
					>
						{/* Controles */}
						<div className="border-b border-[#e5e5e5] p-7 sm:p-9 lg:border-b-0 lg:border-r">
							<div className="flex items-center gap-2.5">
								<span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#24549c]/10 text-[#24549c]">
									<Store className="h-4 w-4" strokeWidth={2.5} />
								</span>
								<p className="text-[12px] font-extrabold uppercase tracking-[0.14em] text-[#737373]">Lojas que você indica</p>
							</div>

							<div className="mt-6 flex items-center justify-between">
								<button
									type="button"
									onClick={() => setStores((current) => clamp(current - 1))}
									disabled={stores <= MIN_STORES}
									aria-label="Diminuir lojas"
									className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#e5e5e5] text-[#171717] transition-colors hover:border-[#24549c]/40 hover:text-[#24549c] disabled:opacity-35 disabled:hover:border-[#e5e5e5] disabled:hover:text-[#171717]"
								>
									<Minus className="h-4 w-4" strokeWidth={2.5} />
								</button>
								<span className="ledger-tabular text-[64px] font-extrabold leading-none tracking-[-0.04em] text-[#171717]">{stores}</span>
								<button
									type="button"
									onClick={() => setStores((current) => clamp(current + 1))}
									disabled={stores >= MAX_STORES}
									aria-label="Aumentar lojas"
									className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#e5e5e5] text-[#171717] transition-colors hover:border-[#24549c]/40 hover:text-[#24549c] disabled:opacity-35 disabled:hover:border-[#e5e5e5] disabled:hover:text-[#171717]"
								>
									<Plus className="h-4 w-4" strokeWidth={2.5} />
								</button>
							</div>

							<input
								type="range"
								min={MIN_STORES}
								max={MAX_STORES}
								value={stores}
								onChange={(event) => setStores(clamp(Number(event.target.value)))}
								aria-label="Número de lojas indicadas"
								className="mt-7 w-full cursor-pointer accent-[#24549c]"
							/>
							<div className="mt-2 flex justify-between text-[11px] font-bold text-[#171717]/40">
								<span>{MIN_STORES} loja</span>
								<span>{MAX_STORES}+ lojas</span>
							</div>

							<p className="mt-7 text-[13px] leading-[1.6] text-[#171717]/55">
								Cada loja ativa rende {formatToMoney(FIRST_MONTH_PAYOUT)} no primeiro mês e {formatToMoney(RECURRING_MONTH_PAYOUT)} por mês depois disso.
							</p>
						</div>

						{/* Resultado */}
						<div className="relative flex flex-col justify-between bg-gradient-to-br from-[#24549c] to-[#1a3d7a] p-7 text-white sm:p-9">
							<div className="absolute -top-16 -right-16 h-[220px] w-[220px] rounded-full bg-[#ffb900]/15 blur-3xl pointer-events-none" aria-hidden />

							<div className="relative">
								<p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-white/60">Receita recorrente</p>
								<div className="mt-2 flex items-baseline gap-2">
									<span className="ledger-tabular text-[44px] font-extrabold leading-none tracking-[-0.03em] text-[#ffb900] sm:text-[56px]">
										{formatToMoney(recurring)}
									</span>
									<span className="text-[15px] font-bold text-white/70">/mês</span>
								</div>
								<p className="mt-2 text-[13px] text-white/60">A partir do segundo mês, mês após mês.</p>
							</div>

							<div className="relative mt-8 grid grid-cols-2 gap-4">
								<div className="rounded-2xl bg-white/10 p-4">
									<p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-white/55">Bônus de ativação</p>
									<p className="ledger-tabular mt-1.5 text-[22px] font-extrabold text-white">{formatToMoney(activation)}</p>
									<p className="mt-0.5 text-[11px] text-white/50">no 1º mês</p>
								</div>
								<div className="rounded-2xl bg-white/10 p-4">
									<p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-white/55">Total no 1º ano</p>
									<p className="ledger-tabular mt-1.5 text-[22px] font-extrabold text-white">{formatToMoney(firstYear)}</p>
									<p className="mt-0.5 text-[11px] text-white/50">ativação + recorrência</p>
								</div>
							</div>

							<TrackedLink
								href={PARTNER_LOGIN_HREF}
								event="partner_program_cta_clicked"
								controlEvent="lead"
								properties={{ cta_id: "calculadora_entrar_no_programa", location: "partner_calculator", stores }}
								className="group relative mt-7 inline-flex items-center justify-center gap-2 rounded-2xl bg-[#ffb900] px-6 py-4 text-[14px] font-extrabold uppercase tracking-[0.04em] text-[#171717] shadow-[0_16px_40px_-12px_rgba(255,185,0,0.5)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#e6a700]"
							>
								Começar a indicar
								<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
							</TrackedLink>
						</div>
					</div>
				</Reveal>

				<p className="mt-5 text-center text-[12px] text-[#737373]">
					Estimativa ilustrativa considerando lojas no plano mensal e ativas no período. Valores brutos, antes de impostos.
				</p>
			</div>
		</section>
	);
}
