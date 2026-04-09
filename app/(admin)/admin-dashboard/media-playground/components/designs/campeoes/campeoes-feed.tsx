import { CAMPEOES_CONVERSION_DISTRIBUTION } from "./campeoes-data";
import { HERO_CTA_BODY, TAGLINE } from "./constants";
import { CampeoesAtmosphere } from "./compositions/campeoes-atmosphere";
import { CampeoesCanvas } from "./compositions/campeoes-canvas";
import { CampeoesClubPill } from "./compositions/campeoes-club-pill";
import { CampeoesCtaStrip } from "./compositions/campeoes-cta-strip";
import { CampeoesDeliveryKpis } from "./compositions/campeoes-delivery-kpis";
import { CampeoesDistributionImpactRow } from "./compositions/campeoes-distribution-impact-row";
import { CampeoesFooter } from "./compositions/campeoes-footer";
import { CampeoesHeroRow } from "./compositions/campeoes-hero-row";
import { CampeoesMainColumn } from "./compositions/campeoes-main-column";
import { CampeoesMetricTrio } from "./compositions/campeoes-metric-trio";
import { getVerticalScale } from "./scale";

type CampeoesFeedPostProps = { width: number; height: number };

/** Layout para feed Instagram 1080×1350 */
export default function CampeoesFeedPost({ width, height }: CampeoesFeedPostProps) {
	const tokens = getVerticalScale(height);
	const { t, padX } = tokens;

	const headlineSize = Math.round(60 * Math.min(1, t + 3));
	const bodySize = Math.round(20 * Math.min(1, t + 0.06));
	const ctaLineSize = Math.round(20 * Math.min(1, t + 0.04));
	const heroBasis = Math.round(332 * Math.min(1.08, 0.88 + t * 0.12));
	const logoHeightPx = Math.round(52 * Math.min(1.15, 0.92 + t * 0.08));
	const footerBottomPx = Math.round(30 * Math.min(1, t));

	return (
		<CampeoesCanvas width={width} height={height} className="campeoes-feed">
			<CampeoesAtmosphere />
			<CampeoesMainColumn tokens={tokens}>
				<CampeoesHeroRow
					width={width}
					tokens={tokens}
					heroBasis={heroBasis}
					headlineSize={headlineSize}
					bodySize={bodySize}
					className="campeoes-feed__hero"
				/>
				<CampeoesCtaStrip
					tokens={tokens}
					ctaLineSize={ctaLineSize}
					flexDirection="row"
					buttonFontMultiplier={12}
					body={HERO_CTA_BODY}
					className="campeoes-feed__cta"
				/>
				<CampeoesClubPill tokens={tokens} className="campeoes-feed__club" />
				<CampeoesMetricTrio tokens={tokens} className="campeoes-feed__metrics" />
				<CampeoesDistributionImpactRow
					tokens={tokens}
					items={[...CAMPEOES_CONVERSION_DISTRIBUTION]}
					showTaglineBand
					taglineFontMultiplier={12}
					tagline={TAGLINE}
					className="campeoes-feed__distribution-impact"
				/>
				<CampeoesDeliveryKpis tokens={tokens} valueFontMultiplier={19} className="campeoes-feed__delivery" />
			</CampeoesMainColumn>
			<CampeoesFooter
				tokens={tokens}
				padX={padX}
				logoHeightPx={logoHeightPx}
				footerBottomPx={footerBottomPx}
				className="campeoes-feed__footer"
			/>
		</CampeoesCanvas>
	);
}
