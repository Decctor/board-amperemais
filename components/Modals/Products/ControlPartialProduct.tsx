import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { getErrorMessage } from "@/lib/errors";
import { useProductById } from "@/lib/queries/products";
import { useProductState } from "@/state-hooks/use-product-state";
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ProductStateGeneralBlock from "./Blocks/General";
import ProductStateStockBlock from "./Blocks/Stock";
import ProductStateAddOnsBlock from "./Blocks/AddOns";
import ProductStateVariantsBlock from "./Blocks/Variants";
import type { TAuthUserSession } from "@/lib/authentication/types";
import ProductStateFiscalBlock from "./Blocks/Fiscal";

type PartialUpdateType = "general" | "stock" | "fiscal" | "add-ons" | "variants";

type ControlPartialProductProps = {
	sessionUser: TAuthUserSession["user"];
	sessionUserMembership: NonNullable<TAuthUserSession["membership"]>;
	initialUpdateType: PartialUpdateType;
	productId: string;
	closeModal: () => void;
	callbacks?: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: () => void;
		onSettled?: () => void;
	};
};
export default function ControlPartialProduct({
	sessionUser,
	sessionUserMembership,
	initialUpdateType,
	productId,
	closeModal,
	callbacks,
}: ControlPartialProductProps) {
	const { data: product, queryKey, isLoading, isError, error } = useProductById({ id: productId });
	const [updateType, setUpdateType] = useState<PartialUpdateType>(initialUpdateType);

	const userHasFiscalViewPermission = sessionUserMembership?.permissoes.fiscal.visualizar;
	const userHasFiscalConfigurePermission = sessionUserMembership?.permissoes.fiscal.configurar;

	const {
		state,
		updateProduct,
		updateProductImageHolder,
		addProductFiscalProfile,
		updateProductFiscalProfile,
		removeProductFiscalProfile,
		addProductAddOn,
		updateProductAddOn,
		removeProductAddOn,
		addProductAddOnOption,
		updateProductAddOnOption,
		removeProductAddOnOption,
		addProductVariant,
		updateProductVariant,
		updateProductVariantImageHolder,
		removeProductVariant,
		resetState,
		redefineState,
	} = useProductState({});
	return (
		<ResponsiveMenu
			menuTitle="CONTROLE DO PRODUTO"
			menuDescription="Atualize as informações do produto..."
			menuActionButtonText="ATUALIZAR PRODUTO"
			menuCancelButtonText="CANCELAR"
			actionFunction={() => {}}
			actionIsLoading={false}
			stateIsLoading={isLoading}
			stateError={isError ? getErrorMessage(error) : null}
			closeMenu={closeModal}
		>
			<Tabs defaultValue={updateType} value={updateType} onValueChange={(v) => setUpdateType(v as PartialUpdateType)} className="w-full">
				<TabsList>
					<TabsTrigger value="general">Geral</TabsTrigger>
					<TabsTrigger value="stock">Estoque</TabsTrigger>

					<TabsTrigger value="add-ons">Adicionais</TabsTrigger>
					<TabsTrigger value="variants">Variantes</TabsTrigger>
					{userHasFiscalViewPermission ? <TabsTrigger value="fiscal">Fiscal</TabsTrigger> : null}
				</TabsList>
				<TabsContent value="general">
					<ProductStateGeneralBlock product={state.product} updateProduct={updateProduct} updateProductImageHolder={updateProductImageHolder} />
				</TabsContent>
				<TabsContent value="stock">
					<ProductStateStockBlock product={state.product} updateProduct={updateProduct} />
				</TabsContent>
				<TabsContent value="fiscal">
					<ProductStateFiscalBlock
						userHasFiscalViewPermission={userHasFiscalViewPermission}
						userHasFiscalConfigurePermission={userHasFiscalConfigurePermission}
						productFiscalProfiles={state.productFiscalProfiles}
						addProductFiscalProfile={addProductFiscalProfile}
						updateProductFiscalProfile={updateProductFiscalProfile}
						removeProductFiscalProfile={removeProductFiscalProfile}
					/>
				</TabsContent>
				<TabsContent value="add-ons">
					<ProductStateAddOnsBlock
						addOns={state.productAddOns}
						addProductAddOn={addProductAddOn}
						updateProductAddOn={updateProductAddOn}
						removeProductAddOn={removeProductAddOn}
						addProductAddOnOption={addProductAddOnOption}
						updateProductAddOnOption={updateProductAddOnOption}
						removeProductAddOnOption={removeProductAddOnOption}
					/>
				</TabsContent>
				<TabsContent value="variants">
					<ProductStateVariantsBlock
						variants={state.productVariants}
						addVariant={addProductVariant}
						updateVariant={updateProductVariant}
						updateVariantImageHolder={updateProductVariantImageHolder}
						removeVariant={removeProductVariant}
					/>
				</TabsContent>
			</Tabs>
		</ResponsiveMenu>
	);
}
