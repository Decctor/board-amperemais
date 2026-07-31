"use client";

import type { TAuthUserSession } from "@/lib/authentication/types";
import { cn } from "@/lib/utils";
import { ChevronDown, Lock } from "lucide-react";
import { useState } from "react";
import { SETTINGS_GROUPS, type TSettingsView, getSettingsLocation, isSettingsSectionAccessible } from "./settings-navigation";

type SettingsNavRailProps = {
	activeView: TSettingsView;
	membership: NonNullable<TAuthUserSession["membership"]>;
	onSelect: (view: TSettingsView) => void;
};

export default function SettingsNavRail({ activeView, membership, onSelect }: SettingsNavRailProps) {
	const [isMobileListOpen, setIsMobileListOpen] = useState(false);
	const { section: activeSection } = getSettingsLocation(activeView);
	const ActiveIcon = activeSection.icon;

	function handleSelect(view: TSettingsView) {
		onSelect(view);
		setIsMobileListOpen(false);
	}

	return (
		<nav
			aria-label="Seções de configuração"
			className="border-border bg-muted/40 flex w-full shrink-0 flex-col gap-1 rounded-xl border p-2 lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)] lg:w-72 lg:self-start lg:overflow-y-auto"
		>
			{/* No tablet, a lista inteira aberta empurraria o conteúdo da seção para fora da tela. */}
			<button
				type="button"
				onClick={() => setIsMobileListOpen((current) => !current)}
				aria-expanded={isMobileListOpen}
				className="hover:bg-secondary/60 focus-visible:ring-ring/50 flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-bold transition-colors duration-150 focus-visible:ring-[3px] focus-visible:outline-none lg:hidden"
			>
				<span className="flex min-w-0 items-center gap-2.5">
					<ActiveIcon className="text-primary h-4 w-4 shrink-0" />
					<span className="truncate">{activeSection.label}</span>
				</span>
				<ChevronDown className={cn("text-muted-foreground h-4 w-4 shrink-0 transition-transform duration-150", isMobileListOpen && "rotate-180")} />
			</button>

			<div className={cn("flex-col gap-1 lg:flex", isMobileListOpen ? "flex" : "hidden")}>
				{SETTINGS_GROUPS.map((group) => (
					<div key={group.label} className="flex flex-col gap-0.5 pb-2 last:pb-0">
						<p className="text-muted-foreground/70 px-2.5 pt-2 pb-1 text-[11px] font-extrabold tracking-[0.08em] uppercase">{group.label}</p>
						{group.sections.map((section) => {
							const Icon = section.icon;
							const isActive = section.view === activeView;
							const isAccessible = isSettingsSectionAccessible(section, membership);
							return (
								<button
									key={section.view}
									type="button"
									// aria-disabled em vez de disabled: o item precisa continuar focável e com tooltip
									// para ensinar o que existe e a quem pedir acesso.
									aria-disabled={!isAccessible}
									aria-current={isActive ? "page" : undefined}
									title={isAccessible ? undefined : section.restrictedReason}
									onClick={isAccessible ? () => handleSelect(section.view) : undefined}
									className={cn(
										"focus-visible:ring-ring/50 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors duration-150 focus-visible:ring-[3px] focus-visible:outline-none",
										isActive ? "bg-secondary text-foreground font-bold" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground font-medium",
										!isAccessible && "hover:text-muted-foreground cursor-not-allowed opacity-50 hover:bg-transparent",
									)}
								>
									<Icon className={cn("h-4 w-4 shrink-0", isActive && "text-primary")} />
									<span className="min-w-0 grow truncate">{section.label}</span>
									{isAccessible ? null : (
										<>
											<Lock aria-hidden className="h-3 w-3 shrink-0" />
											<span className="sr-only">Bloqueado. {section.restrictedReason}</span>
										</>
									)}
								</button>
							);
						})}
					</div>
				))}
			</div>
		</nav>
	);
}
