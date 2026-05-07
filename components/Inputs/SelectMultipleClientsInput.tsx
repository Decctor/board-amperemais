import { useClientsBySearch } from "@/lib/queries/clients";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, UserRound } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { Button } from "../ui/button";
import { Command, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "../ui/command";
import { Drawer, DrawerContent, DrawerTrigger } from "../ui/drawer";
import { Label } from "../ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

type SelectMultipleClientsInputProps = {
	width?: string;
	label: string;
	labelClassName?: string;
	holderClassName?: string;
	showLabel?: boolean;
	selected: string[];
	editable?: boolean;
	handleChange: (value: string[]) => void;
	onReset: () => void;
};

function SelectMultipleClientsInput({
	width,
	label,
	labelClassName,
	holderClassName,
	showLabel = true,
	selected,
	editable = true,
	handleChange,
	onReset,
}: SelectMultipleClientsInputProps) {
	const { data: searchClients, isLoading, isError, isSuccess, search, updateSearch } = useClientsBySearch({ initialSearch: "" });
	const [knownClientsById, setKnownClientsById] = useState(new Map<string, NonNullable<typeof searchClients>[number]>());

	useEffect(() => {
		if (!searchClients) return;
		setKnownClientsById((prev) => {
			const next = new Map(prev);
			for (const client of searchClients) next.set(client.id, client);
			return next;
		});
	}, [searchClients]);

	const selectedClientsById = useMemo(() => {
		return new Map([...(searchClients ?? []).map((client) => [client.id, client] as const), ...knownClientsById]);
	}, [knownClientsById, searchClients]);

	const isDesktop = useMediaQuery("(min-width: 768px)");
	const [isOpen, setIsOpen] = useState(false);
	const triggerRef = useRef<HTMLButtonElement>(null);
	const dialogContainer = triggerRef.current?.closest("[data-dialog-container]") as HTMLElement | null;

	const inputIdentifier = label.toLowerCase().replace(" ", "_");

	function handleSelect(id: string) {
		if (selected.includes(id)) {
			handleChange(selected.filter((item) => item !== id));
		} else {
			handleChange([...selected, id]);
		}
	}

	function resetState() {
		onReset();
		setIsOpen(false);
	}

	const triggerLabel =
		selected.length === 0
			? "NENHUM SELECIONADO"
			: selected.length === 1
				? selectedClientsById.get(selected[0])?.nome ?? "1 CLIENTE SELECIONADO"
				: `${selected.length} CLIENTES SELECIONADOS`;

	const renderTrigger = () => (
		<Button
			ref={triggerRef}
			type="button"
			disabled={!editable}
			variant="outline"
			aria-expanded={isOpen}
			className={cn("w-full justify-between truncate border-primary/20", holderClassName)}
		>
			{triggerLabel}
			<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
		</Button>
	);

	const renderContent = () => (
		<Command shouldFilter={false} className="w-full">
			<CommandInput placeholder="Pesquisar clientes (nome, telefone, CPF/CNPJ)..." value={search} onValueChange={updateSearch} />
			<CommandList>
				<CommandGroup>
					<CommandItem value="reset-selection-option" onSelect={() => resetState()} className="cursor-pointer">
						LIMPAR SELEÇÃO
						<Check className={cn("ml-auto h-4 w-4", selected.length === 0 ? "opacity-100" : "opacity-0")} />
					</CommandItem>
				</CommandGroup>

				<CommandSeparator />

				{isLoading && <div className="p-2 text-center text-xs text-primary/80">Carregando...</div>}
				{isError && <div className="p-2 text-center text-xs text-destructive">Erro ao buscar clientes.</div>}

				{search.trim().length < 2 && !isLoading && (
					<div className="p-2 text-center text-xs text-muted-foreground italic">Digite pelo menos 2 caracteres para buscar.</div>
				)}

				{isSuccess && searchClients && (
					<CommandGroup>
						{searchClients.length === 0 && search.trim().length >= 2 && (
							<div className="p-2 text-center text-sm italic text-primary">Nenhum cliente encontrado.</div>
						)}
						{searchClients.map((client) => (
							<CommandItem
								key={client.id}
								value={client.id}
								onSelect={() => {
									if (editable) handleSelect(client.id);
								}}
								className="cursor-pointer"
							>
								<div className="flex grow items-center gap-2 justify-between min-w-0">
									<div className="flex items-center gap-1.5 flex-1 min-w-0">
										<UserRound className="w-3.5 h-3.5 min-w-3.5 min-h-3.5 text-muted-foreground" />
										<p className="text-sm font-medium truncate">{client.nome}</p>
									</div>
									{client.telefone ? (
										<p className="text-xs text-muted-foreground shrink-0">{client.telefone}</p>
									) : (
										<p className="text-xs text-destructive shrink-0">SEM TELEFONE</p>
									)}
								</div>
								{selected.includes(client.id) ? <Check className="ml-auto h-4 w-4 opacity-100" /> : null}
							</CommandItem>
						))}
					</CommandGroup>
				)}
			</CommandList>
		</Command>
	);

	if (isDesktop) {
		return (
			<div className={cn("flex w-full flex-col gap-1", width && `w-[${width}]`)}>
				{showLabel && (
					<Label htmlFor={inputIdentifier} className={cn("text-start text-sm font-medium tracking-tight text-primary/80", labelClassName)}>
						{label}
					</Label>
				)}
				<Popover open={isOpen} onOpenChange={setIsOpen}>
					<PopoverTrigger asChild>{renderTrigger()}</PopoverTrigger>
					<PopoverContent container={dialogContainer} className="w-[400px] p-0" align="start">
						{renderContent()}
					</PopoverContent>
				</Popover>
			</div>
		);
	}

	return (
		<div className={cn("flex w-full flex-col gap-1", width && `w-[${width}]`)}>
			{showLabel && (
				<Label htmlFor={inputIdentifier} className={cn("text-start text-sm font-medium tracking-tight text-primary/80", labelClassName)}>
					{label}
				</Label>
			)}
			<Drawer open={isOpen} onOpenChange={setIsOpen}>
				<DrawerTrigger asChild>{renderTrigger()}</DrawerTrigger>
				<DrawerContent>
					<div className="mt-4 border-t p-2 pb-8">{renderContent()}</div>
				</DrawerContent>
			</Drawer>
		</div>
	);
}

export default SelectMultipleClientsInput;
