import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Check, ChevronsUpDown } from "lucide-react";
import { type ReactNode, useMemo, useRef, useState } from "react";
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
type SelectInputVirtualizedProps = {
	width?: string;
	label: string;
	labelClassName?: string;
	holderClassName?: string;
	showLabel?: boolean;
	value: string | null;
	editable?: boolean;
	resetOptionLabel: string;
	optionsStartContent?: ReactNode;
	options: SelectOption[] | null;
	handleChange: (value: string) => void;
	onReset: () => void;
	itemHeight?: number;
	maxHeight?: number;
	modal?: boolean;
};

function SelectInputVirtualized({
	width,
	label,
	labelClassName,
	holderClassName,
	showLabel = true,
	value,
	editable = true,
	options,
	optionsStartContent,
	resetOptionLabel,
	handleChange,
	onReset,
	itemHeight = 40,
	maxHeight = 300,
	modal = true,
}: SelectInputVirtualizedProps) {
	const inputIdentifier = label.toLowerCase().replaceAll(" ", "_");
	const isDesktop = useMediaQuery("(min-width: 768px)");
	const [isOpen, setIsOpen] = useState<boolean>(false);
	const [searchValue, setSearchValue] = useState<string>("");
	const triggerRef = useRef<HTMLButtonElement>(null);
	const dialogContainer = (triggerRef.current?.closest("[data-dialog-container]") as HTMLElement) || null;

	// Filter options based on search
	const filteredOptions = useMemo(() => {
		if (!searchValue) return options;
		return (
			options?.filter(
				(option) => option.label.toLowerCase().includes(searchValue.toLowerCase()) || option.value.toLowerCase().includes(searchValue.toLowerCase()),
			) ?? []
		);
	}, [options, searchValue]);

	return isDesktop ? (
		<div className={cn("flex flex-col w-full gap-1", width && `w-[${width}]`)}>
			<Label htmlFor={inputIdentifier} className={cn("text-start text-sm font-medium tracking-tight text-primary/80", labelClassName)}>
				{label}
			</Label>
			<Popover modal={modal} open={isOpen} onOpenChange={setIsOpen}>
				<PopoverTrigger asChild>
					<Button
						ref={triggerRef}
						type="button"
						disabled={!editable}
						variant="outline"
						aria-haspopup="listbox"
						aria-expanded={isOpen}
						className="w-full justify-between truncate border border-primary/20"
					>
						<SelectedOption value={value} options={options ?? []} placeholderText={resetOptionLabel} />
						<ChevronsUpDown className="opacity-50" />
					</Button>
				</PopoverTrigger>
				<PopoverContent container={dialogContainer} className="p-0 w-[var(--radix-popover-trigger-width)]">
					<VirtualizedOptionsList
						value={value}
						placeholderText={resetOptionLabel}
						resetOptionText={resetOptionLabel}
						handleChange={handleChange}
						handleReset={onReset}
						options={filteredOptions ?? []}
						optionsStartContent={optionsStartContent}
						closeMenu={() => setIsOpen(false)}
						searchValue={searchValue}
						setSearchValue={setSearchValue}
						itemHeight={itemHeight}
						maxHeight={maxHeight}
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
						className="w-full justify-between border border-primary/20"
					>
						<SelectedOption value={value} options={options ?? []} placeholderText={resetOptionLabel} />
						<ChevronsUpDown className="opacity-50" />
					</Button>
				</DrawerTrigger>
				<DrawerContent>
					<div className="mt-4 border-t">
						<VirtualizedOptionsList
							value={value}
							placeholderText={resetOptionLabel}
							resetOptionText={resetOptionLabel}
							handleChange={handleChange}
							handleReset={onReset}
							options={filteredOptions ?? []}
							optionsStartContent={optionsStartContent}
							closeMenu={() => setIsOpen(false)}
							searchValue={searchValue}
							setSearchValue={setSearchValue}
							itemHeight={itemHeight}
							maxHeight={maxHeight}
						/>
					</div>
				</DrawerContent>
			</Drawer>
		</div>
	);
}

export default SelectInputVirtualized;

type VirtualizedOptionsListProps = {
	value: string | null;
	placeholderText: string;
	resetOptionText: string;
	handleChange: (value: string) => void;
	handleReset: () => void;
	options: SelectOption[];
	optionsStartContent?: ReactNode;
	closeMenu: () => void;
	searchValue: string;
	setSearchValue: (value: string) => void;
	itemHeight: number;
	maxHeight: number;
};

function VirtualizedOptionsList({
	value,
	placeholderText,
	resetOptionText,
	handleChange,
	handleReset,
	options,
	optionsStartContent,
	closeMenu,
	searchValue,
	setSearchValue,
	itemHeight,
	maxHeight,
}: VirtualizedOptionsListProps) {
	const parentRef = useRef<HTMLDivElement>(null);

	// Create virtualized items array
	const virtualizedItems = useMemo(() => {
		const items = [
			{ type: "reset" as const, id: "reset", label: resetOptionText, value: null },
			...options.map((option) => ({ type: "option" as const, ...option })),
		];
		return items;
	}, [options, resetOptionText]);

	const virtualizer = useVirtualizer({
		count: virtualizedItems.length,
		getScrollElement: () => parentRef.current,
		estimateSize: () => itemHeight,
		overscan: 5,
	});

	const virtualItems = virtualizer.getVirtualItems();

	return (
		<Command loop shouldFilter={false}>
			<CommandInput placeholder={placeholderText} className="h-9 w-full" value={searchValue} onValueChange={setSearchValue} />
			<CommandList className="w-full">
				{options.length === 0 && searchValue ? (
					<CommandEmpty className="w-full p-3">Nenhuma opção encontrada.</CommandEmpty>
				) : (
					<CommandGroup
						ref={parentRef}
						className="w-full overflow-auto scrollbar-thin scrollbar-track-primary/10 scrollbar-thumb-primary/30"
						style={{
							height: Math.min(maxHeight, virtualizedItems.length * itemHeight),
						}}
					>
						<div
							style={{
								height: virtualizer.getTotalSize(),
								width: "100%",
								position: "relative",
							}}
						>
							{virtualItems.map((virtualItem) => {
								const item = virtualizedItems[virtualItem.index];
								if (!item) return null;
								return (
									<div
										key={virtualItem.key}
										style={{
											position: "absolute",
											top: 0,
											left: 0,
											width: "100%",
											height: `${virtualItem.size}px`,
											transform: `translateY(${virtualItem.start}px)`,
										}}
									>
										{item.type === "reset" ? (
											<>
												<CommandItem
													value={undefined}
													onSelect={() => {
														handleReset();
														closeMenu();
													}}
												>
													{resetOptionText}
												</CommandItem>
												{virtualItem.index === 0 && <CommandSeparator className="my-1" />}
											</>
										) : (
											<CommandItem
												key={item.id}
												value={item.value}
												onSelect={(currentValue) => {
													if (currentValue === value) handleReset();
													else handleChange(currentValue);
													closeMenu();
												}}
												className="h-full"
											>
												{item.startContent ? item.startContent : optionsStartContent ? optionsStartContent : undefined}
												{item.label}
												<Check className={cn("ml-auto", value === item.value ? "opacity-100" : "opacity-0")} />
											</CommandItem>
										)}
									</div>
								);
							})}
						</div>
					</CommandGroup>
				)}
			</CommandList>
		</Command>
	);
}

type SelectedOptionProps = {
	value: string | null;
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
