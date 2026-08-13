"use client";

import { useOrgColors } from "@/components/Providers/OrgColorsProvider";
import { MapPin, UtensilsCrossed } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";

/**
 * Casca visual compartilhada das paginas publicas de QR (ponto e tab), no mesmo
 * padrao do cabecalho da loja: capa em degrade com as cores da organizacao e
 * cartao sobreposto com o logo. Fora de um OrgColorsProvider (ex.: QR invalido)
 * cai nas cores padrao da plataforma.
 */
export function PublicShell({
	title,
	subtitle,
	logoUrl,
	children,
}: {
	title: string;
	subtitle?: string;
	logoUrl?: string | null;
	children: ReactNode;
}) {
	const { colors, getPrimaryGradientStyle } = useOrgColors();

	return (
		<main className="min-h-screen w-full bg-background pb-10">
			<div className="relative h-32 w-full overflow-hidden sm:h-40" style={getPrimaryGradientStyle()}>
				<div
					className="absolute inset-0 opacity-[0.12]"
					style={{
						backgroundImage: `radial-gradient(circle, ${colors.primaryForeground} 1px, transparent 1px)`,
						backgroundSize: "18px 18px",
					}}
				/>
				<div className="absolute inset-0 bg-linear-to-b from-transparent to-black/30" />
			</div>

			<div className="relative z-10 -mt-12 px-4">
				<header className="relative mx-auto w-full max-w-xl rounded-t-[1.75rem] rounded-b-2xl border border-border/60 bg-card px-4 pt-12 pb-4 text-card-foreground shadow-lg">
					<div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
						{logoUrl ? (
							<div className="relative size-18 overflow-hidden rounded-full border-[3px] border-background bg-background shadow-lg ring-1 ring-black/5 dark:ring-white/10">
								<Image src={logoUrl} alt={title} fill className="object-cover" sizes="72px" />
							</div>
						) : (
							<div className="flex size-18 items-center justify-center rounded-full border-[3px] border-background bg-brand text-brand-foreground shadow-lg ring-1 ring-black/5 dark:ring-white/10">
								<UtensilsCrossed className="size-7" />
							</div>
						)}
					</div>

					<h1 className="truncate pt-1 text-center text-lg leading-tight font-black sm:text-xl">{title}</h1>
					{subtitle ? (
						<div className="mt-2 flex justify-center">
							<span className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-wide text-secondary-foreground">
								<MapPin className="size-3.5" />
								{subtitle}
							</span>
						</div>
					) : null}
				</header>
			</div>

			<div className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 pt-4">{children}</div>
		</main>
	);
}
