import { getPiorDiaScale } from "./scale";
import { PiorDiaAtmosphere } from "./compositions/pior-dia-atmosphere";
import { PiorDiaCanvas } from "./compositions/pior-dia-canvas";
import { PiorDiaCtaStrip } from "./compositions/pior-dia-cta-strip";
import { PiorDiaFooter } from "./compositions/pior-dia-footer";
import { PiorDiaHeadlineBlock } from "./compositions/pior-dia-headline-block";
import { PiorDiaHowItWorks } from "./compositions/pior-dia-how-it-works";
import { PiorDiaKickerBadge } from "./compositions/pior-dia-kicker-badge";
import { PiorDiaStatsCard } from "./compositions/pior-dia-stats-card";
import { PiorDiaWeekChart } from "./compositions/pior-dia-week-chart";

type PiorDiaReelsPostProps = { width: number; height: number };

/** Layout para Reels/Stories Instagram 1080×1920 */
export default function PiorDiaReelsPost({ width, height }: PiorDiaReelsPostProps) {
	const tokens = getPiorDiaScale(height);
	const { t, padX, padTop, padBottom, sectionGap } = tokens;

	const headlineSize = Math.round(52 * Math.min(1.12, 0.92 + t * 0.1));
	const bodySize = Math.round(22 * Math.min(1.08, 0.95 + t * 0.06));
	const ctaLineSize = Math.round(22 * Math.min(1.08, 0.95 + t * 0.04));
	const chartBasis = Math.round(360 * Math.min(1.08, 0.88 + t * 0.12));
	const logoHeightPx = Math.round(52 * Math.min(1.15, 0.92 + t * 0.08));
	const footerBottomPx = Math.round(30 * Math.min(1, t));

	return (
		<PiorDiaCanvas width={width} height={height} className="pior-dia-reels">
			<PiorDiaAtmosphere />
			<div
				style={{
					position: "relative",
					zIndex: 1,
					height: "100%",
					display: "flex",
					flexDirection: "column",
					gap: sectionGap,
					padding: `${padTop}px ${padX}px ${padBottom}px`,
					boxSizing: "border-box",
				}}
			>
				<PiorDiaKickerBadge tokens={tokens} />

				{/* Hero row: headline left + chart right */}
				<div style={{ display: "flex", flexDirection: "row", gap: Math.round(24 * t), alignItems: "flex-start" }}>
					<div style={{ flex: 1, minWidth: 0 }}>
						<PiorDiaHeadlineBlock
							tokens={tokens}
							headlineSize={headlineSize}
							bodySize={bodySize}
							showBody
						/>
					</div>
					<div style={{ flexShrink: 0, overflow: "visible" }}>
						<PiorDiaWeekChart tokens={tokens} cardWidth={chartBasis} />
					</div>
				</div>

				<PiorDiaHowItWorks tokens={tokens} />
				<PiorDiaStatsCard tokens={tokens} />

				{/* Spacer pushes CTA toward bottom */}
				<div style={{ flex: 1 }} />

				<PiorDiaCtaStrip
					tokens={tokens}
					ctaLineSize={ctaLineSize}
					flexDirection="row"
					buttonFontMultiplier={14}
				/>
			</div>
			<PiorDiaFooter
				tokens={tokens}
				padX={padX}
				logoHeightPx={logoHeightPx}
				footerBottomPx={footerBottomPx}
			/>
		</PiorDiaCanvas>
	);
}
