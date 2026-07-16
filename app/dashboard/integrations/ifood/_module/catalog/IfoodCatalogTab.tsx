"use client";

import ErrorComponent from "@/components/Layouts/ErrorComponent";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getErrorMessage } from "@/lib/errors";
import { upgradeIfoodCatalog } from "@/lib/mutations/ifood";
import { useIfoodCatalogs, useIfoodCategories } from "@/lib/queries/ifood";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BookOpen, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CategoryCard } from "./CategoryCard";

type IfoodCatalogTabProps = {
	merchantId: string | null;
	canManage: boolean;
};

/**
 * Aba de catálogo: seleção de catálogo, detecção de versão (V1 exige upgrade para gestão via API)
 * e listagem de categorias com seus itens.
 */
export function IfoodCatalogTab({ merchantId, canManage }: IfoodCatalogTabProps) {
	const queryClient = useQueryClient();
	const catalogsQuery = useIfoodCatalogs({ merchantId });
	const [selectedCatalogId, setSelectedCatalogId] = useState<string | null>(null);

	const catalogs = catalogsQuery.data?.catalogos ?? [];
	const version = catalogsQuery.data?.versao ?? null;
	const isV1 = version === "V1";

	useEffect(() => {
		if (!selectedCatalogId && catalogs.length > 0) setSelectedCatalogId(catalogs[0].id);
	}, [catalogs, selectedCatalogId]);

	const categoriesQuery = useIfoodCategories({ merchantId, catalogId: isV1 ? null : selectedCatalogId });

	const { mutate: upgradeCatalog, isPending: upgradeIsPending } = useMutation({
		mutationKey: ["upgrade-ifood-catalog", merchantId],
		mutationFn: upgradeIfoodCatalog,
		onSuccess: (data) => {
			toast.success(data.message);
			queryClient.invalidateQueries({ queryKey: catalogsQuery.queryKey });
		},
		onError: (error) => {
			toast.error(getErrorMessage(error));
		},
	});

	if (!merchantId) return null;
	if (catalogsQuery.isLoading) return <LoadingComponent />;
	if (catalogsQuery.isError)
		return <ErrorComponent msg={catalogsQuery.error instanceof Error ? catalogsQuery.error.message : "Erro ao carregar o catálogo."} />;

	return (
		<div className="flex w-full flex-col gap-3">
			{isV1 ? (
				<div className="flex w-full flex-col gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex items-start gap-2">
						<TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
						<div className="flex flex-col gap-0.5">
							<p className="text-sm font-medium text-foreground">Catálogo na versão 1</p>
							<p className="text-xs text-muted-foreground">
								A gestão de catálogo pela API exige a versão 2. O upgrade é definitivo e passa a valer também no Portal do Parceiro.
							</p>
						</div>
					</div>
					{canManage ? (
						<Button
							variant="outline"
							size="sm"
							disabled={upgradeIsPending}
							onClick={() => {
								if (confirm("Atualizar o catálogo desta loja para a versão 2? Essa ação não pode ser desfeita.")) {
									upgradeCatalog({ merchantId, acao: "UPGRADE" });
								}
							}}
						>
							{upgradeIsPending ? "ATUALIZANDO..." : "ATUALIZAR PARA V2"}
						</Button>
					) : null}
				</div>
			) : null}

			{catalogs.length === 0 ? (
				<div className="flex w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border p-6 text-center">
					<BookOpen className="h-5 w-5 text-muted-foreground" />
					<p className="text-sm text-muted-foreground">Nenhum catálogo encontrado para esta loja.</p>
				</div>
			) : (
				<>
					{catalogs.length > 1 ? (
						<Select value={selectedCatalogId ?? undefined} onValueChange={setSelectedCatalogId}>
							<SelectTrigger className="w-full sm:w-[280px]">
								<SelectValue placeholder="Selecione o catálogo" />
							</SelectTrigger>
							<SelectContent>
								{catalogs.map((catalog) => (
									<SelectItem key={catalog.id} value={catalog.id}>
										{catalog.contextos.length ? catalog.contextos.join(", ") : catalog.id}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					) : null}

					{isV1 ? null : categoriesQuery.isLoading ? (
						<LoadingComponent />
					) : categoriesQuery.isError ? (
						<ErrorComponent msg={categoriesQuery.error instanceof Error ? categoriesQuery.error.message : "Erro ao carregar as categorias."} />
					) : (categoriesQuery.data ?? []).length === 0 ? (
						<div className="flex w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border p-6 text-center">
							<BookOpen className="h-5 w-5 text-muted-foreground" />
							<p className="text-sm text-muted-foreground">Nenhuma categoria no catálogo desta loja.</p>
						</div>
					) : (
						<div className="flex w-full flex-col gap-3">
							{(categoriesQuery.data ?? []).map((category) => (
								<CategoryCard key={category.id} category={category} />
							))}
						</div>
					)}
				</>
			)}
		</div>
	);
}
