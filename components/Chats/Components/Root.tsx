"use client";

import type { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { cn } from "@/lib/utils";
import type { TUserSession } from "@/schemas/users";
import { type ReactNode, useState } from "react";
import { ChatHubContext } from "./context";

export type ChatHubRootProps = {
	children: ReactNode;
	session: TUserSession;
	userHasMessageSendingPermission: boolean;
	whatsappConnection: typeof api.queries.connections.getWhatsappConnection._returnType;
	className?: string;
	defaultPhoneNumber?: string;
};

export function Root({ children, session, userHasMessageSendingPermission, whatsappConnection, className, defaultPhoneNumber }: ChatHubRootProps) {
	const isDesktop = useMediaQuery("(min-width: 1024px)");

	const [selectedChatId, setSelectedChatId] = useState<Id<"chats"> | null>(null);
	const [selectedPhoneNumber, setSelectedPhoneNumber] = useState<string | null>(
		defaultPhoneNumber ?? whatsappConnection?.telefones[0]?.whatsappTelefoneId ?? null,
	);

	const contextValue = {
		selectedChatId,
		selectedPhoneNumber,
		session,
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
