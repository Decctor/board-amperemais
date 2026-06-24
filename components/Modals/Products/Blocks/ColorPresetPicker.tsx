"use client";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { COLOR_PRESETS, type TColorPreset } from "@/lib/products/color-presets";
import { cn } from "@/lib/utils";
import { Palette } from "lucide-react";
import { useState } from "react";

type ColorPresetPickerProps = {
	onSelect: (preset: TColorPreset) => void;
	disabled?: boolean;
};

export default function ColorPresetPicker({ onSelect, disabled = false }: ColorPresetPickerProps) {
	const [open, setOpen] = useState(false);

	function handleSelect(preset: TColorPreset) {
		onSelect(preset);
	}

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					disabled={disabled}
					className="h-7 shrink-0 gap-1 px-2 text-xs"
					title="Presets de cor"
				>
					<Palette className="h-3.5 w-3.5" />
					<span className="hidden sm:inline">PRESETS</span>
				</Button>
			</PopoverTrigger>
			<PopoverContent align="start" className="w-56 gap-0 p-2">
				<p className="mb-2 px-1 text-[0.65rem] font-bold uppercase tracking-wide text-muted-foreground">Cores comuns</p>
				<div className="grid grid-cols-2 gap-1">
					{COLOR_PRESETS.map((preset) => (
						<button
							key={preset.nome}
							type="button"
							aria-label={`Adicionar cor ${preset.nome}`}
							onClick={() => handleSelect(preset)}
							className={cn(
								"flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors",
								"hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20",
							)}
						>
							<span
								className="h-4 w-4 shrink-0 rounded-full border border-border"
								style={{ backgroundColor: preset.hex }}
							/>
							<span className="truncate text-xs font-medium text-foreground">{preset.nome}</span>
						</button>
					))}
				</div>
			</PopoverContent>
		</Popover>
	);
}
