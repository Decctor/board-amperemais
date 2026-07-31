"use client";

import { getErrorMessage } from "@/lib/errors";
import { updateOrganization } from "@/lib/mutations/organizations";
import { useOrganization } from "@/lib/queries/organizations";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

/**
 * Plumbing comum às seções que editam a organização. Cada seção guarda o próprio rascunho e envia
 * só o pedaço que possui: a rota faz merge profundo de `preferencias`, `defaults.contabilidade` e
 * `defaults.pagamentos`, então salvar uma seção nunca sobrescreve o que as outras guardam.
 */
export function useOrganizationSectionForm() {
	const queryClient = useQueryClient();
	const { data: organization, queryKey, isLoading, isError, isSuccess, error } = useOrganization();

	const { mutate: save, isPending: isSaving } = useMutation({
		mutationKey: ["update-organization"],
		mutationFn: updateOrganization,
		onMutate: async () => {
			await queryClient.cancelQueries({ queryKey });
		},
		onSuccess: (response) => toast.success(response.message),
		onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey });
		},
	});

	return { organization, isLoading, isError, isSuccess, error, save, isSaving };
}
