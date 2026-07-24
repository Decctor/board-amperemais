import { MapPin, UtensilsCrossed } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Casca visual compartilhada das paginas publicas de QR (ponto e tab).
 */
export function PublicShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
	return (
		<main className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-4 px-4 py-6">
			<header className="flex flex-col items-center gap-1 text-center">
				<UtensilsCrossed className="h-6 w-6" />
				<h1 className="text-lg font-bold tracking-tight">{title}</h1>
				{subtitle ? (
					<p className="flex items-center gap-1 text-xs font-medium uppercase text-muted-foreground">
						<MapPin className="h-3 w-3" />
						{subtitle}
					</p>
				) : null}
			</header>
			{children}
		</main>
	);
}
