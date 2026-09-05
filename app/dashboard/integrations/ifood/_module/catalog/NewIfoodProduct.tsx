"use client";
import { ResponsiveMenuAnimatedBody } from "@/components/Utils/ResponsiveMenuAnimatedBody";
import { LoadingButton } from "@/components/loading-button";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";

import NumberInput from "@/components/Inputs/NumberInput";
import SelectInput from "@/components/Inputs/SelectInput";
import TextInput from "@/components/Inputs/TextInput";
import TextareaInput from "@/components/Inputs/TextareaInput";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getErrorMessage } from "@/lib/errors";
import type { TIfoodCategoryDTO } from "@/lib/integrations/ifood/catalog-types";
import { validateIfoodOptionGroups } from "@/lib/integrations/ifood/option-groups";
import { upsertIfoodItem } from "@/lib/mutations/ifood";
import { useInternalIfoodProductState } from "@/state-hooks/use-internal-ifood-product-state";
import { useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ProductChannelsBlock } from "./Blocks/ProductChannelsBlock";
import { ProductImageBlock } from "./Blocks/ProductImageBlock";
import { ProductOptionGroupsBlock } from "./Blocks/ProductOptionGroupsBlock";

type NewIfoodProductProps = {
	merchantId: string;
	categories: TIfoodCategoryDTO[];
	initialCategoryId?: string | null;
	closeModal: () => void;
	callbacks?: {
		onSuccess?: () => void;
	};
};

/** Modal de criação de produto no catálogo do iFood (produto base + item vendável + complementos). */
export function NewIfoodProduct({ merchantId, categories, initialCategoryId, closeModal, callbacks }: NewIfoodProductProps) {
	const {
		state,
		updateProduto,
		addGrupoComplemento,
		updateGrupoComplemento,
		removeGrupoComplemento,
		addOpcao,
		updateOpcao,
		removeOpcao,
		updateCanal,
	} = useInternalIfoodProductState({
		initialState: { produto: { categoriaId: initialCategoryId ?? null } },
	});
	const [abaAtiva, setAbaAtiva] = useState("geral");

	const issuesComplementos = useMemo(() => validateIfoodOptionGroups(state.gruposComplementos), [state.gruposComplementos]);

	const { mutate, isPending } = useMutation({
		mutationKey: ["upsert-ifood-item", merchantId],
		mutationFn: upsertIfoodItem,
		onSuccess: (data) => {
			callbacks?.onSuccess?.();
			toast.success(data.message);
			closeModal();
		},
		onError: (error) => {
			toast.error(getErrorMessage(error));
		},
	});

	function handleSubmit() {
		if (!state.produto.nome.trim()) return toast.error("Informe o nome do produto.");
		if (!state.produto.categoriaId) return toast.error("Selecione a categoria do produto.");
		if (state.produto.preco == null || state.produto.preco < 0) return toast.error("Informe o preço do produto.");

		// O erro está numa aba que pode não estar à vista — leva o usuário até ele antes de avisar.
		if (issuesComplementos.length > 0) {
			setAbaAtiva("complementos");
			return toast.error(issuesComplementos[0].mensagem);
		}

		mutate({
			merchantId,
			item: {
				categoriaId: state.produto.categoriaId,
				status: state.produto.status,
				preco: state.produto.preco,
				precoOriginal: state.produto.precoOriginal,
				codigoExterno: state.produto.codigoExterno,
				produto: {
					nome: state.produto.nome.trim(),
					descricao: state.produto.descricao,
					imagemPath: state.produto.imagemPath,
				},
				contextModifiers: state.canais.map((canal) => ({
					contexto: canal.contexto,
					preco: canal.preco,
					status: canal.status,
					codigoExterno: canal.codigoExterno,
				})),
				gruposComplementos: state.gruposComplementos.map((grupo) => ({
					id: grupo.id,
					nome: grupo.nome.trim(),
					tipo: grupo.tipo,
					min: grupo.min,
					max: grupo.max,
					opcoes: grupo.opcoes.map((opcao) => ({
						id: opcao.id,
						produtoId: opcao.produtoId,
						nome: opcao.nome.trim(),
						preco: opcao.preco,
						codigoExterno: opcao.codigoExterno,
						status: opcao.status,
					})),
				})),
			},
		});
	}

	const quantidadeGrupos = state.gruposComplementos.length;
	const quantidadeCanaisCustomizados = state.canais.filter((canal) => canal.preco != null || canal.status != null || canal.codigoExterno).length;

	return (
		<ResponsiveMenu.Root
			open
			onOpenChange={(open) => {
				if (!open) closeModal();
			}}
		>
			<ResponsiveMenu.Content dialogVariant="lg" drawerVariant="lg">
				<ResponsiveMenu.Header>
					<ResponsiveMenu.Title>NOVO PRODUTO</ResponsiveMenu.Title>
					<ResponsiveMenu.Description>Cria um produto no catálogo do iFood e o disponibiliza na categoria selecionada.</ResponsiveMenu.Description>
				</ResponsiveMenu.Header>
				<ResponsiveMenuAnimatedBody stateKey="content" className="overflow-x-hidden overflow-y-auto">
					<Tabs value={abaAtiva} onValueChange={setAbaAtiva} className="flex w-full flex-col gap-4">
						<TabsList>
							<TabsTrigger value="geral">GERAL</TabsTrigger>
							<TabsTrigger value="complementos">
								COMPLEMENTOS
								{quantidadeGrupos > 0 ? <span className="ml-1.5 text-xs tabular-nums opacity-70">{quantidadeGrupos}</span> : null}
							</TabsTrigger>
							<TabsTrigger value="canais">
								CANAIS
								{quantidadeCanaisCustomizados > 0 ? <span className="ml-1.5 text-xs tabular-nums opacity-70">{quantidadeCanaisCustomizados}</span> : null}
							</TabsTrigger>
						</TabsList>

						<TabsContent value="geral" className="flex flex-col gap-4">
							<TextInput
								label="NOME DO PRODUTO"
								value={state.produto.nome}
								placeholder="Ex: X-Burguer Especial..."
								handleChange={(value) => updateProduto({ nome: value })}
							/>
							<TextareaInput
								label="DESCRIÇÃO"
								value={state.produto.descricao ?? ""}
								placeholder="Descreva o produto para os clientes..."
								handleChange={(value) => updateProduto({ descricao: value || null })}
							/>
							<SelectInput
								label="CATEGORIA"
								value={state.produto.categoriaId}
								resetOptionLabel="NÃO DEFINIDO"
								options={categories.map((category) => ({ id: category.id, value: category.id, label: category.nome ?? category.id }))}
								handleChange={(value) => updateProduto({ categoriaId: value })}
								onReset={() => updateProduto({ categoriaId: null })}
							/>
							<NumberInput
								label="PREÇO (R$)"
								value={state.produto.preco}
								placeholder="Ex: 29,90..."
								handleChange={(value) => updateProduto({ preco: value })}
							/>
							<TextInput
								label="CÓDIGO EXTERNO (PDV)"
								value={state.produto.codigoExterno ?? ""}
								placeholder="Código do produto no seu sistema..."
								handleChange={(value) => updateProduto({ codigoExterno: value || null })}
							/>
							<ProductImageBlock merchantId={merchantId} imagemPath={state.produto.imagemPath} onUploaded={(imagemPath) => updateProduto({ imagemPath })} />
						</TabsContent>

						<TabsContent value="complementos">
							<ProductOptionGroupsBlock
								embedded
								grupos={state.gruposComplementos}
								issues={issuesComplementos}
								onAddGrupo={addGrupoComplemento}
								onUpdateGrupo={updateGrupoComplemento}
								onRemoveGrupo={removeGrupoComplemento}
								onAddOpcao={addOpcao}
								onUpdateOpcao={updateOpcao}
								onRemoveOpcao={removeOpcao}
							/>
						</TabsContent>

						<TabsContent value="canais">
							<ProductChannelsBlock embedded canais={state.canais} precoPadrao={state.produto.preco} onUpdateCanal={updateCanal} />
						</TabsContent>
					</Tabs>
				</ResponsiveMenuAnimatedBody>
				<ResponsiveMenu.Footer>
					<ResponsiveMenu.Close variant="outline">CANCELAR</ResponsiveMenu.Close>
					<LoadingButton loading={isPending} onClick={handleSubmit}>
						CRIAR PRODUTO
					</LoadingButton>
				</ResponsiveMenu.Footer>
			</ResponsiveMenu.Content>
		</ResponsiveMenu.Root>
	);
}
