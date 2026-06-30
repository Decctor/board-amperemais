"use client";

import type { TGetProductionsOutputDefault } from "@/app/api/productions/route";
import type { TGetProductionRecipesOutputDefault } from "@/app/api/productions/recipes/route";
import ErrorComponent from "@/components/Layouts/ErrorComponent";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import ControlProduction from "@/components/Modals/Internal/Productions/ControlProduction";
import ControlProductionRecipe from "@/components/Modals/Internal/Productions/ControlProductionRecipe";
import NewProduction from "@/components/Modals/Internal/Productions/NewProduction";
import NewProductionRecipe from "@/components/Modals/Internal/Productions/NewProductionRecipe";
import GeneralPaginationComponent from "@/components/Utils/Pagination";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getErrorMessage } from "@/lib/errors";
import { formatDateAsLocale } from "@/lib/formatting";
import { completeProduction } from "@/lib/mutations/productions";
import { cn } from "@/lib/utils";
import { useProductionRecipes, useProductions } from "@/lib/queries/productions";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus, CheckCircle2, Clock, Factory, Package, PackageCheck, Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const PRODUCTION_STATUS_CONFIG = {
	RASCUNHO: { label: "Rascunho", className: "bg-muted text-muted-foreground" },
	PLANEJADA: { label: "Planejada", className: "bg-primary/10 text-primary" },
	EM_PRODUCAO: { label: "Em produção", className: "bg-brand/30 text-foreground" },
	CONCLUIDA: { label: "Concluída", className: "bg-green-100 text-green-700" },
	CANCELADA: { label: "Cancelada", className: "bg-destructive/10 text-destructive" },
} as const;

export default function ProductionsPage() {
	const queryClient = useQueryClient();
	const [newProductionModalIsOpen, setNewProductionModalIsOpen] = useState(false);
	const [newRecipeModalIsOpen, setNewRecipeModalIsOpen] = useState(false);
	const [editingProductionId, setEditingProductionId] = useState<string | null>(null);
	const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);

	const productionsQuery = useProductions({
		initialFilters: { page: 1, search: "", status: [], origem: [], periodAfter: null, periodBefore: null },
	});
	const recipesQuery = useProductionRecipes({
		initialFilters: { page: 1, search: "", activeOnly: true },
	});

	const handleProductionsOnMutate = async () => await queryClient.cancelQueries({ queryKey: productionsQuery.queryKey });
	const handleProductionsOnSettled = async () => await queryClient.invalidateQueries({ queryKey: productionsQuery.queryKey });
	const handleRecipesOnMutate = async () => await queryClient.cancelQueries({ queryKey: recipesQuery.queryKey });
	const handleRecipesOnSettled = async () => await queryClient.invalidateQueries({ queryKey: recipesQuery.queryKey });
	const { mutate: handleCompleteProductionMutation, isPending: productionCompletionIsPending } = useMutation({
		mutationKey: ["complete-production"],
		mutationFn: completeProduction,
		onMutate: handleProductionsOnMutate,
		onSuccess: (data) => toast.success(data.message),
		onError: (error) => toast.error(getErrorMessage(error)),
		onSettled: handleProductionsOnSettled,
	});

	return (
		<Tabs defaultValue="producoes" className="flex w-full flex-col gap-3">
			<TabsList>
				<TabsTrigger value="producoes">PRODUÇÕES</TabsTrigger>
				<TabsTrigger value="receitas">RECEITAS</TabsTrigger>
			</TabsList>
			<TabsContent value="producoes" className="flex w-full flex-col gap-3">
				<ProductionsTab
					query={productionsQuery}
					onCreate={() => setNewProductionModalIsOpen(true)}
					onEdit={(productionId) => setEditingProductionId(productionId)}
					onComplete={(productionId) => handleCompleteProductionMutation({ productionId })}
					completionIsPending={productionCompletionIsPending}
				/>
			</TabsContent>
			<TabsContent value="receitas" className="flex w-full flex-col gap-3">
				<RecipesTab query={recipesQuery} onCreate={() => setNewRecipeModalIsOpen(true)} onEdit={(recipeId) => setEditingRecipeId(recipeId)} />
			</TabsContent>

			{newProductionModalIsOpen ? (
				<NewProduction
					closeModal={() => setNewProductionModalIsOpen(false)}
					callbacks={{ onMutate: handleProductionsOnMutate, onSettled: handleProductionsOnSettled }}
				/>
			) : null}
			{editingProductionId ? (
				<ControlProduction
					productionId={editingProductionId}
					closeModal={() => setEditingProductionId(null)}
					callbacks={{ onMutate: handleProductionsOnMutate, onSettled: handleProductionsOnSettled }}
				/>
			) : null}
			{newRecipeModalIsOpen ? (
				<NewProductionRecipe
					closeModal={() => setNewRecipeModalIsOpen(false)}
					callbacks={{ onMutate: handleRecipesOnMutate, onSettled: handleRecipesOnSettled }}
				/>
			) : null}
			{editingRecipeId ? (
				<ControlProductionRecipe
					productionRecipeId={editingRecipeId}
					closeModal={() => setEditingRecipeId(null)}
					callbacks={{ onMutate: handleRecipesOnMutate, onSettled: handleRecipesOnSettled }}
				/>
			) : null}
		</Tabs>
	);
}

type ProductionsTabProps = {
	query: ReturnType<typeof useProductions>;
	onCreate: () => void;
	onEdit: (productionId: string) => void;
	onComplete: (productionId: string) => void;
	completionIsPending: boolean;
};

function ProductionsTab({ query, onCreate, onEdit, onComplete, completionIsPending }: ProductionsTabProps) {
	const productions = query.data?.productions ?? [];
	const productionsMatched = query.data?.productionsMatched ?? 0;
	const productionsShowing = productions.length;
	const totalPages = query.data?.totalPages ?? 0;

	return (
		<>
			<div className="flex w-full flex-col-reverse items-stretch gap-2 lg:flex-row lg:items-center">
				<Input
					value={query.filters.search ?? ""}
					placeholder="Pesquisar produção..."
					onChange={(event) => query.updateFilters({ search: event.target.value, page: 1 })}
					className="grow rounded-xl"
				/>
				<Button className="flex w-full items-center gap-2 lg:w-auto" size="sm" onClick={onCreate}>
					<Plus className="h-4 w-4" />
					NOVA PRODUÇÃO
				</Button>
			</div>

			<GeneralPaginationComponent
				activePage={query.filters.page}
				queryLoading={query.isLoading}
				selectPage={(page) => query.updateFilters({ page })}
				totalPages={totalPages || 0}
				itemsMatchedText={productionsMatched === 1 ? "1 produção encontrada." : `${productionsMatched} produções encontradas.`}
				itemsShowingText={productionsShowing === 1 ? "Mostrando 1 produção." : `Mostrando ${productionsShowing} produções.`}
			/>

			{query.isLoading ? <LoadingComponent /> : null}
			{query.isError ? <ErrorComponent msg={getErrorMessage(query.error)} /> : null}

			{query.isSuccess && productions.length > 0
				? productions.map((production) => (
						<ProductionCard
							key={production.id}
							production={production}
							onEdit={() => onEdit(production.id)}
							onComplete={() => onComplete(production.id)}
							completionIsPending={completionIsPending}
						/>
					))
				: null}

			{query.isSuccess && productions.length === 0 ? (
				<Empty>
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<Factory />
						</EmptyMedia>
						<EmptyTitle>{query.filters.search ? "Nenhuma produção corresponde à busca" : "Nenhuma produção encontrada"}</EmptyTitle>
						<EmptyDescription>
							{query.filters.search
								? "Revise o termo pesquisado ou limpe a busca para ver todas as produções."
								: "Registre produções para controlar insumos consumidos e produtos gerados."}
						</EmptyDescription>
					</EmptyHeader>
					<EmptyContent className="flex-row justify-center gap-2">
						<Button onClick={onCreate}>CRIAR PRODUÇÃO</Button>
					</EmptyContent>
				</Empty>
			) : null}
		</>
	);
}

type RecipesTabProps = {
	query: ReturnType<typeof useProductionRecipes>;
	onCreate: () => void;
	onEdit: (recipeId: string) => void;
};

function RecipesTab({ query, onCreate, onEdit }: RecipesTabProps) {
	const recipes = query.data?.recipes ?? [];
	const recipesMatched = query.data?.recipesMatched ?? 0;
	const recipesShowing = recipes.length;
	const totalPages = query.data?.totalPages ?? 0;

	return (
		<>
			<div className="flex w-full flex-col-reverse items-stretch gap-2 lg:flex-row lg:items-center">
				<Input
					value={query.filters.search ?? ""}
					placeholder="Pesquisar receita..."
					onChange={(event) => query.updateFilters({ search: event.target.value, page: 1 })}
					className="grow rounded-xl"
				/>
				<Button className="flex w-full items-center gap-2 lg:w-auto" size="sm" onClick={onCreate}>
					<Plus className="h-4 w-4" />
					NOVA RECEITA
				</Button>
			</div>

			<GeneralPaginationComponent
				activePage={query.filters.page}
				queryLoading={query.isLoading}
				selectPage={(page) => query.updateFilters({ page })}
				totalPages={totalPages || 0}
				itemsMatchedText={recipesMatched === 1 ? "1 receita encontrada." : `${recipesMatched} receitas encontradas.`}
				itemsShowingText={recipesShowing === 1 ? "Mostrando 1 receita." : `Mostrando ${recipesShowing} receitas.`}
			/>

			{query.isLoading ? <LoadingComponent /> : null}
			{query.isError ? <ErrorComponent msg={getErrorMessage(query.error)} /> : null}

			{query.isSuccess && recipes.length > 0
				? recipes.map((recipe) => <ProductionRecipeCard key={recipe.id} recipe={recipe} onEdit={() => onEdit(recipe.id)} />)
				: null}

			{query.isSuccess && recipes.length === 0 ? (
				<Empty>
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<Factory />
						</EmptyMedia>
						<EmptyTitle>{query.filters.search ? "Nenhuma receita corresponde à busca" : "Nenhuma receita encontrada"}</EmptyTitle>
						<EmptyDescription>
							{query.filters.search
								? "Revise o termo pesquisado ou limpe a busca para ver todas as receitas."
								: "Cadastre fichas técnicas para transformar insumos em produtos finais."}
						</EmptyDescription>
					</EmptyHeader>
					<EmptyContent className="flex-row justify-center gap-2">
						<Button onClick={onCreate}>CRIAR RECEITA</Button>
					</EmptyContent>
				</Empty>
			) : null}
		</>
	);
}

type ProductionCardProps = {
	production: TGetProductionsOutputDefault["productions"][number];
	onEdit: () => void;
	onComplete: () => void;
	completionIsPending: boolean;
};

function ProductionCard({ production, onEdit, onComplete, completionIsPending }: ProductionCardProps) {
	const statusConfig = PRODUCTION_STATUS_CONFIG[production.status];
	const canComplete = production.status !== "CONCLUIDA" && production.status !== "CANCELADA";

	return (
		<div className="flex w-full flex-col gap-3 rounded-xl border border-border bg-card px-4 py-4 shadow-2xs">
			<div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
				<div className="flex min-w-0 gap-3">
					<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
						<Factory className="h-4 w-4" />
					</div>
					<div className="min-w-0">
						<div className="flex flex-wrap items-center gap-2">
							<h2 className="truncate text-sm font-bold tracking-tight">{production.titulo}</h2>
							<span className={cn("rounded-full px-2 py-0.5 text-[0.65rem] font-semibold", statusConfig.className)}>{statusConfig.label}</span>
						</div>
						{production.receita?.titulo ? <p className="line-clamp-1 text-xs leading-relaxed text-muted-foreground">{production.receita.titulo}</p> : null}
					</div>
				</div>
				<div className="flex flex-wrap items-center gap-2 self-start">
					{canComplete ? (
						<Button variant="ghost-default" size="xs" onClick={onComplete} disabled={completionIsPending}>
							<CheckCircle2 className="h-4 w-4" />
							CONCLUIR
						</Button>
					) : null}
					<Button variant="ghost" size="xs" onClick={onEdit}>
						<Pencil className="h-4 w-4" />
						EDITAR
					</Button>
				</div>
			</div>

			<div className="flex flex-wrap items-center gap-2 text-[0.7rem] font-medium text-muted-foreground">
				<span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1">
					<Package className="h-3.5 w-3.5" />
					{production.entradas.length} entrada(s)
				</span>
				<span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1">
					<PackageCheck className="h-3.5 w-3.5" />
					{production.saidas.length} saída(s)
				</span>
				{production.dataPrevisaoConclusao ? (
					<span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1">
						<Clock className="h-3.5 w-3.5" />
						{formatDateAsLocale(production.dataPrevisaoConclusao, false)}
					</span>
				) : null}
				<span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1">
					<CalendarPlus className="h-3.5 w-3.5" />
					{formatDateAsLocale(production.dataInsercao, true)}
				</span>
			</div>
		</div>
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
