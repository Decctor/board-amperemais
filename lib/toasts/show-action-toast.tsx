"use client";

import { ActionToast } from "@/components/Utils/ActionToast";
import { toast } from "sonner";

type ShowSuccessActionToastParams = {
	message: string;
	actionLabel: string;
	onAction: () => void;
	duration?: number;
};

export function showSuccessActionToast({ message, actionLabel, onAction, duration = 12_000 }: ShowSuccessActionToastParams) {
	return toast.custom(
		(t) => (
			<ActionToast
				message={message}
				actionLabel={actionLabel}
				onAction={() => {
					onAction();
					toast.dismiss(t);
				}}
				onDismiss={() => toast.dismiss(t)}
			/>
		),
		{
			duration,
			className: "!border-0 !bg-transparent !p-0 !shadow-none",
		},
	);
}
