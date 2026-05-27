"use client";

import { cn } from "@/lib/utils";
import { Cake, Filter, MessageCircle, PlugZap, Repeat, ShoppingBag, Sparkles, TrendingUp, UserCheck, Users, Zap } from "lucide-react";
import type { ElementType } from "react";
import { useEffect, useState } from "react";

type FlowScenario = {
	id: string;
	event: string;
	eventDetail: string;
	icon: ElementType;
	campaign: {
		label: string;
		title: string;
		trigger: string;
		audience: string;
		message: string;
	};
	result: string;
	resultDetail: string;
	resultIcon: ElementType;
	accent: "blue" | "amber" | "green";
};

const FLOW_SCENARIOS: FlowScenario[] = [
	{
		id: "primeira-compra",
		event: "Primeira compra",
		eventDetail: "cliente identificado no PDI, QR Code ou integração",
		icon: ShoppingBag,
		campaign: {
			label: "Boas-vindas automática",
			title: "Transformar primeira compra em segunda visita",
			trigger: "Gatilho: primeira compra registrada",
			audience: "Filtros: loja, ticket mínimo e categoria comprada",
			message: "Oi, {{nome}}! Sua primeira compra já gerou um benefício para voltar.",
		},
		result: "Cliente fidelizado",
		resultDetail: "sai da compra com motivo claro para retornar",
		resultIcon: UserCheck,
		accent: "amber",
	},
	{
		id: "inatividade",
		event: "30 dias sem comprar",
		eventDetail: "recência caiu e o risco apareceu antes da perda",
		icon: Users,
		campaign: {
			label: "Recuperação RFM",
			title: "Trazer de volta quem está escapando",
			trigger: "Gatilho: entrada no segmento em risco",
			audience: "Filtros: top compradores, bairro e saldo disponível",
			message: "Sentimos sua falta, {{nome}}. Tem uma condição esperando por você hoje.",
		},
		result: "Cliente recuperado",
		resultDetail: "reativado antes de virar uma perda invisível",
		resultIcon: Repeat,
		accent: "blue",
	},
	{
		id: "aniversario",
		event: "Aniversário do cliente",
		eventDetail: "data especial vira contato comercial com contexto",
		icon: Cake,
		campaign: {
			label: "Relacionamento com marca",
			title: "Criar uma ação pessoal, no momento certo",
			trigger: "Gatilho: aniversário do cliente",
			audience: "Filtros: clientes ativos e preferência de produto",
			message: "{{nome}}, hoje é seu dia. A loja preparou um presente para você.",
		},
		result: "Cliente acelerado",
		resultDetail: "volta por vínculo, não por disparo genérico",
		resultIcon: TrendingUp,
		accent: "green",
	},
	{
		id: "campanha",
		event: "Lançamento de campanha",
		eventDetail: "produto, coleção, combo ou ação sazonal",
		icon: PlugZap,
		campaign: {
			label: "Campanha segmentada",
			title: "Falar com quem tem mais chance de comprar",
			trigger: "Gatilho: disparo único ou recorrente",
			audience: "Filtros: produto X, cidade, LTV e frequência",
			message: "{{nome}}, chegou uma novidade que combina com suas últimas compras.",
		},
		result: "Aumento de vendas",
		resultDetail: "mais receita com audiência precisa e atribuição",
		resultIcon: Zap,
		accent: "amber",
	},
];

const accentClasses: Record<FlowScenario["accent"], { chip: string; halo: string; line: string; text: string; surface: string }> = {
	amber: {
		chip: "bg-[#ffb900] text-[#171717]",
		halo: "shadow-[0_18px_42px_-16px_rgba(255,185,0,0.75)]",
		line: "stroke-[#ffb900]",
		text: "text-[#171717]",
		surface: "bg-[#ffb900]/16 border-[#ffb900]/35",
	},
	blue: {
		chip: "bg-[#24549c] text-white",
		halo: "shadow-[0_18px_42px_-16px_rgba(36,84,156,0.65)]",
		line: "stroke-[#24549c]",
		text: "text-[#24549c]",
		surface: "bg-[#24549c]/10 border-[#24549c]/20",
	},
	green: {
		chip: "bg-[#16a34a] text-white",
		halo: "shadow-[0_18px_42px_-16px_rgba(22,163,74,0.55)]",
		line: "stroke-[#16a34a]",
		text: "text-[#16a34a]",
		surface: "bg-[#16a34a]/10 border-[#16a34a]/20",
	},
};

type CampaignFlowProps = {
	className?: string;
};

export function CampaignFlow({ className }: CampaignFlowProps) {
	const [activeIndex, setActiveIndex] = useState(0);
	const active = FLOW_SCENARIOS[activeIndex];

	useEffect(() => {
		const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
		if (reduceMotion) return;

		const interval = window.setInterval(() => {
			setActiveIndex((current) => (current + 1) % FLOW_SCENARIOS.length);
		}, 6500);

		return () => window.clearInterval(interval);
	}, []);

	const lineClass = accentClasses[active.accent].line;
	const dotClass = active.accent === "amber" ? "fill-[#ffb900]" : active.accent === "green" ? "fill-[#16a34a]" : "fill-[#24549c]";

	return (
		<div className={cn("relative", className)}>
			<div className="relative mx-auto w-full max-w-[540px] overflow-hidden rounded-[28px] border border-[#e5e5e5] bg-white p-4 shadow-[0_28px_70px_-26px_rgba(36,84,156,0.36),0_8px_16px_rgba(0,0,0,0.05)] sm:p-5">
				<div
					className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(36,84,156,0.08),transparent_42%),radial-gradient(circle_at_86%_12%,rgba(255,185,0,0.16),transparent_26%)]"
					aria-hidden
				/>
				<div className="relative">
					<div className="mb-4 flex items-center justify-between gap-4">
						<div>
							<p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#24549c]">Motor de campanhas</p>
							<p className="mt-1 text-[12px] font-semibold leading-snug text-[#171717]/60">Eventos e integrações entram, o CRM decide o próximo contato.</p>
						</div>
					</div>

					<div className="relative grid min-h-[700px] grid-rows-[188px_1fr_170px] gap-3 sm:min-h-[470px] sm:grid-rows-[88px_1fr_78px]">
						<GraphLines activeIndex={activeIndex} lineClass={lineClass} dotClass={dotClass} />

						<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
							{FLOW_SCENARIOS.map((scenario, index) => (
								<GraphNode
									key={scenario.id}
									isActive={index === activeIndex}
									icon={scenario.icon}
									title={scenario.event}
									detail={scenario.eventDetail}
									accent={scenario.accent}
									onClick={() => setActiveIndex(index)}
								/>
							))}
						</div>

						<CampaignCard key={active.id} scenario={active} />

						<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
							{FLOW_SCENARIOS.map((scenario, index) => (
								<ResultNode key={scenario.id} scenario={scenario} isActive={index === activeIndex} onClick={() => setActiveIndex(index)} />
							))}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

function GraphLines({ activeIndex, lineClass, dotClass }: { activeIndex: number; lineClass: string; dotClass: string }) {
	const topXs = [15, 38, 62, 85];
	const bottomXs = [16, 39, 62, 85];
	const activeTopX = topXs[activeIndex];
	const activeBottomX = bottomXs[activeIndex];

	return (
		<svg
			className="pointer-events-none absolute inset-x-3 top-[170px] z-0 h-[390px] sm:inset-x-5 sm:top-[74px] sm:h-[320px]"
			viewBox="0 0 100 350"
			preserveAspectRatio="none"
			aria-hidden
		>
			{topXs.map((x, index) => (
				<path
					key={`top-${x}`}
					d={`M ${x} 8 C ${x} 58, 50 66, 50 118`}
					className={cn(index === activeIndex ? lineClass : "stroke-[#24549c]/14")}
					fill="none"
					strokeWidth={index === activeIndex ? 0.9 : 0.45}
					strokeLinecap="round"
				/>
			))}
			{bottomXs.map((x, index) => (
				<path
					key={`bottom-${x}`}
					d={`M 50 204 C 50 256, ${x} 274, ${x} 320`}
					className={cn(index === activeIndex ? lineClass : "stroke-[#24549c]/14")}
					fill="none"
					strokeWidth={index === activeIndex ? 0.9 : 0.45}
					strokeLinecap="round"
				/>
			))}
			<circle className={cn("ledger-flow-pulse", dotClass)} cx={activeTopX} cy="8" r="1.2" />
			<circle className={cn("ledger-flow-pulse ledger-flow-pulse-delayed", dotClass)} cx={activeBottomX} cy="320" r="1.2" />
		</svg>
	);
}

type NodeProps = {
	isActive: boolean;
	icon: ElementType;
	title: string;
	detail: string;
	accent: FlowScenario["accent"];
	onClick: () => void;
};

function GraphNode({ isActive, icon: Icon, title, detail, accent, onClick }: NodeProps) {
	const styles = accentClasses[accent];

	return (
		<button
			type="button"
			onClick={onClick}
			aria-label={`${title}: ${detail}`}
			className={cn(
				"relative z-10 flex min-h-[88px] flex-col items-start rounded-2xl border p-2.5 text-left transition-all duration-500 ease-out",
				isActive ? cn("border-transparent bg-white", styles.halo, "scale-[1.02]") : "border-[#e5e5e5] bg-white/82 hover:border-[#24549c]/25",
			)}
		>
			<span
				className={cn(
					"mb-2 inline-flex h-7 w-7 items-center justify-center rounded-xl transition-colors",
					isActive ? styles.chip : "bg-[#24549c]/8 text-[#24549c]",
				)}
			>
				<Icon className="h-3.5 w-3.5" />
			</span>
			<span className="text-[11px] font-extrabold leading-[1.08] text-[#171717]">{title}</span>
		</button>
	);
}

function CampaignCard({ scenario }: { scenario: FlowScenario }) {
	const styles = accentClasses[scenario.accent];

	return (
		<div className="relative z-10 self-center rounded-[24px] border border-[#e5e5e5] bg-white p-4 shadow-[0_18px_50px_-24px_rgba(36,84,156,0.38),0_4px_8px_rgba(0,0,0,0.04)] ledger-flow-card">
			<div className="mb-3 flex flex-wrap items-center gap-2">
				<span
					className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em]", styles.chip)}
				>
					<Sparkles className="h-3 w-3" />
					{scenario.campaign.label}
				</span>
				<span className="inline-flex items-center gap-1.5 rounded-full border border-[#24549c]/15 bg-[#24549c]/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#24549c]">
					<Filter className="h-3 w-3" />
					Gatilhos + filtros
				</span>
			</div>
			<p className="text-[18px] font-extrabold leading-tight tracking-[-0.015em] text-[#171717] sm:text-[20px]">{scenario.campaign.title}</p>
			<div className="mt-3 grid gap-2">
				<p className={cn("rounded-2xl border px-3 py-2 text-[11px] font-bold leading-snug", styles.surface, styles.text)}>{scenario.campaign.trigger}</p>
				<p className="rounded-2xl border border-[#e5e5e5] bg-[#f7f9fc] px-3 py-2 text-[11px] font-semibold leading-snug text-[#171717]/70">
					{scenario.campaign.audience}
				</p>
			</div>
			<div className="mt-3 rounded-2xl border border-[#e5e5e5] bg-[#f7f9fc] p-3">
				<div className="mb-2 flex items-center gap-2 text-[#24549c]">
					<MessageCircle className="h-3.5 w-3.5" />
					<p className="text-[10px] font-extrabold uppercase tracking-[0.12em]">WhatsApp da loja</p>
				</div>
				<p className="text-[12px] font-semibold leading-snug text-[#171717]/78">{scenario.campaign.message}</p>
			</div>
		</div>
	);
}

function ResultNode({ scenario, isActive, onClick }: { scenario: FlowScenario; isActive: boolean; onClick: () => void }) {
	const styles = accentClasses[scenario.accent];
	const Icon = scenario.resultIcon;

	return (
		<button
			type="button"
			onClick={onClick}
			aria-label={`${scenario.result}: ${scenario.resultDetail}`}
			className={cn(
				"relative z-10 flex min-h-[78px] flex-col items-start rounded-2xl border p-2.5 text-left transition-all duration-500 ease-out",
				isActive ? cn(styles.surface, styles.halo, "scale-[1.02]") : "border-[#e5e5e5] bg-white/82 hover:border-[#24549c]/25",
			)}
		>
			<span className={cn("mb-2 inline-flex h-7 w-7 items-center justify-center rounded-xl", isActive ? styles.chip : "bg-[#24549c]/8 text-[#24549c]")}>
				<Icon className="h-3.5 w-3.5" />
			</span>
			<span className="text-[11px] font-extrabold leading-[1.08] text-[#171717]">{scenario.result}</span>
		</button>
	);
}
