import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Grid } from "lucide-react";

type CategoriesBarProps = {
	groups: string[];
	selectedGroup: string | null;
	onGroupSelect: (group: string | null) => void;
	isLoading?: boolean;
};

export default function CategoriesBar({ groups, selectedGroup, onGroupSelect, isLoading }: CategoriesBarProps) {
	return (
		<div className="w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain touch-pan-x scrollbar-thin scrollbar-track-primary/10 scrollbar-thumb-primary/30">
			<div className="flex items-center gap-3 pb-1">
				<Button
					variant={selectedGroup === null ? "brand" : "ghost"}
					onClick={() => onGroupSelect(null)}
					className={cn("shrink-0 justify-start h-auto py-2 px-4 rounded-xl font-bold text-xs", selectedGroup === null && "shadow-md")}
					disabled={isLoading}
				>
					<Grid className="w-4 h-4 min-w-4 min-h-4 mr-2" />
					TODOS OS PRODUTOS
				</Button>

				{groups.map((group) => (
					<Button
						key={group}
						variant={selectedGroup === group ? "brand" : "ghost"}
						onClick={() => onGroupSelect(group)}
						className={cn("shrink-0 justify-start h-auto py-2 px-4 rounded-xl font-bold whitespace-nowrap text-xs", selectedGroup === group && "shadow-md")}
						disabled={isLoading}
					>
						{group}
					</Button>
				))}
			</div>
		</div>
	);
}
