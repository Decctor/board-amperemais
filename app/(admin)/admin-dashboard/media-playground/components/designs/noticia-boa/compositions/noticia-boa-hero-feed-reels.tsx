"use client";

import {
	NOTICIA_BOA_BODY,
	NOTICIA_BOA_HEADLINE,
	NOTICIA_BOA_KICKER,
	NOTICIA_BOA_REPORT_DETAIL_PARAGRAPHS,
} from "../constants";
import type { NoticiaBoaLayoutTokens } from "../scale";
import { NoticiaBoaScreenshotCard } from "./noticia-boa-screenshot-card";

type NoticiaBoaHeroFeedReelsProps = {
	width: number;
	tokens: NoticiaBoaLayoutTokens;
	imageColumnWidth: number;
	headlineSize: number;
	bodySize: number;
	kickerSize: number;
	detailSize: number;
	variant: "feed" | "reels";
};

/** Mesmo padrão do post quadrado: copy à esquerda + cartão com screenshot à direita; texto mais longo no feed/reels */
export function NoticiaBoaHeroFeedReels({
	width,
	tokens,
	imageColumnWidth,
	headlineSize,
	bodySize,
	kickerSize,
	detailSize,
	variant,
}: NoticiaBoaHeroFeedReelsProps) {
	const { t, padX } = tokens;
	const rowGap = Math.round((variant === "reels" ? 28 : 24) * t);

	return (
		<div
			data-design-role={`noticia-boa-hero-${variant}`}
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
						marginBottom: Math.round(12 * t),
					}}
				>
					{NOTICIA_BOA_KICKER}
				</p>
				<h1
					style={{
						fontSize: headlineSize,
						fontWeight: 800,
						color: "#FAFAFA",
						lineHeight: 1.08,
						margin: 0,
						letterSpacing: "-0.032em",
						textShadow: "0 4px 28px rgba(0,0,0,0.35)",
					}}
				>
					{NOTICIA_BOA_HEADLINE}
				</h1>
				<p
					style={{
						margin: `${Math.round(18 * t)}px 0 0`,
						fontSize: bodySize,
						fontWeight: 500,
						color: "rgba(252,252,252,0.82)",
						lineHeight: 1.5,
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

				<div
					style={{
						marginTop: Math.round(20 * t),
						display: "flex",
						flexDirection: "column",
						gap: Math.round(14 * t),
					}}
				>
					{NOTICIA_BOA_REPORT_DETAIL_PARAGRAPHS.map((paragraph, idx) => (
						<p
							key={`noticia-boa-report-detail-${idx}`}
							style={{
								margin: 0,
								fontSize: detailSize,
								fontWeight: 500,
								color: "rgba(248,250,252,0.72)",
								lineHeight: 1.48,
							}}
						>
							{paragraph}
						</p>
					))}
				</div>
			</div>

			<NoticiaBoaScreenshotCard
				tokens={tokens}
				imageColumnWidth={imageColumnWidth}
				dataDesignRole={`noticia-boa-screenshot-card-${variant}`}
			/>
		</div>
	);
}
