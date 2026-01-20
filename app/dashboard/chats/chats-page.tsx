"use client";
import ChatsMain from "@/components/Chats/ChatsMain";
import type { TAuthUserSession } from "@/lib/authentication/types";

type ChatsPageProps = {
	user: TAuthUserSession["user"];
	membership: NonNullable<TAuthUserSession["membership"]>;
};
export default function ChatsPage({ user, membership }: ChatsPageProps) {
	return (
		<div className="flex w-full h-full grow flex-col">
			<ChatsMain user={user} organizationId={membership.organizacao.id} />
		</div>
	);
}
