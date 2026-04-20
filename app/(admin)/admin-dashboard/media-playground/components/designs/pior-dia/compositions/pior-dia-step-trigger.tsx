import { cn } from "@/lib/utils";
import {
	PIOR_DIA_TRIGGER_PROGRESS_LABEL,
	PIOR_DIA_TRIGGER_RECIPIENTS_SENT,
	PIOR_DIA_TRIGGER_RECIPIENTS_TOTAL,
	PIOR_DIA_TRIGGER_TIME_LABEL,
} from "../pior-dia-data";
import type { PiorDiaLayoutTokens } from "../scale";

type PiorDiaStepTriggerProps = {
	tokens: PiorDiaLayoutTokens;
	className?: string;
};

/**
 * Etapa 02 — SISTEMA DISPARA.
 * O subtítulo do step já explica "1 dia antes"; aqui só o card de execução (contador + barra + WhatsApp).
 */
export function PiorDiaStepTrigger({ tokens, className }: PiorDiaStepTriggerProps) {
	const { t } = tokens;

	const blockGap = Math.round(9 * t);
	const progressPct = Math.round(
		(PIOR_DIA_TRIGGER_RECIPIENTS_SENT / PIOR_DIA_TRIGGER_RECIPIENTS_TOTAL) * 100,
	);

	return (
		<div
			data-design-role="pior-dia-step-trigger"
			className={cn(className)}
			style={{ display: "flex", flexDirection: "column", gap: blockGap }}
		>
			<div
				style={{
					background: "#F8FAFC",
					border: "1px solid #E2E8F0",
					borderRadius: Math.round(12 * t),
					padding: `${Math.round(11 * t)}px ${Math.round(13 * t)}px`,
					display: "flex",
					flexDirection: "column",
					gap: Math.round(8 * t),
				}}
			>
				<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: Math.round(8 * t) }}>
					<div style={{ display: "flex", alignItems: "center", gap: Math.round(8 * t) }}>
						<div
							style={{
								width: Math.round(8 * t),
								height: Math.round(8 * t),
								borderRadius: 99,
								background: "#FBBF24",
								boxShadow: "0 0 0 6px rgba(251,191,36,0.18), 0 0 14px rgba(251,191,36,0.6)",
							}}
						/>
						<span
							style={{
								fontSize: Math.round(10 * t),
								fontWeight: 800,
								color: "#FBBF24",
								letterSpacing: "0.10em",
								textTransform: "uppercase",
							}}
						>
							Em execução
						</span>
					</div>
					<span
						style={{
							fontSize: Math.round(9.5 * t),
							fontWeight: 700,
							color: "#64748B",
							letterSpacing: "0.08em",
							textTransform: "uppercase",
						}}
					>
						{PIOR_DIA_TRIGGER_TIME_LABEL}
					</span>
				</div>

				<div style={{ display: "flex", alignItems: "baseline", gap: Math.round(8 * t) }}>
					<span
						style={{
							fontSize: Math.round(28 * t),
							fontWeight: 900,
							color: "#0F172A",
							letterSpacing: "-0.03em",
							lineHeight: 1,
						}}
					>
						{PIOR_DIA_TRIGGER_RECIPIENTS_SENT}
					</span>
					<span
						style={{
							fontSize: Math.round(13 * t),
							fontWeight: 700,
							color: "#64748B",
						}}
					>
						/ {PIOR_DIA_TRIGGER_RECIPIENTS_TOTAL} clientes
					</span>
				</div>

				<div style={{ position: "relative", height: Math.round(8 * t) }}>
					<div
						style={{
							position: "absolute",
							inset: 0,
							background: "#E2E8F0",
							borderRadius: 99,
						}}
					/>
					<div
						style={{
							position: "absolute",
							top: 0,
							left: 0,
							bottom: 0,
							width: `${progressPct}%`,
							background: "linear-gradient(90deg, #34D399 0%, #10B981 100%)",
							borderRadius: 99,
							boxShadow: "0 0 14px rgba(16,185,129,0.55)",
						}}
					/>
				</div>

				<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: Math.round(8 * t) }}>
					<div
						style={{
							fontSize: Math.round(9.5 * t),
							fontWeight: 700,
							color: "#34D399",
							letterSpacing: "0.10em",
							textTransform: "uppercase",
						}}
					>
						{PIOR_DIA_TRIGGER_PROGRESS_LABEL}
					</div>
					<div
						style={{
							display: "inline-flex",
							alignItems: "center",
							gap: Math.round(5 * t),
							padding: `${Math.round(3 * t)}px ${Math.round(7 * t)}px`,
							borderRadius: 99,
							background: "rgba(16,185,129,0.14)",
							border: "1px solid rgba(16,185,129,0.30)",
						}}
					>
						<svg width={Math.round(10 * t)} height={Math.round(10 * t)} viewBox="0 0 24 24" fill="none">
							<path
								d="M22 2 L11 13 M22 2 L15 22 L11 13 L2 9 Z"
								stroke="#34D399"
								strokeWidth="1.8"
								strokeLinejoin="round"
								strokeLinecap="round"
								fill="none"
							/>
						</svg>
						<span
							style={{
								fontSize: Math.round(9 * t),
								fontWeight: 800,
								color: "#34D399",
								letterSpacing: "0.06em",
								textTransform: "uppercase",
							}}
						>
							WhatsApp
						</span>
					</div>
				</div>
			</div>
		</div>
	);
}
