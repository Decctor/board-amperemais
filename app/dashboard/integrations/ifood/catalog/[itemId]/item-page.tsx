"use client";

import NumberInput from "@/components/Inputs/NumberInput";
import SelectInput from "@/components/Inputs/SelectInput";
import TextInput from "@/components/Inputs/TextInput";
import TextareaInput from "@/components/Inputs/TextareaInput";
import ErrorComponent from "@/components/Layouts/ErrorComponent";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import SectionApplyBar from "@/components/Utils/SectionApplyBar";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/ui/section";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { canManageIntegrations } from "@/lib/integrations/mask";
import { useIfoodCatalogs, useIfoodCategories, useIfoodItemById } from "@/lib/queries/ifood";
import { useIfoodItemEditor } from "@/state-hooks/use-ifood-item-editor";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Package } from "lucide-react";
import Link from "next/link";
import { IfoodCatalogContextEnum } from "@/schemas/enums";
import { useEffect, useMemo, useState } from "react";
import { ProductChannelsBlock } from "../../_module/catalog/Blocks/ProductChannelsBlock";
import { ProductImageBlock } from "../../_module/catalog/Blocks/ProductImageBlock";
import { ProductInventoryBlock } from "../../_module/catalog/Blocks/ProductInventoryBlock";
import { ProductOptionGroupsBlock } from "../../_module/catalog/Blocks/ProductOptionGroupsBlock";

type IfoodCatalogItemPageProps = {
	membership: NonNullable<TAuthUserSession["membership"]>;
	itemId: string;
	merchantId: string;
};

export default function IfoodCatalogItemPage({ membership, itemId, merchantId }: IfoodCatalogItemPageProps) {
	const canManage = canManageIntegrations(membership.permissoes);
	const itemQuery = useIfoodItemById({ merchantId, itemId });

	if (itemQuery.isLoading) return <LoadingComponent />;
	if (itemQuery.isError || !itemQuery.data) {
		return <ErrorComponent msg={itemQuery.error instanceof Error ? itemQuery.error.message : "Não foi possível carregar este item do iFood."} />;
	}

	return <ItemEditor merchantId={merchantId} item={itemQuery.data} canManage={canManage} queryKey={itemQuery.queryKey} />;
}

type ItemEditorProps = {
	merchantId: string;
	item: NonNullable<ReturnType<typeof useIfoodItemById>["data"]>;
	canManage: boolean;
	queryKey: unknown[];
};

/**
 * Separado do componente de rota para que o editor só monte com o item já carregado — assim a
 * hidratação do estado acontece uma vez, e não a cada troca de `isLoading`.
 */
function ItemEditor({ merchantId, item, canManage, queryKey }: ItemEditorProps) {
	const queryClient = useQueryClient();
	const editor = useIfoodItemEditor({
		merchantId,
		item,
		callbacks: { onSuccess: () => queryClient.invalidateQueries({ queryKey }) },
	});

	const catalogsQuery = useIfoodCatalogs({ merchantId });
	const [catalogId, setCatalogId] = useState<string | null>(null);
	useEffect(() => {
		const catalogos = catalogsQuery.data?.catalogos ?? [];
		if (!catalogId && catalogos.length > 0) setCatalogId(catalogos[0].id);
	}, [catalogsQuery.data, catalogId]);

	const categoriesQuery = useIfoodCategories({ merchantId, catalogId });
	const categorias = categoriesQuery.data ?? [];

	// Canais que a loja de fato possui. O iFood descarta em silêncio um modifier de contexto que a
	// loja não tem, então oferecer os três a uma loja só-delivery seria promessa vazia.
	const contextosDaLoja = useMemo(() => {
		const contextos = (catalogsQuery.data?.catalogos ?? []).flatMap((catalogo) => catalogo.contextos);
		return contextos
			.map((contexto) => IfoodCatalogContextEnum.safeParse(contexto.toUpperCase()))
			.flatMap((parsed) => (parsed.success ? [parsed.data] : []));
	}, [catalogsQuery.data]);

	// Avisa antes de perder o rascunho num fechamento de aba — o iFood não guarda rascunho.
	useEffect(() => {
		if (!editor.isDirty) return;
		function handleBeforeUnload(event: BeforeUnloadEvent) {
			event.preventDefault();
		}
		window.addEventListener("beforeunload", handleBeforeUnload);
		return () => window.removeEventListener("beforeunload", handleBeforeUnload);
	}, [editor.isDirty]);

	return (
		<div className="flex h-full w-full flex-col gap-4 p-2 lg:p-4">
			<div className="flex w-full flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex min-w-0 items-center gap-3">
					<Button variant="ghost" size="icon-sm" asChild>
						<Link href={`/dashboard/integrations/ifood/catalog?merchantId=${merchantId}`} aria-label="Voltar para o catálogo">
							<ArrowLeft className="h-4 w-4" />
						</Link>
					</Button>
					<div className="min-w-0 space-y-0.5">
						<h1 className="truncate text-xl font-semibold tracking-tight">{editor.state.produto.nome || "Item sem nome"}</h1>
						<p className="text-sm text-muted-foreground">Edite os dados e os complementos deste item no catálogo do iFood.</p>
					</div>
				</div>
			</div>

			<div className="flex w-full flex-col gap-6 pb-2">
				<Section.Root>
					<Section.Header>
						<Section.Icon>
							<Package className="h-4 w-4 min-h-4 min-w-4" />
						</Section.Icon>
						<Section.Title>DADOS DO ITEM</Section.Title>
					</Section.Header>
					<Section.Body>
						<div className="flex w-full flex-col gap-4">
							<TextInput
								label="NOME DO PRODUTO"
								value={editor.state.produto.nome}
								placeholder="Ex: X-Burguer Especial..."
								editable={canManage}
								handleChange={(value) => editor.updateProduto({ nome: value })}
							/>
							<TextareaInput
								label="DESCRIÇÃO"
								value={editor.state.produto.descricao ?? ""}
								placeholder="Descreva o produto para os clientes..."
								editable={canManage}
								handleChange={(value) => editor.updateProduto({ descricao: value || null })}
							/>
							<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
								<SelectInput
									label="CATEGORIA"
									value={editor.state.produto.categoriaId}
									resetOptionLabel="NÃO DEFINIDO"
									editable={canManage}
									options={categorias.map((categoria) => ({ id: categoria.id, value: categoria.id, label: categoria.nome ?? categoria.id }))}
									handleChange={(value) => editor.updateProduto({ categoriaId: value })}
									onReset={() => editor.updateProduto({ categoriaId: null })}
								/>
								<SelectInput
									label="STATUS"
									value={editor.state.produto.status}
									resetOptionLabel="DISPONÍVEL"
									editable={canManage}
									options={[
										{ id: "AVAILABLE", value: "AVAILABLE", label: "DISPONÍVEL" },
										{ id: "UNAVAILABLE", value: "UNAVAILABLE", label: "INDISPONÍVEL" },
									]}
									handleChange={(value) => editor.updateProduto({ status: value === "UNAVAILABLE" ? "UNAVAILABLE" : "AVAILABLE" })}
									onReset={() => editor.updateProduto({ status: "AVAILABLE" })}
								/>
								<NumberInput
									label="PREÇO (R$)"
									value={editor.state.produto.preco}
									placeholder="Ex: 29,90..."
									editable={canManage}
									handleChange={(value) => editor.updateProduto({ preco: value })}
								/>
								<TextInput
									label="CÓDIGO EXTERNO (PDV)"
									value={editor.state.produto.codigoExterno ?? ""}
									placeholder="Código do produto no seu sistema..."
									editable={canManage}
									handleChange={(value) => editor.updateProduto({ codigoExterno: value || null })}
								/>
							</div>
							<ProductImageBlock
								merchantId={merchantId}
								imagemPath={editor.state.produto.imagemPath}
								onUploaded={(imagemPath) => editor.updateProduto({ imagemPath })}
							/>
						</div>
					</Section.Body>
				</Section.Root>

				<ProductInventoryBlock merchantId={merchantId} produtoId={item.produtoId} canManage={canManage} />

				<ProductChannelsBlock
					canais={editor.state.canais}
					precoPadrao={editor.state.produto.preco}
					editable={canManage}
					contextosDisponiveis={contextosDaLoja}
					onUpdateCanal={editor.updateCanal}
				/>

				<ProductOptionGroupsBlock
					grupos={editor.state.gruposComplementos}
					issues={editor.issues}
					onAddGrupo={editor.addGrupoComplemento}
					onUpdateGrupo={editor.updateGrupoComplemento}
					onRemoveGrupo={editor.removeGrupoComplemento}
					onAddOpcao={editor.addOpcao}
					onUpdateOpcao={editor.updateOpcao}
					onRemoveOpcao={editor.removeOpcao}
				/>
			</div>

			{canManage ? (
				<SectionApplyBar
					isDirty={editor.isDirty}
					isPending={editor.isPending}
					disabled={editor.issues.length > 0}
					disabledReason={editor.issues[0]?.mensagem ?? null}
					onApply={editor.apply}
					onDiscard={editor.discard}
				/>
			) : null}
		</div>
	);
}
