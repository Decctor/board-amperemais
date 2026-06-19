import { CalendarCheck, Link2, MousePointerClick, ReceiptText } from "lucide-react";
import { Reveal } from "@/app/_components/ledger/_primitives/Reveal";
import { SectionEyebrow } from "./SectionEyebrow";
import { ATTRIBUTION_DAYS } from "./program-facts";

const STEPS = [
	{
		icon: Link2,
		title: "Pegue seu link",
		text: "Ao entrar no programa você recebe um código e um link de indicação exclusivos no seu painel.",
	},
	{
		icon: ReceiptText,
		title: "Indique o lojista",
		text: "Compartilhe com lojas do seu relacionamento. O cliente chega pelo seu link ou informa seu código no cadastro.",
	},
	{
		icon: CalendarCheck,
		title: "Receba todo mês",
		text: "Quando a loja paga a mensalidade, a comissão entra no seu extrato e é repassada via PIX.",
	},
];

const ATTRIBUTION = [
	{
		icon: MousePointerClick,
		title: "Janela de atribuição",
		text: `A indicação fica registrada por ${ATTRIBUTION_DAYS} dias após o clique no seu link.`,
	},
	{
		icon: ReceiptText,
		title: "Código tem prioridade",
		text: "Se o lojista informar seu código no cadastro, a indicação é sua mesmo sem o clique no link.",
	},
];

export function PartnersHowItWorks() {
	return (
		<section id="como-funciona-parceria" className="ledger-canvas relative py-20 lg:py-28">
			<div className="mx-auto max-w-7xl px-5 lg:px-8">
				<Reveal className="max-w-3xl">
					<SectionEyebrow index="01" label="Como funciona" />
					<h2 className="font-extrabold text-[#171717] tracking-[-0.02em] leading-[1.05] text-[32px] sm:text-[42px] lg:text-[52px]">
						<span className="block ledger-write" style={{ "--i": 1 } as React.CSSProperties} data-stagger>
							Três passos.
						</span>
						<span className="block ledger-fade text-[#24549c]" style={{ "--i": 3 } as React.CSSProperties} data-stagger>
							Uma receita que não para.
						</span>
					</h2>
				</Reveal>

				<Reveal className="mt-12 lg:mt-16">
					<ol className="grid gap-5 md:grid-cols-3 lg:gap-6">
						{STEPS.map((step, index) => (
							<li
								key={step.title}
								className="ledger-fade relative flex flex-col rounded-3xl border border-[#e5e5e5] bg-white p-7 shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
								style={{ "--i": index * 2 } as React.CSSProperties}
								data-stagger
							>
								<div className="flex items-center justify-between">
									<span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#24549c]/10 text-[#24549c]">
										<step.icon className="h-5 w-5" strokeWidth={2.5} />
									</span>
									<span className="ledger-tabular text-[40px] font-extrabold leading-none text-[#171717]/8">{`0${index + 1}`}</span>
								</div>
								<h3 className="mt-5 text-[18px] font-extrabold text-[#171717]">{step.title}</h3>
								<p className="mt-2 text-[14px] leading-[1.6] text-[#171717]/65">{step.text}</p>
							</li>
						))}
					</ol>
				</Reveal>

				<Reveal className="mt-6">
					<div className="ledger-fade grid gap-4 rounded-3xl border border-[#24549c]/15 bg-[#f7f9fc] p-6 sm:grid-cols-2 sm:p-7" data-stagger>
						{ATTRIBUTION.map((rule) => (
							<div key={rule.title} className="flex gap-3.5">
								<span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#24549c] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
									<rule.icon className="h-4 w-4" strokeWidth={2.5} />
								</span>
								<div>
									<p className="text-[13px] font-extrabold text-[#171717]">{rule.title}</p>
									<p className="mt-0.5 text-[13px] leading-snug text-[#171717]/62">{rule.text}</p>
								</div>
							</div>
						))}
					</div>
				</Reveal>
			</div>
		</section>
	);
}
