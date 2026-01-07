import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown } from "lucide-react";
import React, { type ReactNode, useState } from "react";
import { Button } from "../ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "../ui/command";
import { Drawer, DrawerContent, DrawerTrigger } from "../ui/drawer";
import { Label } from "../ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

type SelectOption = {
	id: string | number;
	startContent?: ReactNode;
	value: any;
	label: string;
};
type SelectInputProps = {
	width?: string;
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
	width,
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
	const inputIdentifier = label.toLowerCase().replaceAll(" ", "_");
	const isDesktop = useMediaQuery("(min-width: 768px)");
	const [isOpen, setIsOpen] = useState<boolean>(false);

	const selectedOptions = options?.filter((o) => (selected ? selected.includes(o.value) : false));
	return isDesktop ? (
		<div className={cn("flex flex-col w-full gap-1", width && `w-[${width}]`)}>
			<Label htmlFor={inputIdentifier} className={cn("text-start text-sm font-medium tracking-tight text-primary/80", labelClassName)}>
				{label}
			</Label>
			<Popover open={isOpen} onOpenChange={setIsOpen}>
				<PopoverTrigger asChild>
					<Button
						type="button"
						disabled={!editable}
						variant="outline"
						aria-haspopup="listbox"
						aria-expanded={isOpen}
						className="w-full justify-between truncate border border-primary/20"
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
		</div>
	) : (
		<div className={cn("flex flex-col w-full gap-1", width && `w-[${width}]`)}>
			<Label htmlFor={inputIdentifier} className={cn("text-start text-sm font-medium tracking-tight text-primary/80", labelClassName)}>
				{label}
			</Label>
			<Drawer open={isOpen} onOpenChange={setIsOpen}>
				<DrawerTrigger asChild>
					<Button
						type="button"
						disabled={!editable}
						variant="outline"
						aria-haspopup="listbox"
						aria-expanded={isOpen}
						className="w-full justify-between truncate border border-primary/20"
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
		</div>
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
