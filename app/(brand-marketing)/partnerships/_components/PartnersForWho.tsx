import { Briefcase, Calculator, Megaphone, Users } from "lucide-react";
import { Reveal } from "@/app/_components/ledger/_primitives/Reveal";
import { SectionEyebrow } from "./SectionEyebrow";

const PROFILES = [
	{
		icon: Briefcase,
		title: "Consultores de varejo",
		text: "Você já entra nas lojas pra melhorar resultado. Indique a ferramenta que sustenta o que você recomenda.",
	},
	{
		icon: Megaphone,
		title: "Agências e gestores de tráfego",
		text: "Some uma receita recorrente à sua carteira sem precisar entregar mais um serviço operacional.",
	},
	{
		icon: Users,
		title: "Especialistas e criadores",
		text: "Tem audiência de lojistas? Transforme a sua recomendação de confiança em comissão recorrente.",
	},
	{
		icon: Calculator,
		title: "Contadores e parceiros de ERP",
		text: "Você fala com dezenas de comércios todo mês. Indique e acompanhe cada cliente pelo painel.",
	},
];

export function PartnersForWho() {
	return (
		<section className="ledger-canvas-soft relative py-20 lg:py-28">
			<div className="mx-auto max-w-7xl px-5 lg:px-8">
				<div className="grid gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:gap-16">
					<Reveal>
						<SectionEyebrow index="04" label="Para quem é" />
						<h2 className="font-extrabold text-[#171717] tracking-[-0.02em] leading-[1.05] text-[32px] sm:text-[42px] lg:text-[52px]">
							<span className="block ledger-write" style={{ "--i": 1 } as React.CSSProperties} data-stagger>
								Feito pra quem
							</span>
							<span className="block ledger-fade text-[#24549c]" style={{ "--i": 3 } as React.CSSProperties} data-stagger>
								já vive de varejo.
							</span>
						</h2>
						<p
							className="ledger-fade mt-5 max-w-[42ch] text-[16px] leading-[1.6] text-[#171717]/65"
							style={{ "--i": 5 } as React.CSSProperties}
							data-stagger
						>
							Se a sua relação com o lojista já existe, o programa só transforma essa confiança em receita que se acumula.
						</p>
					</Reveal>

					<Reveal>
						<ul className="divide-y divide-[#e5e5e5] border-y border-[#e5e5e5]">
							{PROFILES.map((profile, index) => (
								<li key={profile.title} className="ledger-fade flex items-start gap-5 py-6" style={{ "--i": index } as React.CSSProperties} data-stagger>
									<span className="ledger-tabular w-8 shrink-0 pt-1 text-[13px] font-extrabold text-[#24549c]/45">{`0${index + 1}`}</span>
									<span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[#24549c] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
										<profile.icon className="h-5 w-5" strokeWidth={2.5} />
									</span>
									<div>
										<h3 className="text-[17px] font-extrabold text-[#171717]">{profile.title}</h3>
										<p className="mt-1 max-w-[52ch] text-[14px] leading-[1.6] text-[#171717]/65">{profile.text}</p>
									</div>
								</li>
							))}
						</ul>
					</Reveal>
				</div>
			</div>
		</section>
	);
}
