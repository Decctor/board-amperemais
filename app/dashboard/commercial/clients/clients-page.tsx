"use client";
import ClientsView from "@/components/Databases/ClientsView";
import Header from "@/components/Layouts/HeaderApp";
import type { TUserSession } from "@/schemas/users";

type ClientsPageProps = {
	user: TUserSession;
};
export default function ClientsPage({ user }: ClientsPageProps) {
	return (
		<div className="flex h-full flex-col">
			<Header session={user} />
			<div className="flex w-full max-w-full grow flex-col overflow-x-hidden bg-background px-6 lg:px-12 py-6">
				<h1 className="text-2xl font-black text-primary">Clientes</h1>
			</div>
			<ClientsView session={user} />
		</div>
	);
}
