"use client";
import SaleGoalsView from "@/components/Admin/SaleGoalsView";
import type { TUserSession } from "@/schemas/users";

type GoalsPageProps = {
	user: TUserSession;
};
export default function GoalsPage({ user }: GoalsPageProps) {
	return (
		<div className="flex w-full h-full grow flex-col">
			<SaleGoalsView session={user} />
		</div>
	);
}
