"use client";

import ErrorComponent from "@/components/Layouts/ErrorComponent";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import SectionApplyBar from "@/components/Utils/SectionApplyBar";
import { getErrorMessage } from "@/lib/errors";
import { type TSalesChannelShowcase, useSalesChannelShowcase } from "@/lib/queries/sales-channels";
import { cn } from "@/lib/utils";
import { useSalesChannelShowcaseSectionEditor } from "@/state-hooks/use-sales-channel-showcase-state";
import { AlertCircle } from "lucide-react";
import ShowcaseDraftRow from "./Blocks/ShowcaseDraftRow";
import ShowcaseGroupPanel from "./Blocks/ShowcaseGroupPanel";

const CATALOG_MODES = [
	{
		value: "TODOS",
		title: "Todos os produtos ativos",
		description: "Todo produto ativo e vendável entra na loja automaticamente. Remova aqui os que não devem aparecer.",
	},
	{
		value: "SELECIONADOS",
		title: "Somente os selecionados",
		description: "A loja mostra apenas os produtos desta lista. Produtos novos ficam de fora até serem adicionados.",
	},
] as const;

export default function ShopShowcaseSection() {
	const { data: showcase, isLoading, isError, error } = useSalesChannelShowcase({ channel: "SHOP" });

	if (isLoading) return <LoadingComponent />;
	if (isError) return <ErrorComponent msg={getErrorMessage(error)} />;
	if (!showcase) return <ErrorComponent msg="Vitrine da loja não encontrada." />;

	return <ShopShowcaseEditor showcase={showcase} />;
}

// O editor é um componente à parte para que o hook de rascunho nasça com um estado já resolvido —
// montá-lo antes da consulta obrigaria a hidratar a partir de um estado vazio.
function ShopShowcaseEditor({ showcase }: { showcase: TSalesChannelShowcase }) {
	const {
		state,
		groups,
		hasProduct,
		isDirty,
		isPending,
		apply,
		discard,
		setCatalogMode,
		addProduct,
		removeProduct,
		updateProductPrice,
		moveGroup,
		renameGroup,
	} = useSalesChannelShowcaseSectionEditor({ showcase, channel: "SHOP" });

	const orderableGroups = groups.filter((group) => !group.ungrouped);
	const isEmptySelection = state.catalogoModo === "SELECIONADOS" && state.produtos.length === 0;

	return (
		<div className="space-y-4">
			<div>
				<h3 className="text-sm font-black tracking-[0.08em] uppercase">Vitrine</h3>
				<p className="mt-1 text-sm text-muted-foreground">
					Os produtos que aparecem na loja, agrupados como o cliente vê. Use as setas para ordenar os grupos e otimizar a vitrine.
				</p>
			</div>

			<div className="grid gap-2 sm:grid-cols-2">
				{CATALOG_MODES.map((mode) => (
					<button
						key={mode.value}
						type="button"
						className={cn(
							"rounded-xl border p-3 text-left transition-colors",
							state.catalogoModo === mode.value ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40",
						)}
						onClick={() => setCatalogMode(mode.value)}
					>
						<p className="text-sm font-bold">{mode.title}</p>
						<p className="mt-1 text-xs text-muted-foreground">{mode.description}</p>
					</button>
				))}
			</div>

			{isEmptySelection ? (
				<div className="flex items-start gap-3 rounded-2xl border border-brand-secondary/30 bg-brand-secondary/10 p-4">
					<AlertCircle className="mt-0.5 size-5 shrink-0" />
					<div>
						<p className="font-bold">A loja ficará sem produtos</p>
						<p className="mt-1 text-sm text-muted-foreground">Adicione ao menos um produto ou volte para o modo de todos os produtos ativos.</p>
					</div>
				</div>
			) : null}

			<p className="text-xs text-muted-foreground">
				Produtos sem grupo aparecem no fim da loja, em "Outros". Produtos com variantes têm o preço da loja definido em cada variante, no cadastro do
				produto.
			</p>

			<div className="flex flex-col gap-3">
				{groups.map((group, index) => (
					<ShowcaseGroupPanel
						key={group.key || "__sem-grupo__"}
						group={group}
						position={index + 1}
						canMoveUp={!group.ungrouped && orderableGroups.indexOf(group) > 0}
						canMoveDown={!group.ungrouped && orderableGroups.indexOf(group) < orderableGroups.length - 1}
						otherGroups={orderableGroups.filter((item) => item.key !== group.key).map((item) => item.key)}
						moveGroup={moveGroup}
						renameGroup={renameGroup}
						updateProductPrice={updateProductPrice}
						removeProduct={removeProduct}
					/>
				))}

				{groups.length === 0 ? (
					<p className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-6 text-center text-sm text-muted-foreground">
						Nenhum produto na vitrine. Adicione o primeiro abaixo.
					</p>
				) : null}

				<ShowcaseDraftRow hasProduct={hasProduct} addProduct={addProduct} />
			</div>

			<SectionApplyBar
				isDirty={isDirty}
				isPending={isPending}
				message="Alterações não salvas na vitrine"
				applyButtonText="APLICAR VITRINE"
				onApply={apply}
				onDiscard={discard}
			/>
		</div>
	);
}
