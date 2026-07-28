"use client";
import ChatsMain from "@/components/Chats/ChatsMain";
import type { TAuthUserSession } from "@/lib/authentication/types";

type ChatsPageProps = {
	user: TAuthUserSession["user"];
	membership: NonNullable<TAuthUserSession["membership"]>;
};
export default function ChatsPage({ user, membership }: ChatsPageProps) {
	return (
		<div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
			<ChatsMain user={user} organizationId={membership.organizacao.id} />
		</div>
	);
}
