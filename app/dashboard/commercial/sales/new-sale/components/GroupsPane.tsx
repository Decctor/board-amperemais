import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Grid, Search } from "lucide-react";

type GroupsPaneProps = {
	groups: string[];
	selectedGroup: string | null;
	onGroupSelect: (group: string | null) => void;
	searchValue: string;
	onSearchChange: (value: string) => void;
	isLoading?: boolean;
};

export default function GroupsPane({ groups, selectedGroup, onGroupSelect, searchValue, onSearchChange, isLoading }: GroupsPaneProps) {
	return (
		<div className="flex flex-col gap-4 h-full">
			{/* Search Input */}
			<div className="relative">
				<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
				<Input
					value={searchValue}
					onChange={(e) => onSearchChange(e.target.value)}
					placeholder="Buscar produto..."
					className="pl-10 h-12 rounded-xl"
					disabled={isLoading}
				/>
			</div>

			{/* Groups List */}
			<div className="flex-1 min-h-0">
				<h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Categorias</h3>
				<ScrollArea className="h-full pr-4">
					<div className="flex flex-col gap-2">
						{/* All Products */}
						<Button
							variant={selectedGroup === null ? "default" : "ghost"}
							onClick={() => onGroupSelect(null)}
							className={cn("justify-start h-auto py-3 px-4 rounded-xl font-bold text-left", selectedGroup === null && "shadow-md")}
							disabled={isLoading}
						>
							<Grid className="w-4 h-4 min-w-4 min-h-4 mr-2" />
							Todos os Produtos
						</Button>

						{/* Individual Groups */}
						{groups.map((group) => (
							<Button
								key={group}
								variant={selectedGroup === group ? "default" : "ghost"}
								onClick={() => onGroupSelect(group)}
								className={cn(
									"justify-start h-auto py-3 px-4 rounded-xl font-bold text-left whitespace-normal",
									selectedGroup === group && "shadow-md",
								)}
								disabled={isLoading}
							>
								{group}
							</Button>
						))}
					</div>
				</ScrollArea>
			</div>
		</div>
	);
}
