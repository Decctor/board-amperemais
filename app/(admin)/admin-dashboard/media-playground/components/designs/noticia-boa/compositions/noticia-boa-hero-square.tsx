"use client";

import {
	NOTICIA_BOA_BODY,
	NOTICIA_BOA_HEADLINE,
	NOTICIA_BOA_KICKER,
} from "../constants";
import type { NoticiaBoaLayoutTokens } from "../scale";
import { NoticiaBoaScreenshotCard } from "./noticia-boa-screenshot-card";

type NoticiaBoaHeroSquareProps = {
	width: number;
	tokens: NoticiaBoaLayoutTokens;
	/** Largura da coluna do screenshot (já com 1,125× sobre a base CAMPEÕES) */
	imageColumnWidth: number;
	headlineSize: number;
	bodySize: number;
	kickerSize: number;
};

/** Mesma estrutura do `CampeoesHeroRow` (fill): copy à esquerda + cartão branco à direita; borda interna uniforme */
export function NoticiaBoaHeroSquare({
	width,
	tokens,
	imageColumnWidth,
	headlineSize,
	bodySize,
	kickerSize,
}: NoticiaBoaHeroSquareProps) {
	const { t, padX } = tokens;
	const rowGap = Math.round(26 * t);

	return (
		<div
			data-design-role="noticia-boa-hero-square"
			style={{
				display: "flex",
				flexDirection: "row",
				alignItems: "stretch",
				justifyContent: "space-between",
				gap: rowGap,
				paddingBottom: 0,
				boxSizing: "border-box",
				width: "100%",
				minHeight: 0,
				flex: 1,
			}}
		>
			<div
				style={{
					flex: "1 1 0",
					minWidth: 0,
					maxWidth: width - padX * 2 - imageColumnWidth - rowGap,
					display: "flex",
					flexDirection: "column",
					justifyContent: "center",
					alignSelf: "stretch",
				}}
			>
				<p
					style={{
						margin: 0,
						fontSize: kickerSize,
						fontWeight: 700,
						letterSpacing: "0.12em",
						textTransform: "uppercase",
						color: "rgba(248,250,252,0.55)",
						marginBottom: Math.round(14 * t),
					}}
				>
					{NOTICIA_BOA_KICKER}
				</p>
				<h1
					style={{
						fontSize: headlineSize,
						fontWeight: 800,
						color: "#FAFAFA",
						lineHeight: 1.07,
						margin: 0,
						letterSpacing: "-0.032em",
						textShadow: "0 4px 28px rgba(0,0,0,0.35)",
					}}
				>
					{NOTICIA_BOA_HEADLINE}
				</h1>
				<p
					style={{
						margin: `${Math.round(22 * t)}px 0 0`,
						fontSize: bodySize,
						fontWeight: 500,
						color: "rgba(252,252,252,0.78)",
						lineHeight: 1.52,
					}}
				>
					{NOTICIA_BOA_BODY.split("RecompraCRM").map((part, i, arr) => (
						<span key={i}>
							{part}
							{i < arr.length - 1 ? (
								<span style={{ color: "#FFCD2E", fontWeight: 800 }}>RecompraCRM</span>
							) : null}
						</span>
					))}
				</p>
			</div>

			<NoticiaBoaScreenshotCard tokens={tokens} imageColumnWidth={imageColumnWidth} dataDesignRole="noticia-boa-screenshot-card-square" />
		</div>
	);
}
