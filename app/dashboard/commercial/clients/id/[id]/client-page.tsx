"use client";
import ClientMain from "@/components/Clients/ClientMain";
import type { TUserSession } from "@/schemas/users";

type ClientPageProps = {
	user: TUserSession;
	id: string;
};
export default function ClientPage({ user, id }: ClientPageProps) {
	return (
		<div className="flex w-full max-w-full grow flex-col overflow-x-hidden bg-background px-6 lg:px-12 py-6">
			<h1 className="text-2xl font-black text-primary">Cliente</h1>
			<ClientMain id={id} session={user} />
		</div>
	);
}
