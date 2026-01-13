"use client";
import type { TCreateOrganizationInput } from "@/app/api/admin/organizations/route";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { getErrorMessage } from "@/lib/errors";
import { getJSONFromExcelFile } from "@/lib/excel-utils";
import { createOrganization } from "@/lib/mutations/admin";
import { useOrganizationState } from "@/state-hooks/use-organization-state";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import MainUserBlock from "./Blocks/MainUserBlock";
import OrganizationAddressBlock from "./Blocks/OrganizationAddressBlock";
import OrganizationGeneralBlock from "./Blocks/OrganizationGeneralBlock";
import ProductsImportBlock from "./Blocks/ProductsImportBlock";

type NewOrganizationProps = {
	closeModal: () => void;
};

export default function NewOrganization({ closeModal }: NewOrganizationProps) {
	const { state, updateOrganization, updateLogoHolder, updateMainUser, updateMainUserAvatarHolder, updateProductsExcelFile, resetState } =
		useOrganizationState();

	const queryClient = useQueryClient();

	async function handleCreateOrganization() {
		try {
			// Process logo file
			let logoFile: TCreateOrganizationInput["logoFile"] = null;
			if (state.logoHolder.file) {
				const buffer = await state.logoHolder.file.arrayBuffer();
				const base64 = Buffer.from(buffer).toString("base64");
				logoFile = {
					name: state.logoHolder.file.name,
					base64: base64,
					type: state.logoHolder.file.type,
				};
			}

			// Process products Excel file
			let productsData: TCreateOrganizationInput["productsData"] = null;
			if (state.productsExcelFile) {
				const rawData = await getJSONFromExcelFile(state.productsExcelFile);
				productsData = rawData as any; // Schema will validate on backend
			}

			const input: TCreateOrganizationInput = {
				organization: state.organization,
				mainUser: state.mainUser,
				logoFile,
				productsData,
			};

			return await createOrganization(input);
		} catch (error) {
			console.error("Error creating organization", error);
			throw new Error("Erro ao criar organização.");
		}
	}

	const { mutate, isPending } = useMutation({
		mutationKey: ["create-organization"],
		mutationFn: handleCreateOrganization,
		onSuccess: async (data) => {
			toast.success(data.message);
			resetState();
			queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
			queryClient.invalidateQueries({ queryKey: ["admin-organizations"] });
			closeModal();
		},
		onError: async (error) => {
			toast.error(getErrorMessage(error));
		},
	});

	return (
		<ResponsiveMenu
			menuTitle="NOVA ORGANIZAÇÃO"
			menuDescription="Preencha os campos abaixo para cadastrar uma nova organização"
			menuActionButtonText="CRIAR ORGANIZAÇÃO"
			menuCancelButtonText="CANCELAR"
			actionFunction={() => mutate()}
			actionIsLoading={isPending}
			stateIsLoading={false}
			stateError={null}
			closeMenu={closeModal}
			dialogVariant="xl"
			drawerVariant="xl"
		>
			<OrganizationGeneralBlock
				organization={state.organization}
				updateOrganization={updateOrganization}
				logoHolder={state.logoHolder}
				updateLogoHolder={updateLogoHolder}
			/>
			<OrganizationAddressBlock organization={state.organization} updateOrganization={updateOrganization} />
			<MainUserBlock
				mainUser={state.mainUser}
				updateMainUser={updateMainUser}
				avatarHolder={state.mainUserAvatarHolder}
				updateAvatarHolder={updateMainUserAvatarHolder}
			/>
			<ProductsImportBlock productsExcelFile={state.productsExcelFile} updateProductsExcelFile={updateProductsExcelFile} />
		</ResponsiveMenu>
	);
}
