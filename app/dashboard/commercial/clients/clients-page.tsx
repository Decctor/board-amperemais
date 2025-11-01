"use client";
import ClientsView from "@/components/Databases/ClientsView";
import type { TUserSession } from "@/schemas/users";

type ClientsPageProps = {
	user: TUserSession;
};
export default function ClientsPage({ user }: ClientsPageProps) {
	return (
		<div className="flex w-full h-full flex-col">
			<ClientsView session={user} />
		</div>
	);
}
