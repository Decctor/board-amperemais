"use client";

import Header from "@/components/Layouts/HeaderApp";
import RFMAnalysis from "@/components/RFMAnalysis/RFMAnalysis";
import type { TUserSession } from "@/schemas/users";

type SegmentsPageProps = {
	user: TUserSession;
};
export default function SegmentsPage({ user }: SegmentsPageProps) {
	return (
		<div className="flex h-full flex-col">
			<Header session={user} />
			<div className="flex w-full max-w-full grow flex-col overflow-x-hidden bg-background px-6 lg:px-12 py-6">
				<h1 className="text-2xl font-black text-primary">Segmentações</h1>
			</div>
			<RFMAnalysis user={user} />
		</div>
	);
}
