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
					background:
						"linear-gradient(120deg, rgba(255,205,46,0.18) 0%, rgba(16,185,129,0.16) 100%)",
					border: "1px solid rgba(255,205,46,0.32)",
					borderRadius: Math.round(100 * t),
					padding: `${Math.round(6 * t)}px ${Math.round(14 * t)}px`,
					boxShadow: "0 6px 18px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.08)",
				}}
			>
				<svg width={Math.round(12 * t)} height={Math.round(12 * t)} viewBox="0 0 24 24" fill="none">
					<path
						d="M13 2 L4 14 L11 14 L11 22 L20 10 L13 10 Z"
						fill="#FFCD2E"
						stroke="#FFCD2E"
						strokeWidth="1.4"
						strokeLinejoin="round"
					/>
				</svg>
				<span
					style={{
						fontSize: Math.round(11 * t),
						fontWeight: 800,
						color: "#FFE17F",
						letterSpacing: "0.14em",
						textTransform: "uppercase",
					}}
				>
					{PIOR_DIA_KICKER}
				</span>
			</div>
		</div>
	);
}
