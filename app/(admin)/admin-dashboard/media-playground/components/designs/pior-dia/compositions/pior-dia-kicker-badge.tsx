import { cn } from "@/lib/utils";
import { PIOR_DIA_KICKER } from "../constants";
import type { PiorDiaLayoutTokens } from "../scale";

type PiorDiaKickerBadgeProps = {
	tokens: PiorDiaLayoutTokens;
	centered?: boolean;
	className?: string;
};

export function PiorDiaKickerBadge({ tokens, centered = false, className }: PiorDiaKickerBadgeProps) {
	const { t } = tokens;

	return (
		<div
			data-design-role="pior-dia-kicker-badge"
			className={cn(className)}
			style={{
				display: "flex",
				alignItems: "center",
				justifyContent: centered ? "center" : "flex-start",
			}}
		>
			<div
				style={{
					display: "inline-flex",
					alignItems: "center",
					gap: Math.round(8 * t),
					background: "rgba(239,68,68,0.18)",
					border: "1px solid rgba(239,68,68,0.35)",
					borderRadius: Math.round(100 * t),
					padding: `${Math.round(6 * t)}px ${Math.round(14 * t)}px`,
				}}
			>
				{/* Red pulse dot */}
				<div
					style={{
						width: Math.round(7 * t),
						height: Math.round(7 * t),
						borderRadius: "50%",
						background: "#EF4444",
						boxShadow: "0 0 6px rgba(239,68,68,0.7)",
						flexShrink: 0,
					}}
				/>
				<span
					style={{
						fontSize: Math.round(11 * t),
						fontWeight: 800,
						color: "#FCA5A5",
						letterSpacing: "0.10em",
						textTransform: "uppercase",
					}}
				>
					{PIOR_DIA_KICKER}
				</span>
			</div>
		</div>
	);
}
