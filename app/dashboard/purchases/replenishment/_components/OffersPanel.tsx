"use client";

import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { formatToMoney } from "@/lib/formatting";
import { appRoutes } from "@/lib/navigation/routes";
import { buildOfferSuggestion, type TReplenishmentItem } from "@/lib/replenishment";
import { cn } from "@/lib/utils";
import { PackageCheck, Sparkles, Tag } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { formatCoverage, formatQuantity, StatusChip } from "./replenishment-formatting";

type OffersPanelProps = {
	items: TReplenishmentItem[];
	diasExcessoLimite: number;
};

// A aba de ofertas responde à outra metade da pergunta de compras: o que já foi comprado demais.
// O desconto sugerido nunca fura o piso de margem, e sobressalentes ficam de fora por definição —
// liquidar peça de reposição resolve o indicador e cria a ruptura do mês seguinte.
export function OffersPanel({ items, diasExcessoLimite }: OffersPanelProps) {
	const candidatos = useMemo(() => {
		return items
			.map((item) => ({ item, oferta: buildOfferSuggestion({ item, diasExcessoLimite }) }))
			.filter((entry) => entry.item.status === "EXCESSO" || entry.item.status === "SEM_GIRO")
			.sort((a, b) => b.oferta.capitalParado - a.oferta.capitalParado);
	}, [items, diasExcessoLimite]);

	const elegiveis = candidatos.filter((entry) => entry.oferta.elegivel);
	const capitalTotal = elegiveis.reduce((acc, entry) => acc + entry.oferta.capitalParado, 0);

	if (candidatos.length === 0) {
		return (
			<Empty>
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<PackageCheck />
					</EmptyMedia>
					<EmptyTitle>Nenhum produto em excesso no filtro atual</EmptyTitle>
					<EmptyDescription>
						Todo o estoque analisado está dentro da cobertura de {diasExcessoLimite} dias. Ajuste o limite na política de compra para revisar o critério.
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
		);
	}

	return (
		<div className="flex w-full flex-col gap-3">
			<div className="border-border bg-card flex flex-wrap items-center justify-between gap-3 rounded-xl border px-3 py-2.5">
				<div className="flex flex-col">
					<span className="text-sm font-bold tracking-tight">
						{elegiveis.length} {elegiveis.length === 1 ? "produto pode virar oferta" : "produtos podem virar oferta"}
					</span>
					<span className="text-muted-foreground text-[0.7rem] font-medium">
						{formatToMoney(capitalTotal)} em capital parado além da cobertura de {diasExcessoLimite} dias
					</span>
				</div>
				<Button variant="outline" size="sm" asChild>
					<Link href={appRoutes.growth.newCoupon()}>
						<Sparkles className="h-4 w-4" />
						CRIAR CUPOM
					</Link>
				</Button>
			</div>

			{candidatos.map(({ item, oferta }) => (
				<div
					key={item.produtoId}
					className={cn(
						"bg-card border-border flex w-full flex-col gap-3 rounded-xl border px-3 py-3 shadow-2xs lg:flex-row lg:items-center",
						!oferta.elegivel && "opacity-70",
					)}
				>
					<div className="min-w-0 lg:w-80 lg:shrink-0">
						<div className="flex flex-wrap items-center gap-1.5">
							<StatusChip status={item.status} />
							{item.sobressalente ? (
								<span className="rounded bg-zinc-200 px-1.5 py-0.5 text-[0.6rem] font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
									SOBRESSALENTE
								</span>
							) : null}
						</div>
						<Link href={appRoutes.catalog.product(item.produtoId)} className="hover:text-primary mt-1 block truncate text-sm font-bold tracking-tight">
							{item.nome}
						</Link>
						<span className="text-muted-foreground text-[0.65rem] font-medium">{item.codigo}</span>
					</div>

					<div className="flex grow flex-wrap items-center gap-x-6 gap-y-2">
						<Metric label="Estoque">{formatQuantity(item.estoqueAtual, item.unidade)}</Metric>
						<Metric label="Cobertura">{formatCoverage(item.coberturaDias)}</Metric>
						<Metric label="Excedente" title="Saldo além da cobertura saudável — o que pode ser ofertado sem criar ruptura depois">
							{formatQuantity(Math.round(oferta.excedenteUnidades), item.unidade)}
						</Metric>
						<Metric label="Capital parado" tone="text-orange-600 dark:text-orange-400">
							{formatToMoney(oferta.capitalParado)}
						</Metric>
						<Metric label="Preço atual">{item.valores.precoVenda != null ? formatToMoney(item.valores.precoVenda) : "—"}</Metric>
						{oferta.elegivel && oferta.descontoSugeridoPercentual != null ? (
							<>
								{/* Sem ícone de porcentagem: o número já carrega o "%", e os dois juntos leem "% 23%". */}
								<Metric label="Desconto sugerido" tone="text-primary">
									-{oferta.descontoSugeridoPercentual.toFixed(0)}%
								</Metric>
								<Metric label="Preço na oferta" title={`Máximo sem furar a margem mínima: ${oferta.descontoMaximoPercentual?.toFixed(0)}% de desconto`}>
									<span className="inline-flex items-center gap-1">
										<Tag className="h-3.5 w-3.5 min-h-3.5 min-w-3.5" />
										{formatToMoney(oferta.precoSugerido ?? 0)}
									</span>
								</Metric>
								<Metric label="Margem na oferta" tone="text-green-600 dark:text-green-400">
									{oferta.margemNoPrecoSugerido?.toFixed(1)}%
								</Metric>
							</>
						) : (
							<span className="text-muted-foreground max-w-md text-[0.7rem] font-medium">{oferta.motivo}</span>
						)}
					</div>
				</div>
			))}
		</div>
	);
}

function Metric({ label, children, tone, title }: { label: string; children: React.ReactNode; tone?: string; title?: string }) {
	return (
		<div className="flex flex-col gap-0.5" title={title}>
			<span className="text-muted-foreground text-[0.6rem] font-bold tracking-wider uppercase">{label}</span>
			<span className={cn("text-sm font-bold tracking-tight tabular-nums", tone)}>{children}</span>
		</div>
	);
}
