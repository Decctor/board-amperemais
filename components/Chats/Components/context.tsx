"use client";

import type { TGetWhatsappConnectionOutput } from "@/app/api/whatsapp-connections/route";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { createContext, useContext } from "react";

export type ChatHubContextValue = {
	// State
	selectedChatId: string | null;
	selectedPhoneNumber: string | null;
	user: TAuthUserSession["user"];
	isDesktop: boolean;
	userHasMessageSendingPermission: boolean;
	whatsappConnection: TGetWhatsappConnectionOutput["data"];

	// Actions
	setSelectedChatId: (chatId: string | null) => void;
	setSelectedPhoneNumber: (phoneNumber: string | null) => void;
};

export const ChatHubContext = createContext<ChatHubContextValue | null>(null);

export function useChatHub() {
	const context = useContext(ChatHubContext);
	if (!context) {
		throw new Error("useChatHub must be used within a ChatHub.Root component");
	}
	return context;
}
