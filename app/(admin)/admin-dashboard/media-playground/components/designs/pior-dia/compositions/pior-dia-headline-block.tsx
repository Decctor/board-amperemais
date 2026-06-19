import { cn } from "@/lib/utils";
import {
	PIOR_DIA_BODY,
	PIOR_DIA_HEADLINE_LINE1,
	PIOR_DIA_HEADLINE_LINE2_ACCENT,
	PIOR_DIA_HEADLINE_LINE2_PLAIN,
} from "../constants";
import type { PiorDiaLayoutTokens } from "../scale";

type PiorDiaHeadlineBlockProps = {
	tokens: PiorDiaLayoutTokens;
	headlineSize: number;
	bodySize: number;
	showBody: boolean;
	centered?: boolean;
	className?: string;
};

export function PiorDiaHeadlineBlock({
	tokens,
	headlineSize,
	bodySize,
	showBody,
	centered = false,
	className,
}: PiorDiaHeadlineBlockProps) {
	const { t } = tokens;
	const textAlign = centered ? "center" : "left";

	return (
		<div
			data-design-role="pior-dia-headline-block"
			className={cn(className)}
			style={{ display: "flex", flexDirection: "column", gap: Math.round(14 * t), textAlign }}
		>
			<h1
				style={{
					margin: 0,
					fontSize: headlineSize,
					fontWeight: 900,
					lineHeight: 1.08,
					letterSpacing: "-0.03em",
					color: "#FAFAFA",
					textShadow: "0 2px 24px rgba(0,0,0,0.35)",
				}}
			>
				{PIOR_DIA_HEADLINE_LINE1}
				<br />
				<span style={{ color: "#FAFAFA" }}>{PIOR_DIA_HEADLINE_LINE2_PLAIN}</span>
				<span style={{ color: "#FFCD2E" }}>{PIOR_DIA_HEADLINE_LINE2_ACCENT}</span>
			</h1>

			{showBody && (
				<p
					style={{
						margin: 0,
						fontSize: bodySize,
						fontWeight: 500,
						color: "rgba(248,250,252,0.82)",
						lineHeight: 1.55,
						letterSpacing: "-0.01em",
					}}
				>
					{PIOR_DIA_BODY}
				</p>
			)}
		</div>
	);
}
