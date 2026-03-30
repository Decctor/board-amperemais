"use client";

import { Calendar } from "@/components/ui/calendar";
import { Check, X } from "lucide-react";
import * as React from "react";
import type { Locale } from "date-fns";
import { ptBR } from "date-fns/locale";

import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { cn } from "@/lib/utils";

import { Button } from "./button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "./command";
import { Drawer, DrawerContent, DrawerTrigger } from "./drawer";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

type InteractiveFilterMode = "auto" | "popover" | "drawer";

type InteractiveFilterContextValue = {
	mode: Exclude<InteractiveFilterMode, "auto">;
	open: boolean;
	setOpen: (open: boolean) => void;
	disabled: boolean;
};

const InteractiveFilterContext = React.createContext<InteractiveFilterContextValue | null>(null);

function useInteractiveFilterContext() {
	const context = React.useContext(InteractiveFilterContext);
	if (!context) {
		throw new Error("InteractiveFilter components must be used inside InteractiveFilter.Root");
	}
	return context;
}

type InteractiveFilterRootProps = {
	children: React.ReactNode;
	className?: string;
	mode?: InteractiveFilterMode;
	open?: boolean;
	defaultOpen?: boolean;
	onOpenChange?: (open: boolean) => void;
	disabled?: boolean;
};

function InteractiveFilterRoot({
	children,
	className,
	mode = "auto",
	open,
	defaultOpen = false,
	onOpenChange,
	disabled = false,
}: InteractiveFilterRootProps) {
	const isDesktop = useMediaQuery("(min-width: 768px)");
	const resolvedMode: Exclude<InteractiveFilterMode, "auto"> = mode === "auto" ? (isDesktop ? "popover" : "drawer") : mode;
	const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
	const isControlled = open !== undefined;
	const currentOpen = isControlled ? open : internalOpen;

	function handleOpenChange(nextOpen: boolean) {
		if (disabled && nextOpen) return;
		if (!isControlled) setInternalOpen(nextOpen);
		onOpenChange?.(nextOpen);
	}

	const contextValue: InteractiveFilterContextValue = {
		mode: resolvedMode,
		open: currentOpen,
		setOpen: handleOpenChange,
		disabled,
	};

	const Wrapper = resolvedMode === "popover" ? Popover : Drawer;

	return (
		<InteractiveFilterContext.Provider value={contextValue}>
			<Wrapper open={currentOpen} onOpenChange={handleOpenChange}>
				<div className={cn("flex w-fit items-center", className)}>{children}</div>
			</Wrapper>
		</InteractiveFilterContext.Provider>
	);
}

type InteractiveFilterTriggerProps = {
	children: React.ReactNode;
	className?: string;
};

function InteractiveFilterTrigger({ children, className }: InteractiveFilterTriggerProps) {
	const { mode, disabled, open } = useInteractiveFilterContext();
	const TriggerPrimitive = mode === "popover" ? PopoverTrigger : DrawerTrigger;

	return (
		<TriggerPrimitive asChild>
			<Button
				type="button"
				variant="ghost"
				disabled={disabled}
				aria-haspopup="dialog"
				aria-expanded={open}
				className={cn("h-auto w-fit items-center gap-3 px-3 py-2", className)}
			>
				{children}
			</Button>
		</TriggerPrimitive>
	);
}

type InteractiveFilterIconProps = {
	children: React.ReactNode;
	className?: string;
};

function InteractiveFilterIcon({ children, className }: InteractiveFilterIconProps) {
	return <span className={cn("flex items-center gap-1.5", className)}>{children}</span>;
}

type InteractiveFilterLabelProps = {
	children: React.ReactNode;
	className?: string;
};

function InteractiveFilterLabel({ children, className }: InteractiveFilterLabelProps) {
	return <span className={cn("text-xs font-medium tracking-tight", className)}>{children}</span>;
}

type InteractiveFilterValueProps = {
	children: React.ReactNode;
	className?: string;
};

function InteractiveFilterValue({ children, className }: InteractiveFilterValueProps) {
	return <span className={cn("flex items-center gap-1.5 text-xs text-muted-foreground", className)}>{children}</span>;
}

type InteractiveFilterClearProps = {
	onClear: () => void;
	className?: string;
	label?: string;
};

function InteractiveFilterClear({ onClear, className, label = "Limpar filtro" }: InteractiveFilterClearProps) {
	const { disabled } = useInteractiveFilterContext();

	function handleClick(event: React.MouseEvent<HTMLSpanElement>) {
		event.preventDefault();
		event.stopPropagation();
		if (disabled) return;
		onClear();
	}

	function handleKeyDown(event: React.KeyboardEvent<HTMLSpanElement>) {
		if (event.key !== "Enter" && event.key !== " ") return;
		event.preventDefault();
		event.stopPropagation();
		if (disabled) return;
		onClear();
	}

	return (
		<span
			role="button"
			tabIndex={disabled ? -1 : 0}
			aria-label={label}
			className={cn(
				"inline-flex h-5 w-5 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary",
				disabled && "pointer-events-none opacity-40",
				className,
			)}
			onClick={handleClick}
			onKeyDown={handleKeyDown}
		>
			<X className="h-3.5 w-3.5" />
		</span>
	);
}

type InteractiveFilterContentProps = {
	children: React.ReactNode;
	className?: string;
	drawerClassName?: string;
	align?: "start" | "center" | "end";
};

function InteractiveFilterContent({ children, className, drawerClassName, align = "start" }: InteractiveFilterContentProps) {
	const { mode } = useInteractiveFilterContext();

	if (mode === "popover") {
		return (
			<PopoverContent align={align} className={cn("w-72 p-0", className)}>
				{children}
			</PopoverContent>
		);
	}

	return (
		<DrawerContent className={cn("max-h-[80vh] w-full max-w-none p-0", drawerClassName)}>
			<div className="mt-4 w-full border-t">{children}</div>
		</DrawerContent>
	);
}

export type InteractiveFilterOption<T extends string | number = string> = {
	id: string | number;
	value: T;
	label: string;
	startContent?: React.ReactNode;
	keywords?: string[];
};

type InteractiveFilterMultiContentProps<T extends string | number = string> = {
	options: InteractiveFilterOption<T>[];
	value: T[];
	onChange: (nextValue: T[]) => void;
	onClear?: () => void;
	isCleared?: boolean;
	searchPlaceholder?: string;
	emptyLabel?: string;
	clearLabel?: string;
};

function InteractiveFilterMultiContent<T extends string | number = string>({
	options,
	value,
	onChange,
	onClear,
	isCleared = false,
	searchPlaceholder = "Buscar...",
	emptyLabel = "Nenhuma opção encontrada.",
	clearLabel,
}: InteractiveFilterMultiContentProps<T>) {
	const { setOpen } = useInteractiveFilterContext();
	const normalizedSelectedValues = React.useMemo(() => value.map((item) => String(item)), [value]);
	const resolvedClearLabel = clearLabel ?? (onClear ? "Limpar" : undefined);

	const optionByNormalizedValue = React.useMemo(() => {
		const map = new Map<string, T>();
		for (const option of options) {
			map.set(String(option.value), option.value);
		}
		return map;
	}, [options]);

	function handleToggleValue(currentValue: string) {
		const hasValue = normalizedSelectedValues.includes(currentValue);
		const nextNormalizedValues = hasValue
			? normalizedSelectedValues.filter((selectedValue) => selectedValue !== currentValue)
			: [...normalizedSelectedValues, currentValue];

		const nextValues = nextNormalizedValues
			.map((normalizedValue) => optionByNormalizedValue.get(normalizedValue))
			.filter((normalizedValue): normalizedValue is T => normalizedValue !== undefined);

		onChange(nextValues);
	}

	function handleClear() {
		if (onClear) onClear();
		else onChange([]);
		setOpen(false);
	}

	return (
		<Command className="w-full" loop>
			<CommandInput placeholder={searchPlaceholder} className="h-9 w-full" />
			<CommandList className="w-full">
				<CommandEmpty className="w-full p-3">{emptyLabel}</CommandEmpty>
				<CommandGroup className="w-full">
					{resolvedClearLabel ? (
						<>
							<CommandItem value="__clear__" onSelect={handleClear}>
								{resolvedClearLabel}
								<Check className={cn("ml-auto", isCleared ? "opacity-100" : "opacity-0")} />
							</CommandItem>
							<CommandSeparator className="my-1" />
						</>
					) : null}
					{options.map((option) => {
						const optionValue = String(option.value);
						const isSelected = normalizedSelectedValues.includes(optionValue);
						return (
							<CommandItem
								key={option.id}
								value={optionValue}
								keywords={option.keywords ?? [option.label, optionValue]}
								onSelect={handleToggleValue}
							>
								{option.startContent}
								<span className="truncate">{option.label}</span>
								<Check className={cn("ml-auto", isSelected ? "opacity-100" : "opacity-0")} />
							</CommandItem>
						);
					})}
				</CommandGroup>
			</CommandList>
		</Command>
	);
}

type InteractiveFilterSingleContentProps<T extends string | number = string> = {
	options: InteractiveFilterOption<T>[];
	value: T | null | undefined;
	onChange: (nextValue: T) => void;
	onClear?: () => void;
	isCleared?: boolean;
	searchPlaceholder?: string;
	emptyLabel?: string;
	clearLabel?: string;
	closeOnSelect?: boolean;
};

function InteractiveFilterSingleContent<T extends string | number = string>({
	options,
	value,
	onChange,
	onClear,
	isCleared = value === null || value === undefined,
	searchPlaceholder = "Buscar...",
	emptyLabel = "Nenhuma opção encontrada.",
	clearLabel,
	closeOnSelect = true,
}: InteractiveFilterSingleContentProps<T>) {
	const { setOpen } = useInteractiveFilterContext();
	const normalizedValue = value === null || value === undefined ? null : String(value);
	const resolvedClearLabel = clearLabel ?? (onClear ? "Limpar" : undefined);

	function handleSelect(currentValue: string) {
		const selectedOption = options.find((option) => String(option.value) === currentValue);
		if (!selectedOption) return;
		onChange(selectedOption.value);
		if (closeOnSelect) setOpen(false);
	}

	function handleClear() {
		if (!onClear) return;
		onClear();
		setOpen(false);
	}

	return (
		<Command className="w-full" loop>
			<CommandInput placeholder={searchPlaceholder} className="h-9 w-full" />
			<CommandList className="w-full">
				<CommandEmpty className="w-full p-3">{emptyLabel}</CommandEmpty>
				<CommandGroup className="w-full">
					{resolvedClearLabel && onClear ? (
						<>
							<CommandItem value="__clear__" onSelect={handleClear}>
								{resolvedClearLabel}
								<Check className={cn("ml-auto", isCleared ? "opacity-100" : "opacity-0")} />
							</CommandItem>
							<CommandSeparator className="my-1" />
						</>
					) : null}
					{options.map((option) => {
						const optionValue = String(option.value);
						const isSelected = normalizedValue === optionValue;
						return (
							<CommandItem
								key={option.id}
								value={optionValue}
								keywords={option.keywords ?? [option.label, optionValue]}
								onSelect={handleSelect}
							>
								{option.startContent}
								<span className="truncate">{option.label}</span>
								<Check className={cn("ml-auto", isSelected ? "opacity-100" : "opacity-0")} />
							</CommandItem>
						);
					})}
				</CommandGroup>
			</CommandList>
		</Command>
	);
}

export type InteractiveFilterDateRange = {
	from?: Date;
	to?: Date;
};

type InteractiveFilterDateRangeContentProps = {
	value: InteractiveFilterDateRange;
	onChange: (nextValue: InteractiveFilterDateRange) => void;
	locale?: Locale;
	numberOfMonths?: number;
	className?: string;
};

function InteractiveFilterDateRangeContent({
	value,
	onChange,
	locale = ptBR,
	numberOfMonths = 2,
	className,
}: InteractiveFilterDateRangeContentProps) {
	return (
		<div className={cn("w-auto p-0", className)}>
			<Calendar
				initialFocus
				mode="range"
				locale={locale}
				defaultMonth={value.from}
				selected={{ from: value.from, to: value.to }}
				onSelect={(selectedValue) => onChange({ from: selectedValue?.from, to: selectedValue?.to })}
				numberOfMonths={numberOfMonths}
				classNames={{
					weekdays: "flex items-center gap-1.5",
				}}
			/>
		</div>
	);
}

export const InteractiveFilter = {
	Root: InteractiveFilterRoot,
	Trigger: InteractiveFilterTrigger,
	Icon: InteractiveFilterIcon,
	Label: InteractiveFilterLabel,
	Value: InteractiveFilterValue,
	Clear: InteractiveFilterClear,
	Content: InteractiveFilterContent,
	MultiContent: InteractiveFilterMultiContent,
	SingleContent: InteractiveFilterSingleContent,
	DateRangeContent: InteractiveFilterDateRangeContent,
};
