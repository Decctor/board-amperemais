import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { formatNameAsInitials, formatWithoutDiacritics } from "@/lib/formatting";
import { useKey } from "@/lib/hooks/use-key";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { easeBackInOut } from "d3-ease";
import { ListFilter, UserRound, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";

const variants = {
	hidden: {
		opacity: 0.2,
		scale: 0.95, // Scale down slightly
		backgroundColor: "rgba(255, 255, 255, 0.9)", // Adjust the color and alpha as needed
		transition: {
			duration: 0.5,
			ease: easeBackInOut, // Use an easing function
		},
	},
	visible: {
		opacity: 1,
		scale: 1, // Scale down slightly
		backgroundColor: "rgba(255, 255, 255, 1)", // Normal background color
		transition: {
			duration: 0.5,
			ease: easeBackInOut, // Use an easing function
		},
	},
	exit: {
		opacity: 0,
		scale: 1.05, // Scale down slightly
		backgroundColor: "rgba(255, 255, 255, 0.5)", // Fading background color
		transition: {
			duration: 0.01,
			ease: easeBackInOut, // Use an easing function
		},
	},
};

function validateIsSelected({ id, selected }: { id: string; selected?: string[] | null }) {
	if (!selected) return false;
	return selected.includes(id);
}
function getInitialMode({ referenceId, selected }: { referenceId: string | null; selected?: string[] | null }) {
	if (!selected) return "GERAL";
	if (selected.length === 0 || (selected.length === 1 && selected[0] === referenceId)) return "PRÓPRIO";
	return "PERSONALIZADO";
}

type TScopeOption = {
	id: string;
	label: string;
	image_url?: string | null;
};

type ScopeSelectionProps = {
	referenceId: string | null;
	options: TScopeOption[];
	selected?: string[] | null;
	handleScopeSelection: (info: string[] | null) => void;
};
function PermissionsScope({ referenceId, options, selected, handleScopeSelection }: ScopeSelectionProps) {
	const [mode, setMode] = useState<"PRÓPRIO" | "GERAL" | "PERSONALIZADO">(getInitialMode({ referenceId, selected }));
	const [selectMenuIsOpen, setSelectMenuIsOpen] = useState<boolean>(false);
	useKey("Escape", () => setSelectMenuIsOpen(false));
	useEffect(() => {
		setMode(getInitialMode({ referenceId, selected }));
	}, [selected, referenceId]);
	return (
		<div className="relative flex flex-col">
			<div className="flex flex-col lg:flex-row items-center gap-1">
				<p className="text-[0.65rem] lg:text-xs text-primary/70">ESCOPO</p>
				<div className="flex items-center gap-2">
					<Button
						type="button"
						variant={mode === "PRÓPRIO" ? "default" : "ghost"}
						onClick={() => {
							setMode("PRÓPRIO");
							if (referenceId) handleScopeSelection([referenceId]);
							else handleScopeSelection([]);
						}}
						className="flex items-center gap-1 px-2 py-1 text-xs font-medium"
						size={"fit"}
					>
						<UserRound className="w-4 h-4 min-w-4 min-h-4" />
						PRÓPRIO
					</Button>
					<Button
						type="button"
						onClick={() => {
							setMode("GERAL");
							handleScopeSelection(null);
						}}
						className="flex items-center gap-1 px-2 py-1 text-xs font-medium"
						size={"fit"}
						variant={mode === "GERAL" ? "default" : "ghost"}
					>
						<UsersRound className="w-4 h-4 min-w-4 min-h-4" />
						GERAL
					</Button>
					<Button
						type="button"
						onClick={() => {
							setMode("PERSONALIZADO");
							setSelectMenuIsOpen(true);
						}}
						className="flex items-center gap-1 px-2 py-1 text-xs font-medium"
						size={"fit"}
						variant={mode === "PERSONALIZADO" ? "default" : "ghost"}
					>
						<ListFilter className="w-4 h-4 min-w-4 min-h-4" />
						PERSONALIZADO
					</Button>
				</div>
			</div>
			{mode === "PERSONALIZADO" && selectMenuIsOpen ? (
				<PersonalizedScopeSelectionMenu
					options={options}
					selected={selected}
					handleScopeSelection={handleScopeSelection}
					closeMenu={() => setSelectMenuIsOpen(false)}
				/>
			) : null}
		</div>
	);
}

export default PermissionsScope;
type ScopeSelectionMenuProps = {
	options: TScopeOption[];
	selected?: string[] | null;
	handleScopeSelection: (selected: string[] | null) => void;
	closeMenu: () => void;
};
function PersonalizedScopeSelectionMenu({ options, selected, handleScopeSelection, closeMenu }: ScopeSelectionMenuProps) {
	const isDesktop = useMediaQuery("(min-width: 768px)");
	const MENU_TITLE = "ESCOLHA O ESCOPO DE ACESSO";
	const MENU_DESCRIPTION = "Selecione o escopo de acesso para o usuário.";

	function ScopeSelectionMenuContent() {
		const [search, setSearch] = useState<string>("");

		const filteredOptions = options.filter((option) =>
			search.trim().length > 0 ? formatWithoutDiacritics(option.label, true).includes(formatWithoutDiacritics(search, true)) : true,
		);
		return (
			<div className="w-full h-full flex flex-col gap-6">
				<input
					className="w-full h-fit outline-hidden ring-0 border-none bg-transparent text-xs placeholder:italic"
					placeholder="Pesquise por uma opção..."
					value={search}
					onChange={(e) => setSearch(e.target.value)}
				/>
				<div className="w-full flex flex-col gap-2">
					{filteredOptions.map((option, index) => (
						<Button
							type="button"
							key={`${option.id}-${index}`}
							onClick={() => {
								const selectedArr = selected ? [...selected] : [];
								if (selectedArr.includes(option.id.toString())) selectedArr.splice(index, 1);
								else selectedArr.push(option.id.toString());
								handleScopeSelection(selectedArr);
							}}
							className={cn(
								"flex w-full cursor-pointer items-center gap-2 rounded-md border text-xs font-medium px-2 py-1 hover:bg-text-foreground",
								validateIsSelected({ id: option.id.toString(), selected })
									? " border-primary text-primary bg-primary/10"
									: "border-primary/40 opacity-40 bg-transparent text-primary/80",
							)}
							size={"fit"}
							variant={validateIsSelected({ id: option.id.toString(), selected }) ? "default" : "ghost"}
						>
							<Avatar className="h-5 w-5 min-w-5 min-h-5">
								<AvatarImage src={option.image_url || undefined} alt={option.label} />
								<AvatarFallback>{formatNameAsInitials(option.label)}</AvatarFallback>
							</Avatar>
							<p className="text-primary/80 text-xs font-medium">{option.label}</p>
						</Button>
					))}
				</div>
			</div>
		);
	}
	return isDesktop ? (
		<Dialog open onOpenChange={(v) => (!v ? closeMenu() : null)}>
			<DialogContent className="flex flex-col h-fit min-h-[60vh] max-h-[60vh] dark:bg-background">
				<DialogHeader>
					<DialogTitle>{MENU_TITLE}</DialogTitle>
					<DialogDescription>{MENU_DESCRIPTION}</DialogDescription>
				</DialogHeader>

				<div className="flex-1 overflow-auto">
					<ScopeSelectionMenuContent />
				</div>
				<DialogFooter>
					<DialogClose asChild>
						<Button variant="outline">FECHAR</Button>
					</DialogClose>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	) : (
		<Drawer open onOpenChange={(v) => (!v ? closeMenu() : null)}>
			<DrawerContent className="h-fit max-h-[70vh] flex flex-col">
				<DrawerHeader className="text-left">
					<DrawerTitle>{MENU_TITLE}</DrawerTitle>
					<DrawerDescription>{MENU_DESCRIPTION}</DrawerDescription>
				</DrawerHeader>

				<div className="flex-1 overflow-auto">
					<ScopeSelectionMenuContent />
				</div>
				<DrawerFooter>
					<DrawerClose asChild>
						<Button variant="outline">FECHAR</Button>
					</DrawerClose>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	);
}
