"use client";

import ResponsiveMenuV2 from "@/components/Utils/ResponsiveMenuV2";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { getErrorMessage } from "@/lib/errors";
import { approvePoiTransactionRequest } from "@/lib/mutations/poi-transaction-requests";
import { useMutation } from "@tanstack/react-query";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { useCallback, useState } from "react";
import { toast } from "sonner";

const OPERATOR_PASSWORD_LENGTH = 5;

type ApproveTransactionProps = {
	requestId: string;
	clientDisplayName?: string;
	/** Quando ausente, é obrigatório informar a senha do operador (vendedor). */
	hasLinkedSeller: boolean;
	closeModal: () => void;
	callbacks?: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: (error: Error) => void;
		onSettled?: () => void;
	};
};

export function ApproveTransaction({ requestId, clientDisplayName, hasLinkedSeller, closeModal, callbacks }: ApproveTransactionProps) {
	const [operatorPassword, setOperatorPassword] = useState("");

	const { mutate, isPending } = useMutation({
		mutationKey: ["approve-poi-transaction-request", requestId],
		mutationFn: approvePoiTransactionRequest,
		onMutate: () => {
			callbacks?.onMutate?.();
		},
		onSuccess: (data) => {
			callbacks?.onSuccess?.();
			toast.success(data.message);
			closeModal();
		},
		onError: (error) => {
			callbacks?.onError?.(error);
			toast.error(getErrorMessage(error));
		},
		onSettled: () => {
			callbacks?.onSettled?.();
		},
	});

	const handleApprove = useCallback(() => {
		const code = operatorPassword;
		if (!hasLinkedSeller) {
			if (code.length !== OPERATOR_PASSWORD_LENGTH) {
				toast.error("Informe os 5 dígitos da senha do operador para identificar o vendedor, ou vincule um vendedor ao seu usuário.");
				return;
			}
		} else if (code.length > 0 && code.length !== OPERATOR_PASSWORD_LENGTH) {
			toast.error("Informe os 5 dígitos da senha ou deixe todos os campos em branco para usar o vendedor vinculado ao seu usuário.");
			return;
		}
		mutate({
			requestId,
			operatorIdentifier: code.length === OPERATOR_PASSWORD_LENGTH ? code : undefined,
		});
	}, [hasLinkedSeller, mutate, operatorPassword, requestId]);

	const description = hasLinkedSeller
		? "Informe os 5 dígitos da senha do vendedor que receberá a venda. Se deixar em branco, será usado o vendedor vinculado ao seu usuário."
		: "Informe os 5 dígitos da senha do operador (vendedor) que receberá esta venda.";

	return (
		<ResponsiveMenuV2
			menuTitle="APROVAR SOLICITAÇÃO"
			menuDescription={clientDisplayName ? `${description} Cliente: ${clientDisplayName}.` : description}
			menuActionButtonText="APROVAR"
			menuCancelButtonText="CANCELAR"
			actionFunction={handleApprove}
			actionIsLoading={isPending}
			stateIsLoading={false}
			stateError={null}
			closeMenu={closeModal}
			dialogContentClassName="min-w-0 overflow-x-hidden sm:max-w-lg"
			drawerContentClassName="overflow-x-hidden"
		>
			<div className="flex w-full min-w-0 flex-col gap-3 overflow-x-hidden py-2">
				<Label htmlFor="poi-approve-operator-password" className="text-sm font-medium tracking-tight text-foreground/80">
					SENHA DO OPERADOR (5 DÍGITOS)
					{!hasLinkedSeller ? <span className="text-red-500">*</span> : null}
				</Label>
				<InputOTP
					id="poi-approve-operator-password"
					maxLength={OPERATOR_PASSWORD_LENGTH}
					pattern={REGEXP_ONLY_DIGITS}
					inputMode="numeric"
					autoComplete="off"
					pushPasswordManagerStrategy="none"
					value={operatorPassword}
					onChange={(value) => setOperatorPassword(value)}
					containerClassName="mx-auto w-full max-w-full justify-center"
				>
					<InputOTPGroup>
						<InputOTPSlot index={0} />
						<InputOTPSlot index={1} />
						<InputOTPSlot index={2} />
						<InputOTPSlot index={3} />
						<InputOTPSlot index={4} />
					</InputOTPGroup>
				</InputOTP>
			</div>
		</ResponsiveMenuV2>
	);
}
