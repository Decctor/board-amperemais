"use client";
import ChatsMain from "@/components/Chats/ChatsMain";
import Header from "@/components/Layouts/HeaderApp";
import type { TUserSession } from "@/schemas/users";

type ChatsPageProps = {
	user: TUserSession;
};
export default function ChatsPage({ user }: ChatsPageProps) {
	return (
		<div className="flex h-full flex-col">
			<Header session={user} />
			<div className="flex w-full max-w-full grow flex-col overflow-x-hidden bg-background px-6 lg:px-12 py-6">
				<h1 className="text-2xl font-black text-primary">Chats</h1>
				<ChatsMain user={user} />
			</div>
		</div>
	);
}
