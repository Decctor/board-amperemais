// Primitivos compartilhados entre as propostas comerciais personalizadas.
// A marca é sempre RecompraCRM — a proposta é nossa; o que muda é o cliente.

import LogoHorizontalRecompraCRM from "@/utils/svgs/logos/RECOMPRA - COMPLETE - HORIZONTAL - COLORFUL ICON-BADGE TEXT-BLACK.svg";
import Image from "next/image";
import type { ReactNode } from "react";

/* -------------------------------------------------------------------------- */
/*  Marca RecompraCRM (fixa)                                                    */
/* -------------------------------------------------------------------------- */

export const BRAND = {
	blue: "#24549C",
	blueDeep: "#1A3D7A",
	gold: "#FFB900",
	goldDark: "#E6A700",
	// Bronze escuro (token chart-gold-4) — dourado legível sobre fundos claros (~4.7:1)
	goldText: "#8A5E14",
	ink: "#171717",
	muted: "#737373",
	border: "#E5E5E5",
	surface: "#F5F5F5",
} as const;

export const heroGradient = {
	backgroundImage: `linear-gradient(135deg, ${BRAND.blue} 0%, ${BRAND.blueDeep} 100%)`,
};

/* -------------------------------------------------------------------------- */
/*  Folha base (A4)                                                            */
/* -------------------------------------------------------------------------- */

export function Sheet({ children, className = "" }: { children: ReactNode; className?: string }) {
	return (
		<section
			className={`sheet relative flex flex-col overflow-hidden bg-white text-neutral-900 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.35)] print:shadow-none ${className}`}
		>
			{children}
		</section>
	);
}

export function SheetFooter({ index, label }: { index: string; label: string }) {
	return (
		<div className="mt-auto flex items-center justify-between border-t border-neutral-200 px-14 py-3.5">
			<span className="text-[0.6rem] font-bold uppercase tracking-[0.25em] text-neutral-500">{label}</span>
			<div className="flex items-center gap-3">
				<div className="flex items-center gap-1.5">
					<span className="text-[0.6rem] font-medium text-neutral-400">Powered by</span>
					<div className="relative h-6 w-24">
						<Image src={LogoHorizontalRecompraCRM} alt="RecompraCRM" fill className="object-contain object-left" />
					</div>
				</div>
				<span className="text-[0.6rem] font-bold tabular-nums text-neutral-300">· {index}</span>
			</div>
		</div>
	);
}

/* Rótulo eyebrow reutilizável (usado com moderação — não em toda seção) */
export function Kicker({ children, tone = "blue" }: { children: ReactNode; tone?: "blue" | "gold" | "white" }) {
	const color = tone === "gold" ? BRAND.goldText : tone === "white" ? "rgba(255,255,255,0.75)" : BRAND.blue;
	return (
		<span className="text-[0.68rem] font-extrabold uppercase tracking-[0.28em]" style={{ color }}>
			{children}
		</span>
	);
}
