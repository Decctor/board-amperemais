import type { IntegrationStep } from "@/app/_content/integration-pages";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type IntegrationHowItWorksProps = {
	name: string;
	steps: IntegrationStep[];
	// Mockup node per step, pre-resolved by the page (keeps mockups colocated
	// with the route, components decoupled from the registry).
	mockups: ReactNode[];
};

export function IntegrationHowItWorks({ name, steps, mockups }: IntegrationHowItWorksProps) {
	return (
		<section id="como-conecta" className="mb-16 scroll-mt-24">
			<div className="mb-10">
				<span className="text-xs font-black uppercase tracking-[0.2em] text-[#24549C]">Passo a passo</span>
				<h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Como a conexão com o {name} funciona</h2>
			</div>

			<div className="flex flex-col gap-12">
				{steps.map((step, i) => (
					<div key={step.title} className={cn("grid items-center gap-8 lg:grid-cols-2", i % 2 === 1 && "lg:[&>*:first-child]:order-2")}>
						{/* Copy */}
						<div>
							<div className="flex items-center gap-3">
								<span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#24549C] text-sm font-black text-white">{i + 1}</span>
								<h3 className="text-lg font-black tracking-tight text-slate-900">{step.title}</h3>
							</div>
							<p className="mt-3 leading-relaxed text-slate-600 lg:pl-12">{step.body}</p>
						</div>

						{/* Mockup */}
						<div className="flex justify-center">{mockups[i]}</div>
					</div>
				))}
			</div>
		</section>
	);
}
