"use client";

import ErrorComponent from "@/components/Layouts/ErrorComponent";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import ControlProductionRecipe from "@/components/Modals/Internal/Productions/ControlProductionRecipe";
import NewProductionRecipe from "@/components/Modals/Internal/Productions/NewProductionRecipe";
import GeneralPaginationComponent from "@/components/Utils/Pagination";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TGetProductionRecipesOutputDefault } from "@/app/api/productions/recipes/route";
import { getErrorMessage } from "@/lib/errors";
import { formatDateAsLocale } from "@/lib/formatting";
import { useProductionRecipes } from "@/lib/queries/productions";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarPlus, Clock, Factory, Package, PackageCheck, Pencil, Plus } from "lucide-react";
import { useState } from "react";

export default function ProductionsPage() {
	const queryClient = useQueryClient();
	const [newRecipeModalIsOpen, setNewRecipeModalIsOpen] = useState(false);
	const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
	const { data, isLoading, isError, isSuccess, error, queryKey, filters, updateFilters } = useProductionRecipes({
		initialFilters: { page: 1, search: "", activeOnly: true },
	});

	const recipes = data?.recipes ?? [];
	const recipesMatched = data?.recipesMatched ?? 0;
	const recipesShowing = recipes.length;
	const totalPages = data?.totalPages ?? 0;

	const handleOnMutate = async () => await queryClient.cancelQueries({ queryKey });
	const handleOnSettled = async () => await queryClient.invalidateQueries({ queryKey });

	return (
		<Tabs defaultValue="receitas" className="flex w-full flex-col gap-3">
			<TabsList>
				<TabsTrigger value="receitas">RECEITAS</TabsTrigger>
			</TabsList>
			<TabsContent value="receitas" className="flex w-full flex-col gap-3">
				<div className="flex w-full flex-col-reverse items-stretch gap-2 lg:flex-row lg:items-center">
					<Input
						value={filters.search ?? ""}
						placeholder="Pesquisar receita..."
						onChange={(event) => updateFilters({ search: event.target.value, page: 1 })}
						className="grow rounded-xl"
					/>
					<Button className="flex w-full items-center gap-2 lg:w-auto" size="sm" onClick={() => setNewRecipeModalIsOpen(true)}>
						<Plus className="h-4 w-4" />
						NOVA RECEITA
					</Button>
				</div>

				<GeneralPaginationComponent
					activePage={filters.page}
					queryLoading={isLoading}
					selectPage={(page) => updateFilters({ page })}
					totalPages={totalPages || 0}
					itemsMatchedText={recipesMatched === 1 ? "1 receita encontrada." : `${recipesMatched} receitas encontradas.`}
					itemsShowingText={recipesShowing === 1 ? "Mostrando 1 receita." : `Mostrando ${recipesShowing} receitas.`}
				/>

				{isLoading ? <LoadingComponent /> : null}
				{isError ? <ErrorComponent msg={getErrorMessage(error)} /> : null}

				{isSuccess && recipes.length > 0
					? recipes.map((recipe) => <ProductionRecipeCard key={recipe.id} recipe={recipe} onEdit={() => setEditingRecipeId(recipe.id)} />)
					: null}

				{isSuccess && recipes.length === 0 ? (
					<Empty>
						<EmptyHeader>
							<EmptyMedia variant="icon">
								<Factory />
							</EmptyMedia>
							<EmptyTitle>{filters.search ? "Nenhuma receita corresponde à busca" : "Nenhuma receita encontrada"}</EmptyTitle>
							<EmptyDescription>
								{filters.search
									? "Revise o termo pesquisado ou limpe a busca para ver todas as receitas."
									: "Cadastre fichas técnicas para transformar insumos em produtos finais."}
							</EmptyDescription>
						</EmptyHeader>
						<EmptyContent className="flex-row justify-center gap-2">
							<Button onClick={() => setNewRecipeModalIsOpen(true)}>CRIAR RECEITA</Button>
						</EmptyContent>
					</Empty>
				) : null}

				{newRecipeModalIsOpen ? (
					<NewProductionRecipe closeModal={() => setNewRecipeModalIsOpen(false)} callbacks={{ onMutate: handleOnMutate, onSettled: handleOnSettled }} />
				) : null}
				{editingRecipeId ? (
					<ControlProductionRecipe
						productionRecipeId={editingRecipeId}
						closeModal={() => setEditingRecipeId(null)}
						callbacks={{ onMutate: handleOnMutate, onSettled: handleOnSettled }}
					/>
				) : null}
			</TabsContent>
		</Tabs>
	);
}

type ProductionRecipeCardProps = {
	recipe: TGetProductionRecipesOutputDefault["recipes"][number];
	onEdit: () => void;
};

function ProductionRecipeCard({ recipe, onEdit }: ProductionRecipeCardProps) {
	const hasDuration = Boolean(recipe.previsaoTempoValor && recipe.previsaoTempoMedida);

	return (
		<div className="flex w-full flex-col gap-3 rounded-xl border border-border bg-card px-4 py-4 shadow-2xs">
			<div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
				<div className="flex min-w-0 gap-3">
					<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
						<Factory className="h-4 w-4" />
					</div>
					<div className="min-w-0">
						<h2 className="truncate text-sm font-bold tracking-tight">{recipe.titulo}</h2>
						{recipe.descricao ? <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{recipe.descricao}</p> : null}
					</div>
				</div>
				<Button variant="ghost" size="xs" onClick={onEdit} className="self-start">
					<Pencil className="h-4 w-4" />
					EDITAR
				</Button>
			</div>

			<div className="flex flex-wrap items-center gap-2 text-[0.7rem] font-medium text-muted-foreground">
				<span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1">
					<Package className="h-3.5 w-3.5" />
					{recipe.insumos.length} insumo(s)
				</span>
				<span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1">
					<PackageCheck className="h-3.5 w-3.5" />
					{recipe.saidas.length} saída(s)
				</span>
				{hasDuration ? (
					<span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1">
						<Clock className="h-3.5 w-3.5" />
						{`${recipe.previsaoTempoValor} ${recipe.previsaoTempoMedida?.toLowerCase()}`}
					</span>
				) : null}
				<span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1">
					<CalendarPlus className="h-3.5 w-3.5" />
					{formatDateAsLocale(recipe.dataInsercao, true)}
				</span>
			</div>
		</div>
	);
}
