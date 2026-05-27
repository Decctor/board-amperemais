import { CAMPEOES_CONVERSION_DISTRIBUTION } from "./campeoes-data";
import { HERO_CTA_BODY, TAGLINE } from "./constants";
import { CampeoesAtmosphere } from "./compositions/campeoes-atmosphere";
import { CampeoesCanvas } from "./compositions/campeoes-canvas";
import { CampeoesClubPill } from "./compositions/campeoes-club-pill";
import { CampeoesCtaStrip } from "./compositions/campeoes-cta-strip";
import { CampeoesDistributionImpactRow } from "./compositions/campeoes-distribution-impact-row";
import { CampeoesFooter } from "./compositions/campeoes-footer";
import { CampeoesHeroRow } from "./compositions/campeoes-hero-row";
import { CampeoesMainColumn } from "./compositions/campeoes-main-column";
import { CampeoesMetricTrio } from "./compositions/campeoes-metric-trio";
import { getVerticalScale } from "./scale";

type CampeoesReelsPostProps = { width: number; height: number };

/** Layout para Reels / Stories 1080×1920 */
export default function CampeoesReelsPost({ width, height }: CampeoesReelsPostProps) {
	const tokens = getVerticalScale(height);
	const { t, padX } = tokens;

	const headlineSize = Math.round(60 * Math.min(1, t + 3));
	const bodySize = Math.round(20 * Math.min(1, t + 0.06));
	const ctaLineSize = Math.round(20 * Math.min(1, t + 0.04));
	const heroBasis = Math.round(352 * Math.min(1.08, 0.88 + t * 0.12));
	const logoHeightPx = Math.round(58 * Math.min(1.15, 0.92 + t * 0.08));
	const footerBottomPx = Math.round(36 * Math.min(1, t));

	return (
		<CampeoesCanvas width={width} height={height} className="campeoes-reels">
			<CampeoesAtmosphere />
			<CampeoesMainColumn tokens={tokens}>
				<CampeoesHeroRow
					width={width}
					tokens={tokens}
					heroBasis={heroBasis}
					headlineSize={headlineSize}
					bodySize={bodySize}
					className="campeoes-reels__hero"
				/>
				<CampeoesCtaStrip
					tokens={tokens}
					ctaLineSize={ctaLineSize}
					flexDirection="row"
					buttonFontMultiplier={12}
					body={HERO_CTA_BODY}
					className="campeoes-reels__cta"
				/>
				<CampeoesClubPill tokens={tokens} className="campeoes-reels__club" />
				<CampeoesMetricTrio tokens={tokens} className="campeoes-reels__metrics" />
				<CampeoesDistributionImpactRow
					tokens={tokens}
					items={[...CAMPEOES_CONVERSION_DISTRIBUTION]}
					showTaglineBand
					taglineFontMultiplier={12}
					tagline={TAGLINE}
					className="campeoes-reels__distribution-impact"
				/>
			</CampeoesMainColumn>
			<CampeoesFooter
				tokens={tokens}
				padX={padX}
				logoHeightPx={logoHeightPx}
				footerBottomPx={footerBottomPx}
				className="campeoes-reels__footer"
			/>
		</CampeoesCanvas>
	);
}
