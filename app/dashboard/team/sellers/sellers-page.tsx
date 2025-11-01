"use client";
import SalesTeamMain from "@/components/SalesTeam/SalesTeamMain";
import type { TUserSession } from "@/schemas/users";

type SellersPageProps = {
	user: TUserSession;
};
export default function SellersPage({ user }: SellersPageProps) {
	return (
		<div className="flex w-full h-full grow flex-col">
			<SalesTeamMain user={user} />
		</div>
	);
}
