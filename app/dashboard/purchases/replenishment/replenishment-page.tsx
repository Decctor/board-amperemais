"use client";

import ErrorComponent from "@/components/Layouts/ErrorComponent";
import GeneralPaginationComponent from "@/components/Utils/Pagination";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getErrorMessage } from "@/lib/errors";
import { formatDateAsLocale, formatToMoney } from "@/lib/formatting";
import { buildReplenishmentSearchParams, useReplenishment } from "@/lib/queries/replenishment";
import type { TReplenishmentItem } from "@/lib/replenishment";
import { useQueryClient } from "@tanstack/react-query";
import { FileSpreadsheet, PackageSearch, Settings2, Upload } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { OffersPanel } from "./_components/OffersPanel";
import { ProductPolicyModal } from "./_components/ProductPolicyModal";
import { QuotationExportModal } from "./_components/QuotationExportModal";
import { ReplenishmentFilters } from "./_components/ReplenishmentFilters";
import { ReplenishmentItemRow } from "./_components/ReplenishmentItemRow";
import { ReplenishmentPolicyModal } from "./_components/ReplenishmentPolicyModal";
import { ReplenishmentSummaryAlert, ReplenishmentSummaryCards } from "./_components/ReplenishmentSummaryCards";
import { StockPositionImportModal } from "./_components/StockPositionImportModal";

export default function ReplenishmentPage() {
	const queryClient = useQueryClient();
	const { data, isLoading, isError, isSuccess, error, filters, debouncedFilters, updateFilters, resetFilters } = useReplenishment();

	const [modal, setModal] = useState<"policy" | "import" | "export" | null>(null);
	const [productPolicyItem, setProductPolicyItem] = useState<TReplenishmentItem | null>(null);
	const [selectedIds, setSelectedIds] = useState<string[]>([]);
	// Quantidades editadas na tela. Só guardamos o que a compradora mudou de fato: o resto continua
	// vindo do cálculo, e assim uma nova leitura não sobrescreve nem congela as sugestões.
	const [quantidadesEditadas, setQuantidadesEditadas] = useState<Record<string, number>>({});

	const items = useMemo(() => data?.items ?? [], [data]);
	const resumo = data?.resumo;
	const settings = data?.configuracao;

	const resolveQuantidade = useCallback(
		(item: TReplenishmentItem) => quantidadesEditadas[item.produtoId] ?? item.plano.quantidadeSugerida,
		[quantidadesEditadas],
	);

	const selecionados = useMemo(() => items.filter((item) => selectedIds.includes(item.produtoId)), [items, selectedIds]);
	const itensParaExportar = selecionados.length > 0 ? selecionados : items;
	const valorEstimado = useMemo(
		() => itensParaExportar.reduce((acc, item) => acc + resolveQuantidade(item) * (item.valores.custoMedio ?? 0), 0),
		[itensParaExportar, resolveQuantidade],
	);

	function toggleSelected(produtoId: string) {
		setSelectedIds((previous) => (previous.includes(produtoId) ? previous.filter((id) => id !== produtoId) : [...previous, produtoId]));
	}

	function invalidateAnalysis() {
		queryClient.invalidateQueries({ queryKey: ["replenishment"] });
		queryClient.invalidateQueries({ queryKey: ["replenishment-settings"] });
		queryClient.invalidateQueries({ queryKey: ["stock-position-imports"] });
	}

	return (
		<div className="flex w-full flex-col gap-4">
			<div className="flex w-full flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
				<div className="flex flex-col">
					<h1 className="text-lg font-black tracking-tight">Reposição de estoque</h1>
					<p className="text-muted-foreground text-xs font-medium">
						O que precisa ser comprado agora, quanto comprar e o que já foi comprado demais.
						{data?.periodo ? (
							<span className="ml-1">
								Demanda medida entre {formatDateAsLocale(data.periodo.inicio)} e {formatDateAsLocale(data.periodo.fim)}.
							</span>
						) : null}
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<Button variant="outline" size="sm" onClick={() => setModal("import")}>
						<Upload className="h-4 w-4" />
						IMPORTAR ESTOQUE
					</Button>
					<Button variant="outline" size="sm" onClick={() => setModal("policy")}>
						<Settings2 className="h-4 w-4" />
						POLÍTICA
					</Button>
					<Button size="sm" onClick={() => setModal("export")} disabled={items.length === 0}>
						<FileSpreadsheet className="h-4 w-4" />
						EXPORTAR COTAÇÃO
					</Button>
				</div>
			</div>

			{/* O saldo importado tem idade: uma posição de três dias atrás muda a leitura da cobertura, e
			    a tela precisa dizer isso em vez de apresentar o número como se fosse de agora. */}
			{data?.posicaoEstoque.origem === "IMPORTACAO" ? (
				<div className="flex flex-wrap items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300">
					<Upload className="h-4 w-4 min-h-4 min-w-4" />
					<span>
						Saldo vindo da posição importada de {formatDateAsLocale(data.posicaoEstoque.dataPosicao)}
						{data.posicaoEstoque.arquivoNome ? ` (${data.posicaoEstoque.arquivoNome})` : ""} · {data.posicaoEstoque.produtosCobertos} produtos cobertos. Os
						demais usam o saldo do RecompraCRM.
					</span>
				</div>
			) : null}

			<ReplenishmentSummaryCards resumo={resumo} />
			<ReplenishmentSummaryAlert resumo={resumo} />

			<Tabs defaultValue="comprar" className="w-full">
				<TabsList>
					<TabsTrigger value="comprar">Comprar</TabsTrigger>
					<TabsTrigger value="excesso">Excesso e ofertas</TabsTrigger>
				</TabsList>

				<TabsContent value="comprar" className="flex w-full flex-col gap-4 pt-3">
					<ReplenishmentFilters
						filters={filters}
						grupos={data?.filtros.grupos ?? []}
						fornecedores={data?.filtros.fornecedores ?? []}
						updateFilters={updateFilters}
						resetFilters={resetFilters}
					/>

					{selectedIds.length > 0 ? (
						<div className="border-primary/40 bg-primary/5 flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2">
							<span className="text-xs font-bold tracking-tight">
								{selectedIds.length} {selectedIds.length === 1 ? "produto selecionado" : "produtos selecionados"} · {formatToMoney(valorEstimado)}
							</span>
							<Button variant="ghost" size="sm" onClick={() => setSelectedIds([])}>
								LIMPAR SELEÇÃO
							</Button>
						</div>
					) : null}

					<GeneralPaginationComponent
						activePage={filters.page}
						queryLoading={isLoading}
						selectPage={(page) => updateFilters({ page })}
						totalPages={data?.totalPages ?? 0}
						itemsMatchedText={resumo?.produtosAnalisados === 1 ? "1 produto na análise." : `${resumo?.produtosAnalisados ?? 0} produtos na análise.`}
						itemsShowingText={items.length === 1 ? "Mostrando 1 produto." : `Mostrando ${items.length} produtos.`}
					/>

					{isLoading ? (
						<div className="flex flex-col gap-2">
							{Array.from({ length: 6 }).map((_, index) => (
								<Skeleton key={index} className="h-28 w-full rounded-xl" />
							))}
						</div>
					) : null}
					{isError ? <ErrorComponent msg={getErrorMessage(error)} /> : null}

					{isSuccess && items.length > 0
						? items.map((item) => (
								<ReplenishmentItemRow
									key={item.produtoId}
									item={item}
									selected={selectedIds.includes(item.produtoId)}
									quantidade={resolveQuantidade(item)}
									onToggleSelected={() => toggleSelected(item.produtoId)}
									onChangeQuantidade={(value) =>
										setQuantidadesEditadas((previous) => ({ ...previous, [item.produtoId]: Number.isFinite(value) ? Math.max(value, 0) : 0 }))
									}
									onOpenPolicy={() => setProductPolicyItem(item)}
								/>
							))
						: null}

					{isSuccess && items.length === 0 ? (
						<Empty>
							<EmptyHeader>
								<EmptyMedia variant="icon">
									<PackageSearch />
								</EmptyMedia>
								<EmptyTitle>Nenhum produto nesse recorte</EmptyTitle>
								<EmptyDescription>
									{filters.coberturaMaximaDias != null
										? `Nenhum produto está com menos de ${filters.coberturaMaximaDias} dias de cobertura — o que é uma boa notícia. Aumente o limite ou limpe os filtros para ver o resto do catálogo.`
										: "Ajuste os filtros ou importe a posição de estoque para que a cobertura possa ser calculada."}
								</EmptyDescription>
							</EmptyHeader>
						</Empty>
					) : null}
				</TabsContent>

				<TabsContent value="excesso" className="flex w-full flex-col gap-4 pt-3">
					<ReplenishmentFilters
						filters={filters}
						grupos={data?.filtros.grupos ?? []}
						fornecedores={data?.filtros.fornecedores ?? []}
						updateFilters={updateFilters}
						resetFilters={resetFilters}
					/>
					{isLoading ? <Skeleton className="h-40 w-full rounded-xl" /> : null}
					{isSuccess ? <OffersPanel items={items} diasExcessoLimite={settings?.diasExcessoLimite ?? 30} /> : null}
				</TabsContent>
			</Tabs>

			{modal === "policy" && settings ? (
				<ReplenishmentPolicyModal settings={settings} closeModal={() => setModal(null)} onSaved={invalidateAnalysis} />
			) : null}
			{modal === "import" ? <StockPositionImportModal closeModal={() => setModal(null)} onImported={invalidateAnalysis} /> : null}
			{modal === "export" ? (
				<QuotationExportModal
					searchParams={buildReplenishmentSearchParams(debouncedFilters)}
					produtoIds={selecionados.map((item) => item.produtoId)}
					quantidades={quantidadesEditadas}
					valorEstimado={valorEstimado}
					closeModal={() => setModal(null)}
				/>
			) : null}
			{productPolicyItem ? (
				<ProductPolicyModal item={productPolicyItem} closeModal={() => setProductPolicyItem(null)} onSaved={invalidateAnalysis} />
			) : null}
		</div>
	);
}
