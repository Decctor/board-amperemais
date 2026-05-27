import { Reveal } from "./_primitives/Reveal";
import { Stamp } from "./_primitives/Stamp";

const ENTRIES = [
	{
		index: "01",
		header: "Dados",
		title: "O sistema recebe a informação da venda.",
		desc:
			"A informação pode vir do ponto de interação em tablet, de um QR Code ou da integração com o app preferido da empresa, como iFood, Nuvem Shop e outras conexões. Cada compra traz matéria-prima valiosa: identificação do cliente, valor da venda e, quando disponível, os itens comprados.",
		stamp: "PDI + integrações",
		stampVariant: "soft-blue" as const,
		aux: "Entrada de dados para alimentar o relacionamento",
	},
	{
		index: "02",
		header: "Inteligência",
		title: "O CRM decide quem deve receber o quê, e quando.",
		desc:
			"A inteligência atua em gatilhos como nova compra, primeira compra, aniversário, cashback expirando e movimentos RFM. Depois combina isso com filtros de segmentação, localização, top compradores do produto X, frequência e valor gasto. O resultado é comunicação para a pessoa certa, na hora certa.",
		stamp: "Gatilhos + filtros",
		stampVariant: "soft-amber" as const,
		aux: "O poder do CRM está na precisão da audiência",
	},
	{
		index: "03",
		header: "Automação",
		title: "A comunicação sai com a marca e o número da loja.",
		desc:
			"A empresa não precisa ficar olhando clientes em risco e criando mensagem manualmente. O RecompraCRM monta e dispara comunicações automáticas, com textos personalizados, imagens, vídeos e a identidade escolhida pela loja. Nada de e-mail frio ou SMS desconhecido: a conversa acontece no canal da própria marca.",
		stamp: "WhatsApp da loja",
		stampVariant: "success" as const,
		aux: "Automação sem perder a voz da empresa",
	},
];

export function LedgerHowItWorks() {
	return (
		<section id="como-funciona" className="ledger-canvas-soft relative py-20 lg:py-28">
			<div className="mx-auto max-w-7xl px-5 lg:px-8">
				{/* Section header */}
				<Reveal className="mb-14 lg:mb-20">
					<div className="flex items-center gap-3 mb-6">
						<span className="ledger-fade inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#24549c] text-white text-[11px] font-extrabold ledger-tabular">
							02
						</span>
						<span
							className="ledger-fade text-[11px] font-extrabold tracking-[0.16em] uppercase text-[#24549c]"
							style={{ "--i": 1 } as React.CSSProperties}
							data-stagger
						>
							Como funciona
						</span>
						<span className="ledger-fade flex-1 h-px bg-[#24549c]/15" style={{ "--i": 2 } as React.CSSProperties} data-stagger />
					</div>
					<h2 className="font-extrabold text-[#171717] tracking-[-0.02em] leading-[1.05] text-[34px] sm:text-[42px] lg:text-[56px] max-w-[20ch]">
						<span className="block ledger-write" style={{ "--i": 1 } as React.CSSProperties} data-stagger>
							Dados entram.
						</span>
						<span className="block text-[#171717]/55 ledger-fade mt-1" style={{ "--i": 4 } as React.CSSProperties} data-stagger>
							O CRM transforma em recompra.
						</span>
					</h2>
				</Reveal>

				{/* Entries */}
				<div className="space-y-5">
					{ENTRIES.map((entry) => (
						<Reveal key={entry.index}>
							<article className="rounded-3xl bg-white border border-[#e5e5e5] shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-6 lg:p-10 grid grid-cols-12 gap-4 lg:gap-8">
								{/* Index */}
								<div className="col-span-12 lg:col-span-2 flex lg:flex-col items-baseline lg:items-start gap-3 lg:gap-3">
									<p
										className="ledger-fade text-[60px] lg:text-[80px] font-extrabold tracking-[-0.04em] leading-none text-[#24549c] ledger-tabular"
										style={{ "--i": 0 } as React.CSSProperties}
										data-stagger
									>
										{entry.index}
									</p>
									<p
										className="ledger-fade text-[11px] font-extrabold tracking-[0.16em] uppercase text-[#24549c]/80"
										style={{ "--i": 1 } as React.CSSProperties}
										data-stagger
									>
										{entry.header}
									</p>
								</div>

								{/* Content */}
								<div className="col-span-12 lg:col-span-7">
									<h3
										className="ledger-fade font-extrabold tracking-[-0.018em] leading-[1.1] text-[24px] lg:text-[32px] text-[#171717] mb-4 max-w-[22ch]"
										style={{ "--i": 2 } as React.CSSProperties}
										data-stagger
									>
										{entry.title}
									</h3>
									<p
										className="ledger-fade text-[15px] lg:text-[16px] leading-[1.65] text-[#171717]/70 max-w-[58ch]"
										style={{ "--i": 4 } as React.CSSProperties}
										data-stagger
									>
										{entry.desc}
									</p>
								</div>

								{/* Stamp + aux */}
								<div className="col-span-12 lg:col-span-3 flex flex-col items-start lg:items-end gap-3 lg:pt-3">
									<div className="ledger-fade" style={{ "--i": 6 } as React.CSSProperties} data-stagger>
										<Stamp variant={entry.stampVariant} size="md">
											{entry.stamp}
										</Stamp>
									</div>
									<p
										className="ledger-fade text-[11px] leading-snug font-semibold text-[#737373] lg:text-right max-w-[20ch]"
										style={{ "--i": 8 } as React.CSSProperties}
										data-stagger
									>
										{entry.aux}
									</p>
								</div>
							</article>
						</Reveal>
					))}
				</div>
			</div>
		</section>
	);
}
