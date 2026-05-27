import { TProductVariantState, TUseProductVariantState, useProductVariantState } from "@/state-hooks/use-product-state";
import { useProductVariantById } from "@/lib/queries/products";
import Image from "next/image";
import { ImageIcon } from "lucide-react";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import TextInput from "@/components/Inputs/TextInput";
import NumberInput from "@/components/Inputs/NumberInput";
import { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateProductVariant as updateProductVariantMutation } from "@/lib/mutations/products";
type VariantMenuProps = {
	variantId?: string;
	closeMenu: () => void;
	submitVariant: (state: TUseProductVariantState["state"]) => void;
	submitVariantIsLoading: boolean;
};
export default function VariantMenu({ variantId, closeMenu, submitVariant, submitVariantIsLoading }: VariantMenuProps) {
	if (variantId) {
		return (
			<VariantMenuPersisted variantId={variantId} closeMenu={closeMenu} submitVariant={submitVariant} submitVariantIsLoading={submitVariantIsLoading} />
		);
	}
	return <VariantMenuNonPersisted closeMenu={closeMenu} submitVariant={submitVariant} submitVariantIsLoading={submitVariantIsLoading} />;
}

type VariantMenuPersistedProps = {
	variantId: string;
	closeMenu: () => void;

	submitVariant: (state: TUseProductVariantState["state"]) => void;
	submitVariantIsLoading: boolean;
};
function VariantMenuPersisted({ variantId, closeMenu, submitVariant, submitVariantIsLoading }: VariantMenuPersistedProps) {
	const queryClient = useQueryClient();
	const { data: variant, queryKey, isLoading, isError, error } = useProductVariantById({ productVariantId: variantId });

	const { state, updateVariant, updateVariantImageHolder, resetState, redefineState } = useProductVariantState({});

	useEffect(() => {
		if (variant) {
			redefineState({
				nome: variant.nome,
				codigo: variant.codigo ?? "",
				precoCusto: variant.precoCusto ?? 0,
				precoVenda: variant.precoVenda,
				quantidade: variant.quantidade ?? 0,
				ativo: variant.ativo ?? true,
				rastreamentoEstoqueAtivo: variant.rastreamentoEstoqueAtivo ?? false,
				imagemCapaHolder: {
					file: null,
					previewUrl: variant.imagemCapaUrl,
				},
				perfisFiscais: variant.perfisFiscais,
				addOns: variant.addOnsReferencias.map((addOn) => ({
					nome: addOn.grupo.nome,
					ativo: addOn.grupo.ativo ?? true,
					internoNome: addOn.grupo.internoNome ?? "",
					minOpcoes: addOn.grupo.minOpcoes ?? 0,
					maxOpcoes: addOn.grupo.maxOpcoes ?? 0,
					opcoes: addOn.grupo.opcoes.map((opcao) => ({
						nome: opcao.nome,
						codigo: opcao.codigo ?? "",
						ativo: opcao.ativo ?? true,
						quantidadeConsumo: opcao.quantidadeConsumo ?? 0,
						precoDelta: opcao.precoDelta ?? 0,
						maxQtdePorItem: opcao.maxQtdePorItem ?? 0,
					})),
				})),
			});
		}
	}, [variant]);

	return (
		<VariantMenuContent
			closeMenu={closeMenu}
			state={state}
			stateIsLoading={isLoading}
			stateError={error ? error.message : null}
			updateVariant={updateVariant}
			updateVariantImageHolder={updateVariantImageHolder}
			submitionIsLoading={submitVariantIsLoading}
			submitVariant={() => {
				console.log("Submitting variant", state);
				submitVariant(state);
			}}
			menuTitle={"EDITAR VARIANTE"}
			menuDescription="Preencha os campos abaixo para editar a variante"
			menuActionButtonText="ATUALIZAR VARIANTE"
			menuCancelButtonText="CANCELAR"
		/>
	);
}

type VariantMenuNonPersistedProps = {
	closeMenu: () => void;

	submitVariant: (state: TUseProductVariantState["state"]) => void;
	submitVariantIsLoading: boolean;
};
function VariantMenuNonPersisted({ closeMenu, submitVariant, submitVariantIsLoading }: VariantMenuNonPersistedProps) {
	const { state, updateVariant, updateVariantImageHolder } = useProductVariantState({});

	return (
		<VariantMenuContent
			closeMenu={closeMenu}
			state={state}
			stateIsLoading={false}
			stateError={null}
			updateVariant={updateVariant}
			updateVariantImageHolder={updateVariantImageHolder}
			submitionIsLoading={submitVariantIsLoading}
			submitVariant={() => {
				console.log("Submitting variant", state);
				submitVariant(state);
			}}
			menuTitle={"CRIAR VARIANTE"}
			menuDescription="Preencha os campos abaixo para criar a variante"
			menuActionButtonText="CRIAR VARIANTE"
			menuCancelButtonText="CANCELAR"
		/>
	);
}

type VariantMenuContentProps = {
	closeMenu: () => void;
	state: TUseProductVariantState["state"];
	stateIsLoading: boolean;
	stateError: string | null;
	updateVariant: TUseProductVariantState["updateVariant"];
	updateVariantImageHolder: TUseProductVariantState["updateVariantImageHolder"];
	submitionIsLoading: boolean;
	submitVariant: (state: TUseProductVariantState["state"]) => void;
	menuTitle: string;
	menuDescription: string;
	menuActionButtonText: string;
	menuCancelButtonText: string;
};
function VariantMenuContent({
	closeMenu,
	state,
	stateIsLoading,
	stateError,
	updateVariant,
	updateVariantImageHolder,
	submitionIsLoading,
	submitVariant,
	menuTitle,
	menuDescription,
	menuActionButtonText,
	menuCancelButtonText,
}: VariantMenuContentProps) {
	function ProductVariantsBlockVariantImage({
		imageUrl,
		imageHolder,
	}: {
		imageUrl: TUseProductVariantState["state"]["imagemCapaUrl"];
		imageHolder: TUseProductVariantState["state"]["imagemCapaHolder"];
	}) {
		if (imageHolder.previewUrl) {
			return <Image alt="Capa da variante." fill={true} objectFit="cover" src={imageHolder.previewUrl} />;
		}
		if (imageUrl) {
			return <Image alt="Capa da variante." fill={true} objectFit="cover" src={imageUrl} />;
		}

		return (
			<div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-primary/20">
				<ImageIcon className="h-6 w-6" />
				<p className="text-center font-medium text-xs">DEFINIR CAPA</p>
			</div>
		);
	}
	return (
		<ResponsiveMenu
			menuTitle={menuTitle}
			menuDescription={menuDescription}
			menuActionButtonText={menuActionButtonText}
			menuCancelButtonText={menuCancelButtonText}
			closeMenu={closeMenu}
			actionFunction={() => submitVariant(state)}
			actionIsLoading={submitionIsLoading}
			stateIsLoading={stateIsLoading}
			stateError={stateError}
		>
			<div className="flex items-center justify-center min-h-[250px] min-w-[250px]">
				<label className="relative aspect-square w-full max-w-[250px] cursor-pointer overflow-hidden rounded-lg" htmlFor="product-variant-dropzone-file">
					<ProductVariantsBlockVariantImage imageHolder={state.imagemCapaHolder} imageUrl={state.imagemCapaUrl} />
					<input
						accept=".png,.jpeg,.jpg"
						className="absolute h-full w-full cursor-pointer opacity-0"
						id="product-variant-dropzone-file"
						multiple={false}
						onChange={(e) => {
							const file = e.target.files?.[0] ?? null;
							updateVariantImageHolder({
								file,
								previewUrl: file ? URL.createObjectURL(file) : null,
							});
						}}
						tabIndex={-1}
						type="file"
					/>
				</label>
			</div>
			<TextInput label="NOME" placeholder="Digite o nome da variante" value={state.nome} handleChange={(value) => updateVariant({ nome: value })} />
			<TextInput
				label="CÓDIGO"
				placeholder="Digite o código da variante"
				value={state.codigo}
				handleChange={(value) => updateVariant({ codigo: value })}
			/>
			<NumberInput
				label="PREÇO DE CUSTO"
				placeholder="Digite o preço de custo da variante"
				value={state.precoCusto}
				handleChange={(value) => updateVariant({ precoCusto: value })}
			/>
			<NumberInput
				label="PREÇO DE VENDA"
				placeholder="Digite o preço de venda da variante"
				value={state.precoVenda}
				handleChange={(value) => updateVariant({ precoVenda: value })}
			/>
			<NumberInput
				label="QUANTIDADE EM ESTOQUE"
				placeholder="Digite a quantidade em estoque da variante"
				value={state.quantidade}
				handleChange={(value) => updateVariant({ quantidade: value })}
			/>
		</ResponsiveMenu>
	);
}
