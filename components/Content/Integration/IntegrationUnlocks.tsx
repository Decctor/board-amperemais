import type { IntegrationUnlock } from "@/app/_content/integration-pages";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

type IntegrationUnlocksProps = {
	name: string;
	unlocks: IntegrationUnlock[];
};

export function IntegrationUnlocks({ name, unlocks }: IntegrationUnlocksProps) {
	return (
		<section className="mb-16">
			<div className="mb-8">
				<span className="text-xs font-black uppercase tracking-[0.2em] text-[#24549C]">Depois da conexão</span>
				<h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">O que os dados do {name} desbloqueiam</h2>
				<p className="mt-3 max-w-2xl leading-relaxed text-slate-600">
					Importar os dados é o começo. Assim que as vendas entram no RecompraCRM, elas alimentam os três motores de retenção da plataforma.
				</p>
			</div>

			<div className="grid gap-4 sm:grid-cols-3">
				{unlocks.map((unlock) => (
					<Link
						key={unlock.featureSlug}
						href={`/features/${unlock.featureSlug}`}
						className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[#24549C]/30 hover:shadow-lg hover:shadow-slate-900/5"
					>
						<span className="text-3xl">{unlock.emoji}</span>
						<h3 className="mt-4 text-base font-black tracking-tight text-slate-900">{unlock.title}</h3>
						<p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{unlock.body}</p>
						<span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-[#24549C]">
							Saiba mais
							<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
						</span>
					</Link>
				))}
			</div>
		</section>
	);
}
