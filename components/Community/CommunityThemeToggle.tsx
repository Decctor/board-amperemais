"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

type CommunityThemeToggleProps = {
	variant?: "dock" | "header";
	className?: string;
};

export function CommunityThemeToggle({ variant = "header", className }: CommunityThemeToggleProps) {
	const { theme, setTheme } = useTheme();
	const [mounted, setMounted] = useState(false);

	useEffect(() => setMounted(true), []);

	const isDark = theme === "dark";
	const label = isDark ? "Ativar modo claro" : "Ativar modo escuro";

	const buttonClass =
		variant === "dock"
			? "flex size-7 items-center justify-center rounded-full text-white/70 outline-none transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/30 md:size-9"
			: "flex size-9 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/20";

	if (!mounted) {
		return <div className={cn(buttonClass, "opacity-0", className)} aria-hidden />;
	}

	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<button type="button" className={cn(buttonClass, className)} onClick={() => setTheme(isDark ? "light" : "dark")} aria-label={label}>
						{isDark ? <Sun className="size-[18px]" strokeWidth={1.75} /> : <Moon className="size-[18px]" strokeWidth={1.75} />}
					</button>
				}
			/>
			<TooltipContent side="top" className="text-xs">
				{label}
			</TooltipContent>
		</Tooltip>
	);
}
