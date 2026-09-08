import { cn } from "@/lib/utils";
import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";

type LandingArtProps = {
	/** Caminho público do PNG com alpha (ex.: "/images/landing/poi-tablet.png"). */
	src: string;
	/** Vazio por padrão: as ilustrações são decorativas e o texto ao lado carrega o significado. */
	alt?: string;
	aspect?: "square" | "wide";
	sizes: string;
	priority?: boolean;
	/** Flutuação sutil (desligada com prefers-reduced-motion via CSS). */
	float?: boolean;
	/** Sombra difusa de apoio abaixo do objeto. */
	glow?: boolean;
	className?: string;
	/** Chips e rótulos HTML posicionados por cima da ilustração. */
	children?: ReactNode;
};

export function LandingArt({ src, alt = "", aspect = "square", sizes, priority = false, float = true, glow = true, className, children }: LandingArtProps) {
	return (
		<div className={cn("relative", aspect === "wide" ? "aspect-[3/2]" : "aspect-square", className)}>
			{glow ? <div className="pointer-events-none absolute inset-x-[16%] bottom-[7%] h-[10%] rounded-[100%] bg-[#24549c]/12 blur-2xl" aria-hidden /> : null}
			<div className={cn("absolute inset-0", float && "ledger-float")}>
				<Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-contain" />
			</div>
			{children}
		</div>
	);
}

type ArtChipProps = {
	children: ReactNode;
	icon?: ReactNode;
	tone?: "white" | "blue" | "amber" | "green";
	className?: string;
	/** Defasagem da flutuação, para chips não subirem e descerem juntos. */
	delayMs?: number;
};

const chipTones: Record<NonNullable<ArtChipProps["tone"]>, string> = {
	white: "bg-white text-[#171717] border-[#e5e5e5]",
	blue: "bg-[#24549c] text-white border-[#24549c]",
	amber: "bg-[#ffb900] text-[#171717] border-[#ffb900]",
	green: "bg-[#dcf8c6] text-[#143d1f] border-[#bde9a6]",
};

const chipIconTones: Record<NonNullable<ArtChipProps["tone"]>, string> = {
	white: "bg-[#24549c]/8 text-[#24549c]",
	blue: "bg-white/15 text-white",
	amber: "bg-[#171717]/8 text-[#171717]",
	green: "bg-[#25d366]/15 text-[#1faa52]",
};

/** Rótulo de exemplo sobreposto à ilustração. Texto sempre em HTML, nunca dentro do raster. */
export function ArtChip({ children, icon, tone = "white", className, delayMs = 0 }: ArtChipProps) {
	return (
		<div
			className={cn(
				"ledger-float absolute z-10 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-extrabold tracking-[0.02em] shadow-[0_12px_28px_-12px_rgba(36,84,156,0.4),0_2px_6px_rgba(0,0,0,0.06)] sm:text-[12px]",
				chipTones[tone],
				className,
			)}
			style={{ animationDelay: `${delayMs}ms` } as CSSProperties}
		>
			{icon ? <span className={cn("inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full [&>svg]:h-3 [&>svg]:w-3", chipIconTones[tone])}>{icon}</span> : null}
			<span className="whitespace-nowrap">{children}</span>
		</div>
	);
}
