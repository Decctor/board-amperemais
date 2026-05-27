"use client";

import ProductFiscalBlock from "@/components/Modals/Products/Blocks/Fiscal";
import { LoadingButton } from "@/components/loading-button";
import SectionWrapper from "@/components/ui/section-wrapper";
import type { TUseProductState } from "@/state-hooks/use-product-state";
import { FileText } from "lucide-react";

type ProductFiscalProfilesSectionProps = {
	productFiscalProfiles: TUseProductState["state"]["productFiscalProfiles"];
	addProductFiscalProfile: TUseProductState["addProductFiscalProfile"];
	updateProductFiscalProfile: TUseProductState["updateProductFiscalProfile"];
	removeProductFiscalProfile: TUseProductState["removeProductFiscalProfile"];
	userHasFiscalViewPermission: boolean;
	userHasFiscalConfigurePermission: boolean;
	isPending: boolean;
	onSave: () => void;
};

export default function ProductFiscalProfilesSection({
	productFiscalProfiles,
	addProductFiscalProfile,
	updateProductFiscalProfile,
	removeProductFiscalProfile,
	userHasFiscalViewPermission,
	userHasFiscalConfigurePermission,
	isPending,
	onSave,
}: ProductFiscalProfilesSectionProps) {
	if (!userHasFiscalViewPermission) return null;

	const validCount = productFiscalProfiles.filter((profile) => !profile.deletar).length;

	return (
		<SectionWrapper
			title="PERFIS FISCAIS"
			icon={<FileText className="h-4 min-h-4 w-4 min-w-4" />}
			actions={
				<LoadingButton variant="default" size="xs" onClick={onSave} loading={isPending}>
					SALVAR
				</LoadingButton>
			}
		>
			<p className="mb-2 text-xs text-muted-foreground">
				{validCount} perfil(es) fiscal(is) cadastrado(s). Alterações nos menus são salvas ao clicar em SALVAR.
			</p>
			<ProductFiscalBlock
				userHasFiscalViewPermission={userHasFiscalViewPermission}
				userHasFiscalConfigurePermission={userHasFiscalConfigurePermission}
				productFiscalProfiles={productFiscalProfiles}
				addProductFiscalProfile={addProductFiscalProfile}
				updateProductFiscalProfile={updateProductFiscalProfile}
				removeProductFiscalProfile={removeProductFiscalProfile}
				embedded
			/>
		</SectionWrapper>
	);
}

export { ProductFiscalProfileCard } from "./product-fiscal-profile-card";
