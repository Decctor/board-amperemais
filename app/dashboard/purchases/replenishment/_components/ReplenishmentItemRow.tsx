"use client";

import type { TReplenishmentItem } from "@/lib/replenishment";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { formatDateAsLocale, formatToMoney } from "@/lib/formatting";
import { appRoutes } from "@/lib/navigation/routes";
import { cn } from "@/lib/utils";
import { BadgeDollarSign, Boxes, CalendarClock, Code, Diamond, ExternalLink, Settings2, Ship, Truck } from "lucide-react";
import Link from "next/link";
import { formatCoverage, formatQuantity, StatusChip, TrendIcon } from "./replenishment-formatting";

type ReplenishmentItemRowProps = {
	item: TReplenishmentItem;
	selected: boolean;
	quantidade: number;
	onToggleSelected: () => void;
	onChangeQuantidade: (value: number) => void;
	onOpenPolicy: () => void;
};

function Metric({ label, children, tone, title }: { label: string; children: React.ReactNode; tone?: string; title?: string }) {
	return (
		<div className="flex flex-col gap-0.5" title={title}>
			<span className="text-muted-foreground text-[0.6rem] font-bold tracking-wider uppercase">{label}</span>
			<span className={cn("text-sm font-bold tracking-tight tabular-nums", tone)}>{children}</span>
		</div>
	);
}

export function ReplenishmentItemRow({ item, selected, quantidade, onToggleSelected, onChangeQuantidade, onOpenPolicy }: ReplenishmentItemRowProps) {
	const coberturaTone =
		item.coberturaDias == null
			? "text-muted-foreground"
			: item.coberturaDias < item.politica.leadTimeDias
				? "text-red-600 dark:text-red-400"
				: item.coberturaDias < item.politica.leadTimeDias + item.politica.cicloRevisaoDias
					? "text-yellow-700 dark:text-yellow-400"
					: "text-foreground";

	return (
		<div
			className={cn(
				"bg-card border-border flex w-full flex-col gap-3 rounded-xl border px-3 py-3 shadow-2xs transition-colors duration-200 lg:flex-row lg:items-center",
				selected ? "border-primary/60 bg-primary/5" : "hover:border-primary/40",
			)}
		>
			<div className="flex min-w-0 items-start gap-3 lg:w-80 lg:shrink-0">
				<Checkbox checked={selected} onCheckedChange={onToggleSelected} className="mt-1" aria-label={`Selecionar ${item.nome}`} />
				<div className="min-w-0">
					<div className="flex flex-wrap items-center gap-1.5">
						<StatusChip status={item.status} />
						<span
							className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[0.6rem] font-bold"
							title="Curva ABC (faturamento) + XYZ (regularidade da demanda)"
						>
							{item.classeAbc}
							{item.demanda.regularidade}
						</span>
						{item.sobressalente ? (
							<span className="rounded bg-zinc-200 px-1.5 py-0.5 text-[0.6rem] font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
								SOBRESSALENTE
							</span>
						) : null}
						{item.origemEstoque === "IMPORTACAO" ? (
							<span
								className="rounded bg-indigo-100 px-1.5 py-0.5 text-[0.6rem] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
								title="Saldo vindo da última posição de estoque importada"
							>
								IMPORTADO
							</span>
						) : null}
					</div>
					<Link href={appRoutes.catalog.product(item.produtoId)} className="hover:text-primary mt-1 block truncate text-sm font-bold tracking-tight">
						{item.nome}
					</Link>
					<div className="text-foreground/70 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[0.65rem] font-medium">
						<span className="inline-flex items-center gap-1">
							<Code className="h-3 w-3 min-h-3 min-w-3" />
							{item.codigo}
						</span>
						{item.grupo ? (
							<span className="inline-flex items-center gap-1">
								<Diamond className="h-3 w-3 min-h-3 min-w-3" />
								{item.grupo}
							</span>
						) : null}
						{item.fornecedor.nome ? (
							<span className="inline-flex items-center gap-1" title={`Fornecedor (${item.fornecedor.origem.toLowerCase()})`}>
								<Truck className="h-3 w-3 min-h-3 min-w-3" />
								{item.fornecedor.nome}
							</span>
						) : null}
					</div>
				</div>
			</div>

			<div className="flex grow flex-wrap items-center gap-x-5 gap-y-3">
				<Metric label="Estoque" title="Saldo físico disponível">
					<span className="inline-flex items-center gap-1">
						<Boxes className="text-muted-foreground h-3.5 w-3.5 min-h-3.5 min-w-3.5" />
						{formatQuantity(item.estoqueAtual, item.unidade)}
					</span>
				</Metric>

				{item.estoqueEmTransito > 0 ? (
					<Metric label="A caminho" tone="text-blue-600 dark:text-blue-400" title="Já pedido ao fornecedor e ainda não recebido — descontado da sugestão">
						<span className="inline-flex items-center gap-1">
							<Ship className="h-3.5 w-3.5 min-h-3.5 min-w-3.5" />
							{formatQuantity(item.estoqueEmTransito)}
						</span>
					</Metric>
				) : null}

				<Metric label="Saída/mês" title={`${formatQuantity(item.demanda.quantidadeTotalJanela)} no período analisado`}>
					<span className="inline-flex items-center gap-1">
						<TrendIcon tendencia={item.demanda.tendencia} />
						{formatQuantity(item.demanda.demandaMensal)}
					</span>
				</Metric>

				<Metric
					label="Cobertura"
					tone={coberturaTone}
					title={
						item.dataRupturaPrevista
							? `Estoque acaba por volta de ${formatDateAsLocale(item.dataRupturaPrevista)} · prazo do fornecedor: ${item.politica.leadTimeDias} dias`
							: "Sem saída na janela analisada"
					}
				>
					<span className="inline-flex items-center gap-1">
						<CalendarClock className="h-3.5 w-3.5 min-h-3.5 min-w-3.5" />
						{formatCoverage(item.coberturaDias)}
					</span>
				</Metric>

				<Metric label="Ponto de pedido" title="Saldo a partir do qual comprar deixa de ser opcional">
					{formatQuantity(Math.round(item.plano.pontoPedido))}
				</Metric>

				<Metric label="Preço venda">{item.valores.precoVenda != null ? formatToMoney(item.valores.precoVenda) : "—"}</Metric>

				<Metric
					label="Custo médio"
					title={item.valores.dataUltimaCompra ? `Última compra em ${formatDateAsLocale(item.valores.dataUltimaCompra)}` : undefined}
				>
					<span className="inline-flex items-center gap-1">
						<BadgeDollarSign className="text-muted-foreground h-3.5 w-3.5 min-h-3.5 min-w-3.5" />
						{item.valores.custoMedio != null ? formatToMoney(item.valores.custoMedio) : "—"}
					</span>
				</Metric>

				<Metric
					label="Margem"
					tone={
						item.valores.margemPercentual == null
							? undefined
							: item.valores.margemPercentual < 0
								? "text-red-600 dark:text-red-400"
								: "text-green-600 dark:text-green-400"
					}
					title={item.valores.markupPercentual != null ? `Markup sobre o custo: ${item.valores.markupPercentual.toFixed(1)}%` : undefined}
				>
					{item.valores.margemPercentual != null ? `${item.valores.margemPercentual.toFixed(1)}%` : "—"}
				</Metric>

				{item.perdaPotencial > 0 ? (
					<Metric
						label="Venda em risco"
						tone="text-red-600 dark:text-red-400"
						title="Margem estimada que se perde se o item faltar até a mercadoria chegar"
					>
						{formatToMoney(item.perdaPotencial)}
					</Metric>
				) : null}
			</div>

			<div className="flex shrink-0 items-end gap-2 border-t pt-3 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-4">
				<div className="flex flex-col gap-0.5">
					<span className="text-muted-foreground text-[0.6rem] font-bold tracking-wider uppercase">Comprar</span>
					<div className="flex items-center gap-1">
						<Input
							type="number"
							min={0}
							step={item.politica.multiploCompra ?? 1}
							value={Number.isFinite(quantidade) ? quantidade : 0}
							onChange={(event) => onChangeQuantidade(Number(event.target.value))}
							className="h-9 w-24 rounded-lg text-sm font-bold tabular-nums"
							aria-label={`Quantidade a comprar de ${item.nome}`}
						/>
						<span className="text-muted-foreground text-[0.65rem] font-medium">{item.unidade}</span>
					</div>
					<span className="text-muted-foreground text-[0.65rem] font-medium tabular-nums">
						{item.valores.custoMedio != null ? formatToMoney(quantidade * item.valores.custoMedio) : "—"}
					</span>
				</div>
				<Button variant="ghost" size="icon" onClick={onOpenPolicy} title="Política de compra deste produto" aria-label="Política de compra deste produto">
					<Settings2 className="h-4 w-4" />
				</Button>
				<Button variant="ghost" size="icon" asChild title="Abrir produto" aria-label="Abrir produto">
					<Link href={appRoutes.catalog.product(item.produtoId)}>
						<ExternalLink className="h-4 w-4" />
					</Link>
				</Button>
			</div>
		</div>
	);
}
