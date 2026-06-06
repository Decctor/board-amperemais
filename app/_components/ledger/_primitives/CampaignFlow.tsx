"use client";

import { cn } from "@/lib/utils";
import { ArrowRight, BarChart3, Cake, ChevronDown, LogIn, MessageCircle, PlugZap, Repeat, Settings2, ShoppingBag, Sparkles, TrendingUp, UserCheck, Users, Zap } from "lucide-react";
import type { ElementType } from "react";

export type FlowRegion = "entradas" | "motor" | "resultados";

type FlowNode = {
	id: string;
	icon: ElementType;
	label: string;
};

const ENTRADAS: FlowNode[] = [
	{ id: "primeira-compra", icon: ShoppingBag, label: "Primeira compra" },
	{ id: "inatividade", icon: Users, label: "30 dias sem comprar" },
	{ id: "aniversario", icon: Cake, label: "Aniversário do cliente" },
	{ id: "campanha", icon: PlugZap, label: "Lançamento de campanha" },
];

const RESULTADOS: FlowNode[] = [
	{ id: "fidelizado", icon: UserCheck, label: "Cliente fidelizado" },
	{ id: "recuperado", icon: Repeat, label: "Cliente recuperado" },
	{ id: "acelerado", icon: TrendingUp, label: "Cliente acelerado" },
	{ id: "vendas", icon: Zap, label: "Aumento de vendas" },
];

const CAMPAIGN = {
	label: "Boas-vindas automática",
	title: "Transformar primeira compra em segunda visita",
	trigger: "Primeira compra",
	message: "Oi, {{nome}}! Sua primeira compra já gerou um benefício para voltar.",
};

type CampaignFlowProps = {
	activeRegion: FlowRegion;
	/** When false (e.g. reduced motion), every region stays at full emphasis. */
	dimmed?: boolean;
	className?: string;
};

export function CampaignFlow({ activeRegion, dimmed = true, className }: CampaignFlowProps) {
	const isActive = (region: FlowRegion) => !dimmed || activeRegion === region;
	const recede = (region: FlowRegion) => (isActive(region) ? "opacity-100" : "opacity-45 saturate-[0.6]");

	// Primary node = the canonical scenario's entry / outcome.
	const primaryEntry = ENTRADAS[0].id;
	const primaryResult = RESULTADOS[0].id;

	return (
		<div
			className={cn(
				"relative overflow-hidden rounded-[28px] border border-[#e5e5e5] bg-white p-5 sm:p-7 lg:p-8 shadow-[0_28px_70px_-26px_rgba(36,84,156,0.36),0_8px_16px_rgba(0,0,0,0.05)]",
				className,
			)}
		>
			<div
				className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(36,84,156,0.06),transparent_46%),radial-gradient(circle_at_88%_8%,rgba(255,185,0,0.12),transparent_28%)]"
				aria-hidden
			/>

			{/* Top badge */}
			<div className="relative flex justify-center">
				<span className="inline-flex items-center gap-2 rounded-full bg-[#ffb900] px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#171717] shadow-[0_8px_20px_-8px_rgba(255,185,0,0.7)]">
					<span className="ledger-pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-[#171717]" />
					Campanha em ação
				</span>
			</div>

			<div className="relative mt-6 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,0.92fr)_52px_minmax(0,1.7fr)_52px_minmax(0,0.92fr)] lg:items-stretch lg:gap-2">
				{/* ENTRADAS */}
				<div className={cn("flex min-w-0 flex-col transition-all duration-700 ease-out", recede("entradas"))}>
					<ColumnHeader icon={LogIn} label="Entradas" />
					<div className="grid grid-cols-2 gap-2 lg:flex lg:flex-1 lg:flex-col lg:justify-between lg:gap-3">
						{ENTRADAS.map((node) => (
							<FlowCard key={node.id} node={node} highlighted={isActive("entradas") && node.id === primaryEntry} accent="amber" />
						))}
					</div>
					<MobileConnector accent="amber" />
				</div>

				{/* Connector: entradas -> motor */}
				<DesktopConnector variant="converge" active={isActive("entradas") || isActive("motor")} accent="amber" />

				{/* MOTOR */}
				<div className={cn("min-w-0 transition-all duration-700 ease-out", recede("motor"))}>
					<div
						className={cn(
							"relative h-full rounded-[24px] border bg-white p-5 transition-all duration-700 ease-out sm:p-6",
							isActive("motor")
								? "border-[#ffb900]/45 shadow-[0_22px_56px_-22px_rgba(255,185,0,0.5),0_4px_10px_rgba(0,0,0,0.04)]"
								: "border-[#e5e5e5] shadow-[0_1px_2px_rgba(0,0,0,0.03)]",
						)}
					>
						<div className="flex items-center justify-center gap-2 text-[#24549c]">
							<Settings2 className="h-4 w-4" />
							<p className="text-[13px] font-extrabold uppercase tracking-[0.12em] sm:text-[15px]">Motor de campanhas</p>
						</div>
						<p className="mt-1.5 text-center text-[12px] font-semibold leading-snug text-[#171717]/55">
							Eventos e integrações entram, o CRM decide o próximo contato.
						</p>

						<div className="mt-5 flex justify-center">
							<span className="inline-flex items-center gap-2 rounded-full bg-[#ffb900] px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#171717]">
								<Sparkles className="h-3.5 w-3.5" />
								{CAMPAIGN.label}
							</span>
						</div>

						<p className="mt-4 text-center text-[19px] font-extrabold leading-tight tracking-[-0.015em] text-[#171717] sm:text-[22px]">
							{CAMPAIGN.title}
						</p>

						<div className="mt-4 flex justify-center">
							<span className="inline-flex items-center gap-2 rounded-2xl border border-[#ffb900]/35 bg-[#ffb900]/12 px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#171717]">
								<Zap className="h-3.5 w-3.5 text-[#e6a700]" />
								{CAMPAIGN.trigger}
							</span>
						</div>

						{/* WhatsApp bubble */}
						<div
							className={cn(
								"mt-5 rounded-2xl border p-4 transition-all duration-700 ease-out",
								isActive("resultados")
									? "border-[#16a34a]/40 bg-[#16a34a]/[0.06] shadow-[0_14px_34px_-18px_rgba(22,163,74,0.5)]"
									: "border-[#e5e5e5] bg-[#f7f9fc]",
							)}
						>
							<div className="mb-2.5 flex items-center gap-2">
								<span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#25d366]/12 text-[#1faa52]">
									<MessageCircle className="h-3.5 w-3.5" />
								</span>
								<p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#1faa52]">WhatsApp da loja</p>
							</div>
							<div className="relative ml-1 max-w-[88%] rounded-2xl rounded-tl-sm bg-[#dcf8c6] px-3.5 py-2.5">
								<p className="text-[13px] font-medium leading-snug text-[#143d1f]">{CAMPAIGN.message}</p>
								<p className="mt-1 text-right text-[10px] font-semibold text-[#143d1f]/45">10:30 ✓✓</p>
							</div>
						</div>
					</div>
				</div>

				{/* Connector: motor -> resultados */}
				<DesktopConnector variant="fan" active={isActive("motor") || isActive("resultados")} accent="blue" />
				<div className="lg:hidden">
					<MobileConnector accent="blue" />
				</div>

				{/* RESULTADOS */}
				<div className={cn("flex min-w-0 flex-col transition-all duration-700 ease-out", recede("resultados"))}>
					<ColumnHeader icon={BarChart3} label="Resultados" />
					<div className="grid grid-cols-2 gap-2 lg:flex lg:flex-1 lg:flex-col lg:justify-between lg:gap-3">
						{RESULTADOS.map((node) => (
							<FlowCard key={node.id} node={node} highlighted={isActive("resultados") && node.id === primaryResult} accent="blue" />
						))}
					</div>
				</div>
			</div>
		</div>
	);
}

function ColumnHeader({ icon: Icon, label }: { icon: ElementType; label: string }) {
	return (
		<div className="mb-3 flex items-center gap-2 text-[#24549c]">
			<Icon className="h-4 w-4" />
			<p className="text-[12px] font-extrabold uppercase tracking-[0.14em]">{label}</p>
		</div>
	);
}

function FlowCard({ node, highlighted, accent }: { node: FlowNode; highlighted: boolean; accent: "amber" | "blue" }) {
	const Icon = node.icon;
	const chip = highlighted
		? accent === "amber"
			? "bg-[#ffb900] text-[#171717]"
			: "bg-[#24549c] text-white"
		: "bg-[#24549c]/8 text-[#24549c]";

	return (
		<div
			className={cn(
				"flex items-center gap-2.5 rounded-2xl border bg-white px-3 py-2.5 transition-all duration-500 ease-out",
				highlighted
					? accent === "amber"
						? "border-[#ffb900]/45 shadow-[0_14px_32px_-16px_rgba(255,185,0,0.6)]"
						: "border-[#24549c]/30 shadow-[0_14px_32px_-16px_rgba(36,84,156,0.5)]"
					: "border-[#e5e5e5] shadow-[0_1px_2px_rgba(0,0,0,0.03)]",
			)}
		>
			<span className={cn("inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors", chip)}>
				<Icon className="h-4 w-4" />
			</span>
			<span className="min-w-0 text-[12px] font-extrabold leading-[1.12] text-[#171717]">{node.label}</span>
		</div>
	);
}

function MobileConnector({ accent }: { accent: "amber" | "blue" }) {
	return (
		<div className="flex justify-center py-2 lg:hidden" aria-hidden>
			<span
				className={cn(
					"inline-flex h-7 w-7 items-center justify-center rounded-full",
					accent === "amber" ? "bg-[#ffb900]/15 text-[#e6a700]" : "bg-[#24549c]/10 text-[#24549c]",
				)}
			>
				<ChevronDown className="h-4 w-4" />
			</span>
		</div>
	);
}

function DesktopConnector({ variant, active, accent }: { variant: "converge" | "fan"; active: boolean; accent: "amber" | "blue" }) {
	const stroke = active ? (accent === "amber" ? "stroke-[#ffb900]" : "stroke-[#24549c]") : "stroke-[#24549c]/14";
	const dotFill = accent === "amber" ? "fill-[#ffb900]" : "fill-[#24549c]";
	const nodeYs = [22, 41, 60, 79];
	const dashed = variant === "fan";

	return (
		<div className="relative hidden lg:flex lg:items-stretch" aria-hidden>
			<svg className="h-full w-full" viewBox="0 0 52 100" preserveAspectRatio="none" fill="none">
				{nodeYs.map((y) =>
					variant === "converge" ? (
						<path
							key={y}
							d={`M 2 ${y} C 26 ${y}, 26 50, 50 50`}
							className={cn(stroke, "transition-[stroke] duration-500")}
							strokeWidth={active ? 1.1 : 0.7}
							strokeDasharray={dashed ? "3 3" : undefined}
							strokeLinecap="round"
							vectorEffect="non-scaling-stroke"
						/>
					) : (
						<path
							key={y}
							d={`M 2 50 C 26 50, 26 ${y}, 50 ${y}`}
							className={cn(stroke, "transition-[stroke] duration-500")}
							strokeWidth={active ? 1.1 : 0.7}
							strokeDasharray="3 3"
							strokeLinecap="round"
							vectorEffect="non-scaling-stroke"
						/>
					),
				)}
				{active ? (
					<circle className={cn(dotFill, variant === "converge" ? "ledger-flow-pulse-x" : "ledger-flow-pulse-x ledger-flow-pulse-x-delayed")} cx="26" cy="50" r="2.2" />
				) : null}
			</svg>
			<span
				className={cn(
					"absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-colors duration-500",
					active ? (accent === "amber" ? "text-[#e6a700]" : "text-[#24549c]") : "text-[#24549c]/30",
				)}
			>
				<ArrowRight className="h-3.5 w-3.5" />
			</span>
		</div>
	);
}
