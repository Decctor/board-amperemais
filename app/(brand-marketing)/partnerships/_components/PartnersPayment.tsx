import { formatToMoney } from "@/lib/formatting";
import { BadgeDollarSign, CalendarClock, Landmark, Receipt } from "lucide-react";
import { Reveal } from "@/app/_components/ledger/_primitives/Reveal";
import { SectionEyebrow } from "./SectionEyebrow";
import {
	COMMISSIONABLE_MONTHLY_BASE,
	FIRST_INVOICE_PERCENT,
	FIRST_MONTH_PAYOUT,
	RECURRING_MONTH_PAYOUT,
	SUBSEQUENT_INVOICE_PERCENT,
	THIRD_INVOICE_PERCENT,
	THIRD_MONTH_PAYOUT,
	YEARLY_INVOICE_PERCENT,
} from "./program-facts";

const TIERS = [
	{
		label: "Primeira mensalidade",
		percent: `${FIRST_INVOICE_PERCENT}%`,
		caption: "Plano mensal",
		helper: "Assim que o primeiro pagamento é confirmado, a mensalidade inteira vai pra você.",
		amount: `${formatToMoney(FIRST_MONTH_PAYOUT)} por loja`,
		featured: true,
	},
	{
		label: "Terceira mensalidade",
		percent: `${THIRD_INVOICE_PERCENT}%`,
		caption: "Plano mensal",
		helper: "Bônus de permanência quando o cliente indicado chega à terceira mensalidade paga.",
		amount: `${formatToMoney(THIRD_MONTH_PAYOUT)} por loja`,
		featured: true,
	},
	{
		label: "Demais mensalidades",
		percent: `${SUBSEQUENT_INVOICE_PERCENT}%`,
		caption: "Plano mensal",
		helper: "Recorrente, mês após mês, enquanto a loja continuar ativa na plataforma.",
		amount: `${formatToMoney(RECURRING_MONTH_PAYOUT)} por loja/mês`,
		featured: false,
	},
	{
		label: "Planos anuais",
		percent: `${YEARLY_INVOICE_PERCENT}%`,
		caption: "Pagamento à vista",
		helper: "Quando a loja fecha no plano anual, você recebe uma comissão única sobre a fatura.",
		amount: "Sobre a fatura anual",
		featured: false,
	},
];

const PAYOUT_DETAILS = [
	{ icon: CalendarClock, title: "Apuração mensal", text: "O financeiro fecha as comissões elegíveis todo mês." },
	{ icon: Landmark, title: "Repasse via PIX", text: "Pagamento na chave PIX cadastrada no seu perfil de parceiro." },
	{ icon: Receipt, title: "Comprovante anexado", text: "Cada pagamento fica no seu painel com o comprovante do repasse." },
];

export function PartnersPayment() {
	return (
		<section id="esquema-de-pagamento" className="ledger-canvas-soft relative overflow-hidden py-20 lg:py-28">
			<div className="absolute inset-x-0 top-0 h-px bg-[#24549c]/10" aria-hidden />
			<div className="mx-auto max-w-7xl px-5 lg:px-8">
				<Reveal className="max-w-3xl">
					<SectionEyebrow index="02" label="Esquema de pagamento" />
					<h2 className="font-extrabold text-[#171717] tracking-[-0.02em] leading-[1.05] text-[32px] sm:text-[42px] lg:text-[52px]">
						<span className="block ledger-write" style={{ "--i": 1 } as React.CSSProperties} data-stagger>
							100% no primeiro mês.
						</span>
						<span className="block ledger-fade text-[#24549c]" style={{ "--i": 3 } as React.CSSProperties} data-stagger>
							E 100% no terceiro.
						</span>
					</h2>
					<p
						className="ledger-fade mt-5 max-w-[56ch] text-[16px] leading-[1.6] text-[#171717]/65"
						style={{ "--i": 5 } as React.CSSProperties}
						data-stagger
					>
						A comissão incide sobre a mensalidade do plano da plataforma, hoje {formatToMoney(COMMISSIONABLE_MONTHLY_BASE)}. Serviços de consultoria e
						adicionais não entram na base.
					</p>
				</Reveal>

				<Reveal className="mt-12 lg:mt-16">
					<div className="grid gap-5 lg:grid-cols-4 lg:gap-6">
						{TIERS.map((tier, index) => (
							<div
								key={tier.label}
								className={`ledger-fade flex flex-col rounded-3xl p-7 ${
									tier.featured
										? "bg-gradient-to-br from-[#24549c] to-[#1a3d7a] text-white shadow-[0_28px_60px_-22px_rgba(36,84,156,0.5)]"
										: "border border-[#e5e5e5] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
								}`}
								style={{ "--i": index * 2 } as React.CSSProperties}
								data-stagger
							>
								<div className="flex items-center justify-between gap-3">
									<p className={`text-[11px] font-extrabold uppercase tracking-[0.14em] ${tier.featured ? "text-white/65" : "text-[#171717]/50"}`}>
										{tier.caption}
									</p>
									{tier.featured ? (
										<span className="inline-flex items-center gap-1.5 rounded-full bg-[#ffb900] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#171717]">
											<BadgeDollarSign className="h-3 w-3" strokeWidth={2.5} />
											Bônus
										</span>
									) : null}
								</div>

								<div className="mt-6 flex items-end gap-2">
									<span
										className={`ledger-tabular text-[56px] font-extrabold leading-none tracking-[-0.04em] ${
											tier.featured ? "text-[#ffb900]" : "text-[#24549c]"
										}`}
									>
										{tier.percent}
									</span>
								</div>
								<p className={`mt-3 text-[15px] font-extrabold ${tier.featured ? "text-white" : "text-[#171717]"}`}>{tier.label}</p>
								<p className={`mt-1.5 flex-1 text-[14px] leading-[1.6] ${tier.featured ? "text-white/75" : "text-[#171717]/62"}`}>{tier.helper}</p>
								<p
									className={`mt-5 rounded-xl px-3.5 py-2.5 text-[13px] font-extrabold ${tier.featured ? "bg-white/12 text-white" : "bg-[#24549c]/8 text-[#24549c]"}`}
								>
									{tier.amount}
								</p>
							</div>
						))}
					</div>
				</Reveal>

				<Reveal className="mt-6">
					<div className="ledger-fade grid gap-6 rounded-3xl border border-[#e5e5e5] bg-white p-7 sm:grid-cols-3 sm:p-8" data-stagger>
						{PAYOUT_DETAILS.map((detail) => (
							<div key={detail.title} className="flex gap-3.5">
								<span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#ffb900]/18 text-[#171717]">
									<detail.icon className="h-4 w-4 text-[#24549c]" strokeWidth={2.5} />
								</span>
								<div>
									<p className="text-[14px] font-extrabold text-[#171717]">{detail.title}</p>
									<p className="mt-1 text-[13px] leading-snug text-[#171717]/62">{detail.text}</p>
								</div>
							</div>
						))}
					</div>
				</Reveal>
			</div>
		</section>
	);
}
