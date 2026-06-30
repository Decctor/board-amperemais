"use client";

import type { TGetProductStockLotsDefaultInput, TGetProductStockLotsOutputDefault } from "@/app/api/products/stock-lots/route";
import ErrorComponent from "@/components/Layouts/ErrorComponent";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import DiscardStockLot from "@/components/Modals/Internal/StockLots/DiscardStockLot";
import GeneralPaginationComponent from "@/components/Utils/Pagination";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { getErrorMessage } from "@/lib/errors";
import { formatDateAsLocale } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import { useProductStockLots } from "@/lib/queries/product-stock-lots";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CalendarClock, Factory, PackageSearch, PackageX, ShoppingCart, Trash2 } from "lucide-react";
import { useState } from "react";

const STOCK_LOT_STATUS_CONFIG = {
	ATIVO: { label: "Ativo", className: "bg-green-100 text-green-700" },
	ESGOTADO: { label: "Esgotado", className: "bg-muted text-muted-foreground" },
	VENCIDO: { label: "Vencido", className: "bg-destructive/10 text-destructive" },
	DESCARTADO: { label: "Descartado", className: "bg-yellow-100 text-yellow-800" },
} as const;

type QuickFilterKey = "TODOS" | "ATIVOS" | "VENCENDO" | "VENCIDOS" | "ESGOTADOS" | "DESCARTADOS";

const QUICK_FILTERS: {
	key: QuickFilterKey;
	label: string;
	filters: Pick<TGetProductStockLotsDefaultInput, "status" | "dueInDays">;
}[] = [
	{ key: "TODOS", label: "Todos", filters: { status: [], dueInDays: null } },
	{ key: "ATIVOS", label: "Ativos", filters: { status: ["ATIVO"], dueInDays: null } },
	{ key: "VENCENDO", label: "Vencem em 7 dias", filters: { status: ["ATIVO"], dueInDays: 7 } },
	{ key: "VENCIDOS", label: "Vencidos", filters: { status: ["VENCIDO"], dueInDays: null } },
	{ key: "ESGOTADOS", label: "Esgotados", filters: { status: ["ESGOTADO"], dueInDays: null } },
	{ key: "DESCARTADOS", label: "Descartados", filters: { status: ["DESCARTADO"], dueInDays: null } },
];

export default function StockLotsPage() {
	const queryClient = useQueryClient();
	const [discardingStockLot, setDiscardingStockLot] = useState<TGetProductStockLotsOutputDefault["stockLots"][number] | null>(null);
	const query = useProductStockLots({
		initialFilters: { page: 1, search: "", status: [], produtoId: null, produtoVarianteId: null, dueInDays: null },
	});
	const activeQuickFilter = getActiveQuickFilter(query.filters);

	const handleStockLotsOnMutate = async () => await queryClient.cancelQueries({ queryKey: query.queryKey });
	const handleStockLotsOnSettled = async () => await queryClient.invalidateQueries({ queryKey: ["product-stock-lots"] });

	const stockLots = query.data?.stockLots ?? [];
	const stockLotsMatched = query.data?.stockLotsMatched ?? 0;
	const totalPages = query.data?.totalPages ?? 0;

	return (
		<div className="flex w-full flex-col gap-3">
			<div className="flex w-full flex-col gap-2">
				<Input
					value={query.filters.search ?? ""}
					placeholder="Pesquisar lote..."
					onChange={(event) => query.updateFilters({ search: event.target.value, page: 1 })}
					className="rounded-xl"
				/>
				<div className="flex flex-wrap gap-2">
					{QUICK_FILTERS.map((filter) => (
						<Button
							key={filter.key}
							variant={activeQuickFilter === filter.key ? "default" : "outline"}
							size="sm"
							onClick={() => query.updateFilters({ ...filter.filters, page: 1 })}
						>
							{filter.label}
						</Button>
					))}
				</div>
			</div>

			<GeneralPaginationComponent
				activePage={query.filters.page}
				queryLoading={query.isLoading}
				selectPage={(page) => query.updateFilters({ page })}
				totalPages={totalPages || 0}
				itemsMatchedText={stockLotsMatched === 1 ? "1 lote encontrado." : `${stockLotsMatched} lotes encontrados.`}
				itemsShowingText={stockLots.length === 1 ? "Mostrando 1 lote." : `Mostrando ${stockLots.length} lotes.`}
			/>

			{query.isLoading ? <LoadingComponent /> : null}
			{query.isError ? <ErrorComponent msg={getErrorMessage(query.error)} /> : null}

			{query.isSuccess && stockLots.length > 0
				? stockLots.map((stockLot) => <StockLotCard key={stockLot.id} stockLot={stockLot} onDiscard={() => setDiscardingStockLot(stockLot)} />)
				: null}

			{query.isSuccess && stockLots.length === 0 ? (
				<Empty>
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<PackageSearch />
						</EmptyMedia>
						<EmptyTitle>{query.filters.search ? "Nenhum lote corresponde à busca" : "Nenhum lote encontrado"}</EmptyTitle>
						<EmptyDescription>
							{query.filters.search
								? "Revise o termo pesquisado ou limpe a busca para ver todos os lotes."
								: "Lotes serão gerados por compras e produções de produtos com rastreamento de estoque ativo."}
						</EmptyDescription>
					</EmptyHeader>
					<EmptyContent />
				</Empty>
			) : null}

			{discardingStockLot ? (
				<DiscardStockLot
					stockLot={discardingStockLot}
					closeModal={() => setDiscardingStockLot(null)}
					callbacks={{ onMutate: handleStockLotsOnMutate, onSettled: handleStockLotsOnSettled }}
				/>
			) : null}
		</div>
	);
}

type StockLotCardProps = {
	stockLot: TGetProductStockLotsOutputDefault["stockLots"][number];
	onDiscard: () => void;
};

function StockLotCard({ stockLot, onDiscard }: StockLotCardProps) {
	const statusConfig = STOCK_LOT_STATUS_CONFIG[stockLot.statusEfetivo as keyof typeof STOCK_LOT_STATUS_CONFIG] ?? STOCK_LOT_STATUS_CONFIG.ATIVO;
	const productName = stockLot.produtoVariante?.nome ?? stockLot.produto?.nome ?? "Produto sem nome";
	const productCode = stockLot.produtoVariante?.codigo ?? stockLot.produto?.codigo ?? null;
	const canDiscard = stockLot.quantidadeAtual > 0 && stockLot.statusEfetivo !== "DESCARTADO" && stockLot.statusEfetivo !== "ESGOTADO";
	const validityTone =
		stockLot.statusEfetivo === "VENCIDO"
			? "text-destructive"
			: stockLot.diasAteValidade != null && stockLot.diasAteValidade <= 7
				? "text-yellow-700"
				: "text-muted-foreground";

	return (
		<div className="flex w-full flex-col gap-3 rounded-xl border border-border bg-card px-4 py-4 shadow-2xs">
			<div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
				<div className="flex min-w-0 gap-3">
					<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
						<PackageSearch className="h-4 w-4" />
					</div>
					<div className="min-w-0">
						<div className="flex flex-wrap items-center gap-2">
							<h2 className="truncate text-sm font-bold tracking-tight">{productName}</h2>
							<span className={cn("rounded-full px-2 py-0.5 text-[0.65rem] font-semibold", statusConfig.className)}>{statusConfig.label}</span>
						</div>
						<p className="line-clamp-1 text-xs leading-relaxed text-muted-foreground">
							{stockLot.codigoLote ? `Lote ${stockLot.codigoLote}` : "Lote sem código"}
							{productCode ? ` · Código ${productCode}` : ""}
						</p>
					</div>
				</div>
				{canDiscard ? (
					<Button variant="ghost-destructive" size="xs" onClick={onDiscard} className="self-start">
						<Trash2 className="h-4 w-4" />
						DESCARTAR
					</Button>
				) : null}
			</div>

			<div className="grid gap-2 text-[0.7rem] font-medium text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
				<span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1">
					<PackageX className="h-3.5 w-3.5" />
					Saldo {stockLot.quantidadeAtual} / {stockLot.quantidadeInicial}
				</span>
				<span className={cn("inline-flex items-center gap-1 rounded-full border border-border px-2 py-1", validityTone)}>
					<CalendarClock className="h-3.5 w-3.5" />
					{stockLot.dataValidade ? formatDateAsLocale(stockLot.dataValidade, false) : "Sem validade"}
				</span>
				<span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1">
					<Factory className="h-3.5 w-3.5" />
					{stockLot.producao?.titulo ?? "Sem produção"}
				</span>
				<span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1">
					<ShoppingCart className="h-3.5 w-3.5" />
					{stockLot.compra?.titulo ?? "Sem compra"}
				</span>
			</div>
			{stockLot.statusEfetivo === "VENCIDO" ? (
				<div className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
					<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
					<span>Este lote está vencido e deve ser retirado do fluxo de consumo.</span>
				</div>
			) : null}
		</div>
	);
}

function getActiveQuickFilter(filters: TGetProductStockLotsDefaultInput): QuickFilterKey {
	if (filters.dueInDays === 7 && filters.status.includes("ATIVO")) return "VENCENDO";
	if (filters.status.length === 1) {
		if (filters.status[0] === "ATIVO") return "ATIVOS";
		if (filters.status[0] === "VENCIDO") return "VENCIDOS";
		if (filters.status[0] === "ESGOTADO") return "ESGOTADOS";
		if (filters.status[0] === "DESCARTADO") return "DESCARTADOS";
	}
	return "TODOS";
}
