import { getPiorDiaScale } from "./scale";
import { PiorDiaAtmosphere } from "./compositions/pior-dia-atmosphere";
import { PiorDiaCanvas } from "./compositions/pior-dia-canvas";
import { PiorDiaFooter } from "./compositions/pior-dia-footer";
import { PiorDiaHeadlineBlock } from "./compositions/pior-dia-headline-block";
import { PiorDiaHowItWorks } from "./compositions/pior-dia-how-it-works";
import { PiorDiaKickerBadge } from "./compositions/pior-dia-kicker-badge";
import { PiorDiaWeekChart } from "./compositions/pior-dia-week-chart";

type PiorDiaQuadradoPostProps = { width: number; height: number };

/** Layout para post quadrado Instagram 1080×1080 */
export default function PiorDiaQuadradoPost({ width, height }: PiorDiaQuadradoPostProps) {
	const tokens = getPiorDiaScale(height);
	const { t, padX } = tokens;

	const headlineSize = Math.round(54 * Math.min(1, t + 3));
	const logoHeightPx = Math.round(52 * Math.min(1.15, 0.92 + t * 0.08));
	const footerBottomPx = Math.round(30 * Math.min(1, t));
	const footerBandApprox = Math.round(14 * t) + 2 + Math.max(logoHeightPx, Math.round(44 * t));
	const padY = Math.max(40, Math.round(26 * t));
	const padBottom = padY + footerBottomPx + footerBandApprox;

	return (
		<PiorDiaCanvas width={width} height={height} className="pior-dia-quadrado">
			<PiorDiaAtmosphere />
			<div
				style={{
					position: "relative",
					zIndex: 1,
					height: "100%",
					display: "flex",
					flexDirection: "column",
					gap: Math.round(16 * t),
					padding: `${padY}px ${padX}px ${padBottom}px`,
					boxSizing: "border-box",
					alignItems: "stretch",
					justifyContent: "center",
				}}
			>
				<PiorDiaKickerBadge tokens={tokens} centered />
				<PiorDiaHeadlineBlock
					tokens={tokens}
					headlineSize={headlineSize}
					bodySize={0}
					showBody={false}
					centered
				/>
				<PiorDiaWeekChart tokens={tokens} compact />
				<PiorDiaHowItWorks tokens={tokens} compact />
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
