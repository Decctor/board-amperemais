"use client";

import { TAuthUserSession } from "@/lib/authentication/types";
import type { TGetProductsOutputById } from "@/app/api/products/route";
import ProductGeneralInformation from "./_components/GeneralInformation";
import ProductVariantsInformation from "./_components/VariantsInformation";
import ProductAddOnsInformation from "./_components/AddOnsInformation";
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
			<div className="flex w-full flex-col items-stretch gap-3 lg:flex-row">
				<div className="h-[500px] max-h-[500px] min-h-[500px] w-full lg:w-1/2">
					<ProductVariantsInformation product={product} callbacks={callbacks} sectionWrapperClassName="h-full" />
				</div>
				<div className="h-[500px] max-h-[500px] min-h-[500px] w-full lg:w-1/2">
					<ProductAddOnsInformation product={product} callbacks={callbacks} sectionWrapperClassName="h-full" />
				</div>
			</div>
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
