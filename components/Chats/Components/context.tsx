"use client";

import type { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { TUserSession } from "@/schemas/users";
import { createContext, useContext } from "react";

export type ChatHubContextValue = {
	// State
	selectedChatId: Id<"chats"> | null;
	selectedPhoneNumber: string | null;
	session: TUserSession;
	isDesktop: boolean;
	userHasMessageSendingPermission: boolean;
	whatsappConnection: typeof api.queries.connections.getWhatsappConnection._returnType;

	// Actions
	setSelectedChatId: (chatId: Id<"chats"> | null) => void;
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
