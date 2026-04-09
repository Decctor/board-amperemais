import { CampeoesAtmosphere } from "./compositions/campeoes-atmosphere";
import { CampeoesCanvas } from "./compositions/campeoes-canvas";
import { CampeoesHeroRow } from "./compositions/campeoes-hero-row";
import { getVerticalScale } from "./scale";

type CampeoesQuadradoPostProps = { width: number; height: number };

/** Post quadrado 1080×1080 — apenas bloco herói (titular + card de métricas), centralizado */
export default function CampeoesQuadradoPost({ width, height }: CampeoesQuadradoPostProps) {
	const tokens = getVerticalScale(height);
	const { t, padX } = tokens;

	/** Margens verticais modestas — o bloco herói ampliado ocupa o quadrado */
	const padY = Math.max(40, Math.round(26 * t));

	const headlineSize = Math.round(76 * Math.min(1, t + 3));
	const bodySize = Math.round(26 * Math.min(1, t + 0.06));
	const heroBasis = Math.round(396 * Math.min(1.08, 0.88 + t * 0.12));

	return (
		<CampeoesCanvas width={width} height={height} className="campeoes-quadrado">
			<CampeoesAtmosphere />
			<div
				data-design-role="campeoes-quadrado-frame"
				className="campeoes-quadrado__frame"
				style={{
					position: "relative",
					zIndex: 1,
					boxSizing: "border-box",
					width: "100%",
					height: "100%",
					padding: `${padY}px ${padX}px`,
					display: "flex",
					flexDirection: "column",
					minHeight: 0,
				}}
			>
				<div
					style={{
						flex: 1,
						minHeight: 0,
						display: "flex",
						flexDirection: "column",
						alignItems: "stretch",
						justifyContent: "center",
					}}
				>
					<CampeoesHeroRow
						width={width}
						tokens={tokens}
						heroBasis={heroBasis}
						headlineSize={headlineSize}
						bodySize={bodySize}
						heroLayout="fill"
						className="campeoes-quadrado__hero"
					/>
				</div>
			</div>
		</CampeoesCanvas>
	);
}
