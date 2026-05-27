"use client";
import { CampaignStatsSection } from "@/components/Stats/CampaignStatsSection";
import { CommercialStatsSection } from "@/components/Stats/CommercialStatsSection";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { BadgeDollarSign, Megaphone } from "lucide-react";
import WhatsappConnectionsPills from "@/components/WhatsappConnections/ConnectionsPills";
type DashboardPageProps = {
	user: TAuthUserSession["user"];
	userOrg: NonNullable<TAuthUserSession["membership"]>["organizacao"];
	membership: NonNullable<TAuthUserSession["membership"]>;
};

export function DashboardPage({ user, userOrg, membership }: DashboardPageProps) {
	return (
		<div className="w-full h-full flex flex-col gap-3">
			<div className="w-full flex items-center justify-end">
				<WhatsappConnectionsPills />
			</div>
			<Tabs defaultValue="campanhas">
				<TabsList className="flex items-center gap-1.5 w-fit h-fit self-start rounded-lg px-2 py-1">
					<TabsTrigger value="campanhas" className="flex items-center gap-1.5 px-2 py-2 rounded-lg">
						<Megaphone className="w-4 h-4 min-w-4 min-h-4" />
						Campanhas
					</TabsTrigger>
					<TabsTrigger value="comercial" className="flex items-center gap-1.5 px-2 py-2 rounded-lg">
						<BadgeDollarSign className="w-4 h-4 min-w-4 min-h-4" />
						Comercial
					</TabsTrigger>
				</TabsList>

				<TabsContent value="comercial" className="flex flex-col gap-3 mt-3">
					<CommercialStatsSection user={user} userOrg={userOrg} membership={membership} />
				</TabsContent>

				<TabsContent value="campanhas" className="flex flex-col gap-3 mt-3">
					<CampaignStatsSection />
				</TabsContent>
			</Tabs>
		</div>
	);
}
