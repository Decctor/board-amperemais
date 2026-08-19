import { cn } from "@/lib/utils";
import type { PropsWithChildren, ReactNode } from "react";

/**
 * Cabeçalho de grupo para as seções de configuração que NÃO são formulário — pilhas de painéis com
 * interação própria (dispositivos, impressão, fila), onde SettingsFormCard criaria card dentro de
 * card. Uma vocabulário só: ícone + título, ações à direita, descrição embaixo.
 *
 * As ações moram no cabeçalho de propósito: solta entre dois cards, uma barra de botões não diz a
 * que grupo pertence — foi o que fez "ATIVAR DISPOSITIVO" parecer parte do card de download.
 */
type SettingsPanelSectionProps = PropsWithChildren<{
	title: string;
	icon?: ReactNode;
	description?: string;
	action?: ReactNode;
	className?: string;
}>;

export default function SettingsPanelSection({ title, icon, description, action, className, children }: SettingsPanelSectionProps) {
	return (
		<section className={cn("flex w-full flex-col gap-3", className)}>
			<div className="flex w-full flex-col gap-2 md:flex-row md:items-start md:justify-between">
				<div className="flex min-w-0 flex-col gap-1">
					<div className="flex items-center gap-2 text-muted-foreground">
						{icon}
						<h2 className="text-xs font-extrabold uppercase tracking-[0.08em] text-foreground">{title}</h2>
					</div>
					{description ? <p className="max-w-[62ch] text-xs text-muted-foreground">{description}</p> : null}
				</div>
				{action ? <div className="flex shrink-0 flex-wrap items-center gap-2 md:justify-end">{action}</div> : null}
			</div>
			{children}
		</section>
	);
}
