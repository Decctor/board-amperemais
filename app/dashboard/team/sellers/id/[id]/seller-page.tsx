"use client";
import SalesTeamBySellerMain from "@/components/SalesTeam/SalesTeamBySellerMain";
import type { TUserSession } from "@/schemas/users";

type SellerPageProps = {
	user: TUserSession;
	id: string;
};
export default function SellerPage({ user, id }: SellerPageProps) {
	return (
		<div className="flex w-full h-full grow flex-col">
			<SalesTeamBySellerMain id={id} session={user} />
		</div>
	);
}
