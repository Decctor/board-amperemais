import { ArrowRight } from "lucide-react";
import { LandingArt } from "./_primitives/LandingArt";
import { Reveal } from "./_primitives/Reveal";
import { SectionHeader } from "./_primitives/SectionHeader";

const STEPS = [
	{
		index: "01",
		label: "A venda entra",
		title: "O sistema reconhece a compra.",
		description: "Pelo tablet no balcão, QR Code ou integração com seu ERP, delivery ou loja online. Sem retrabalho no caixa.",
		art: "/images/landing/poi-tablet.png",
	},
	{
		index: "02",
		label: "O CRM decide",
		title: "Cada cliente recebe o estímulo certo.",
		description: "Primeira compra, aniversário, inatividade, cashback expirando e perfil RFM definem quem deve ser acionado e quando.",
		art: "/images/landing/crm-sorter.png",
	},
	{
		index: "03",
		label: "A mensagem sai",
		title: "A loja volta a conversar.",
		description: "Enviada pelo número e com a identidade da sua marca, pronta para virar uma nova visita.",
		art: "/images/landing/message-out.png",
	},
] as const;

export function LedgerHowItWorks() {
	return (
		<section id="como-funciona" className="ledger-canvas-soft ledger-deferred relative py-20 lg:py-28">
			<div className="mx-auto max-w-7xl px-5 lg:px-8">
				<SectionHeader
					eyebrow="Como funciona"
					title={
						<span className="ledger-write block" style={{ "--i": 1 } as React.CSSProperties} data-stagger>
							Da venda à próxima visita, sem ninguém precisar lembrar.
						</span>
					}
					description="Os dados entram uma vez. O CRM decide quem acionar. A conversa acontece no WhatsApp da loja."
				/>

				<Reveal>
					<ol className="grid gap-5 lg:grid-cols-3 lg:gap-8">
						{STEPS.map((step, index) => (
							<li
								key={step.index}
								className="ledger-fade relative flex flex-col rounded-3xl border border-[#e5e5e5] bg-white p-6 shadow-[0_18px_50px_-32px_rgba(36,84,156,0.35)] lg:p-8"
								style={{ "--i": index * 2 } as React.CSSProperties}
								data-stagger
							>
								<div className="flex items-center justify-between">
									<span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#24549c]">{step.label}</span>
									<span className="ledger-tabular text-[13px] font-extrabold text-[#24549c]/45">{step.index}</span>
								</div>
								<LandingArt src={step.art} sizes="(max-width: 1023px) 240px, 260px" className="mx-auto mt-4 w-[200px] sm:w-[240px] lg:w-[260px]" />
								<h3 className="mt-5 text-[20px] font-extrabold leading-tight tracking-[-0.015em] text-[#171717] lg:text-[22px]">{step.title}</h3>
								<p className="mt-2 text-[14px] leading-[1.6] text-[#171717]/65 lg:text-[15px]">{step.description}</p>
								{index < STEPS.length - 1 ? (
									<span
										className="absolute top-1/2 -right-6 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[#e5e5e5] bg-white text-[#24549c] shadow-[0_6px_16px_-6px_rgba(36,84,156,0.35)] lg:flex"
										aria-hidden
									>
										<ArrowRight className="h-4 w-4" />
									</span>
								) : null}
							</li>
						))}
					</ol>
				</Reveal>

				<Reveal className="mt-8 flex justify-center lg:mt-10">
					<div className="ledger-fade inline-flex items-center gap-3 rounded-2xl bg-[#ffb900]/15 px-4 py-3 text-[#171717]">
						<span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#ffb900]">
							<ArrowRight className="h-4 w-4" />
						</span>
						<p className="text-[13px] font-bold leading-snug sm:text-[14px]">Menos operação manual. Mais clientes lembrando de voltar.</p>
					</div>
				</Reveal>
			</div>
		</section>
	);
}
