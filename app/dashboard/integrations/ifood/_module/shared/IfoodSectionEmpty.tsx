import type { LucideIcon } from "lucide-react";

type IfoodSectionEmptyProps = {
	icon: LucideIcon;
	message: string;
};

/** Estado vazio padrão do corpo das seções do iFood. */
export function IfoodSectionEmpty({ icon: Icon, message }: IfoodSectionEmptyProps) {
	return (
		<div className="flex w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border p-6 text-center">
			<Icon className="h-5 w-5 text-muted-foreground" />
			<p className="text-sm text-muted-foreground">{message}</p>
		</div>
	);
}
