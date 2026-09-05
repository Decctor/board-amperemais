"use client";

import { normalizeForSearch } from "@/lib/formatting";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { useProductGroups } from "@/lib/queries/products";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, LayoutGrid, Plus } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { Button } from "../ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "../ui/command";
import { Drawer, DrawerContent, DrawerTrigger } from "../ui/drawer";
import { Field, FieldLabel } from "../ui/field";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { RequiredIndicator } from "./RequiredIndicator";

type SelectProductGroupProps = {
	label?: string;
	showLabel?: boolean;
	value: string;
	editable?: boolean;
	required?: boolean;
	handleChange: (grupo: string) => void;
};

/**
 * Seletor do grupo do produto. O grupo não é entidade — é o texto livre de `products.grupo` — então
 * a lista de opções é o que a organização já usa, e digitar um nome inédito continua permitido.
 *
 * O ganho não é de digitação, é de integridade: enquanto o campo era texto puro, "Bebidas",
 * "bebidas" e "Bebidas " viravam três grupos diferentes na vitrine, no PDV e nos alvos de cupom.
 * Oferecer o que já existe torna a escolha certa a mais fácil; criar continua a um clique.
 */
export default function SelectProductGroup({
	label = "GRUPO",
	showLabel = true,
	value,
	editable = true,
	required = false,
	handleChange,
}: SelectProductGroupProps) {
	const { data: groups, isLoading } = useProductGroups();
	const isDesktop = useMediaQuery("(min-width: 768px)");
	const [isOpen, setIsOpen] = useState(false);
	const [search, setSearch] = useState("");
	const generatedId = useId();
	const inputIdentifier = `grupo_produto_${generatedId}`;

	function selectGroup(grupo: string) {
		handleChange(grupo);
		setSearch("");
		setIsOpen(false);
	}

	const trigger = (
		<Button
			id={inputIdentifier}
			type="button"
			disabled={!editable}
			variant="outline"
			aria-haspopup="listbox"
			aria-expanded={isOpen}
			className="w-full justify-between truncate border border-border font-normal"
		>
			<span className={cn("flex items-center gap-1.5 truncate", !value && "text-muted-foreground")}>
				<LayoutGrid className="size-3.5 shrink-0 text-muted-foreground" />
				{value || "SELECIONE OU CRIE UM GRUPO"}
			</span>
			<ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
		</Button>
	);

	return (
		<Field className="gap-1" data-disabled={!editable}>
			{showLabel ? (
				<FieldLabel htmlFor={inputIdentifier} className="text-start text-sm font-medium tracking-tight text-foreground/80">
					{label}
					{required ? <RequiredIndicator /> : null}
				</FieldLabel>
			) : null}

			{isDesktop ? (
				<Popover open={isOpen} onOpenChange={setIsOpen}>
					<PopoverTrigger render={trigger} />
					<PopoverContent className="w-[var(--anchor-width)] p-0" align="start">
						<GroupOptionsList groups={groups ?? []} isLoading={isLoading} value={value} search={search} setSearch={setSearch} selectGroup={selectGroup} />
					</PopoverContent>
				</Popover>
			) : (
				<Drawer open={isOpen} onOpenChange={setIsOpen}>
					<DrawerTrigger asChild>{trigger}</DrawerTrigger>
					<DrawerContent className="max-h-[85dvh] overflow-hidden">
						<div className="mt-4 border-t p-2">
							<GroupOptionsList groups={groups ?? []} isLoading={isLoading} value={value} search={search} setSearch={setSearch} selectGroup={selectGroup} />
						</div>
					</DrawerContent>
				</Drawer>
			)}
		</Field>
	);
}

type GroupOptionsListProps = {
	groups: string[];
	isLoading: boolean;
	value: string;
	search: string;
	setSearch: (search: string) => void;
	selectGroup: (grupo: string) => void;
};

function GroupOptionsList({ groups, isLoading, value, search, setSearch, selectGroup }: GroupOptionsListProps) {
	const typed = search.trim();
	// Só oferece criar quando o texto não é um grupo existente. A comparação ignora acento e caixa
	// de propósito: se o usuário digita "acai" e já existe "Açaí", o caminho certo é escolher o que
	// existe — criar seria justamente o duplicado que este seletor veio evitar.
	const alreadyExists = useMemo(() => groups.some((grupo) => normalizeForSearch(grupo) === normalizeForSearch(typed)), [groups, typed]);
	const canCreate = typed.length > 0 && !alreadyExists;

	return (
		<Command className="flex max-h-[min(18rem,65dvh)] min-h-0 w-full flex-col overflow-hidden">
			<CommandInput placeholder="Buscar ou digitar um grupo..." className="h-9 w-full" value={search} onValueChange={setSearch} />
			<CommandList className="max-h-none min-h-0 flex-1 overflow-y-auto">
				{canCreate ? (
					<>
						<CommandGroup className="w-full">
							<CommandItem value={`__criar__${typed}`} onSelect={() => selectGroup(typed)}>
								<Plus className="size-4 shrink-0 text-muted-foreground" />
								<span className="truncate">
									Criar grupo <span className="font-semibold">{typed}</span>
								</span>
							</CommandItem>
						</CommandGroup>
						<CommandSeparator className="my-1" />
					</>
				) : null}

				<CommandEmpty className="w-full p-3 text-sm text-muted-foreground">
					{isLoading ? "Carregando grupos..." : "Digite para criar o primeiro grupo."}
				</CommandEmpty>

				<CommandGroup className="w-full">
					{value ? (
						<CommandItem value="__sem_grupo__" onSelect={() => selectGroup("")}>
							<span className="text-muted-foreground">Sem grupo</span>
						</CommandItem>
					) : null}
					{groups.map((grupo) => (
						<CommandItem key={grupo} value={grupo} onSelect={() => selectGroup(grupo)}>
							<span className="truncate">{grupo}</span>
							<Check className={cn("ml-auto", value === grupo ? "opacity-100" : "opacity-0")} />
						</CommandItem>
					))}
				</CommandGroup>
			</CommandList>
		</Command>
	);
}
