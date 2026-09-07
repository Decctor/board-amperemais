"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Ban, Lock } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Ações indisponíveis com o motivo escrito ao lado.
 *
 * Um botão desabilitado que só explica o bloqueio em tooltip não explica nada: tooltip não abre no
 * toque, e quem está travado precisa ler o motivo sem descobrir que existe um motivo. Então o
 * motivo é texto, na linha, sempre visível.
 *
 * `blockedBy` separa as duas perguntas que o operador faz: "não posso" (permissão — chamar quem
 * pode) e "ainda não / não mais" (estado do registro — esperar ou escolher outro caminho).
 */

function BlockedActionsRoot({ className, children }: { className?: string; children: ReactNode }) {
	return (
		<div data-slot="blocked-actions" className={cn("flex flex-col gap-1 rounded-lg border border-dashed bg-muted/10 px-2.5 py-2", className)}>
			{children}
		</div>
	);
}

type BlockedActionItemProps = {
	reason: ReactNode;
	blockedBy?: "permission" | "state";
	icon?: ReactNode;
	className?: string;
	children: ReactNode;
};

function BlockedActionsItem({ reason, blockedBy = "state", icon, className, children }: BlockedActionItemProps) {
	const fallbackIcon = blockedBy === "permission" ? <Lock /> : <Ban />;
	return (
		<div data-slot="blocked-action" className={cn("flex flex-wrap items-center gap-x-2 gap-y-0.5", className)}>
			<Button type="button" size="xs" variant="outline" disabled className="h-6 gap-1 px-2 text-micro opacity-60">
				{icon ?? fallbackIcon}
				{children}
			</Button>
			<span className="text-micro leading-snug font-normal text-muted-foreground">{reason}</span>
		</div>
	);
}

export const BlockedActions = {
	Root: BlockedActionsRoot,
	Item: BlockedActionsItem,
};
