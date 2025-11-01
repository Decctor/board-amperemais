"use client";
import Header from "@/components/Layouts/HeaderApp";
import SalesTeamMain from "@/components/SalesTeam/SalesTeamMain";
import type { TUserSession } from "@/schemas/users";

type SellersPageProps = {
	user: TUserSession;
};
export default function SellersPage({ user }: SellersPageProps) {
	return (
		<div className="flex h-full flex-col">
			<Header session={user} />
			<div className="flex w-full max-w-full grow flex-col overflow-x-hidden bg-background px-6 lg:px-12 py-6">
				<h1 className="text-2xl font-black text-primary">Vendedores</h1>
				<SalesTeamMain user={user} />
			</div>
		</div>
	);
}
