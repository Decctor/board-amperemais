"use client";

import FiscalProfileMenu from "@/components/Modals/Products/FiscalProfiles/FiscalProfileMenu";
import { getErrorMessage } from "@/lib/errors";
import { createProductFiscalProfile, updateProductFiscalProfile } from "@/lib/mutations/products";
import { FISCAL_PENDING_QUERY_KEY } from "@/lib/queries/fiscal";
import { useProductFiscalProfilesByProductId } from "@/lib/queries/products";
import type { TUseProductFiscalProfileState } from "@/state-hooks/use-product-state";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type ProductFiscalProfileQuickMenuProps = {
	productId: string;
	closeMenu: () => void;
	onSaved?: () => void;
};

/**
 * Abre o cadastro/edicao do perfil fiscal de um produto a partir de qualquer tela (modulo fiscal,
 * venda, checkout) — sem passar pela pagina do produto. Descobre sozinho se ja existe perfil ativo
 * e decide entre criar e atualizar.
 */
export function ProductFiscalProfileQuickMenu({ productId, closeMenu, onSaved }: ProductFiscalProfileQuickMenuProps) {
	const queryClient = useQueryClient();
	const { data: profiles, isLoading } = useProductFiscalProfilesByProductId({ productId });
	const existingProfile = profiles?.[0] ?? null;

	const invalidate = async () => {
		await Promise.all([
			queryClient.invalidateQueries({ queryKey: ["product-fiscal-profiles-by-product-id", productId] }),
			queryClient.invalidateQueries({ queryKey: ["product-by-id", productId] }),
			queryClient.invalidateQueries({ queryKey: FISCAL_PENDING_QUERY_KEY }),
			queryClient.invalidateQueries({ queryKey: ["fiscal-documents"] }),
		]);
	};

	const { mutate: submitProfile, isPending } = useMutation({
		mutationKey: ["quick-product-fiscal-profile", productId],
		mutationFn: async (state: TUseProductFiscalProfileState["state"]) => {
			if (existingProfile) return updateProductFiscalProfile({ productId, productFiscalProfileId: existingProfile.id, fiscalProfile: state });
			return createProductFiscalProfile({ productId, fiscalProfile: state });
		},
		onSuccess: async () => {
			await invalidate();
			toast.success(existingProfile ? "Perfil fiscal atualizado com sucesso." : "Perfil fiscal criado com sucesso.");
			onSaved?.();
			closeMenu();
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	// Enquanto nao sabemos se existe perfil, nao abrimos o formulario errado (criar x editar).
	if (isLoading) return null;

	return (
		<FiscalProfileMenu
			fiscalProfileId={existingProfile?.id}
			closeMenu={closeMenu}
			submitFiscalProfile={(state) => submitProfile(state)}
			submitFiscalProfileIsLoading={isPending}
		/>
	);
}
