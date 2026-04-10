import LogoWhite from "@/utils/svgs/logos/RECOMPRA - COMPLETE - HORIZONTAL - COLORFUL.svg";
import { cn } from "@/lib/utils";
import type { NoticiaBoaLayoutTokens } from "../scale";

type NoticiaBoaFooterProps = {
	tokens: NoticiaBoaLayoutTokens;
	padX: number;
	logoHeightPx: number;
	footerBottomPx: number;
	className?: string;
};

export function NoticiaBoaFooter({ tokens, padX, logoHeightPx, footerBottomPx, className }: NoticiaBoaFooterProps) {
	const { t } = tokens;

	return (
		<div
			data-design-role="noticia-boa-footer"
			className={cn(className)}
			style={{
				position: "absolute",
				bottom: footerBottomPx,
				left: padX,
				right: padX,
				zIndex: 10,
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				gap: Math.round(16 * t),
				paddingTop: Math.round(14 * t),
				borderTop: "1px solid rgba(255,255,255,0.12)",
			}}
		>
			<img
				src={LogoWhite.src}
				alt="RecompraCRM"
				style={{
					height: logoHeightPx,
					width: "auto",
					maxWidth: "25%",
					objectFit: "contain",
					objectPosition: "left center",
					display: "block",
				}}
				crossOrigin="anonymous"
			/>
			<div style={{ display: "flex", alignItems: "center", gap: Math.round(12 * t), flexShrink: 0 }}>
				<span style={{ fontSize: Math.round(16 * t), fontWeight: 500, color: "rgba(248,250,252,0.55)" }}>Conheça e</span>
				<div
					style={{
						background: "linear-gradient(180deg, #FFCD2E 0%, #FFB800 100%)",
						color: "#0A0F18",
						fontWeight: 800,
						fontSize: Math.round(16 * t),
						padding: `${Math.round(10 * t)}px ${Math.round(24 * t)}px`,
						borderRadius: Math.round(10 * t),
						letterSpacing: "-0.02em",
						whiteSpace: "nowrap",
						boxShadow: "0 10px 28px rgba(255,184,0,0.3), inset 0 1px 0 rgba(255,255,255,0.45)",
					}}
				>
					Comece grátis
				</div>
			</div>
		</div>
	);
}
