import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown } from "lucide-react";
import React, { type ReactNode, useId, useState } from "react";
import { Button } from "../ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "../ui/command";
import { Drawer, DrawerContent, DrawerTrigger } from "../ui/drawer";
import { Field, FieldLabel } from "../ui/field";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

type SelectOption = {
	id: string | number;
	startContent?: ReactNode;
	value: any;
	label: string;
};
type SelectInputProps = {
	label: string;
	labelClassName?: string;
	holderClassName?: string;
	showLabel?: boolean;
	selected: (string | number)[] | null;
	editable?: boolean;
	resetOptionLabel: string;
	optionsStartContent?: ReactNode;
	options: SelectOption[] | null;
	handleChange: (value: string[]) => void;
	onReset: () => void;
};

function MultipleSelectInput({
	label,
	labelClassName,
	holderClassName,
	showLabel = true,
	selected,
	editable = true,
	optionsStartContent,
	options,
	resetOptionLabel,
	handleChange,
	onReset,
}: SelectInputProps) {
	const generatedId = useId();
	const inputIdentifier = `${label.toLowerCase().replaceAll(" ", "_")}_${generatedId}`;
	const isDesktop = useMediaQuery("(min-width: 768px)");
	const [isOpen, setIsOpen] = useState<boolean>(false);

	const selectedOptions = options?.filter((o) => (selected ? selected.includes(o.value) : false));
	return (
		<Field className="gap-1" data-disabled={!editable}>
			{showLabel ? (
				<FieldLabel htmlFor={inputIdentifier} className={cn("text-start text-sm font-medium tracking-tight text-foreground/80", labelClassName)}>
					{label}
				</FieldLabel>
			) : null}

			{isDesktop ? (
				<Popover open={isOpen} onOpenChange={setIsOpen}>
					<PopoverTrigger asChild>
						<Button
							id={inputIdentifier}
							type="button"
							disabled={!editable}
							variant="outline"
							aria-haspopup="listbox"
							aria-expanded={isOpen}
							className={cn("w-full justify-between truncate border border-border", holderClassName)}
						>
							<SelectedOptions selectedOptions={selectedOptions ?? []} placeholderText={resetOptionLabel} />
							<ChevronsUpDown className="w-3 h-3 min-w-3 min-h-3" />
						</Button>
					</PopoverTrigger>
					<PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]">
						<OptionsList
							value={selected?.map((p) => p.toString()) ?? null}
							selectedOptions={selectedOptions ?? []}
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
							className={cn("w-full justify-between truncate border border-border", holderClassName)}
						>
							<SelectedOptions selectedOptions={selectedOptions ?? []} placeholderText={resetOptionLabel} />
							<ChevronsUpDown className="w-4 h-4 min-w-4 min-h-4" />
						</Button>
					</DrawerTrigger>
					<DrawerContent>
						<div className="mt-4 border-t">
							<OptionsList
								value={selected?.map((p) => p.toString()) ?? null}
								selectedOptions={selectedOptions ?? []}
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

export default MultipleSelectInput;

type OptionsListProps = {
	value: string[] | null;
	selectedOptions: SelectOption[];
	placeholderText: string;
	resetOptionText: string;
	handleChange: (value: string[]) => void;
	handleReset: () => void;
	options: SelectOption[];
	optionsStartContent?: ReactNode;
	closeMenu: () => void;
};
function OptionsList({
	value,
	selectedOptions,
	placeholderText,
	resetOptionText,
	handleChange,
	handleReset,
	options,
	optionsStartContent,
	closeMenu,
}: OptionsListProps) {
	const selectedOptionsValues = selectedOptions.map((v) => v.value);
	return (
		<Command className="w-full" loop>
			<CommandInput placeholder={placeholderText} className="h-9 w-full" />
			<CommandList className="w-full">
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
							value={String(option.value)}
							keywords={[option.label]}
							onSelect={(currentValue) => {
								if (selectedOptionsValues.includes(currentValue)) handleChange(selectedOptionsValues.filter((s) => s !== currentValue));
								else handleChange([...selectedOptionsValues, currentValue]);
							}}
						>
							{option.startContent ? option.startContent : optionsStartContent ? optionsStartContent : undefined}
							{option.label}
							<Check className={cn("ml-auto", selectedOptionsValues.includes(option.value) ? "opacity-100" : "opacity-0")} />
						</CommandItem>
					))}
				</CommandGroup>
			</CommandList>
		</Command>
	);
}

type SelectedOptionsProps = {
	selectedOptions: SelectOption[];
	placeholderText: string;
};
function SelectedOptions({ selectedOptions, placeholderText }: SelectedOptionsProps) {
	if (selectedOptions.length === 0) return placeholderText;

	return (
		<span className="flex items-center gap-1 overflow-hidden">
			{selectedOptions.map((option, index, arr) => (
				<span key={option.id} className="flex items-center gap-1">
					{option.startContent ?? null}
					{option.label}
					{index + 1 !== arr.length ? ", " : null}
				</span>
			))}
		</span>
	);
}
