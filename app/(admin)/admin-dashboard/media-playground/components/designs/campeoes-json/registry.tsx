"use client";

import { defineRegistry } from "@json-render/react";
import { createContext, useContext } from "react";
import { CampeoesAtmosphere } from "../campeoes/compositions/campeoes-atmosphere";
import { CampeoesCanvas } from "../campeoes/compositions/campeoes-canvas";
import { CampeoesClubPill } from "../campeoes/compositions/campeoes-club-pill";
import { CampeoesCtaStrip } from "../campeoes/compositions/campeoes-cta-strip";
import { CampeoesDeliveryKpis } from "../campeoes/compositions/campeoes-delivery-kpis";
import type { CampeoesDistributionItem } from "../campeoes/compositions/campeoes-distribution-card";
import { CampeoesDistributionImpactRow } from "../campeoes/compositions/campeoes-distribution-impact-row";
import { CampeoesFooter } from "../campeoes/compositions/campeoes-footer";
import { CampeoesHeroRow } from "../campeoes/compositions/campeoes-hero-row";
import { CampeoesMainColumn } from "../campeoes/compositions/campeoes-main-column";
import { CampeoesMetricTrio } from "../campeoes/compositions/campeoes-metric-trio";
import { HERO_CTA_BODY } from "../campeoes/constants";
import type { CampeoesLayoutTokens } from "../campeoes/scale";
import { campeoesCatalog } from "./catalog";

// ─── Contexto React ───────────────────────────────────────────────────────────
// O bridge renderer (campeoes-json-renderer.tsx) calcula os tokens a partir de
// width/height e os injeta aqui. Os componentes do registry leem via useCampeoesCtx().

type CampeoesRenderCtx = {
	tokens: CampeoesLayoutTokens;
	width: number;
};

export const CampeoesRenderContext = createContext<CampeoesRenderCtx | null>(null);

function useCampeoesCtx(): CampeoesRenderCtx {
	const ctx = useContext(CampeoesRenderContext);
	if (!ctx) throw new Error("CampeoesRenderContext não encontrado. Use CampeoesJsonRenderer.");
	return ctx;
}

// ─── Tipos de props por componente ───────────────────────────────────────────
// Explicitados aqui porque a inferência de tipos do catálogo falha pela
// incompatibilidade de versões do Zod (projeto usa v3, @json-render/core exige v4).

type QuadradoFrameProps = { logoHeightBase: number; footerBottomBase: number };
type HeroRowProps = { heroLayout: "default" | "fill"; heroBasisBase: number; headlineSizeBase: number; bodySizeBase: number };
type CtaStripProps = { flexDirection: "row" | "column"; buttonFontMultiplier: number; ctaLineSizeBase: number };
type DistributionImpactRowProps = { items: CampeoesDistributionItem[]; showTaglineBand: boolean; taglineFontMultiplier: number; tagline: string };
type DeliveryKpisProps = { valueFontMultiplier: number };
type FooterProps = { logoHeightBase: number; footerBottomBase: number };

// ─── Registry ─────────────────────────────────────────────────────────────────

export const { registry: campeoesRegistry } = defineRegistry(campeoesCatalog, {
	components: {
		CampeoesCanvas: ({ children }) => {
			const { tokens, width } = useCampeoesCtx();
			const height = (tokens.t * 1350) / 1.2;
			return (
				<CampeoesCanvas width={width} height={height}>
					{children}
				</CampeoesCanvas>
			);
		},

		CampeoesAtmosphere: () => <CampeoesAtmosphere />,

		CampeoesMainColumn: ({ children }) => {
			const { tokens } = useCampeoesCtx();
			return <CampeoesMainColumn tokens={tokens}>{children}</CampeoesMainColumn>;
		},

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		CampeoesQuadradoFrame: ({ props: _props, children }: any) => {
			const props = _props as QuadradoFrameProps;
			const { tokens } = useCampeoesCtx();
			const { t, padX } = tokens;
			const logoHeightPx = Math.round(props.logoHeightBase * Math.min(1.15, 0.92 + t * 0.08));
			const footerBottomPx = Math.round(props.footerBottomBase * Math.min(1, t));
			const footerBandApprox = Math.round(14 * t) + 2 + Math.max(logoHeightPx, Math.round(44 * t));
			const padY = Math.max(40, Math.round(26 * t));
			const padBottom = padY + footerBottomPx + footerBandApprox;
			return (
				<div
					data-design-role="campeoes-quadrado-frame"
					style={{
						position: "relative",
						zIndex: 1,
						boxSizing: "border-box",
						width: "100%",
						height: "100%",
						padding: `${padY}px ${padX}px ${padBottom}px ${padX}px`,
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
						{children}
					</div>
				</div>
			);
		},

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		CampeoesHeroRow: ({ props: _props }: any) => {
			const props = _props as HeroRowProps;
			const { tokens, width } = useCampeoesCtx();
			const { t } = tokens;
			const heroBasis = Math.round(props.heroBasisBase * Math.min(1.08, 0.88 + t * 0.12));
			const headlineSize = Math.round(props.headlineSizeBase * Math.min(1, t + 3));
			const bodySize = Math.round(props.bodySizeBase * Math.min(1, t + 0.06));
			return (
				<CampeoesHeroRow
					width={width}
					tokens={tokens}
					heroBasis={heroBasis}
					headlineSize={headlineSize}
					bodySize={bodySize}
					heroLayout={props.heroLayout}
				/>
			);
		},

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		CampeoesCtaStrip: ({ props: _props }: any) => {
			const props = _props as CtaStripProps;
			const { tokens } = useCampeoesCtx();
			const ctaLineSize = Math.round(props.ctaLineSizeBase * Math.min(1, tokens.t + 0.04));
			return (
				<CampeoesCtaStrip
					tokens={tokens}
					ctaLineSize={ctaLineSize}
					flexDirection={props.flexDirection}
					buttonFontMultiplier={props.buttonFontMultiplier}
					body={HERO_CTA_BODY}
				/>
			);
		},

		CampeoesClubPill: () => {
			const { tokens } = useCampeoesCtx();
			return <CampeoesClubPill tokens={tokens} />;
		},

		CampeoesMetricTrio: () => {
			const { tokens } = useCampeoesCtx();
			return <CampeoesMetricTrio tokens={tokens} />;
		},

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		CampeoesDistributionImpactRow: ({ props: _props }: any) => {
			const props = _props as DistributionImpactRowProps;
			const { tokens } = useCampeoesCtx();
			return (
				<CampeoesDistributionImpactRow
					tokens={tokens}
					items={props.items}
					showTaglineBand={props.showTaglineBand}
					taglineFontMultiplier={props.taglineFontMultiplier}
					tagline={props.tagline}
				/>
			);
		},

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		CampeoesDeliveryKpis: ({ props: _props }: any) => {
			const props = _props as DeliveryKpisProps;
			const { tokens } = useCampeoesCtx();
			return <CampeoesDeliveryKpis tokens={tokens} valueFontMultiplier={props.valueFontMultiplier} />;
		},

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		CampeoesFooter: ({ props: _props }: any) => {
			const props = _props as FooterProps;
			const { tokens } = useCampeoesCtx();
			const { t, padX } = tokens;
			const logoHeightPx = Math.round(props.logoHeightBase * Math.min(1.15, 0.92 + t * 0.08));
			const footerBottomPx = Math.round(props.footerBottomBase * Math.min(1, t));
			return (
				<CampeoesFooter tokens={tokens} padX={padX} logoHeightPx={logoHeightPx} footerBottomPx={footerBottomPx} />
			);
		},
	},
	actions: {},
});
