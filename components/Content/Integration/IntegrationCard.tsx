import type { IntegrationPage } from "@/app/_content/integration-pages";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export function IntegrationCard({ integration }: { integration: IntegrationPage }) {
	return (
		<Link
			href={`/integrations/${integration.slug}`}
			className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[#24549C]/30 hover:shadow-lg hover:shadow-slate-900/5"
		>
			<div className="flex items-center justify-between">
				<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 p-2 ring-1 ring-slate-100">
					<Image src={integration.logo} alt={integration.logoAlt} className="h-full w-full object-contain" />
				</div>
				<span className="rounded-full bg-blue-50 px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-[#24549C]">{integration.category}</span>
			</div>
			<h3 className="mt-5 text-lg font-black tracking-tight text-slate-900">{integration.name}</h3>
			<p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{integration.heroSubtitle}</p>
			<span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-[#24549C]">
				Ver integração
				<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
			</span>
		</Link>
	);
}
