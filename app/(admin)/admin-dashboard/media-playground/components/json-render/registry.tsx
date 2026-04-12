"use client";

import type { BaseComponentProps } from "@json-render/react";
import { defineRegistry } from "@json-render/react";
import type { CSSProperties, ReactNode } from "react";
import RecompraHorizontalColorful from "@/utils/svgs/logos/RECOMPRA - COMPLETE - HORIZONTAL- COLORFUL.svg";
import RecompraHorizontalDark from "@/utils/svgs/logos/RECOMPRA - COMPLETE - HORIZONTAL- COLORFUL TEXT-BLACK.svg";
import RecompraIconColorful from "@/utils/svgs/logos/RECOMPRA - ICON - COLORFUL.svg";
import RecompraIconWhite from "@/utils/svgs/logos/RECOMPRA - ICON - WHITE-N-BLACK.svg";
import { mediaCatalog } from "./catalog";
import { useMediaRenderContext } from "./render-context";

type TLength = number | string | undefined;

type TBaseLayoutProps = {
	position?: "relative" | "absolute";
	top?: TLength;
	right?: TLength;
	bottom?: TLength;
	left?: TLength;
	width?: TLength;
	height?: TLength;
	minWidth?: TLength;
	minHeight?: TLength;
	maxWidth?: TLength;
	maxHeight?: TLength;
	flex?: number | string;
	zIndex?: number;
	overflow?: "visible" | "hidden";
	opacity?: number;
	background?: string;
	border?: string;
	borderTop?: string;
	borderRight?: string;
	borderBottom?: string;
	borderLeft?: string;
	borderRadius?: TLength;
	boxShadow?: string;
	rotateDeg?: number;
	backdropBlur?: TLength;
	pointerEvents?: "none" | "auto";
	mixBlendMode?: string;
	backgroundImage?: string;
	backgroundSize?: string;
	padding?: TLength;
	paddingX?: TLength;
	paddingY?: TLength;
	paddingTop?: TLength;
	paddingRight?: TLength;
	paddingBottom?: TLength;
	paddingLeft?: TLength;
	margin?: TLength;
	marginTop?: TLength;
	marginBottom?: TLength;
	marginLeft?: TLength;
	marginRight?: TLength;
	alignSelf?: "auto" | "stretch" | "flex-start" | "center" | "flex-end";
	justifySelf?: "auto" | "stretch" | "start" | "center" | "end";
};

type TTextWeight = "regular" | "medium" | "semibold" | "bold";

type TTextSpan = {
	text: string;
	color?: string;
	weight?: TTextWeight;
	underlineColor?: string;
	underlineThickness?: number;
	skipInkNone?: boolean;
};

type TCanvasProps = {
	background?: string;
	fontFamily?: string;
	borderRadius?: TLength;
	overflow?: "visible" | "hidden";
};

type TStackProps = TBaseLayoutProps & {
	direction?: "row" | "column";
	gap?: TLength;
	alignItems?: "stretch" | "flex-start" | "center" | "flex-end";
	justifyContent?: "flex-start" | "center" | "flex-end" | "space-between" | "space-around";
	wrap?: boolean;
};

type TGridProps = TBaseLayoutProps & {
	columns?: string | Array<number | string>;
	rows?: string | Array<number | string>;
	gap?: TLength;
	columnGap?: TLength;
	rowGap?: TLength;
	alignItems?: "stretch" | "start" | "center" | "end";
	justifyItems?: "stretch" | "start" | "center" | "end";
};

type TSurfaceProps = TBaseLayoutProps & {
	direction?: "row" | "column";
	gap?: TLength;
	alignItems?: "stretch" | "flex-start" | "center" | "flex-end";
	justifyContent?: "flex-start" | "center" | "flex-end" | "space-between";
};

type TTextProps = {
	text?: string;
	lines?: TTextSpan[][];
	size: number;
	weight?: TTextWeight;
	color?: string;
	lineHeight?: number;
	tracking?: string;
	shadow?: string;
	align?: "left" | "center" | "right";
	uppercase?: boolean;
	opacity?: number;
	marginTop?: TLength;
	maxWidth?: TLength;
	whiteSpace?: "normal" | "nowrap";
};

type TBadgeProps = {
	label: string;
	background: string;
	color: string;
	fontSize: number;
	fontWeight?: TTextWeight;
	borderRadius?: TLength;
	paddingX?: TLength;
	paddingY?: TLength;
	border?: string;
	boxShadow?: string;
	tracking?: string;
};

type TMetricCardProps = {
	label: string;
	value: string;
	background: string;
	valueColor?: string;
	labelColor?: string;
	border?: string;
	boxShadow?: string;
	borderRadius?: TLength;
	paddingX?: TLength;
	paddingY?: TLength;
	labelSize?: number;
	valueSize?: number;
	labelUppercase?: boolean;
	align?: "left" | "center" | "right";
};

type TDistributionItem = {
	label: string;
	count: number;
	percentage: number;
	revenue: string;
	color: string;
};

type TDistributionListCardProps = {
	title: string;
	items: TDistributionItem[];
	tagline?: string;
	background: string;
	border?: string;
	boxShadow?: string;
	borderRadius?: TLength;
	paddingX?: TLength;
	paddingY?: TLength;
};

type TInsightItem = {
	label: string;
	value: string;
	positive?: boolean;
};

type TInsightPanelProps = {
	title: string;
	items: TInsightItem[];
	background: string;
	border?: string;
	boxShadow?: string;
	borderRadius?: TLength;
	paddingX?: TLength;
	paddingY?: TLength;
};

type TLogoProps = {
	asset: "recompra-horizontal-colorful" | "recompra-horizontal-dark" | "recompra-icon-colorful" | "recompra-icon-white";
	alt: string;
	height: number;
	maxWidth?: TLength;
	objectPosition?: string;
};

const logoAssets = {
	"recompra-horizontal-colorful": RecompraHorizontalColorful,
	"recompra-horizontal-dark": RecompraHorizontalDark,
	"recompra-icon-colorful": RecompraIconColorful,
	"recompra-icon-white": RecompraIconWhite,
} as const;

function resolveLength(value: TLength, scale: number) {
	if (typeof value === "number") {
		return Math.round(value * scale);
	}

	return value;
}

function resolveWeight(weight: TTextWeight | undefined) {
	switch (weight) {
		case "medium":
			return 500;
		case "semibold":
			return 600;
		case "bold":
			return 800;
		case "regular":
		default:
			return 400;
	}
}

function withPixelUnits(value: number | string | undefined) {
	if (typeof value === "number") {
		return `${value}px`;
	}

	return value;
}

function buildBoxStyle(props: TBaseLayoutProps, scale: number): CSSProperties {
	const paddingX = resolveLength(props.paddingX, scale);
	const paddingY = resolveLength(props.paddingY, scale);
	const padding = resolveLength(props.padding, scale);
	const paddingTop = resolveLength(props.paddingTop, scale);
	const paddingRight = resolveLength(props.paddingRight, scale);
	const paddingBottom = resolveLength(props.paddingBottom, scale);
	const paddingLeft = resolveLength(props.paddingLeft, scale);

	return {
		position: props.position,
		top: withPixelUnits(resolveLength(props.top, scale)),
		right: withPixelUnits(resolveLength(props.right, scale)),
		bottom: withPixelUnits(resolveLength(props.bottom, scale)),
		left: withPixelUnits(resolveLength(props.left, scale)),
		width: withPixelUnits(resolveLength(props.width, scale)),
		height: withPixelUnits(resolveLength(props.height, scale)),
		minWidth: withPixelUnits(resolveLength(props.minWidth, scale)),
		minHeight: withPixelUnits(resolveLength(props.minHeight, scale)),
		maxWidth: withPixelUnits(resolveLength(props.maxWidth, scale)),
		maxHeight: withPixelUnits(resolveLength(props.maxHeight, scale)),
		flex: props.flex,
		zIndex: props.zIndex,
		overflow: props.overflow,
		opacity: props.opacity,
		background: props.background,
		border: props.border,
		borderTop: props.borderTop,
		borderRight: props.borderRight,
		borderBottom: props.borderBottom,
		borderLeft: props.borderLeft,
		borderRadius: withPixelUnits(resolveLength(props.borderRadius, scale)),
		boxShadow: props.boxShadow,
		transform: typeof props.rotateDeg === "number" ? `rotate(${props.rotateDeg}deg)` : undefined,
		backdropFilter: props.backdropBlur ? `blur(${withPixelUnits(resolveLength(props.backdropBlur, scale))})` : undefined,
		pointerEvents: props.pointerEvents,
		mixBlendMode: props.mixBlendMode as CSSProperties["mixBlendMode"],
		backgroundImage: props.backgroundImage,
		backgroundSize: props.backgroundSize,
		padding: withPixelUnits(padding),
		paddingTop: withPixelUnits(paddingTop ?? paddingY ?? padding),
		paddingRight: withPixelUnits(paddingRight ?? paddingX ?? padding),
		paddingBottom: withPixelUnits(paddingBottom ?? paddingY ?? padding),
		paddingLeft: withPixelUnits(paddingLeft ?? paddingX ?? padding),
		margin: withPixelUnits(resolveLength(props.margin, scale)),
		marginTop: withPixelUnits(resolveLength(props.marginTop, scale)),
		marginBottom: withPixelUnits(resolveLength(props.marginBottom, scale)),
		marginLeft: withPixelUnits(resolveLength(props.marginLeft, scale)),
		marginRight: withPixelUnits(resolveLength(props.marginRight, scale)),
		alignSelf: props.alignSelf,
		justifySelf: props.justifySelf,
		boxSizing: "border-box",
	};
}

function buildTemplate(value: string | Array<number | string> | undefined, scale: number) {
	if (!value) {
		return undefined;
	}

	if (typeof value === "string") {
		return value;
	}

	return value
		.map((item) => {
			const resolved = resolveLength(item, scale);
			return typeof resolved === "number" ? `${resolved}px` : resolved;
		})
		.join(" ");
}

function renderChildren(children: ReactNode) {
	return children ?? null;
}

function MediaCanvas({ props, children }: BaseComponentProps<TCanvasProps>) {
	const { width, height, tokens } = useMediaRenderContext();

	return (
		<div
			style={{
				position: "relative",
				boxSizing: "border-box",
				width,
				height,
				overflow: props.overflow ?? "hidden",
				background: props.background,
				borderRadius: withPixelUnits(resolveLength(props.borderRadius, tokens.t)),
				fontFamily: props.fontFamily,
				isolation: "isolate",
			}}
		>
			{renderChildren(children)}
		</div>
	);
}

function MediaBox({ props, children }: BaseComponentProps<TBaseLayoutProps>) {
	const { tokens } = useMediaRenderContext();

	return <div style={buildBoxStyle(props, tokens.t)}>{renderChildren(children)}</div>;
}

function MediaStack({ props, children }: BaseComponentProps<TStackProps>) {
	const { tokens } = useMediaRenderContext();

	return (
		<div
			style={{
				...buildBoxStyle(props, tokens.t),
				display: "flex",
				flexDirection: props.direction ?? "column",
				gap: withPixelUnits(resolveLength(props.gap, tokens.t)),
				alignItems: props.alignItems,
				justifyContent: props.justifyContent,
				flexWrap: props.wrap ? "wrap" : undefined,
			}}
		>
			{renderChildren(children)}
		</div>
	);
}

function MediaGrid({ props, children }: BaseComponentProps<TGridProps>) {
	const { tokens } = useMediaRenderContext();

	return (
		<div
			style={{
				...buildBoxStyle(props, tokens.t),
				display: "grid",
				gridTemplateColumns: buildTemplate(props.columns, tokens.t),
				gridTemplateRows: buildTemplate(props.rows, tokens.t),
				gap: withPixelUnits(resolveLength(props.gap, tokens.t)),
				columnGap: withPixelUnits(resolveLength(props.columnGap, tokens.t)),
				rowGap: withPixelUnits(resolveLength(props.rowGap, tokens.t)),
				alignItems: props.alignItems,
				justifyItems: props.justifyItems,
			}}
		>
			{renderChildren(children)}
		</div>
	);
}

function MediaSurface({ props, children }: BaseComponentProps<TSurfaceProps>) {
	const { tokens } = useMediaRenderContext();

	return (
		<div
			style={{
				...buildBoxStyle(props, tokens.t),
				display: "flex",
				flexDirection: props.direction ?? "column",
				gap: withPixelUnits(resolveLength(props.gap, tokens.t)),
				alignItems: props.alignItems,
				justifyContent: props.justifyContent,
			}}
		>
			{renderChildren(children)}
		</div>
	);
}

function MediaText({ props }: BaseComponentProps<TTextProps>) {
	const { tokens } = useMediaRenderContext();
	const resolvedSize = Math.round(props.size * tokens.t);

	return (
		<div
			style={{
				marginTop: withPixelUnits(resolveLength(props.marginTop, tokens.t)),
				maxWidth: withPixelUnits(resolveLength(props.maxWidth, tokens.t)),
				fontSize: resolvedSize,
				fontWeight: resolveWeight(props.weight),
				color: props.color,
				lineHeight: props.lineHeight,
				letterSpacing: props.tracking,
				textShadow: props.shadow,
				textAlign: props.align,
				textTransform: props.uppercase ? "uppercase" : undefined,
				opacity: props.opacity,
				whiteSpace: props.whiteSpace,
			}}
		>
			{props.lines
				? props.lines.map((line, lineIndex) => (
						<div key={`line-${lineIndex}`}>
							{line.map((span, spanIndex) => (
								<span
									key={`span-${lineIndex}-${spanIndex}`}
									style={{
										color: span.color,
										fontWeight: resolveWeight(span.weight),
										textDecoration: span.underlineColor ? "underline" : undefined,
										textDecorationColor: span.underlineColor,
										textUnderlineOffset: span.underlineColor ? "0.12em" : undefined,
										textDecorationThickness:
											span.underlineThickness !== undefined ? `${span.underlineThickness}px` : undefined,
										textDecorationSkipInk: span.skipInkNone ? "none" : undefined,
									}}
								>
									{span.text}
								</span>
							))}
						</div>
					))
				: props.text}
		</div>
	);
}

function MediaBadge({ props }: BaseComponentProps<TBadgeProps>) {
	const { tokens } = useMediaRenderContext();

	return (
		<div
			style={{
				display: "inline-flex",
				alignItems: "center",
				justifyContent: "center",
				alignSelf: "flex-start",
				background: props.background,
				color: props.color,
				fontSize: Math.round(props.fontSize * tokens.t),
				fontWeight: resolveWeight(props.fontWeight),
				borderRadius: withPixelUnits(resolveLength(props.borderRadius, tokens.t)),
				padding: `${resolveLength(props.paddingY ?? 8, tokens.t)}px ${resolveLength(props.paddingX ?? 14, tokens.t)}px`,
				border: props.border,
				boxShadow: props.boxShadow,
				letterSpacing: props.tracking,
				boxSizing: "border-box",
				whiteSpace: "nowrap",
			}}
		>
			{props.label}
		</div>
	);
}

function MediaMetricCard({ props }: BaseComponentProps<TMetricCardProps>) {
	const { tokens } = useMediaRenderContext();
	const align = props.align ?? "left";

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				justifyContent: "space-between",
				background: props.background,
				border: props.border,
				boxShadow: props.boxShadow,
				borderRadius: withPixelUnits(resolveLength(props.borderRadius ?? 18, tokens.t)),
				padding: `${resolveLength(props.paddingY ?? 16, tokens.t)}px ${resolveLength(props.paddingX ?? 18, tokens.t)}px`,
				boxSizing: "border-box",
				height: "100%",
				textAlign: align,
			}}
		>
			<div
				style={{
					fontSize: Math.round((props.labelSize ?? 9) * tokens.t),
					fontWeight: 800,
					textTransform: props.labelUppercase === false ? undefined : "uppercase",
					letterSpacing: "0.08em",
					color: props.labelColor ?? "#64748B",
					marginBottom: Math.round(8 * tokens.t),
				}}
			>
				{props.label}
			</div>
			<div
				style={{
					fontSize: Math.round((props.valueSize ?? 24) * tokens.t),
					fontWeight: 800,
					lineHeight: 1.1,
					letterSpacing: "-0.02em",
					color: props.valueColor ?? "#0F172A",
				}}
			>
				{props.value}
			</div>
		</div>
	);
}

function MediaDistributionListCard({ props }: BaseComponentProps<TDistributionListCardProps>) {
	const { tokens } = useMediaRenderContext();

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				height: "100%",
				background: props.background,
				border: props.border,
				boxShadow: props.boxShadow,
				borderRadius: withPixelUnits(resolveLength(props.borderRadius ?? 18, tokens.t)),
				padding: `${resolveLength(props.paddingY ?? 18, tokens.t)}px ${resolveLength(props.paddingX ?? 20, tokens.t)}px`,
				boxSizing: "border-box",
			}}
		>
			<div
				style={{
					fontSize: Math.round(11 * tokens.t),
					fontWeight: 800,
					letterSpacing: "0.08em",
					textTransform: "uppercase",
					color: "#E2E8F0",
					marginBottom: Math.round(16 * tokens.t),
				}}
			>
				{props.title}
			</div>
			<div style={{ display: "flex", flexDirection: "column", gap: Math.round(12 * tokens.t), flex: 1 }}>
				{props.items.map((item) => (
					<div
						key={item.label}
						style={{
							display: "grid",
							gridTemplateColumns: `${Math.round(128 * tokens.t)}px minmax(0,1fr) auto`,
							gap: Math.round(10 * tokens.t),
							alignItems: "center",
						}}
					>
						<div
							style={{
								fontSize: Math.round(12 * tokens.t),
								fontWeight: 700,
								color: "#F8FAFC",
								lineHeight: 1.3,
							}}
						>
							{item.label} ({item.count})
						</div>
						<div
							style={{
								position: "relative",
								height: Math.round(16 * tokens.t),
								borderRadius: Math.round(999 * tokens.t),
								background: "rgba(255,255,255,0.12)",
								overflow: "hidden",
							}}
						>
							<div
								style={{
									position: "absolute",
									inset: 0,
									width: `${item.percentage}%`,
									background: item.color,
									borderRadius: Math.round(999 * tokens.t),
									boxShadow: `0 0 ${Math.round(20 * tokens.t)}px ${item.color}55`,
								}}
							/>
						</div>
						<div
							style={{
								fontSize: Math.round(12 * tokens.t),
								fontWeight: 700,
								color: "#F8FAFC",
								whiteSpace: "nowrap",
							}}
						>
							{item.revenue}
						</div>
					</div>
				))}
			</div>
			{props.tagline ? (
				<div
					style={{
						marginTop: Math.round(16 * tokens.t),
						paddingTop: Math.round(14 * tokens.t),
						borderTop: "1px solid rgba(255,255,255,0.12)",
						fontSize: Math.round(12 * tokens.t),
						fontWeight: 600,
						lineHeight: 1.45,
						color: "rgba(248,250,252,0.78)",
					}}
				>
					{props.tagline}
				</div>
			) : null}
		</div>
	);
}

function MediaInsightPanel({ props }: BaseComponentProps<TInsightPanelProps>) {
	const { tokens } = useMediaRenderContext();

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				height: "100%",
				background: props.background,
				border: props.border,
				boxShadow: props.boxShadow,
				borderRadius: withPixelUnits(resolveLength(props.borderRadius ?? 18, tokens.t)),
				padding: `${resolveLength(props.paddingY ?? 16, tokens.t)}px ${resolveLength(props.paddingX ?? 18, tokens.t)}px`,
				boxSizing: "border-box",
			}}
		>
			<div
				style={{
					fontSize: Math.round(10 * tokens.t),
					fontWeight: 800,
					textTransform: "uppercase",
					letterSpacing: "0.08em",
					color: "#CBD5E1",
					marginBottom: Math.round(12 * tokens.t),
				}}
			>
				{props.title}
			</div>
			<div style={{ display: "flex", flexDirection: "column", gap: Math.round(9 * tokens.t), flex: 1 }}>
				{props.items.map((item) => (
					<div
						key={item.label}
						style={{
							display: "grid",
							gridTemplateColumns: "minmax(0,1fr) auto",
							gap: Math.round(8 * tokens.t),
							alignItems: "baseline",
						}}
					>
						<div
							style={{
								fontSize: Math.round(12 * tokens.t),
								fontWeight: 600,
								lineHeight: 1.35,
								color: "rgba(248,250,252,0.78)",
							}}
						>
							{item.label}
						</div>
						<div
							style={{
								fontSize: Math.round(16 * tokens.t),
								fontWeight: 800,
								lineHeight: 1.1,
								letterSpacing: "-0.02em",
								color: item.positive === false ? "#FCA5A5" : "#F8FAFC",
								whiteSpace: "nowrap",
							}}
						>
							{item.value}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

function MediaLogo({ props }: BaseComponentProps<TLogoProps>) {
	const { tokens } = useMediaRenderContext();
	const asset = logoAssets[props.asset];

	return (
		<img
			src={asset.src}
			alt={props.alt}
			style={{
				height: Math.round(props.height * tokens.t),
				width: "auto",
				maxWidth: withPixelUnits(resolveLength(props.maxWidth, tokens.t)),
				objectFit: "contain",
				objectPosition: props.objectPosition ?? "left center",
				display: "block",
			}}
			crossOrigin="anonymous"
		/>
	);
}

export const { registry: mediaRegistry } = defineRegistry(mediaCatalog, {
	components: {
		MediaCanvas,
		MediaBox,
		MediaStack,
		MediaGrid,
		MediaSurface,
		MediaText,
		MediaBadge,
		MediaMetricCard,
		MediaDistributionListCard,
		MediaInsightPanel,
		MediaLogo,
	},
	actions: {},
});
