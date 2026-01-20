"use client";

import type { TGetWhatsappConnectionOutput } from "@/app/api/whatsapp-connections/route";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { type ReactNode, useState } from "react";
import { ChatHubContext } from "./context";

export type ChatHubRootProps = {
	children: ReactNode;
	user: TAuthUserSession["user"];
	organizationId: string;
	userHasMessageSendingPermission: boolean;
	whatsappConnection: TGetWhatsappConnectionOutput["data"];
	className?: string;
	defaultPhoneNumber?: string;
};

export function Root({ children, user, organizationId, userHasMessageSendingPermission, whatsappConnection, className, defaultPhoneNumber }: ChatHubRootProps) {
	const isDesktop = useMediaQuery("(min-width: 1024px)");

	const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
	const [selectedPhoneNumber, setSelectedPhoneNumber] = useState<string | null>(
		defaultPhoneNumber ?? whatsappConnection?.telefones?.[0]?.whatsappTelefoneId ?? null,
	);

	const contextValue = {
		selectedChatId,
		selectedPhoneNumber,
		user,
		organizationId,
		isDesktop,
		userHasMessageSendingPermission,
		whatsappConnection,
		setSelectedChatId,
		setSelectedPhoneNumber,
	};

	return (
		<ChatHubContext.Provider value={contextValue}>
			<div
				className={cn(
					"w-full max-h-[calc(100vh-100px)] grow flex flex-col items-center justify-center rounded-lg shadow-lg border border-primary/20 overflow-hidden",
					className,
				)}
			>
				{children}
			</div>
		</ChatHubContext.Provider>
	);
}
