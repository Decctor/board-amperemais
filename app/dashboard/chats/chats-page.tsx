"use client";
import ChatsMain from "@/components/Chats/ChatsMain";
import type { TAuthUserSession } from "@/lib/authentication/types";

type ChatsPageProps = {
	user: TAuthUserSession["user"];
	membership: NonNullable<TAuthUserSession["membership"]>;
};
export default function ChatsPage({ user, membership }: ChatsPageProps) {
	return (
		<div
			data-chat-page=""
			className="flex h-[calc(100dvh-7rem)] min-h-0 w-full shrink-0 flex-col overflow-hidden lg:h-[calc(100dvh-8rem)]"
		>
			<ChatsMain
				user={user}
				organizationId={membership.organizacao.id}
				canManageAttendances={membership.permissoes.atendimentos.finalizar ?? false}
			/>
		</div>
	);
}
