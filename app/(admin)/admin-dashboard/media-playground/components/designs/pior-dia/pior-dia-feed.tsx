"use client";
import { PiorDiaAtmosphere } from "./compositions/pior-dia-atmosphere";
import { PiorDiaCanvas } from "./compositions/pior-dia-canvas";
import { PiorDiaCtaStrip } from "./compositions/pior-dia-cta-strip";
import { PiorDiaFooter } from "./compositions/pior-dia-footer";
import { PiorDiaHeadlineBlock } from "./compositions/pior-dia-headline-block";
import { PiorDiaKickerBadge } from "./compositions/pior-dia-kicker-badge";
import { PiorDiaWorkflow } from "./compositions/pior-dia-workflow";
import { getPiorDiaScale } from "./scale";

type PiorDiaFeedPostProps = { width: number; height: number };

/**
 * Layout FEED INSTAGRAM (1080×1350) — mesma estrutura 2-col do reels,
 * mais compacta verticalmente.
 */
export default function PiorDiaFeedPost({ width, height }: PiorDiaFeedPostProps) {
	const tokens = getPiorDiaScale(height);
	const { t, padX, padTop, padBottom, sectionGap } = tokens;

	const headlineSize = Math.round(48 * Math.min(1.1, 0.92 + t * 0.1));
	const bodySize = Math.round(18 * Math.min(1.08, 0.95 + t * 0.06));
	const ctaLineSize = Math.round(17 * Math.min(1.08, 0.95 + t * 0.04));
	const logoHeightPx = Math.round(52 * Math.min(1.15, 0.92 + t * 0.08));
	const footerBottomPx = Math.round(30 * Math.min(1, t));
	const colGap = Math.round(22 * t);

	return (
		<PiorDiaCanvas width={width} height={height} className="pior-dia-feed">
			<PiorDiaAtmosphere />
			<div
				style={{
					position: "relative",
					zIndex: 1,
					height: "100%",
					padding: `${padTop}px ${padX}px ${padBottom}px`,
					boxSizing: "border-box",
					display: "flex",
					flexDirection: "row",
					gap: colGap,
					alignItems: "stretch",
				}}
			>
				{/* ─ Coluna esquerda ─────────────────────────────── */}
				<div
					style={{
						flex: "0 0 36%",
						minWidth: 0,
						display: "flex",
						flexDirection: "column",
						gap: sectionGap,
					}}
				>
					<PiorDiaKickerBadge tokens={tokens} />
					<PiorDiaHeadlineBlock tokens={tokens} headlineSize={headlineSize} bodySize={bodySize} showBody />

					<div style={{ flex: 1 }} />

					<PiorDiaCtaStrip tokens={tokens} ctaLineSize={ctaLineSize} flexDirection="column" buttonFontMultiplier={14} />
				</div>

				{/* ─ Coluna direita: workflow ────────────────────── */}
				<div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "stretch" }}>
					<PiorDiaWorkflow tokens={tokens} />
				</div>
			</div>

			<PiorDiaFooter tokens={tokens} padX={padX} logoHeightPx={logoHeightPx} footerBottomPx={footerBottomPx} />
		</PiorDiaCanvas>
	);
}
