"use client";

import Image from "next/image";
import { useState } from "react";
import { CaseVideo } from "./CaseVideo";
import { LANDING_CASES, type TCaseMetric, type TLandingCase } from "./cases-data";

function ClientLogo({ client, sizeClass }: { client: TLandingCase["client"]; sizeClass: string }) {
	if (client.logoSrc) {
		return (
			<span className={`flex items-center justify-center overflow-hidden rounded-xl border border-[#e5e5e5] bg-white p-1.5 ${sizeClass}`}>
				<Image src={client.logoSrc} alt={`Logo ${client.name}`} width={48} height={48} className="h-full w-full object-contain" />
			</span>
		);
	}
	const initials = client.name
		.split(" ")
		.filter(Boolean)
		.slice(0, 2)
		.map((word) => word[0])
		.join("")
		.toUpperCase();
	return (
		<span className={`flex items-center justify-center rounded-xl bg-[#24549c] text-[13px] font-extrabold text-white ${sizeClass}`}>
			{initials}
		</span>
	);
}

function MetricValue({ metric }: { metric: TCaseMetric }) {
	return (
		<p className="mb-3 font-extrabold leading-none tracking-[-0.025em] text-[#ffb900] text-[44px] lg:text-[54px]">
			{metric.prefix ? <span className="mr-0.5 align-top text-[26px] lg:text-[32px]">{metric.prefix}</span> : null}
			<span className="ledger-tabular">
				{metric.value.toLocaleString("pt-BR", { minimumFractionDigits: metric.decimals ?? 0, maximumFractionDigits: metric.decimals ?? 0 })}
			</span>
			{metric.suffix}
			{metric.unit ? <span className="ml-1.5 align-baseline text-[22px] lg:text-[27px]">{metric.unit}</span> : null}
		</p>
	);
}

function CaseQuote({ activeCase, large }: { activeCase: TLandingCase; large?: boolean }) {
	const { quote, client } = activeCase;
	if (!quote) return null;
	const attribution = quote.author
		? `${quote.author}${quote.role ? ` · ${quote.role}` : ""} · ${client.name}`
		: `${client.name} · ${client.segment} · ${client.city}/${client.state}`;
	return (
		<blockquote className="max-w-[62ch]">
			<p className={`font-medium leading-[1.5] text-white/95 ${large ? "text-[20px] lg:text-[26px]" : "text-[17px] lg:text-[20px]"}`}>
				<span className="mr-1 font-extrabold text-[#ffb900]">&ldquo;</span>
				{quote.text}
				<span className="ml-1 font-extrabold text-[#ffb900]">&rdquo;</span>
			</p>
			<footer className="mt-5 flex items-center gap-4">
				<span className="h-px w-10 bg-[#ffb900]" />
				<p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-white/85">{attribution}</p>
			</footer>
		</blockquote>
	);
}

export function CaseShowcase() {
	const [activeId, setActiveId] = useState(LANDING_CASES[0]?.id);
	const activeCase = LANDING_CASES.find((c) => c.id === activeId) ?? LANDING_CASES[0];

	if (!activeCase) return null;

	const hasMetrics = activeCase.metrics.length > 0;
	const hasVideo = !!activeCase.video;

	return (
		<div>
			{/* Seletor de clientes — só aparece com mais de um case */}
			{LANDING_CASES.length > 1 ? (
				<div className="-mx-5 mb-6 overflow-x-auto px-5 pb-2 lg:mx-0 lg:px-0">
					<div className="flex w-max gap-3">
						{LANDING_CASES.map((caseStudy) => {
							const isActive = caseStudy.id === activeCase.id;
							return (
								<button
									key={caseStudy.id}
									type="button"
									onClick={() => setActiveId(caseStudy.id)}
									aria-pressed={isActive}
									className={`flex items-center gap-3 rounded-2xl border bg-white px-4 py-3 text-left transition-all duration-200 ${
										isActive
											? "border-[#24549c] shadow-[0_10px_28px_-14px_rgba(36,84,156,0.45)]"
											: "border-[#e5e5e5] hover:border-[#24549c]/35 hover:-translate-y-0.5"
									}`}
								>
									<ClientLogo client={caseStudy.client} sizeClass="h-10 w-10 shrink-0" />
									<span className="flex flex-col">
										<span className="text-[13px] font-extrabold text-[#171717]">{caseStudy.client.name}</span>
										<span className="text-[11px] text-[#171717]/55">
											{caseStudy.client.segment} · {caseStudy.client.city}/{caseStudy.client.state}
										</span>
									</span>
								</button>
							);
						})}
					</div>
				</div>
			) : null}

			{/* Painel-certificado do case ativo (key remonta e reanima na troca) */}
			<div
				key={activeCase.id}
				className="ledger-flow-card relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#24549c] to-[#1a3d7a] text-white shadow-[0_28px_60px_-20px_rgba(36,84,156,0.45),0_8px_16px_rgba(36,84,156,0.18)]"
			>
				{/* blobs decorativos */}
				<div className="ledger-ambient pointer-events-none absolute -right-20 -top-20 h-[280px] w-[280px] rounded-full bg-[#ffb900]/12 blur-3xl" aria-hidden />
				<div className="ledger-ambient pointer-events-none absolute -bottom-32 -left-20 h-[320px] w-[320px] rounded-full bg-white/6 blur-3xl" aria-hidden />

				{/* Cabeçalho */}
				<div className="relative flex flex-wrap items-center justify-between gap-3 border-b border-white/15 px-6 py-4 lg:px-10">
					<div className="flex items-center gap-3">
						<span className="ledger-pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-[#ffb900]" />
						<p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/85">
							Case real · {activeCase.client.name} · {activeCase.client.city}/{activeCase.client.state}
						</p>
					</div>
					{activeCase.period ? (
						<p className="ledger-tabular text-[10px] font-bold uppercase tracking-[0.1em] text-white/55">{activeCase.period}</p>
					) : null}
				</div>

				{hasMetrics ? (
					<>
						{/* Métricas (+ vídeo ao lado, quando houver) */}
						<div className={`relative px-6 py-10 lg:px-10 lg:py-14 ${hasVideo ? "grid gap-10 lg:grid-cols-[1.15fr_minmax(300px,0.85fr)] lg:items-center" : ""}`}>
							<div className={`grid gap-y-10 gap-x-4 ${hasVideo ? "sm:grid-cols-2" : "md:grid-cols-3 lg:divide-x divide-white/15"}`}>
								{activeCase.metrics.map((metric, i) => (
									<div key={metric.label} className={hasVideo ? "" : `md:px-6 ${i === 0 ? "md:first:pl-0" : ""}`}>
										<p className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/60">{metric.label}</p>
										<MetricValue metric={metric} />
										<p className="max-w-[24ch] text-[13px] leading-snug text-white/70">{metric.description}</p>
									</div>
								))}
							</div>
							{hasVideo ? <CaseVideo video={activeCase.video!} clientName={activeCase.client.name} /> : null}
						</div>

						{/* Citação */}
						{activeCase.quote ? (
							<div className="relative border-t border-white/15 px-6 py-8 lg:px-10 lg:py-10">
								<CaseQuote activeCase={activeCase} />
							</div>
						) : null}
					</>
				) : (
					/* Case só de depoimento: vídeo em destaque + citação ao lado */
					<div className="relative grid gap-10 px-6 py-10 lg:grid-cols-2 lg:items-center lg:px-10 lg:py-14">
						{hasVideo ? <CaseVideo video={activeCase.video!} clientName={activeCase.client.name} /> : null}
						<CaseQuote activeCase={activeCase} large />
					</div>
				)}
			</div>
		</div>
	);
}
