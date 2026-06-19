import { cn } from "@/lib/utils";

type PiorDiaAtmosphereProps = {
	className?: string;
};

export function PiorDiaAtmosphere({ className }: PiorDiaAtmosphereProps) {
	return (
		<div
			data-design-role="pior-dia-atmosphere"
			className={cn(className)}
			style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}
		>
			{/* Red glow top-left (worst day danger) + green glow bottom-right (resolution) */}
			<div
				style={{
					position: "absolute",
					inset: 0,
					background: `
						radial-gradient(ellipse 70% 45% at 0% 0%, rgba(239,68,68,0.12) 0%, transparent 55%),
						radial-gradient(ellipse 55% 40% at 100% 100%, rgba(16,185,129,0.08) 0%, transparent 50%)
					`,
				}}
			/>
			{/* Film grain texture */}
			<div
				style={{
					position: "absolute",
					inset: 0,
					opacity: 0.4,
					backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
					backgroundSize: "180px 180px",
					mixBlendMode: "overlay",
				}}
			/>
			{/* Diagonal line pattern */}
			<div
				style={{
					position: "absolute",
					inset: 0,
					background:
						"repeating-linear-gradient(-28deg, transparent, transparent 56px, rgba(255,255,255,0.014) 56px, rgba(255,255,255,0.014) 57px)",
				}}
			/>
			{/* Bottom vignette */}
			<div
				style={{
					position: "absolute",
					inset: 0,
					background: "radial-gradient(ellipse at 50% 100%, rgba(0,0,0,0.25) 0%, transparent 55%)",
				}}
			/>
		</div>
	);
}
