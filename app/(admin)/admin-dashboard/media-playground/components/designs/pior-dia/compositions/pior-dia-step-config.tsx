import { cn } from "@/lib/utils";
import { PIOR_DIA_WHATSAPP_TEXT, PIOR_DIA_WHATSAPP_TIME } from "../constants";
import { PIOR_DIA_SEGMENTS } from "../pior-dia-data";
import type { PiorDiaLayoutTokens } from "../scale";

type PiorDiaStepConfigProps = {
	tokens: PiorDiaLayoutTokens;
	className?: string;
};

/**
 * Etapa 01 — VOCÊ CONFIGURA.
 * Linha única: gatilho + "pior dia" à esquerda, flag **QUA** à direita; segmentos + WhatsApp.
 */
export function PiorDiaStepConfig({ tokens, className }: PiorDiaStepConfigProps) {
	const { t } = tokens;

	const triggerLabelSize = Math.round(9 * t);
	const triggerValueSize = Math.round(11 * t);
	const groupLabelSize = Math.round(8.5 * t);
	const segmentSize = Math.round(11 * t);
	const blockGap = Math.round(9 * t);
	const quaFlagSize = Math.round(12 * t);

	return (
		<div
			data-design-role="pior-dia-step-config"
			className={cn(className)}
			style={{ display: "flex", flexDirection: "column", gap: blockGap }}
		>
			{/* GATILHO + PIOR DIA … ———— QUA */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					gap: Math.round(12 * t),
					padding: `${Math.round(10 * t)}px ${Math.round(12 * t)}px`,
					background: "rgba(239,68,68,0.10)",
					border: "1px solid rgba(239,68,68,0.30)",
					borderRadius: Math.round(12 * t),
				}}
			>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: Math.round(10 * t),
						flexWrap: "wrap",
						minWidth: 0,
						flex: "1 1 auto",
					}}
				>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: Math.round(6 * t),
							padding: `${Math.round(4 * t)}px ${Math.round(8 * t)}px`,
							background: "#EF4444",
							borderRadius: Math.round(6 * t),
							boxShadow: "0 4px 12px rgba(239,68,68,0.40)",
							flexShrink: 0,
						}}
					>
						<svg width={Math.round(11 * t)} height={Math.round(11 * t)} viewBox="0 0 24 24" fill="none">
							<path
								d="M12 2 L13.5 9 L22 10 L15.5 14.5 L17.5 22 L12 17.5 L6.5 22 L8.5 14.5 L2 10 L10.5 9 Z"
								fill="#FFFFFF"
							/>
						</svg>
						<span
							style={{
								color: "#FFFFFF",
								fontSize: triggerLabelSize,
								fontWeight: 900,
								letterSpacing: "0.06em",
								textTransform: "uppercase",
							}}
						>
							GATILHO
						</span>
					</div>
					<span
						style={{
							color: "#B91C1C",
							fontSize: triggerValueSize,
							fontWeight: 800,
							letterSpacing: "0.02em",
							textTransform: "uppercase",
						}}
					>
						Pior dia de vendas
					</span>
				</div>

				<div style={{ flexShrink: 0 }}>
					<div
						style={{
							padding: `${Math.round(6 * t)}px ${Math.round(12 * t)}px`,
							background: "linear-gradient(180deg, #F87171 0%, #DC2626 100%)",
							borderRadius: Math.round(8 * t),
							border: "1px solid rgba(220,38,38,0.35)",
							color: "#FFFFFF",
							fontSize: quaFlagSize,
							fontWeight: 900,
							letterSpacing: "0.08em",
							boxShadow: "0 6px 16px rgba(220,38,38,0.35), inset 0 1px 0 rgba(255,255,255,0.2)",
						}}
					>
						QUA
					</div>
				</div>
			</div>

			{/* SEGMENTOS */}
			<div style={{ display: "flex", alignItems: "center", gap: Math.round(10 * t), flexWrap: "wrap" }}>
				<span
					style={{
						fontSize: groupLabelSize,
						fontWeight: 700,
						color: "#64748B",
						letterSpacing: "0.10em",
						textTransform: "uppercase",
					}}
				>
					Segmentos
				</span>
				{PIOR_DIA_SEGMENTS.map((seg) => (
					<div
						key={seg.label}
						style={{
							display: "inline-flex",
							alignItems: "center",
							gap: Math.round(6 * t),
							padding: `${Math.round(4 * t)}px ${Math.round(10 * t)}px`,
							background: seg.bg,
							border: `1px solid ${seg.border}`,
							borderRadius: 99,
							color: seg.color,
							fontSize: segmentSize,
							fontWeight: 800,
							letterSpacing: "0.06em",
						}}
					>
						<span
							style={{
								width: Math.round(6 * t),
								height: Math.round(6 * t),
								borderRadius: 99,
								background: seg.color,
								boxShadow: `0 0 8px ${seg.color}`,
							}}
						/>
						{seg.label}
					</div>
				))}
			</div>

			<WhatsAppBubble tokens={tokens} />
		</div>
	);
}

function WhatsAppBubble({ tokens }: { tokens: PiorDiaLayoutTokens }) {
	const { t } = tokens;
	const bodySize = Math.round(11.5 * t);
	const timeSize = Math.round(8.5 * t);

	return (
		<div
			style={{
				background: "#075E54",
				borderRadius: Math.round(12 * t),
				padding: Math.round(8 * t),
				boxShadow: "0 14px 32px rgba(0,0,0,0.32)",
				position: "relative",
				display: "flex",
				flexDirection: "column",
				gap: Math.round(6 * t),
			}}
		>
			<div style={{ display: "flex", alignItems: "center", gap: Math.round(6 * t) }}>
				<div
					style={{
						width: Math.round(16 * t),
						height: Math.round(16 * t),
						borderRadius: 99,
						background: "linear-gradient(135deg, #34D399 0%, #10B981 100%)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						color: "#064E3B",
						fontSize: Math.round(9 * t),
						fontWeight: 900,
					}}
				>
					R
				</div>
				<span style={{ color: "rgba(255,255,255,0.85)", fontSize: Math.round(9 * t), fontWeight: 700 }}>
					Sua loja
				</span>
			</div>

			<div
				style={{
					alignSelf: "flex-start",
					background: "#DCF8C6",
					color: "#0B141A",
					padding: `${Math.round(9 * t)}px ${Math.round(11 * t)}px`,
					borderRadius: `${Math.round(12 * t)}px ${Math.round(12 * t)}px ${Math.round(12 * t)}px ${Math.round(2 * t)}px`,
					fontSize: bodySize,
					lineHeight: 1.45,
					fontWeight: 500,
					boxShadow: "0 2px 6px rgba(0,0,0,0.18)",
					maxWidth: "94%",
				}}
			>
				{PIOR_DIA_WHATSAPP_TEXT}
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "flex-end",
						gap: Math.round(4 * t),
						marginTop: Math.round(4 * t),
					}}
				>
					<span style={{ fontSize: timeSize, color: "rgba(11,20,26,0.55)", fontWeight: 600 }}>
						{PIOR_DIA_WHATSAPP_TIME}
					</span>
					<svg width={Math.round(12 * t)} height={Math.round(8 * t)} viewBox="0 0 16 11" fill="none">
						<path d="M1 5.5 L4.5 9 L10 2" stroke="#34B7F1" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
						<path d="M5 5.5 L8.5 9 L14 2" stroke="#34B7F1" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
					</svg>
				</div>
			</div>
		</div>
	);
}
