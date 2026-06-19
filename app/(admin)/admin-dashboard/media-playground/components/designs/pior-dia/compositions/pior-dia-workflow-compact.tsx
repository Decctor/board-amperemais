import { cn } from "@/lib/utils";
import { PIOR_DIA_STEP_LABELS } from "../constants";
import { PIOR_DIA_REVENUE_DELTA, PIOR_DIA_SEGMENTS, PIOR_DIA_TRIGGER_RECIPIENTS_TOTAL } from "../pior-dia-data";
import type { PiorDiaLayoutTokens } from "../scale";

type PiorDiaWorkflowCompactProps = {
	tokens: PiorDiaLayoutTokens;
	className?: string;
};

const STEPS = [
	{
		key: "config",
		label: PIOR_DIA_STEP_LABELS.one,
		accent: { ring: "#EF4444", bg: "rgba(239,68,68,0.12)", badgeText: "#B91C1C", glow: "rgba(239,68,68,0.30)" },
	},
	{
		key: "trigger",
		label: PIOR_DIA_STEP_LABELS.two,
		accent: { ring: "#FBBF24", bg: "rgba(251,191,36,0.22)", badgeText: "#0A1424", glow: "rgba(251,191,36,0.35)" },
	},
	{
		key: "conversion",
		label: PIOR_DIA_STEP_LABELS.three,
		accent: { ring: "#10B981", bg: "rgba(16,185,129,0.14)", badgeText: "#047857", glow: "rgba(16,185,129,0.28)" },
	},
] as const;

/**
 * Versão horizontal/compacta do workflow para o formato QUADRADO.
 * Cada etapa vira um mini-card com número + título + 1 elemento visual representativo.
 * Setas horizontais entre eles.
 */
export function PiorDiaWorkflowCompact({ tokens, className }: PiorDiaWorkflowCompactProps) {
	return (
		<div
			data-design-role="pior-dia-workflow-compact"
			className={cn(className)}
			style={{
				display: "flex",
				flexDirection: "row",
				gap: 0,
				alignItems: "stretch",
				width: "100%",
			}}
		>
			{STEPS.map((step, idx) => (
				<div key={step.key} style={{ display: "flex", alignItems: "center", flex: idx === 1 ? 1.1 : 1, minWidth: 0 }}>
					<MiniStepCard tokens={tokens} step={step} />
					{idx < STEPS.length - 1 && (
						<HorizontalConnector tokens={tokens} fromColor={step.accent.ring} toColor={STEPS[idx + 1].accent.ring} />
					)}
				</div>
			))}
		</div>
	);
}

function MiniStepCard({
	tokens,
	step,
}: {
	tokens: PiorDiaLayoutTokens;
	step: (typeof STEPS)[number];
}) {
	const { t, radiusLg } = tokens;

	return (
		<div
			style={{
				flex: 1,
				minWidth: 0,
				background: "linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)",
				border: "1px solid #E2E8F0",
				borderRadius: radiusLg,
				padding: `${Math.round(16 * t)}px ${Math.round(14 * t)}px`,
				display: "flex",
				flexDirection: "column",
				gap: Math.round(10 * t),
				boxShadow: "0 12px 28px rgba(15, 23, 42, 0.10), 0 2px 8px rgba(15, 23, 42, 0.06)",
				position: "relative",
			}}
		>
			{/* faixa colorida no topo */}
			<div
				style={{
					position: "absolute",
					top: 0,
					left: Math.round(14 * t),
					right: Math.round(14 * t),
					height: Math.max(2, Math.round(3 * t)),
					background: step.accent.ring,
					borderRadius: 99,
					boxShadow: `0 0 12px ${step.accent.glow}`,
				}}
			/>

			{/* Header com número grande + título */}
			<div style={{ display: "flex", alignItems: "center", gap: Math.round(8 * t) }}>
				<div
					style={{
						width: Math.round(34 * t),
						height: Math.round(34 * t),
						borderRadius: Math.round(8 * t),
						background: step.accent.bg,
						border: `1px solid ${step.accent.ring}`,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						color: step.accent.badgeText,
						fontSize: Math.round(15 * t),
						fontWeight: 900,
						letterSpacing: "-0.04em",
						boxShadow: `0 4px 12px ${step.accent.glow}`,
						flexShrink: 0,
					}}
				>
					{step.label.number}
				</div>
				<div
					style={{
						fontSize: Math.round(11 * t),
						fontWeight: 800,
						color: "#0F172A",
						letterSpacing: "0.04em",
						textTransform: "uppercase",
						lineHeight: 1.15,
					}}
				>
					{step.label.title}
				</div>
			</div>

			{/* Corpo — visual único representativo da etapa */}
			<div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
				<MiniBody tokens={tokens} stepKey={step.key} />
			</div>
		</div>
	);
}

function MiniBody({ tokens, stepKey }: { tokens: PiorDiaLayoutTokens; stepKey: (typeof STEPS)[number]["key"] }) {
	const { t } = tokens;

	if (stepKey === "config") {
		return (
			<div style={{ display: "flex", flexDirection: "column", gap: Math.round(8 * t) }}>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						gap: Math.round(6 * t),
						padding: `${Math.round(5 * t)}px ${Math.round(7 * t)}px`,
						background: "rgba(239,68,68,0.08)",
						border: "1px solid rgba(239,68,68,0.22)",
						borderRadius: Math.round(7 * t),
					}}
				>
					<span
						style={{
							fontSize: Math.round(7 * t),
							fontWeight: 800,
							color: "#B91C1C",
							letterSpacing: "0.04em",
							textTransform: "uppercase",
						}}
					>
						Pior dia
					</span>
					<div
						style={{
							padding: `${Math.round(3 * t)}px ${Math.round(7 * t)}px`,
							background: "linear-gradient(180deg, #F87171 0%, #DC2626 100%)",
							borderRadius: Math.round(5 * t),
							color: "#FFFFFF",
							fontSize: Math.round(9 * t),
							fontWeight: 900,
						}}
					>
						QUA
					</div>
				</div>
				<div style={{ display: "flex", gap: Math.round(5 * t), flexWrap: "wrap" }}>
					{PIOR_DIA_SEGMENTS.map((seg) => (
						<div
							key={seg.label}
							style={{
								padding: `${Math.round(2 * t)}px ${Math.round(7 * t)}px`,
								borderRadius: 99,
								background: seg.bg,
								border: `1px solid ${seg.border}`,
								color: seg.color,
								fontSize: Math.round(8 * t),
								fontWeight: 800,
								letterSpacing: "0.05em",
							}}
						>
							{seg.label}
						</div>
					))}
				</div>
			</div>
		);
	}

	if (stepKey === "trigger") {
		return (
			<div style={{ display: "flex", flexDirection: "column", gap: Math.round(8 * t), alignItems: "center" }}>
				<div
					style={{
						display: "inline-flex",
						alignItems: "center",
						gap: Math.round(6 * t),
						padding: `${Math.round(4 * t)}px ${Math.round(8 * t)}px`,
						borderRadius: 99,
						background: "rgba(16,185,129,0.12)",
						border: "1px solid rgba(16,185,129,0.30)",
					}}
				>
					<svg width={Math.round(10 * t)} height={Math.round(10 * t)} viewBox="0 0 24 24" fill="none">
						<path d="M22 2 L11 13 M22 2 L15 22 L11 13 L2 9 Z" stroke="#34D399" strokeWidth="1.8" fill="none" strokeLinejoin="round" />
					</svg>
					<span style={{ fontSize: Math.round(9 * t), fontWeight: 800, color: "#34D399", letterSpacing: "0.06em", textTransform: "uppercase" }}>
						{PIOR_DIA_TRIGGER_RECIPIENTS_TOTAL} clientes
					</span>
				</div>
			</div>
		);
	}

	// conversion
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: Math.round(6 * t), alignItems: "center" }}>
			<MiniUpChart tokens={tokens} />
			<div
				style={{
					padding: `${Math.round(4 * t)}px ${Math.round(10 * t)}px`,
					borderRadius: Math.round(6 * t),
					background: "rgba(16,185,129,0.20)",
					border: "1px solid rgba(16,185,129,0.45)",
					color: "#34D399",
					fontSize: Math.round(14 * t),
					fontWeight: 900,
					boxShadow: "0 4px 14px rgba(16,185,129,0.32)",
					letterSpacing: "0.02em",
				}}
			>
				{PIOR_DIA_REVENUE_DELTA}
			</div>
		</div>
	);
}

function MiniUpChart({ tokens }: { tokens: PiorDiaLayoutTokens }) {
	const { t } = tokens;
	const w = Math.round(96 * t);
	const h = Math.round(40 * t);
	const points = [
		[2, 35],
		[20, 32],
		[40, 22],
		[60, 14],
		[78, 6],
		[92, 4],
	];
	const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ");
	const area = `M 2 ${h - 2} L ${points.map((p) => `${p[0]} ${p[1]}`).join(" L ")} L 92 ${h - 2} Z`;

	return (
		<svg width={w} height={h} viewBox={`0 0 96 ${h}`}>
			<defs>
				<linearGradient id="pior-dia-mini-up" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="#10B981" stopOpacity="0.55" />
					<stop offset="100%" stopColor="#10B981" stopOpacity="0.02" />
				</linearGradient>
			</defs>
			<path d={area} fill="url(#pior-dia-mini-up)" />
			<path d={path} fill="none" stroke="#34D399" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
			<circle cx="92" cy="4" r="3" fill="#34D399" />
			<circle cx="92" cy="4" r="6" fill="#34D399" fillOpacity="0.25" />
		</svg>
	);
}

function HorizontalConnector({
	tokens,
	fromColor,
	toColor,
}: {
	tokens: PiorDiaLayoutTokens;
	fromColor: string;
	toColor: string;
}) {
	const { t } = tokens;
	const w = Math.round(28 * t);
	const h = Math.round(20 * t);
	const gradId = `pior-dia-h-arrow-${fromColor.replace(/[^a-z0-9]/gi, "")}-${toColor.replace(/[^a-z0-9]/gi, "")}`;

	return (
		<div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", width: w, height: h }}>
			<svg width={w} height={h} viewBox="0 0 28 20" fill="none">
				<defs>
					<linearGradient id={gradId} x1="0" y1="10" x2="28" y2="10" gradientUnits="userSpaceOnUse">
						<stop offset="0%" stopColor={fromColor} stopOpacity="0.95" />
						<stop offset="100%" stopColor={toColor} stopOpacity="0.95" />
					</linearGradient>
				</defs>
				<line x1="2" y1="10" x2="22" y2="10" stroke={`url(#${gradId})`} strokeWidth="2.4" strokeLinecap="round" />
				<polyline
					points="18,4 26,10 18,16"
					fill="none"
					stroke={toColor}
					strokeWidth="2.4"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
				<circle cx="2" cy="10" r="2" fill={fromColor} />
			</svg>
		</div>
	);
}
