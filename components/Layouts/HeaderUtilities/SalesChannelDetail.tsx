"use client";

import { Button } from "@/components/ui/button";
import type { TSalesChannelStatusDTO } from "@/lib/sales-channels/status";
import { DEFAULT_SHOP_TIME_ZONE } from "@/lib/shop/availability";
import { cn } from "@/lib/utils";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { ChannelMark } from "./ChannelMark";

/**
 * Conteúdo do popover de um canal: por que o canal está nesse estado e para onde ir para mudá-lo.
 *
 * As ações de escrita (pausar loja, ligar/desligar a loja digital) ainda não moram aqui — o bloco
 * de ações existe com um destino só, e é onde elas entram quando chegarem.
 */

const CHANNEL_DESTINATION: Record<TSalesChannelStatusDTO["canal"], { href: string; rotulo: string }> = {
	IFOOD: { href: "/dashboard/integrations/ifood", rotulo: "Gerenciar integração" },
	LOJA_DIGITAL: { href: "/dashboard/catalog/store", rotulo: "Configurar loja digital" },
};

/** "Hoje às 18:00" / "sábado às 08:00" — no fuso da loja, o mesmo em que o horário foi cadastrado. */
function formatNextOpening(iso: string) {
	const date = new Date(iso);
	const timeZone = DEFAULT_SHOP_TIME_ZONE;
	const hora = new Intl.DateTimeFormat("pt-BR", { timeZone, hour: "2-digit", minute: "2-digit" }).format(date);

	const hoje = new Intl.DateTimeFormat("en-CA", { timeZone, dateStyle: "short" });
	if (hoje.format(date) === hoje.format(new Date())) return `Hoje às ${hora}`;

	const dia = new Intl.DateTimeFormat("pt-BR", { timeZone, weekday: "long" }).format(date);
	return `${dia.charAt(0).toUpperCase()}${dia.slice(1)} às ${hora}`;
}

type SalesChannelDetailProps = {
	canal: TSalesChannelStatusDTO;
	estadoRotulo: string;
};

export function SalesChannelDetail({ canal, estadoRotulo }: SalesChannelDetailProps) {
	const destino = CHANNEL_DESTINATION[canal.canal];

	return (
		<div className="flex flex-col">
			<div className="flex flex-col gap-1 px-4 pb-3 pt-4">
				<div className="flex items-center justify-between gap-2">
					<div className="flex min-w-0 items-center gap-1.5">
						<ChannelMark canal={canal.canal} size="md" />
						<h3 className="truncate text-sm font-bold leading-none tracking-tight">{canal.rotulo}</h3>
					</div>
					<span className="shrink-0 text-xs font-semibold text-muted-foreground">{estadoRotulo}</span>
				</div>
				{canal.detalhe ? <p className="text-xs leading-snug text-muted-foreground">{canal.detalhe}</p> : null}
				{canal.proximaAbertura ? <p className="text-xs leading-snug text-foreground/80">Abre {formatNextOpening(canal.proximaAbertura).toLowerCase()}.</p> : null}
				{canal.lojas > 1 ? <p className="text-xs leading-snug text-muted-foreground">{canal.lojas} lojas conectadas neste canal.</p> : null}
			</div>

			{canal.operacoes.length > 0 ? (
				<div className="flex flex-col gap-1.5 border-t border-border px-4 py-3">
					{canal.operacoes.map((operacao) => (
						<div key={operacao.nome} className="flex items-center justify-between gap-2">
							<span className="text-xs text-foreground/80">{operacao.nome}</span>
							<span className={cn("text-xs font-semibold", operacao.disponivel ? "text-success" : "text-muted-foreground")}>
								{operacao.disponivel ? "Disponível" : "Indisponível"}
							</span>
						</div>
					))}
				</div>
			) : null}

			<div className="border-t border-border p-2">
				<Button variant="ghost" size="sm" asChild className="w-full justify-between">
					<Link href={destino.href}>
						{destino.rotulo}
						<ArrowUpRight className="size-4 shrink-0" />
					</Link>
				</Button>
			</div>
		</div>
	);
}
