import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

type EmptyContentPlaceholderProps = {
	icon?: LucideIcon;
	title?: string;
	description?: string;
};

export function EmptyContentPlaceholder({
	icon: Icon = Inbox,
	title = "Nenhum conteúdo por aqui",
	description = "Em breve teremos novos materiais disponíveis.",
}: EmptyContentPlaceholderProps) {
	return (
		<div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 py-14 text-center">
			<div className="mb-4 rounded-full bg-primary/8 p-4">
				<Icon className="size-8 text-primary/70" strokeWidth={1.5} />
			</div>
			<h3 className="text-base font-semibold tracking-tight">{title}</h3>
			<p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
		</div>
	);
}
