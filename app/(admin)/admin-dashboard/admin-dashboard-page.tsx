"use client";
import NewDeal from "@/components/Modals/Deals/NewDeal";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { useQueryClient } from "@tanstack/react-query";
import { Building2, Handshake, Plus, Users } from "lucide-react";
import { parseAsStringEnum, useQueryState } from "nuqs";
import { useState } from "react";
import AdminDealsBlock from "./components/AdminDealsBlock";
import AdminKPIsBlock from "./components/AdminKPIsBlock";
import AdminOrganizationsBlock from "./components/AdminOrganizationsBlock";
import AdminUsersBlock from "./components/AdminUsersBlock";
import NewOrganization from "./components/NewOrganization/NewOrganization";

type TAdminDashboardPageProps = {
	user: TAuthUserSession["user"];
};
export default function AdminDashboardPage({ user }: TAdminDashboardPageProps) {
	const queryClient = useQueryClient();
	const [viewMode, setViewMode] = useQueryState("view", parseAsStringEnum(["organizations", "users", "deals"]));
	const [newOrganizationModalOpen, setNewOrganizationModalOpen] = useState(false);
	const [newDealModalOpen, setNewDealModalOpen] = useState(false);

	const activeView = viewMode ?? "organizations";

	return (
		<div className="w-full h-full flex flex-col gap-4">
			{/* Header with Action Button */}
			<div className="w-full flex items-center justify-end flex-wrap">
				<div className="flex items-center gap-2">
					{activeView === "organizations" ? (
						<Button onClick={() => setNewOrganizationModalOpen(true)} className="flex items-center gap-2">
							<Plus className="w-4 h-4 min-w-4 min-h-4" />
							NOVA ORGANIZAÇÃO
						</Button>
					) : null}
					{activeView === "deals" ? (
						<Button onClick={() => setNewDealModalOpen(true)} className="flex items-center gap-2">
							<Plus className="w-4 h-4 min-w-4 min-h-4" />
							NOVO DEAL
						</Button>
					) : null}
				</div>
			</div>

			<Tabs value={activeView} onValueChange={(v: string) => setViewMode(v as "organizations" | "users" | "deals")}>
				<TabsList variant="page">
					<TabsTrigger value="organizations">
						<Building2 className="w-4 h-4 min-w-4 min-h-4" />
						Organizações
					</TabsTrigger>
					<TabsTrigger value="users">
						<Users className="w-4 h-4 min-w-4 min-h-4" />
						Usuários
					</TabsTrigger>
					<TabsTrigger value="deals">
						<Handshake className="w-4 h-4 min-w-4 min-h-4" />
						Deals
					</TabsTrigger>
				</TabsList>
				<TabsContent value="organizations">
					<div className="w-full flex flex-col gap-4">
						{/* KPIs Block */}
						<AdminKPIsBlock />

						{/* Organizations Block */}
						<AdminOrganizationsBlock user={user} />
					</div>
				</TabsContent>
				<TabsContent value="users">
					<AdminUsersBlock />
				</TabsContent>
				<TabsContent value="deals">
					<AdminDealsBlock />
				</TabsContent>
			</Tabs>

			{/* New Organization Modal */}
			{newOrganizationModalOpen && <NewOrganization closeModal={() => setNewOrganizationModalOpen(false)} />}

			{/* New Deal Modal */}
			{newDealModalOpen && (
				<NewDeal
					closeModal={() => setNewDealModalOpen(false)}
					callbacks={{ onSettled: () => queryClient.invalidateQueries({ queryKey: ["admin-deals"] }) }}
				/>
			)}
		</div>
	);
}
