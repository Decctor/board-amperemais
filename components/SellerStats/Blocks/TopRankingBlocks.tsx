"use client";

import type { TGetSellerStatsOutput } from "@/app/api/sellers/stats/route";
import { formatDecimalPlaces, formatToMoney } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import { ShoppingBag, UserRound } from "lucide-react";
import { createContext, use, useState } from "react";

// ---------------------------------------------------------------------------
// Primitivos compound: ranking top-10 com ordenação por valor/quantidade.
// O modo de ordenação vive no contexto do Frame — toggle e lista compartilham.
// ---------------------------------------------------------------------------

type TSortMode = "value" | "quantity";
type TRankingItem = { quantidade: number; total: number };

const TopRankingContext = createContext<{ sortMode: TSortMode; setSortMode: (mode: TSortMode) => void } | null>(null);

function useTopRankingContext() {
	const context = use(TopRankingContext);
	if (!context) throw new Error("Componentes TopRanking.* devem ser usados dentro de TopRanking.Frame.");
	return context;
}

function TopRankingFrame({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
	const [sortMode, setSortMode] = useState<TSortMode>("value");
	return (
		<TopRankingContext value={{ sortMode, setSortMode }}>
			<div className="bg-card border-border flex w-full flex-col gap-3 rounded-xl border px-3 py-4 shadow-2xs h-full">
				<div className="flex items-center justify-between">
					<h1 className="text-xs font-medium tracking-tight uppercase">{title}</h1>
					<div className="flex items-center gap-2">{icon}</div>
				</div>
				{children}
			</div>
		</TopRankingContext>
	);
}

function TopRankingSortToggle() {
	const { sortMode, setSortMode } = useTopRankingContext();
	return (
		<div className="flex items-center gap-1 w-full">
			{(
				[
					{ mode: "value", label: "VALOR" },
					{ mode: "quantity", label: "QUANTIDADE" },
				] as const
			).map(({ mode, label }) => (
				<button
					key={mode}
					type="button"
					onClick={() => setSortMode(mode)}
					className={cn(
						"px-2 py-1 text-[10px] font-medium tracking-tight rounded transition-colors",
						sortMode === mode ? "bg-primary text-foreground-foreground" : "bg-primary/10 text-foreground hover:bg-primary/20",
					)}
				>
					{label}
				</button>
			))}
		</div>
	);
}

function TopRankingList<T extends TRankingItem>({ data, getKey, getLabel }: { data: T[]; getKey: (item: T) => string; getLabel: (item: T) => string }) {
	const { sortMode } = useTopRankingContext();
	const sortedData = [...data].sort((a, b) => (sortMode === "value" ? b.total - a.total : b.quantidade - a.quantidade));

	return (
		<div className="w-full flex flex-col gap-2">
			{sortedData.slice(0, 10).map((item, index) => (
				<div key={getKey(item)} className="w-full flex items-center justify-between gap-2">
					<div className="flex items-center gap-1 flex-1 min-w-0">
						<div className="w-6 h-6 min-w-6 min-h-6 rounded-full flex items-center justify-center border border-border text-xs">{index + 1}º</div>
						<h1 className="text-xs font-medium tracking-tight uppercase truncate">{getLabel(item)}</h1>
					</div>
					<div className="flex items-center gap-2">
						<span className="text-xs font-bold tracking-tight">{sortMode === "value" ? formatToMoney(item.total) : formatDecimalPlaces(item.quantidade)}</span>
					</div>
				</div>
			))}
		</div>
	);
}

export const TopRanking = {
	Frame: TopRankingFrame,
	SortToggle: TopRankingSortToggle,
	List: TopRankingList,
};

// ---------------------------------------------------------------------------
// Variants explícitos: rankings do vendedor
// ---------------------------------------------------------------------------

type TSellerGroupedResults = TGetSellerStatsOutput["data"]["resultadosAgrupados"];

export function SellerTopProductsBlock({ data }: { data: TSellerGroupedResults["produto"] }) {
	return (
		<TopRanking.Frame title="TOP 10 PRODUTOS" icon={<ShoppingBag className="w-4 h-4 min-w-4 min-h-4" />}>
			<TopRanking.SortToggle />
			<TopRanking.List data={data} getKey={(item) => item.produtoId ?? item.produtoNome} getLabel={(item) => item.produtoNome} />
		</TopRanking.Frame>
	);
}

export function SellerTopClientsBlock({ data }: { data: TSellerGroupedResults["cliente"] }) {
	return (
		<TopRanking.Frame title="TOP 10 CLIENTES" icon={<UserRound className="w-4 h-4 min-w-4 min-h-4" />}>
			<TopRanking.SortToggle />
			<TopRanking.List data={data} getKey={(item) => item.clienteId ?? item.clienteNome ?? "sem-cliente"} getLabel={(item) => item.clienteNome ?? ""} />
		</TopRanking.Frame>
	);
}

export function SellerTopProductGroupsBlock({ data }: { data: TSellerGroupedResults["grupo"] }) {
	return (
		<TopRanking.Frame title="TOP 10 GRUPOS DE PRODUTO" icon={<ShoppingBag className="w-4 h-4 min-w-4 min-h-4" />}>
			<TopRanking.SortToggle />
			<TopRanking.List data={data} getKey={(item) => item.grupo ?? "sem-grupo"} getLabel={(item) => item.grupo ?? ""} />
		</TopRanking.Frame>
	);
}
