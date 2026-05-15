"use client";

import { type VariantProps, cva } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const chipVariants = cva("inline-flex w-fit shrink-0 items-center border border-transparent whitespace-nowrap", {
	variants: {
		variant: {
			default: "bg-primary text-primary-foreground",
			secondary: "bg-secondary text-secondary-foreground",
			outline: "border-border bg-transparent text-foreground shadow-none",
			muted: "bg-muted text-muted-foreground",
			ghost: "border-transparent bg-transparent text-primary",
			brand: "bg-brand text-brand-foreground",
			destructive: "bg-destructive/12 text-destructive dark:bg-destructive/20 dark:text-destructive",
			success: "bg-green-200 text-green-600 dark:bg-green-200/25 dark:text-green-600",
			positiveSolid: "bg-chart-2 text-primary-foreground dark:bg-chart-2",
			neutralSolid: "bg-muted-foreground/85 text-background dark:bg-muted-foreground/75",
			neutralOnDark: "bg-foreground text-background",
		},
		size: {
			xs: "gap-1 px-2 py-0.5 text-[11px] leading-none",
			sm: "gap-1.5 px-2.5 py-0.5 text-xs leading-none",
			md: "gap-1.5 px-3 py-1.5 text-xs leading-tight",
		},
		shape: {
			md: "rounded-md",
			lg: "rounded-lg",
			xl: "rounded-xl",
			pill: "rounded-full",
		},
	},
	defaultVariants: {
		variant: "secondary",
		size: "sm",
		shape: "md",
	},
});

export type ChipSize = NonNullable<VariantProps<typeof chipVariants>["size"]>;

type ChipContextValue = {
	size: ChipSize;
};

const ChipContext = React.createContext<ChipContextValue | null>(null);

function useChipContext() {
	const ctx = React.useContext(ChipContext);
	return ctx ?? { size: "sm" satisfies ChipSize };
}

const chipIconVariants = cva("inline-flex shrink-0 items-center justify-center [&_svg]:pointer-events-none", {
	variants: {
		size: {
			xs: "[&_svg]:size-3 [&_svg]:min-h-3 [&_svg]:min-w-3",
			sm: "[&_svg]:size-3.5 [&_svg]:min-h-3.5 [&_svg]:min-w-3.5",
			md: "[&_svg]:size-4 [&_svg]:min-h-4 [&_svg]:min-w-4",
		},
	},
	defaultVariants: { size: "sm" },
});

const chipLabelVariants = cva("-mb-px min-w-0 max-w-[min(100%,40rem)] truncate tracking-tight select-none [&_+.chip-label]:-ml-px", {
	variants: {
		size: {
			xs: "text-[inherit]",
			sm: "text-[inherit]",
			md: "text-[inherit]",
		},
		weight: {
			medium: "font-medium",
			semibold: "font-semibold",
			bold: "font-bold",
		},
		caps: {
			true: "uppercase tracking-tight",
			false: "normal-case",
		},
	},
	defaultVariants: { weight: "medium", caps: false },
});

type ChipRootProps = React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof chipVariants>;

const ChipRoot = React.forwardRef<HTMLSpanElement, ChipRootProps>(({ children, variant, size, shape, className, ...props }, ref) => {
	const resolvedSize = (size ?? "sm") satisfies ChipSize;
	return (
		<ChipContext.Provider value={{ size: resolvedSize }}>
			<span ref={ref} data-slot="chip" className={cn(chipVariants({ variant, size, shape }), className)} {...props}>
				{children}
			</span>
		</ChipContext.Provider>
	);
});
ChipRoot.displayName = "Chip.Root";

const ChipIcon = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(({ children, className, ...props }, ref) => {
	const { size } = useChipContext();
	return (
		<span ref={ref} data-slot="chip-icon" className={cn(chipIconVariants({ size }), className)} {...props}>
			{children}
		</span>
	);
});
ChipIcon.displayName = "Chip.Icon";

type ChipLabelProps = Omit<React.HTMLAttributes<HTMLSpanElement>, "className"> & {
	className?: string;
	caps?: boolean;
	weight?: "medium" | "semibold" | "bold";
};

const ChipLabel = React.forwardRef<HTMLSpanElement, ChipLabelProps>(({ className, caps = false, weight = "medium", ...props }, ref) => {
	const { size } = useChipContext();
	return <span ref={ref} data-slot="chip-label" className={cn("chip-label", chipLabelVariants({ size, weight, caps }), className)} {...props} />;
});
ChipLabel.displayName = "Chip.Label";

/** Composable chip (leading icon + label) with unified padding and scale; aligns with DESIGN.md § Chips / Badges when using default shape/size. */
export const Chip = {
	Root: ChipRoot,
	Icon: ChipIcon,
	Label: ChipLabel,
};

export { chipVariants, chipIconVariants, chipLabelVariants, ChipRoot, ChipIcon, ChipLabel };
