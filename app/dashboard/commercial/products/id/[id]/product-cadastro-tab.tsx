"use client";

import ProductFiscalProfilesSection from "@/components/Products/Detail/blocks/product-fiscal-profiles-section";
import ErrorComponent from "@/components/Layouts/ErrorComponent";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import { getErrorMessage } from "@/lib/errors";
import { useProductById } from "@/lib/queries/products";
import { type TProductState, useProductState } from "@/state-hooks/use-product-state";
import { TAuthUserSession } from "@/lib/authentication/types";
import ProductGeneralInformation from "./_components/GeneralInformation";
import ProductVariantsInformation from "./_components/VariantsInformation";
import ProductAddOnsInformation from "./_components/AddOnsInformation";
import { useQueryClient } from "@tanstack/react-query";

type ProductCadastroTabProps = {
	sessionUser: TAuthUserSession["user"];
	sessionUserMembership: NonNullable<TAuthUserSession["membership"]>;
	productId: string;
};

export default function ProductCadastroTab({ sessionUser, sessionUserMembership, productId }: ProductCadastroTabProps) {
	const queryClient = useQueryClient();
	const orgHasERPAccess = sessionUserMembership?.organizacao.configuracao.recursos.erp.acesso;
	const userHasFiscalViewPermission = sessionUserMembership?.permissoes.fiscal.visualizar;
	const userHasFiscalConfigurePermission = sessionUserMembership?.permissoes.fiscal.configurar;
	const { data: product, queryKey, isLoading, isError, error } = useProductById({ id: productId });
	const {
		state,
		updateProduct,
		updateProductImageHolder,
		addProductVariant,
		updateProductVariant,
		updateProductVariantImageHolder,
		removeProductVariant,
		addProductAddOn,
		updateProductAddOn,
		removeProductAddOn,
		addProductAddOnOption,
		updateProductAddOnOption,
		removeProductAddOnOption,
		addProductFiscalProfile,
		updateProductFiscalProfile,
		removeProductFiscalProfile,
		resetState,
	} = useProductState({});

	const handleOnMutate = async () => await queryClient.cancelQueries({ queryKey });
	const handleOnSettled = async () => await queryClient.invalidateQueries({ queryKey });
	if (isLoading) return <LoadingComponent />;
	if (isError) return <ErrorComponent msg={getErrorMessage(error)} />;
	if (!product) return null;

	return (
		<div className="flex w-full flex-col gap-6">
			<ProductGeneralInformation product={product} sessionUser={sessionUser} sessionUserMembership={sessionUserMembership} />
			<div className="w-full flex items-stretch gap-3 flex-col lg:flex-row">
				<div className="w-full lg:w-1/2">
					<ProductVariantsInformation product={product} callbacks={{ onMutate: handleOnMutate, onSettled: handleOnSettled }} />
				</div>
				<div className="w-full lg:w-1/2">
					<ProductAddOnsInformation product={product} />
				</div>
			</div>
			{orgHasERPAccess ? (
				<ProductFiscalProfilesSection
					productFiscalProfiles={state.productFiscalProfiles}
					addProductFiscalProfile={addProductFiscalProfile}
					updateProductFiscalProfile={updateProductFiscalProfile}
					removeProductFiscalProfile={removeProductFiscalProfile}
					userHasFiscalViewPermission={userHasFiscalViewPermission}
					userHasFiscalConfigurePermission={userHasFiscalConfigurePermission}
					isPending={false}
					onSave={() => {}}
				/>
			) : null}
		</div>
	);
}
