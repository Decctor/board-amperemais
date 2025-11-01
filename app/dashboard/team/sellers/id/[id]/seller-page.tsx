"use client";
import Header from "@/components/Layouts/HeaderApp";
import SalesTeamBySellerMain from "@/components/SalesTeam/SalesTeamBySellerMain";
import type { TUserSession } from "@/schemas/users";

type SellerPageProps = {
	user: TUserSession;
	id: string;
};
export default function SellerPage({ user, id }: SellerPageProps) {
	return (
		<div className="flex h-full flex-col">
			<Header session={user} />
			<div className="flex w-full max-w-full grow flex-col overflow-x-hidden bg-background px-6 lg:px-12 py-6">
				<h1 className="text-2xl font-black text-primary">Resultados do Vendedor</h1>
				<SalesTeamBySellerMain id={id} session={user} />
			</div>
		</div>
	);
}
