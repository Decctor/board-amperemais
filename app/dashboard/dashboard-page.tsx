"use client";
import { CampaignStatsSection } from "@/components/Stats/CampaignStatsSection";
import { CommercialStatsSection } from "@/components/Stats/CommercialStatsSection";
import { Tabs, TabsContent, TabsList, TabsTrigger, tabsPageToolbarActionsClassName, tabsPageToolbarClassName } from "@/components/ui/tabs";
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
			<Tabs defaultValue="campanhas" className="flex w-full flex-col">
				<div className={tabsPageToolbarClassName}>
					<TabsList variant="page">
						<TabsTrigger value="campanhas">
							<Megaphone className="w-4 h-4 min-w-4 min-h-4" />
							Campanhas
						</TabsTrigger>
						<TabsTrigger value="comercial">
							<BadgeDollarSign className="w-4 h-4 min-w-4 min-h-4" />
							Comercial
						</TabsTrigger>
					</TabsList>
					<div className={tabsPageToolbarActionsClassName}>
						<WhatsappConnectionsPills />
					</div>
				</div>

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
