"use client";
import ChatsMain from "@/components/Chats/ChatsMain";
import type { TUserSession } from "@/schemas/users";

type ChatsPageProps = {
	user: TUserSession;
};
export default function ChatsPage({ user }: ChatsPageProps) {
	return (
		<div className="flex w-full h-full grow flex-col">
			<ChatsMain user={user} />
		</div>
	);
}
