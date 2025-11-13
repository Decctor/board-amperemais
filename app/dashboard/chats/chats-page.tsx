"use client";
import ChatsMain from "@/components/Chats/ChatsMain";
import type { TAuthUserSession } from "@/lib/authentication/types";

type ChatsPageProps = {
	user: TAuthUserSession["user"];
};
export default function ChatsPage({ user }: ChatsPageProps) {
	return (
		<div className="flex w-full h-full grow flex-col">
			<ChatsMain user={user} />
		</div>
	);
}
