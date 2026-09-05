import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown } from "lucide-react";
import React, { type ComponentProps, type ReactNode, useId, useState } from "react";
import { Button } from "../ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "../ui/command";
import { Drawer, DrawerContent, DrawerTrigger } from "../ui/drawer";
import { Field, FieldLabel } from "../ui/field";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { RequiredIndicator } from "./RequiredIndicator";

type SelectOption = {
	id: string | number;
	value: string;
	label: string;
	startContent?: ReactNode;
};
type SelectInputProps = {
	label: string;
	labelClassName?: string;
	holderClassName?: string;
	triggerProps?: ComponentProps<typeof Button>;
	showLabel?: boolean;
	value: string | null | undefined;
	editable?: boolean;
	resetOptionLabel: string;
	optionsStartContent?: ReactNode;
	options: SelectOption[] | null;
	handleChange: (value: string) => void;
	onReset: () => void;
	required?: boolean;
};

function SelectInput({
	label,
	labelClassName,
	holderClassName,
	triggerProps,
	showLabel = true,
	value,
	editable = true,
	options,
	resetOptionLabel,
	optionsStartContent,
	handleChange,
	onReset,
	required = false,
}: SelectInputProps) {
	const generatedId = useId();
	const inputIdentifier = `${label.toLowerCase().replaceAll(" ", "_")}_${generatedId}`;
	const isDesktop = useMediaQuery("(min-width: 768px)");
	const [isOpen, setIsOpen] = useState<boolean>(false);
	return (
		<Field className="gap-1" data-disabled={!editable}>
			{showLabel && (
				<FieldLabel htmlFor={inputIdentifier} className={cn("text-start text-sm font-medium tracking-tight text-foreground/80", labelClassName)}>
					{label}
					{required ? <RequiredIndicator /> : null}
				</FieldLabel>
			)}

			{isDesktop ? (
				<Popover open={isOpen} onOpenChange={setIsOpen}>
					<PopoverTrigger
						render={
							<Button
								id={inputIdentifier}
								type="button"
								disabled={!editable}
								variant="outline"
								aria-haspopup="listbox"
								aria-expanded={isOpen}
								className={cn("w-full justify-between truncate border border-border", holderClassName)}
								{...triggerProps}
							>
								<SelectedOption value={value} options={options ?? []} placeholderText={resetOptionLabel} />
								<ChevronsUpDown className="w-4 h-4 min-w-4 min-h-4" />
							</Button>
						}
					/>
					<PopoverContent
						className="z-60 max-h-[min(22rem,var(--available-height))] w-[var(--anchor-width)] overflow-hidden p-0"
						onWheel={(event) => event.stopPropagation()}
					>
						<OptionsList
							value={value}
							placeholderText={resetOptionLabel}
							resetOptionText={resetOptionLabel}
							handleChange={handleChange}
							handleReset={onReset}
							options={options ?? []}
							optionsStartContent={optionsStartContent}
							closeMenu={() => setIsOpen(false)}
						/>
					</PopoverContent>
				</Popover>
			) : (
				<Drawer open={isOpen} onOpenChange={setIsOpen}>
					<DrawerTrigger asChild>
						<Button
							id={inputIdentifier}
							type="button"
							disabled={!editable}
							variant="outline"
							aria-haspopup="listbox"
							aria-expanded={isOpen}
							className={cn("w-full justify-between border border-border", holderClassName)}
							{...triggerProps}
						>
							<SelectedOption value={value} options={options ?? []} placeholderText={resetOptionLabel} />
							<ChevronsUpDown className="w-3 h-3 min-w-3 min-h-3" />
						</Button>
					</DrawerTrigger>
					<DrawerContent className="max-h-[85dvh] overflow-hidden">
						<div className="mt-4 min-h-0 overflow-hidden border-t">
							<OptionsList
								value={value}
								placeholderText={resetOptionLabel}
								resetOptionText={resetOptionLabel}
								handleChange={handleChange}
								handleReset={onReset}
								options={options ?? []}
								optionsStartContent={optionsStartContent}
								closeMenu={() => setIsOpen(false)}
							/>
						</div>
					</DrawerContent>
				</Drawer>
			)}
		</Field>
	);
}

export default SelectInput;

type OptionsListProps = {
	value: string | null | undefined;
	placeholderText: string;
	resetOptionText: string;
	handleChange: (value: string) => void;
	handleReset: () => void;
	options: SelectOption[];
	optionsStartContent?: ReactNode;
	closeMenu: () => void;
};
function OptionsList({
	value,
	placeholderText,
	resetOptionText,
	handleChange,
	handleReset,
	options,
	optionsStartContent,
	closeMenu,
}: OptionsListProps) {
	return (
		<Command className="flex max-h-[min(18rem,65dvh)] min-h-0 w-full flex-col overflow-hidden">
			<CommandInput placeholder={placeholderText} className="h-9 w-full" />
			<CommandList className="min-h-0 flex-1 overflow-y-auto max-h-none">
				<CommandEmpty className="w-full p-3">Nenhuma opção encontrada.</CommandEmpty>
				<CommandGroup className="w-full">
					<CommandItem
						value={undefined}
						onSelect={() => {
							handleReset();
							closeMenu();
						}}
					>
						{resetOptionText}
						<Check className={cn("ml-auto", value === null ? "opacity-100" : "opacity-0")} />
					</CommandItem>
					<CommandSeparator className="my-1" />
					{options.map((option) => (
						<CommandItem
							key={option.id}
							value={option.value}
							keywords={[option.label]}
							onSelect={(currentValue) => {
								if (currentValue === value) handleReset();
								else handleChange(currentValue);
								closeMenu();
							}}
						>
							{option.startContent ? option.startContent : optionsStartContent ? optionsStartContent : undefined}
							{option.label}
							<Check className={cn("ml-auto", value === option.value ? "opacity-100" : "opacity-0")} />
						</CommandItem>
					))}
				</CommandGroup>
			</CommandList>
		</Command>
	);
}

type SelectedOptionProps = {
	value: string | null | undefined;
	placeholderText: string;
	options: SelectOption[];
};
function SelectedOption({ value, placeholderText, options }: SelectedOptionProps) {
	const selectedOption = options.find((o) => o.value === value);

	if (!selectedOption) return <span className="flex items-center gap-1 truncate">{placeholderText}</span>;
	return (
		<span className="flex items-center gap-1 overflow-hidden truncate">
			{selectedOption.startContent ?? null}
			{selectedOption.label}
		</span>
	);
}
