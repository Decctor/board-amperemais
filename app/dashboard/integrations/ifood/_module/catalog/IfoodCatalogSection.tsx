"use client";

import ErrorComponent from "@/components/Layouts/ErrorComponent";
import { Button } from "@/components/ui/button";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getErrorMessage } from "@/lib/errors";
import type { TIfoodCategoryDTO } from "@/lib/integrations/ifood/catalog-types";
import { upgradeIfoodCatalog } from "@/lib/mutations/ifood";
import { useIfoodCatalogs, useIfoodCategories } from "@/lib/queries/ifood";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Plus, Store, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { IfoodSectionEmpty } from "../shared/IfoodSectionEmpty";
import { IfoodSectionLoading } from "../shared/IfoodSectionLoading";
import { CategoryCard } from "./CategoryCard";
import { ControlIfoodCategory } from "./ControlIfoodCategory";
import { NewIfoodCategory } from "./NewIfoodCategory";
import { NewIfoodProduct } from "./NewIfoodProduct";

type IfoodCatalogSectionProps = {
	merchantId: string | null;
	canManage: boolean;
};

/**
 * Seção de catálogo: seleção de catálogo, detecção de versão (V1 exige upgrade para gestão via API)
 * e gestão de categorias, produtos e itens.
 */
export function IfoodCatalogSection({ merchantId, canManage }: IfoodCatalogSectionProps) {
	const queryClient = useQueryClient();
	const catalogsQuery = useIfoodCatalogs({ merchantId });
	const [selectedCatalogId, setSelectedCatalogId] = useState<string | null>(null);
	const [newCategoryIsOpen, setNewCategoryIsOpen] = useState(false);
	const [editingCategory, setEditingCategory] = useState<TIfoodCategoryDTO | null>(null);
	const [newProductCategoryId, setNewProductCategoryId] = useState<string | null>(null);
	const [newProductIsOpen, setNewProductIsOpen] = useState(false);

	const catalogs = catalogsQuery.data?.catalogos ?? [];
	const version = catalogsQuery.data?.versao ?? null;
	const isV1 = version === "V1";

	useEffect(() => {
		if (!selectedCatalogId && catalogs.length > 0) setSelectedCatalogId(catalogs[0].id);
	}, [catalogs, selectedCatalogId]);

	const categoriesQuery = useIfoodCategories({ merchantId, catalogId: isV1 ? null : selectedCatalogId });
	const categories = categoriesQuery.data ?? [];

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

	function invalidateCategories() {
		queryClient.invalidateQueries({ queryKey: categoriesQuery.queryKey });
	}

	const canManageCatalog = canManage && !!merchantId && !isV1 && !!selectedCatalogId && !catalogsQuery.isLoading && !catalogsQuery.isError;

	return (
		<SectionWrapper
			title="CATÁLOGO"
			icon={<BookOpen className="w-4 h-4 min-w-4 min-h-4" />}
			actions={
				canManageCatalog ? (
					<div className="flex items-center gap-1">
						<Button variant="ghost" size="xs" onClick={() => setNewCategoryIsOpen(true)} className="flex items-center gap-1">
							<Plus className="w-4 h-4 min-w-4 min-h-4" />
							NOVA CATEGORIA
						</Button>
						<Button
							variant="ghost"
							size="xs"
							disabled={categories.length === 0}
							onClick={() => {
								setNewProductCategoryId(null);
								setNewProductIsOpen(true);
							}}
							className="flex items-center gap-1"
						>
							<Plus className="w-4 h-4 min-w-4 min-h-4" />
							NOVO PRODUTO
						</Button>
					</div>
				) : null
			}
		>
			{!merchantId ? (
				<IfoodSectionEmpty icon={Store} message="Selecione uma loja para gerenciar o catálogo." />
			) : catalogsQuery.isLoading ? (
				<IfoodSectionLoading rows={3} />
			) : catalogsQuery.isError ? (
				<ErrorComponent msg={catalogsQuery.error instanceof Error ? catalogsQuery.error.message : "Erro ao carregar o catálogo."} />
			) : (
				<>
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
						<IfoodSectionEmpty icon={BookOpen} message="Nenhum catálogo encontrado para esta loja." />
					) : isV1 ? null : (
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

							{categoriesQuery.isLoading ? (
								<IfoodSectionLoading rows={3} />
							) : categoriesQuery.isError ? (
								<ErrorComponent msg={categoriesQuery.error instanceof Error ? categoriesQuery.error.message : "Erro ao carregar as categorias."} />
							) : categories.length === 0 ? (
								<IfoodSectionEmpty icon={BookOpen} message="Nenhuma categoria no catálogo desta loja." />
							) : (
								<div className="flex w-full flex-col gap-3">
									{categories.map((category) => (
										<CategoryCard
											key={category.id}
											merchantId={merchantId}
											category={category}
											canManage={canManage}
											onEdit={() => setEditingCategory(category)}
											onAddProduct={() => {
												setNewProductCategoryId(category.id);
												setNewProductIsOpen(true);
											}}
											onChanged={invalidateCategories}
										/>
									))}
								</div>
							)}
						</>
					)}
				</>
			)}

			{newCategoryIsOpen && merchantId && selectedCatalogId ? (
				<NewIfoodCategory
					merchantId={merchantId}
					catalogId={selectedCatalogId}
					closeModal={() => setNewCategoryIsOpen(false)}
					callbacks={{ onSuccess: invalidateCategories }}
				/>
			) : null}

			{editingCategory && merchantId && selectedCatalogId ? (
				<ControlIfoodCategory
					merchantId={merchantId}
					catalogId={selectedCatalogId}
					category={editingCategory}
					closeModal={() => setEditingCategory(null)}
					callbacks={{ onSuccess: invalidateCategories }}
				/>
			) : null}

			{newProductIsOpen && merchantId ? (
				<NewIfoodProduct
					merchantId={merchantId}
					categories={categories}
					initialCategoryId={newProductCategoryId}
					closeModal={() => setNewProductIsOpen(false)}
					callbacks={{ onSuccess: invalidateCategories }}
				/>
			) : null}
		</SectionWrapper>
	);
}
