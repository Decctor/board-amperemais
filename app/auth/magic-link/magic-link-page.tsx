"use client";

import { SubmitButton } from "@/components/submit-button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { verifyMagicLinkCode } from "@/lib/authentication/actions";
import { useActionState, useState } from "react";

type MagicLinkVerifyWaitingPageFormProps = {
	verificationTokenId: string;
};

function MagicLinkVerifyWaitingPageForm({ verificationTokenId }: MagicLinkVerifyWaitingPageFormProps) {
	const [code, setCode] = useState("");
	const [actionResult, actionMethod] = useActionState(verifyMagicLinkCode, {}, verificationTokenId);

	return (
		<form action={async () => await actionMethod({ code, verificationTokenId })} className="flex flex-col items-center gap-4">
			<Label className="self-center text-center font-medium text-primary/80 text-sm tracking-tight" htmlFor="code">
				Digite o código de verificação:
			</Label>
			<div className="flex justify-center">
				<InputOTP id="verification-code" name="verification-code" maxLength={6} onChange={(value) => setCode(value)} value={code}>
					<InputOTPGroup>
						<InputOTPSlot index={0} />
						<InputOTPSlot index={1} />
						<InputOTPSlot index={2} />
						<InputOTPSlot index={3} />
						<InputOTPSlot index={4} />
						<InputOTPSlot index={5} />
					</InputOTPGroup>
				</InputOTP>
			</div>

			{actionResult?.fieldError?.code && <p className="text-center text-destructive text-sm">{actionResult.fieldError.code}</p>}

			{actionResult?.formError && <p className="text-center text-destructive text-sm">{actionResult.formError}</p>}

			<SubmitButton className="w-full">Verificar Código</SubmitButton>
		</form>
	);
}

export default MagicLinkVerifyWaitingPageForm;
