"use client";

import { LoadingButton } from "@/components/loading-button";
import { getErrorMessage } from "@/lib/errors";
import { submitDealOnboarding } from "@/lib/mutations/deal-onboarding";
import { useMutation } from "@tanstack/react-query";
import { CreditCard } from "lucide-react";
import { toast } from "sonner";

export function DealOnboardingCheckoutButton({ token }: { token: string }) {
	const { mutate, isPending } = useMutation({
		mutationKey: ["deal-onboarding-checkout", token],
		mutationFn: () => submitDealOnboarding({ acao: "OBTER_CHECKOUT", token }),
		onSuccess: (data) => {
			if (data.data.checkoutUrl) window.location.assign(data.data.checkoutUrl);
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	return (
		<LoadingButton loading={isPending} onClick={() => mutate()}>
			<CreditCard className="h-4 w-4 min-w-4 min-h-4" />
			IR PARA O PAGAMENTO
		</LoadingButton>
	);
}
