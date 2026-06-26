"use client";

import { ActionToolbar } from "@/components/ui/action-toolbar";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database, MessageCircle, MessageCircleIcon, Plus, TrendingUp } from "lucide-react";
import Link from "next/link";
import { parseAsStringEnum, useQueryState } from "nuqs";
import { CampaignsDatabaseView } from "./database/campaigns-database-view";
import { CampaignsInteractionsView } from "./interactions/campaigns-interactions-view";
import { CampaignsStatsView } from "./stats/campaigns-stats-view";
import { CampaignTemplatesView } from "./templates/campaign-templates-view";

type CampaignsPageProps = {
	user: TAuthUserSession["user"];
	membership: NonNullable<TAuthUserSession["membership"]>;
};

function CampaignModuleActions() {
	return (
		<ActionToolbar>
			<ActionToolbar.Action asChild icon={Plus}>
				<Link href="/dashboard/communication/builder">NOVO TEMPLATE</Link>
			</ActionToolbar.Action>
			<ActionToolbar.Primary asChild icon={Plus}>
				<Link href="/dashboard/commercial/campaigns/new">NOVA CAMPANHA</Link>
			</ActionToolbar.Primary>
		</ActionToolbar>
	);
}

export default function CampaignsPage({ membership }: CampaignsPageProps) {
	const [viewMode, setViewMode] = useQueryState("view", parseAsStringEnum(["stats", "database", "interactions", "templates"]));

	return (
		<div className="flex h-full w-full flex-col gap-3">
			<Tabs
				value={viewMode ?? "stats"}
				onValueChange={(v: string) => setViewMode(v as "stats" | "database" | "interactions" | "templates")}
				className="flex h-full w-full flex-col"
			>
				<div className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
					<TabsList className="h-fit w-fit max-w-full justify-self-start">
						<TabsTrigger value="stats" className="flex items-center gap-1.5 rounded-lg px-2 py-2">
							<TrendingUp className="h-4 w-4 min-h-4 min-w-4" />
							Estatísticas
						</TabsTrigger>
						<TabsTrigger value="database" className="flex items-center gap-1.5 rounded-lg px-2 py-2">
							<Database className="h-4 w-4 min-h-4 min-w-4" />
							Minhas Campanhas
						</TabsTrigger>
						<TabsTrigger value="interactions" className="flex items-center gap-1.5 rounded-lg px-2 py-2">
							<MessageCircle className="h-4 w-4 min-h-4 min-w-4" />
							Interações
						</TabsTrigger>
						<TabsTrigger value="templates" className="flex items-center gap-1.5 rounded-lg px-2 py-2">
							<MessageCircleIcon className="h-4 w-4 min-h-4 min-w-4" />
							Modelos de Mensagens
						</TabsTrigger>
					</TabsList>
					<div className="justify-self-end">
						<CampaignModuleActions />
					</div>
				</div>
				<TabsContent value="stats" className="mt-3 flex flex-col gap-3">
					<CampaignsStatsView />
				</TabsContent>
				<TabsContent value="database" className="mt-3 flex flex-col gap-3">
					<CampaignsDatabaseView />
				</TabsContent>
				<TabsContent value="interactions" className="mt-3 flex flex-col gap-3">
					<CampaignsInteractionsView />
				</TabsContent>
				<TabsContent value="templates" className="mt-3 flex flex-col gap-3">
					<CampaignTemplatesView organizationName={membership.organizacao.nome} />
				</TabsContent>
			</Tabs>
		</div>
	);
}
