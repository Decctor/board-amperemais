import { cn } from "@/lib/utils";
import type { PiorDiaLayoutTokens } from "../scale";

type PiorDiaHowItWorksProps = {
	tokens: PiorDiaLayoutTokens;
	compact?: boolean;
	className?: string;
};

const STEPS = [
	{
		number: "01",
		label: "Rastreia",
		description: "Analisa 8 semanas de vendas e identifica o dia mais fraco.",
		iconBg: "rgba(99,179,237,0.18)",
		iconBorder: "rgba(99,179,237,0.30)",
		iconColor: "#63B3ED",
		// Target / radar icon
		icon: (size: number) => (
			<svg width={size} height={size} viewBox="0 0 24 24" fill="none">
				<circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
				<circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.8" />
				<circle cx="12" cy="12" r="1.5" fill="currentColor" />
				<line x1="12" y1="2" x2="12" y2="4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
				<line x1="12" y1="19.5" x2="12" y2="22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
				<line x1="2" y1="12" x2="4.5" y2="12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
				<line x1="19.5" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
			</svg>
		),
	},
	{
		number: "02",
		label: "Aciona",
		description: "Dispara mensagem no WhatsApp do cliente naquele dia.",
		iconBg: "rgba(251,191,36,0.18)",
		iconBorder: "rgba(251,191,36,0.30)",
		iconColor: "#FBBF24",
		// Lightning bolt icon
		icon: (size: number) => (
			<svg width={size} height={size} viewBox="0 0 24 24" fill="none">
				<polygon points="13,2 4,14 11,14 11,22 20,10 13,10" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" fill="none" />
			</svg>
		),
	},
	{
		number: "03",
		label: "Converte",
		description: "Cashback inteligente que traz a compra de volta.",
		iconBg: "rgba(16,185,129,0.18)",
		iconBorder: "rgba(16,185,129,0.30)",
		iconColor: "#10B981",
		// Checkmark icon
		icon: (size: number) => (
			<svg width={size} height={size} viewBox="0 0 24 24" fill="none">
				<circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
				<polyline points="8,12.5 11,15.5 16,9.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
			</svg>
		),
	},
] as const;

export function PiorDiaHowItWorks({ tokens, compact = false, className }: PiorDiaHowItWorksProps) {
	const { t, radiusMd } = tokens;

	const labelSize = Math.round(13 * t);
	const descSize = Math.round(10 * t);
	const numSize = Math.round(9 * t);
	const iconSize = Math.round(20 * t);
	const iconCircleSize = Math.round(36 * t);

	return (
		<div
			data-design-role="pior-dia-how-it-works"
			className={cn(className)}
			style={{
				display: "flex",
				flexDirection: "row",
				gap: Math.round(8 * t),
				alignItems: "stretch",
			}}
		>
			{STEPS.map((step, i) => (
				<div
					key={step.number}
					style={{
						flex: "1 1 0",
						display: "flex",
						flexDirection: "column",
						gap: Math.round(8 * t),
						background: "rgba(255,255,255,0.06)",
						border: "1px solid rgba(255,255,255,0.10)",
						borderRadius: radiusMd,
						padding: `${Math.round(12 * t)}px ${Math.round(12 * t)}px`,
					}}
				>
					{/* Step number */}
					<div
						style={{
							fontSize: numSize,
							fontWeight: 700,
							color: "rgba(248,250,252,0.40)",
							letterSpacing: "0.08em",
						}}
					>
						{step.number}
					</div>

					{/* Icon circle */}
					<div
						style={{
							width: iconCircleSize,
							height: iconCircleSize,
							borderRadius: "50%",
							background: step.iconBg,
							border: `1px solid ${step.iconBorder}`,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							color: step.iconColor,
						}}
					>
						{step.icon(iconSize)}
					</div>

					{/* Label */}
					<div
						style={{
							fontSize: labelSize,
							fontWeight: 800,
							color: "#FAFAFA",
							letterSpacing: "-0.01em",
						}}
					>
						{step.label}
					</div>

					{/* Description — hidden in compact mode */}
					{!compact && (
						<div
							style={{
								fontSize: descSize,
								fontWeight: 500,
								color: "rgba(248,250,252,0.60)",
								lineHeight: 1.5,
							}}
						>
							{step.description}
						</div>
					)}
				</div>
			))}
		</div>
	);
}
