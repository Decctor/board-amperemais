import { type QueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "../errors";

type UseMutationWithFeedbackParams = {
	queryClient: QueryClient;
	mutationKey: any[];
	mutationFn: any;
	callbackFn?: () => void;
	affectedQueryKey: any[];
	options?: any;
};
export function useMutationWithFeedback({
	queryClient,
	mutationKey,
	mutationFn,
	callbackFn,
	affectedQueryKey,
	options = {},
}: UseMutationWithFeedbackParams) {
	return useMutation({
		mutationKey: mutationKey,
		mutationFn: mutationFn,
		...options,
		onMutate: async (variables) => {
			// Show a loading toast message
			const loadingToast = toast.loading("Processando...");

			// Invalidate relevant queries before the mutation
			await queryClient.cancelQueries({ queryKey: affectedQueryKey });
			console.log("QUERY CANCELED", affectedQueryKey);
			// Return the loading toast to be used for rollback on error
			return { loadingToast };
		},
		onSuccess: (data, variables, context) => {
			// Dismiss the loading toast and show a success toast
			if (!context) return;
			const { loadingToast } = context;
			toast.dismiss();
			console.log("SUCCESS");
			const msg = typeof data === "string" ? data : "Atualização feita com sucesso !";
			toast.success(msg);
		},
		onSettled: async (data, error) => {
			console.log("QUERY INVALIDATED", affectedQueryKey);
			if (callbackFn) callbackFn();
			await queryClient.invalidateQueries({ queryKey: affectedQueryKey });
		},
		onError: (error, variables, context) => {
			console.log(error);
			// Rollback changes if needed

			toast.dismiss();

			const msg = getErrorMessage(error);
			// Show an error toast
			toast.error(msg);
		},
	});
}
