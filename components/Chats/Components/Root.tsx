"use client";

import type { TGetWhatsappConnectionsOutput } from "@/app/api/whatsapp-connections/route";
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
	whatsappConnections: TGetWhatsappConnectionsOutput["data"];
	className?: string;
	defaultPhoneNumber?: string;
};

export function Root({
	children,
	user,
	organizationId,
	userHasMessageSendingPermission,
	whatsappConnections,
	className,
	defaultPhoneNumber,
}: ChatHubRootProps) {
	const isDesktop = useMediaQuery("(min-width: 1024px)");

	const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
	const [selectedPhoneNumber, setSelectedPhoneNumber] = useState<string | null>(
		defaultPhoneNumber ?? whatsappConnections.flatMap((connection) => connection.telefones)[0]?.id ?? null,
	);

	const contextValue = {
		selectedChatId,
		selectedPhoneNumber,
		user,
		organizationId,
		isDesktop,
		userHasMessageSendingPermission,
		whatsappConnections,
		setSelectedChatId,
		setSelectedPhoneNumber,
	};

	return (
		<ChatHubContext.Provider value={contextValue}>
			<div
				className={cn(
					"w-full max-h-[calc(100vh-100px)] grow flex flex-col items-center justify-center rounded-lg shadow-lg border border-border overflow-hidden",
					className,
				)}
			>
				{children}
			</div>
		</ChatHubContext.Provider>
	);
}
