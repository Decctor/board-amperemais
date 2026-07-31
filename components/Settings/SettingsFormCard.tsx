import type { PropsWithChildren, ReactNode } from "react";

/**
 * Card único de formulário das seções de configuração: grupos internos separados por divisor e
 * a barra de ações no rodapé, onde a leitura do formulário termina. Substitui o padrão antigo de
 * vários cards soltos com o salvar flutuando no topo.
 */
export function SettingsFormCard({ children, footer }: PropsWithChildren<{ footer?: ReactNode }>) {
	return (
		<div className="bg-card border-border divide-border flex w-full flex-col divide-y rounded-xl border shadow-xs">
			{children}
			{footer ? <div className="flex items-center justify-end px-4 py-3">{footer}</div> : null}
		</div>
	);
}

export function SettingsFormSection({ title, icon, children }: PropsWithChildren<{ title?: string; icon?: ReactNode }>) {
	return (
		<section className="flex w-full flex-col gap-4 px-4 py-5">
			{title ? (
				<div className="flex items-center gap-1.5">
					{icon}
					<h3 className="text-xs font-bold tracking-tight uppercase">{title}</h3>
				</div>
			) : null}
			{children}
		</section>
	);
}
