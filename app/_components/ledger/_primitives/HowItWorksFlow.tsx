"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import { Stamp } from "./Stamp";
import { CampaignFlow, type FlowRegion } from "./CampaignFlow";

type StampVariant = "soft-blue" | "soft-amber" | "success";

type Step = {
	index: string;
	header: string;
	idle: string;
	title: string;
	desc: string;
	stamp: string;
	stampVariant: StampVariant;
	region: FlowRegion;
};

const STEPS: Step[] = [
	{
		index: "01",
		header: "Dados",
		idle: "A venda entra pelo PDI, QR Code ou integração.",
		title: "O sistema recebe a informação da venda.",
		desc:
			"A informação pode vir do ponto de interação em tablet, de um QR Code ou da integração com o app preferido da empresa, como iFood, Nuvem Shop e outras conexões. Cada compra traz matéria-prima valiosa: identificação do cliente, valor da venda e, quando disponível, os itens comprados.",
		stamp: "PDI + integrações",
		stampVariant: "soft-blue",
		region: "entradas",
	},
	{
		index: "02",
		header: "Inteligência",
		idle: "O CRM decide quem recebe o quê, e quando.",
		title: "O CRM decide quem deve receber o quê, e quando.",
		desc:
			"A inteligência atua em gatilhos como nova compra, primeira compra, aniversário, cashback expirando e movimentos RFM. Depois combina isso com filtros de segmentação, localização, top compradores do produto X, frequência e valor gasto. O resultado é comunicação para a pessoa certa, na hora certa.",
		stamp: "Gatilhos + filtros",
		stampVariant: "soft-amber",
		region: "motor",
	},
	{
		index: "03",
		header: "Automação",
		idle: "A mensagem sai com a marca e o número da loja.",
		title: "A comunicação sai com a marca e o número da loja.",
		desc:
			"A empresa não precisa ficar olhando clientes em risco e criando mensagem manualmente. O RecompraCRM monta e dispara comunicações automáticas, com textos personalizados, imagens, vídeos e a identidade escolhida pela loja. Nada de e-mail frio ou SMS desconhecido: a conversa acontece no canal da própria marca.",
		stamp: "WhatsApp da loja",
		stampVariant: "success",
		region: "resultados",
	},
];

const ADVANCE_MS = 5500;

export function HowItWorksFlow() {
	const [activeIndex, setActiveIndex] = useState(0);
	const [paused, setPaused] = useState(false);
	const [reduced, setReduced] = useState(false);

	useEffect(() => {
		const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
		if (!mq) return;
		setReduced(mq.matches);
		const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
		mq.addEventListener?.("change", onChange);
		return () => mq.removeEventListener?.("change", onChange);
	}, []);

	useEffect(() => {
		if (paused || reduced) return;
		const id = window.setTimeout(() => {
			setActiveIndex((current) => (current + 1) % STEPS.length);
		}, ADVANCE_MS);
		return () => window.clearTimeout(id);
	}, [activeIndex, paused, reduced]);

	const selectStep = (index: number) => {
		setActiveIndex(index);
		setPaused(true);
	};

	const activeRegion = STEPS[activeIndex].region;
	const autoRunning = !paused && !reduced;

	return (
		<div className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_7fr] lg:items-stretch lg:gap-8">
			{/* Stepper — 30 */}
			<ol className="flex min-w-0 flex-col gap-3">
				{STEPS.map((step, index) => {
					const isActive = reduced || index === activeIndex;
					return (
						<li key={step.index}>
							<StepCard
								step={step}
								isActive={isActive}
								showProgress={autoRunning && index === activeIndex}
								onSelect={() => selectStep(index)}
							/>
						</li>
					);
				})}
			</ol>

			{/* Diagram — 70 */}
			<CampaignFlow activeRegion={activeRegion} dimmed={!reduced} className="min-w-0 lg:self-stretch" />
		</div>
	);
}

function StepCard({
	step,
	isActive,
	showProgress,
	onSelect,
}: {
	step: Step;
	isActive: boolean;
	showProgress: boolean;
	onSelect: () => void;
}) {
	const ref = useRef<HTMLButtonElement | null>(null);

	return (
		<button
			ref={ref}
			type="button"
			onClick={onSelect}
			aria-expanded={isActive}
			aria-label={`Passo ${step.index}: ${step.header}`}
			className={cn(
				"group relative w-full overflow-hidden rounded-3xl border bg-white p-5 text-left transition-all duration-500 ease-out lg:p-6",
				isActive
					? "border-[#24549c]/25 shadow-[0_18px_44px_-22px_rgba(36,84,156,0.4),0_3px_8px_rgba(0,0,0,0.04)]"
					: "border-[#e5e5e5] shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-[#24549c]/25 hover:bg-[#f7f9fc]",
			)}
		>
			{/* auto-advance progress bar */}
			{showProgress ? (
				<span className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-[#24549c]/10" aria-hidden>
					<span className="ledger-step-progress block h-full w-full bg-[#24549c]" style={{ "--dur": "5500ms" } as React.CSSProperties} />
				</span>
			) : null}

			{isActive ? (
				<div>
					<div className="flex items-baseline gap-3">
						<span className="text-[40px] font-extrabold leading-none tracking-[-0.03em] text-[#24549c] ledger-tabular lg:text-[52px]">
							{step.index}
						</span>
						<span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#24549c]/80">{step.header}</span>
					</div>
					<h3 className="mt-4 text-[20px] font-extrabold leading-[1.15] tracking-[-0.018em] text-[#171717] lg:text-[24px]">{step.title}</h3>
					<p className="mt-3 text-[14px] leading-[1.6] text-[#171717]/70 lg:text-[15px]">{step.desc}</p>
					<div className="mt-5">
						<Stamp variant={step.stampVariant} size="md">
							{step.stamp}
						</Stamp>
					</div>
				</div>
			) : (
				<div className="flex items-center gap-3.5">
					<span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#24549c]/8 text-[13px] font-extrabold text-[#24549c] ledger-tabular">
						{step.index}
					</span>
					<div className="min-w-0">
						<p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#24549c]/70">{step.header}</p>
						<p className="mt-0.5 truncate text-[13px] font-semibold text-[#171717]/65">{step.idle}</p>
					</div>
				</div>
			)}
		</button>
	);
}
