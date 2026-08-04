import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export default function DeleteRowButton({
	onRemove,
	ariaLabel = "Remover linha",
	disabled = false,
}: {
	onRemove: () => void;
	ariaLabel?: string;
	disabled?: boolean;
}) {
	return (
		<Button
			type="button"
			variant="ghost"
			size="icon"
			onClick={onRemove}
			disabled={disabled}
			aria-label={ariaLabel}
			className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:ring-destructive/30"
		>
			<Trash2 className="h-4 w-4" />
		</Button>
	);
}
