"use client";



import { TAuthUserSession } from "@/lib/authentication/types";

import type { TGetProductsOutputById } from "@/app/api/products/route";

import ProductGeneralInformation from "./_components/GeneralInformation";

import ProductVariantsInformation from "./_components/VariantsInformation";

import ProductAddOnsInformation from "./_components/AddOnsInformation";
import SalesChannelsSection from "./_components/SalesChannelsSection";

import ProductFiscalProfilesInformation from "./_components/FiscalProfilesInformation";



type ProductRegistryTabProps = {

	sessionUserMembership: NonNullable<TAuthUserSession["membership"]>;

	product: TGetProductsOutputById;

	callbacks: {

		onMutate?: () => void;

		onSuccess?: () => void;

		onError?: (error: Error) => void;

		onSettled?: () => void;

	};

};



export default function ProductRegistryTab({ sessionUserMembership, product, callbacks }: ProductRegistryTabProps) {

	const orgHasERPAccess = sessionUserMembership?.organizacao.configuracao.recursos.erp.acesso;

	const userHasFiscalViewPermission = sessionUserMembership?.permissoes.fiscal.visualizar;

	const userHasFiscalConfigurePermission = sessionUserMembership?.permissoes.fiscal.configurar;



	return (

		<div className="flex w-full flex-col gap-6">

			<ProductGeneralInformation product={product} callbacks={callbacks} />

			<ProductVariantsInformation product={product} callbacks={callbacks} />

			<ProductAddOnsInformation product={product} callbacks={callbacks} />
			<SalesChannelsSection product={product} />

			{orgHasERPAccess ? (

				<ProductFiscalProfilesInformation

					product={product}

					userHasFiscalViewPermission={userHasFiscalViewPermission}

					userHasFiscalConfigurePermission={userHasFiscalConfigurePermission}

					callbacks={callbacks}

				/>

			) : null}

		</div>

	);

}

