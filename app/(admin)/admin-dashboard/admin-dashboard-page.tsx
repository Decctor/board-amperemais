"use client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { BookOpen, Building2, Plus, Users } from "lucide-react";
import Link from "next/link";
import { parseAsStringEnum, useQueryState } from "nuqs";
import { useState } from "react";
import AdminKPIsBlock from "./components/AdminKPIsBlock";
import AdminOrganizationsBlock from "./components/AdminOrganizationsBlock";
import AdminUsersBlock from "./components/AdminUsersBlock";
import NewOrganization from "./components/NewOrganization/NewOrganization";

type TAdminDashboardPageProps = {
	user: TAuthUserSession["user"];
};
export default function AdminDashboardPage({ user }: TAdminDashboardPageProps) {
	const [viewMode, setViewMode] = useQueryState("view", parseAsStringEnum(["organizations", "users"]));
	const [newOrganizationModalOpen, setNewOrganizationModalOpen] = useState(false);

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
				</div>
			</div>

			<Tabs value={activeView} onValueChange={(v: string) => setViewMode(v as "organizations" | "users")}>
				<TabsList variant="page">
					<TabsTrigger value="organizations">
						<Building2 className="w-4 h-4 min-w-4 min-h-4" />
						Organizações
					</TabsTrigger>
					<TabsTrigger value="users">
						<Users className="w-4 h-4 min-w-4 min-h-4" />
						Usuários
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
			</Tabs>

			{/* New Organization Modal */}
			{newOrganizationModalOpen && <NewOrganization closeModal={() => setNewOrganizationModalOpen(false)} />}
		</div>
	);
}
