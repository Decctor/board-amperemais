"use client";

import type { TGetWhatsappConnectionsOutput } from "@/app/api/whatsapp-connections/route";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { useCreateChat } from "@/lib/mutations/chats";
import { useState } from "react";
import { toast } from "sonner";
import * as ChatHub from "./Components/index";

type ChatsHubProps = {
	user: TAuthUserSession["user"];
	organizationId: string;
	userHasMessageSendingPermission: boolean;
	whatsappConnections: TGetWhatsappConnectionsOutput["data"];
};

/**
 * ChatsHub - Composable Version
 *
 * This component demonstrates the composable pattern for building complex UI.
 * Each sub-component can be customized and styled independently while sharing
 * state through context.
 *
 * Features:
 * - Beautiful, modern UI with smooth animations
 * - Responsive design (mobile & desktop)
 * - Smooth transitions between views
 * - Accessible (ARIA labels, keyboard navigation)
 * - Type-safe with TypeScript
 * - Composable architecture
 */
export default function ChatsHub({ user, organizationId, userHasMessageSendingPermission, whatsappConnections }: ChatsHubProps) {
	return (
		<ChatHub.Root
			user={user}
			organizationId={organizationId}
			userHasMessageSendingPermission={userHasMessageSendingPermission}
			whatsappConnections={whatsappConnections}
		>
			<ChatHubContent whatsappConnections={whatsappConnections} />
		</ChatHub.Root>
	);
}

/**
 * Inner component that has access to ChatHub context
 */
function ChatHubContent({ whatsappConnections }: { whatsappConnections: TGetWhatsappConnectionsOutput["data"] }) {
	const [newChatMenuIsOpen, setNewChatMenuIsOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");

	const handleNewChat = () => {
		setNewChatMenuIsOpen(true);
	};

	return (
		<>
			{/* Layout - Handles responsive desktop/mobile views */}
			<ChatHub.Layout
				listPanel={
					<>
						{/* List Header - Phone selector and new chat button */}
						<ChatHub.Header
							whatsappConnections={whatsappConnections}
							onNewChat={handleNewChat}
							showSearch={true}
							searchQuery={searchQuery}
							onSearchChange={setSearchQuery}
						/>

						{/* Chat List - Displays all conversations */}
						<ChatHub.List searchQuery={searchQuery} />
					</>
				}
				contentPanel={
					<>
						{/* Content - Displays active chat or empty state */}
						<ChatHub.Content>
							{/* Messages - Scrollable message list */}
							<ChatHub.Messages />

							{/* Input - Message composition area */}
							<ChatHub.Input placeholder="Digite uma mensagem..." maxRows={4} />
						</ChatHub.Content>
					</>
				}
			/>

			{/* New Chat Modal */}
			{/* {newChatMenuIsOpen && <ClientsSelectionMenu closeModal={() => setNewChatMenuIsOpen(false)} handleSelect={handleSelectClient} />} */}
		</>
	);
}
