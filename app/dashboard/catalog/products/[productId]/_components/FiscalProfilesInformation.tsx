import { TGetProductsOutputById } from "@/app/api/products/route";
import FiscalProfileMenu from "@/components/Modals/Products/FiscalProfiles/FiscalProfileMenu";
import { ProductFiscalProfileCard, type TProductFiscalProfileCardData } from "@/components/Products/Shared/ProductFiscalProfileCard";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Section } from "@/components/ui/section";
import { getErrorMessage } from "@/lib/errors";
import { createProductFiscalProfile, deleteProductFiscalProfile, updateProductFiscalProfile } from "@/lib/mutations/products";
import { TUseProductFiscalProfileState } from "@/state-hooks/use-product-state";
import { useMutation } from "@tanstack/react-query";
import { FileText, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type ProductFiscalProfilesInformationProps = {
	product: TGetProductsOutputById;
	userHasFiscalViewPermission: boolean;
	userHasFiscalConfigurePermission: boolean;
	callbacks: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: (error: Error) => void;
		onSettled?: () => void;
	};
};

function mapApiFiscalProfileToCardData(fiscalProfile: TGetProductsOutputById["perfisFiscais"][number]): TProductFiscalProfileCardData {
	return {
		origemMercadoria: fiscalProfile.origemMercadoria,
		ncm: fiscalProfile.ncm,
		exTipi: fiscalProfile.exTipi != null ? fiscalProfile.exTipi : null,
		cest: fiscalProfile.cest != null ? fiscalProfile.cest : null,
		cfopPadrao: fiscalProfile.cfopPadrao != null ? fiscalProfile.cfopPadrao : null,
		unidadeComercial: fiscalProfile.unidadeComercial,
		codigoBeneficioFiscal: fiscalProfile.codigoBeneficioFiscal != null ? fiscalProfile.codigoBeneficioFiscal : null,
		ativo: fiscalProfile.ativo,
	};
}

export default function ProductFiscalProfilesInformation({
	product,
	userHasFiscalViewPermission,
	userHasFiscalConfigurePermission,
	callbacks,
}: ProductFiscalProfilesInformationProps) {
	const [newFiscalProfileMenuIsOpen, setNewFiscalProfileMenuIsOpen] = useState(false);
	const [editingFiscalProfileId, setEditingFiscalProfileId] = useState<string | null>(null);

	if (!userHasFiscalViewPermission) return null;

	async function handleCreationFiscalProfileSubmiting(state: TUseProductFiscalProfileState["state"]) {
		return await createProductFiscalProfile({
			productId: product.id,
			fiscalProfile: state,
		});
	}

	async function handleEditFiscalProfileSubmiting({
		state,
		productFiscalProfileId,
	}: {
		state: TUseProductFiscalProfileState["state"];
		productFiscalProfileId: string;
	}) {
		return await updateProductFiscalProfile({
			productId: product.id,
			productFiscalProfileId,
			fiscalProfile: state,
		});
	}

	async function handleDeleteFiscalProfileSubmiting(productFiscalProfileId: string) {
		return await deleteProductFiscalProfile({
			productId: product.id,
			productFiscalProfileId,
		});
	}

	const { mutate: createFiscalProfileMutation, isPending: isCreatingFiscalProfile } = useMutation({
		mutationKey: ["create-product-fiscal-profile", product.id],
		mutationFn: handleCreationFiscalProfileSubmiting,
		onMutate: () => {
			callbacks.onMutate?.();
		},
		onSuccess: () => {
			callbacks.onSuccess?.();
			setNewFiscalProfileMenuIsOpen(false);
			toast.success("Perfil fiscal criado com sucesso");
		},
		onError: (error) => {
			callbacks.onError?.(error);
			return toast.error(getErrorMessage(error));
		},
		onSettled: () => {
			callbacks.onSettled?.();
		},
	});
	const { mutate: updateFiscalProfileMutation, isPending: isUpdatingFiscalProfile } = useMutation({
		mutationKey: ["update-product-fiscal-profile", product.id],
		mutationFn: handleEditFiscalProfileSubmiting,
		onMutate: () => {
			callbacks.onMutate?.();
		},
		onSuccess: () => {
			callbacks.onSuccess?.();
			setEditingFiscalProfileId(null);
			toast.success("Perfil fiscal atualizado com sucesso");
		},
		onError: (error) => {
			callbacks.onError?.(error);
			return toast.error(getErrorMessage(error));
		},
		onSettled: () => {
			callbacks.onSettled?.();
		},
	});
	const { mutate: deleteFiscalProfileMutation, isPending: isDeletingFiscalProfile } = useMutation({
		mutationKey: ["delete-product-fiscal-profile", product.id],
		mutationFn: handleDeleteFiscalProfileSubmiting,
		onMutate: () => {
			callbacks.onMutate?.();
		},
		onSuccess: () => {
			callbacks.onSuccess?.();
			toast.success("Perfil fiscal excluído com sucesso");
		},
		onError: (error) => {
			callbacks.onError?.(error);
			return toast.error(getErrorMessage(error));
		},
		onSettled: () => {
			callbacks.onSettled?.();
		},
	});

	return (
		<Section.Root>
			<Section.Header>
				<Section.Icon>
					<FileText className="h-4 min-h-4 w-4 min-w-4" />
				</Section.Icon>
				<Section.Title>PERFIS FISCAIS</Section.Title>
				<Section.Actions>
					{userHasFiscalConfigurePermission ? (
						<Button
							variant="ghost"
							size="xs"
							onClick={() => setNewFiscalProfileMenuIsOpen(true)}
							className="flex items-center gap-1"
							disabled={isDeletingFiscalProfile}
						>
							<Plus className="h-4 min-h-4 w-4 min-w-4" />
							ADICIONAR
						</Button>
					) : null}
				</Section.Actions>
			</Section.Header>
			<Section.Body>
				<div className="flex w-full flex-col gap-3">
					{product.perfisFiscais.length > 0 ? (
						product.perfisFiscais.map((fiscalProfile) => (
							<ProductFiscalProfileCard
								key={fiscalProfile.id}
								fiscalProfile={mapApiFiscalProfileToCardData(fiscalProfile)}
								userHasFiscalConfigurePermission={userHasFiscalConfigurePermission}
								handleEditClick={() => setEditingFiscalProfileId(fiscalProfile.id)}
								handleDeleteClick={() => deleteFiscalProfileMutation(fiscalProfile.id)}
							/>
						))
					) : (
						<Empty>
							<EmptyHeader>
								<EmptyMedia variant="icon">
									<FileText className="h-4 w-4" />
								</EmptyMedia>
								<EmptyTitle>Nenhum perfil fiscal encontrado</EmptyTitle>
								<EmptyDescription>Adicione um perfil fiscal para começar</EmptyDescription>
							</EmptyHeader>
						</Empty>
					)}
				</div>
				{editingFiscalProfileId ? (
					<FiscalProfileMenu
						fiscalProfileId={editingFiscalProfileId}
						closeMenu={() => setEditingFiscalProfileId(null)}
						submitFiscalProfile={(state) => updateFiscalProfileMutation({ state, productFiscalProfileId: editingFiscalProfileId })}
						submitFiscalProfileIsLoading={isUpdatingFiscalProfile}
					/>
				) : null}
				{newFiscalProfileMenuIsOpen ? (
					<FiscalProfileMenu
						fiscalProfileId={undefined}
						closeMenu={() => setNewFiscalProfileMenuIsOpen(false)}
						submitFiscalProfile={(state) => createFiscalProfileMutation(state)}
						submitFiscalProfileIsLoading={isCreatingFiscalProfile}
					/>
				) : null}
			</Section.Body>
		</Section.Root>
	);
}
