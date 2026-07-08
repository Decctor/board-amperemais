import type { IntegrationImportGroup } from "@/app/_content/integration-pages";

type WhatWeImportTableProps = {
	name: string;
	groups: IntegrationImportGroup[];
};

// Plain-language "what comes in" section. Business language + human-readable
// tags — deliberately not a technical field-mapping.
export function WhatWeImportTable({ name, groups }: WhatWeImportTableProps) {
	return (
		<section className="mb-16">
			<div className="mb-8">
				<span className="text-xs font-black uppercase tracking-[0.2em] text-[#24549C]">O que entra</span>
				<h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Tudo que vem do {name}, sem digitar</h2>
				<p className="mt-3 max-w-2xl leading-relaxed text-slate-600">
					A cada sincronização, o RecompraCRM traz suas vendas, clientes e produtos do {name} já organizados — prontos para gerar cashback e campanhas.
				</p>
			</div>

			<div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
				{groups.map((group, gi) => (
					<div key={group.entity} className={`grid gap-4 p-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] sm:gap-8 sm:p-8${gi > 0 ? " border-t border-slate-100" : ""}`}>
						{/* What */}
						<div className="flex gap-4">
							<span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-slate-50 text-xl">{group.emoji}</span>
							<div>
								<h3 className="text-base font-black tracking-tight text-slate-900">{group.entity}</h3>
								<p className="mt-1 text-sm leading-relaxed text-slate-600">{group.summary}</p>
							</div>
						</div>

						{/* Human-readable tags */}
						<div className="flex flex-wrap content-start gap-2 sm:justify-end">
							{group.items.map((item) => (
								<span key={item} className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-[#24549C]">
									{item}
								</span>
							))}
						</div>
					</div>
				))}
			</div>
		</section>
	);
}
