import type { IntegrationPage } from "@/app/_content/integration-pages";
import RecompraLogo from "@/utils/svgs/logos/RECOMPRA - COMPLETE - HORIZONTAL - COLORFUL ICON-BADGE TEXT-BLACK.svg";
import { ArrowRight, Calendar, Plug } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const WHATSAPP_NUMBER = "553499480791";

type IntegrationHeroProps = {
	page: IntegrationPage;
};

export function IntegrationHero({ page }: IntegrationHeroProps) {
	const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(page.cta.whatsappMessage)}`;

	return (
		<section className="bg-gradient-to-b from-slate-50 to-white px-6 pt-28 pb-16">
			<div className="container mx-auto max-w-5xl">
				{/* Breadcrumb */}
				<nav aria-label="Trilha de navegação" className="mb-8 flex items-center gap-2 text-sm">
					<Link href="/" className="font-semibold text-[#24549C] hover:underline">
						Home
					</Link>
					<span className="text-slate-300">/</span>
					<Link href="/integrations" className="text-slate-500 transition-colors hover:text-[#24549C]">
						Integrações
					</Link>
					<span className="text-slate-300">/</span>
					<span className="text-slate-400">{page.name}</span>
				</nav>

				<div className="grid items-center gap-12 lg:grid-cols-2">
					{/* Copy */}
					<div>
						<span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-[#24549C]">
							<Plug className="h-3.5 w-3.5" />
							Integração · {page.category}
						</span>

						<h1 className="mt-4 text-3xl font-black leading-tight tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">{page.tagline}</h1>
						<p className="mt-5 text-lg leading-relaxed text-slate-600">{page.heroSubtitle}</p>

						<div className="mt-8 flex flex-wrap items-center gap-3">
							<a
								href={whatsappUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-2 rounded-2xl bg-[#24549C] px-6 py-3.5 text-base font-black text-white shadow-lg shadow-[#24549C]/25 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#1a3d7a]"
							>
								{page.cta.buttonText}
								<ArrowRight className="h-5 w-5" />
							</a>
							<a
								href="#como-conecta"
								className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-6 py-3.5 text-base font-bold text-slate-700 transition-colors hover:bg-slate-50"
							>
								Ver como conecta
							</a>
						</div>

						<div className="mt-8 flex flex-wrap gap-4 text-sm font-medium text-slate-500">
							<span className="flex items-center gap-1.5">
								<Calendar className="h-4 w-4 text-[#24549C]" />
								15 dias grátis para testar
							</span>
							<span>✓ Setup em menos de 1 dia</span>
						</div>
					</div>

					{/* Connection lockup — partner logo × RecompraCRM */}
					<div className="relative">
						<div className="absolute -inset-4 -z-10 rounded-[2rem] bg-blue-50/60 blur-2xl" aria-hidden />
						<div className="flex flex-col items-center gap-7 rounded-3xl border border-slate-200 bg-white px-8 py-12 shadow-xl shadow-slate-900/5">
							<span className="rounded-full bg-blue-50 px-3 py-1 text-[0.65rem] font-black uppercase tracking-widest text-[#24549C]">
								Integração oficial
							</span>

							<div className="flex h-24 w-full max-w-[240px] items-center justify-center">
								<Image src={page.logo} alt={page.logoAlt} className="h-full w-full object-contain" priority />
							</div>

							{/* Connector */}
							<div className="flex w-full max-w-[240px] items-center gap-3" aria-hidden>
								<span className="h-px flex-1 bg-slate-200" />
								<span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-[#24549C]">
									<Plug className="h-4 w-4" />
								</span>
								<span className="h-px flex-1 bg-slate-200" />
							</div>

							<div className="relative h-7 w-40">
								<Image src={RecompraLogo} alt="RecompraCRM" fill className="object-contain" />
							</div>
						</div>
						<p className="mt-4 text-center text-xs font-medium text-slate-400">{page.connectionSummary}</p>
					</div>
				</div>
			</div>
		</section>
	);
}
