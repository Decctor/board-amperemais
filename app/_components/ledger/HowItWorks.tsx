import { ArrowRight, MessageCircle, ShoppingBag, Sparkles } from "lucide-react";

const STEPS = [
	{
		index: "01",
		label: "A venda entra",
		title: "O sistema reconhece a compra.",
		description: "Pelo tablet, QR Code ou integração, o RecompraCRM registra cliente, valor e itens sem criar mais trabalho no balcão.",
		icon: ShoppingBag,
	},
	{
		index: "02",
		label: "O CRM decide",
		title: "Cada cliente recebe o estímulo certo.",
		description: "Gatilhos de primeira compra, inatividade, aniversário, cashback e perfil RFM definem quem deve ser acionado e quando.",
		icon: Sparkles,
	},
	{
		index: "03",
		label: "A mensagem sai",
		title: "A loja volta a conversar no WhatsApp.",
		description: "A comunicação é enviada automaticamente com a identidade e o número da loja, pronta para transformar lembrança em nova visita.",
		icon: MessageCircle,
	},
] as const;

export function LedgerHowItWorks() {
	return (
		<section id="como-funciona" className="ledger-canvas-soft ledger-deferred relative py-16 sm:py-20 lg:py-24">
			<div className="mx-auto max-w-7xl px-5 lg:px-8">
				<div className="grid gap-10 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] lg:items-end lg:gap-16">
					<div>
						<div className="mb-5 flex items-center gap-3">
							<span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#24549c] text-[11px] font-extrabold text-white ledger-tabular">
								02
							</span>
							<span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#24549c]">Como funciona</span>
						</div>
						<h2 className="max-w-[15ch] text-[34px] font-extrabold leading-[1.05] tracking-[-0.02em] text-[#171717] sm:text-[42px] lg:text-[56px]">
							Da venda à próxima visita, no automático.
						</h2>
						<p className="mt-5 max-w-[48ch] text-[15px] leading-[1.65] text-[#171717]/65 lg:text-[17px]">
							O fluxo é simples para a equipe e inteligente por trás: os dados entram uma vez, o CRM identifica a oportunidade e a conversa acontece.
						</p>
					</div>

					<div className="rounded-3xl border border-[#e5e5e5] bg-white px-5 py-2 shadow-[0_18px_50px_-32px_rgba(36,84,156,0.35)] sm:px-7">
						<ol>
							{STEPS.map((step, index) => {
								const Icon = step.icon;
								return (
									<li key={step.index} className="grid grid-cols-[auto_1fr] gap-4 border-b border-[#e5e5e5] py-6 last:border-b-0 sm:gap-5">
										<div className="flex flex-col items-center">
											<span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#24549c]/10 text-[#24549c]">
												<Icon className="h-5 w-5" strokeWidth={2.2} />
											</span>
											{index < STEPS.length - 1 ? <span className="mt-3 hidden h-full w-px bg-[#24549c]/15 sm:block" aria-hidden /> : null}
										</div>
										<div className="min-w-0">
											<div className="flex flex-wrap items-center gap-x-3 gap-y-1">
												<span className="text-[11px] font-extrabold tracking-[0.14em] text-[#24549c] ledger-tabular">{step.index}</span>
												<span className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#171717]/45">{step.label}</span>
											</div>
											<h3 className="mt-2 text-[19px] font-extrabold leading-tight tracking-[-0.015em] text-[#171717] sm:text-[22px]">{step.title}</h3>
											<p className="mt-2 max-w-[58ch] text-[14px] leading-[1.6] text-[#171717]/65 sm:text-[15px]">{step.description}</p>
										</div>
									</li>
								);
							})}
						</ol>
						<div className="mb-5 flex items-center gap-3 rounded-2xl bg-[#ffb900]/15 px-4 py-3 text-[#171717] sm:ml-16">
							<span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#ffb900]">
								<ArrowRight className="h-4 w-4" />
							</span>
							<p className="text-[13px] font-bold leading-snug">Menos operação manual. Mais clientes lembrando de voltar.</p>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
