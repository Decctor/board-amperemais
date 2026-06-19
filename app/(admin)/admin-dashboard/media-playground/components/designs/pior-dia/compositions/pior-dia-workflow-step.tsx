import { cn } from "@/lib/utils";
import type { CSSProperties, ReactNode } from "react";
import type { PiorDiaLayoutTokens } from "../scale";

type PiorDiaWorkflowStepProps = {
	tokens: PiorDiaLayoutTokens;
	number: string;
	title: string;
	subtitle: string;
	accent: { ring: string; bg: string; text: string; glow: string };
	children: ReactNode;
	className?: string;
};

/**
 * Shell de uma etapa do workflow — header com número grande + título + subtítulo,
 * e uma área de conteúdo abaixo. Usado dentro do PiorDiaWorkflow.
 */
export function PiorDiaWorkflowStep({
	tokens,
	number,
	title,
	subtitle,
	accent,
	children,
	className,
}: PiorDiaWorkflowStepProps) {
	const { t, radiusLg } = tokens;

	const badgeSize = Math.round(40 * t);
	const numFontSize = Math.round(18 * t);
	const titleSize = Math.round(14 * t);
	const subtitleSize = Math.round(9 * t);
	const padX = Math.round(16 * t);
	const padY = Math.round(12 * t);
	const headerGap = Math.round(10 * t);
	const contentTopGap = Math.round(10 * t);

	const cardStyle: CSSProperties = {
		position: "relative",
		background: "linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)",
		border: "1px solid #E2E8F0",
		borderRadius: radiusLg,
		padding: `${padY}px ${padX}px`,
		boxShadow: "0 12px 28px rgba(15, 23, 42, 0.10), 0 2px 8px rgba(15, 23, 42, 0.06)",
	};

	return (
		<div
			data-design-role="pior-dia-workflow-step"
			className={cn(className)}
			style={cardStyle}
		>
			{/* faixa lateral colorida indicando a etapa */}
			<div
				style={{
					position: "absolute",
					top: Math.round(14 * t),
					bottom: Math.round(14 * t),
					left: 0,
					width: Math.max(2, Math.round(3 * t)),
					background: accent.ring,
					borderRadius: 99,
					boxShadow: `0 0 16px ${accent.glow}`,
				}}
			/>

			{/* Header: badge numérico + título/subtítulo */}
			<div style={{ display: "flex", alignItems: "center", gap: headerGap }}>
				<div
					style={{
						width: badgeSize,
						height: badgeSize,
						borderRadius: Math.round(12 * t),
						background: accent.bg,
						border: `1px solid ${accent.ring}`,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						color: accent.text,
						fontSize: numFontSize,
						fontWeight: 900,
						letterSpacing: "-0.04em",
						boxShadow: `0 4px 14px ${accent.glow}`,
						flexShrink: 0,
					}}
				>
					{number}
				</div>

				<div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
					<div
						style={{
							fontSize: titleSize,
							fontWeight: 800,
							color: "#0F172A",
							letterSpacing: "0.04em",
							textTransform: "uppercase",
							lineHeight: 1.1,
						}}
					>
						{title}
					</div>
					<div
						style={{
							fontSize: subtitleSize,
							fontWeight: 600,
							color: "#64748B",
							letterSpacing: "0.06em",
							textTransform: "uppercase",
							marginTop: Math.round(3 * t),
						}}
					>
						{subtitle}
					</div>
				</div>
			</div>

			{/* Conteúdo da etapa */}
			<div style={{ marginTop: contentTopGap }}>{children}</div>
		</div>
	);
}
