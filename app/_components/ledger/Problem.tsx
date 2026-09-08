import { LandingArt } from "./_primitives/LandingArt";
import { Reveal } from "./_primitives/Reveal";
import { SectionHeader } from "./_primitives/SectionHeader";

const PROBLEMS = [
	{
		art: "/images/landing/bag-asleep.png",
		title: "Ele esquece da loja.",
		text: "Sem um motivo concreto para voltar, a próxima compra vai para quem apareceu primeiro no feed.",
	},
	{
		art: "/images/landing/calendar-hourglass.png",
		title: "Você descobre tarde demais.",
		text: "Quando percebe que o cliente sumiu, já se passaram dois meses. Planilha nenhuma avisa.",
	},
	{
		art: "/images/landing/phone-pile.png",
		title: "Mandar mensagem na mão não escala.",
		text: "Copiar número, escrever, esperar. Funciona com 10 clientes. Não funciona com 1.000.",
	},
] as const;

export function LedgerProblem() {
	return (
		<section id="problema" className="ledger-canvas ledger-deferred relative py-20 lg:py-28">
			<div className="mx-auto max-w-7xl px-5 lg:px-8">
				<SectionHeader
					eyebrow="Por que o cliente some"
					title={
						<>
							<span className="ledger-write block" style={{ "--i": 1 } as React.CSSProperties} data-stagger>
								Não é falta de cliente.
							</span>
							<span className="ledger-fade mt-1 block text-[#171717]/55" style={{ "--i": 4 } as React.CSSProperties} data-stagger>
								É falta de motivo para voltar.
							</span>
						</>
					}
				/>

				<Reveal>
					<div className="grid gap-5 md:grid-cols-3 lg:gap-6">
						{PROBLEMS.map((problem, index) => (
							<article
								key={problem.title}
								className="ledger-fade flex flex-col rounded-3xl border border-[#e5e5e5] bg-[#f7f9fc] p-6 lg:p-8"
								style={{ "--i": index * 2 } as React.CSSProperties}
								data-stagger
							>
								<LandingArt src={problem.art} sizes="(max-width: 767px) 190px, 230px" className="mx-auto w-[170px] sm:w-[200px] lg:w-[230px]" />
								<h3 className="mt-6 text-[20px] font-extrabold leading-tight tracking-[-0.015em] text-[#171717] lg:text-[22px]">{problem.title}</h3>
								<p className="mt-2 text-[14px] leading-[1.6] text-[#171717]/65 lg:text-[15px]">{problem.text}</p>
							</article>
						))}
					</div>
				</Reveal>
			</div>
		</section>
	);
}
