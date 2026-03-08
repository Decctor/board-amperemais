"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

type ThemeToggleProps = {
	className?: string;
};
export const ThemeToggle = ({ className }: ThemeToggleProps) => {
	const { theme, setTheme } = useTheme();

	return (
		<div className={cn("w-full flex items-center justify-center", className)}>
			<Button variant="ghost" size="icon" onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
				{theme === "light" ? <SunIcon className="w-4 h-4" /> : <MoonIcon className="w-4 h-4" />}
			</Button>
		</div>
	);
};
