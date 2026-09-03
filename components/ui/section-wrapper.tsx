import { cn } from "@/lib/utils";
import type { PropsWithChildren } from "react";

type SectionWrapperProps = PropsWithChildren<{
	title: string;
	icon?: React.ReactNode;
	actions?: React.ReactNode;
	wrapperClassName?: string;
}>;

export function SectionWrapper({ children, title, icon, actions, wrapperClassName }: SectionWrapperProps) {
	return (
		// Sem `min-h-0` na raiz: dentro de um pai flex de altura fixa, `min-h-0` deixa a seção
		// encolher abaixo do próprio conteúdo — e o conteúdo vaza para fora da borda em vez de
		// esticar o cartão. Encolher assim é comportamento de painel com rolagem interna, que se
		// pede via `wrapperClassName="min-h-0"`, não o padrão. O `min-h-0` da div interna abaixo é
		// outro: aquele é o que habilita a rolagem interna quando a altura vem de fora.
		<div className={cn("bg-card border-border flex w-full flex-col gap-6 rounded-xl border px-3 py-4 shadow-xs", wrapperClassName)}>
			<div className="flex items-center justify-between min-h-8">
				<div className="flex items-center gap-1">
					{icon}
					<h1 className="text-xs font-bold tracking-tight uppercase">{title}</h1>
				</div>
				{actions}
			</div>
			<div className="flex w-full min-h-0 flex-1 flex-col gap-3">{children}</div>
		</div>
	);
}

export function SectionWrapperDataRow({ icon, label, value }: { label: string; value: string; icon?: React.ReactNode }) {
	return (
		<div className="flex w-full items-center gap-1.5">
			{icon}
			<h3 className="text-sm font-semibold tracking-tighter text-foreground/80 shrink-0">{label}</h3>
			<h3 className="text-sm font-semibold tracking-tight">{value}</h3>
		</div>
	);
}
