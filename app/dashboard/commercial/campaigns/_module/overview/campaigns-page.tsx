"use client";

import type { TAuthUserSession } from "@/lib/authentication/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database, MessageCircle, MessageCircleIcon, TrendingUp } from "lucide-react";
import { parseAsStringEnum, useQueryState } from "nuqs";
import { CampaignsDatabaseView } from "./database/campaigns-database-view";
import { CampaignsInteractionsView } from "./interactions/campaigns-interactions-view";
import { CampaignsStatsView } from "./stats/campaigns-stats-view";
import { CampaignTemplatesView } from "./templates/campaign-templates-view";

type CampaignsPageProps = {
	user: TAuthUserSession["user"];
	membership: NonNullable<TAuthUserSession["membership"]>;
};

export default function CampaignsPage({ membership }: CampaignsPageProps) {
	const [viewMode, setViewMode] = useQueryState("view", parseAsStringEnum(["stats", "database", "interactions", "templates"]));

	return (
		<div className="w-full h-full flex flex-col gap-3">
			<Tabs value={viewMode ?? "stats"} onValueChange={(v: string) => setViewMode(v as "stats" | "database" | "interactions" | "templates")}>
				<TabsList className="flex items-center gap-1.5 w-fit h-fit self-start rounded-lg px-2 py-1">
					<TabsTrigger value="stats" className="flex items-center gap-1.5 px-2 py-2 rounded-lg">
						<TrendingUp className="w-4 h-4 min-w-4 min-h-4" />
						Estatísticas
					</TabsTrigger>
					<TabsTrigger value="database" className="flex items-center gap-1.5 px-2 py-2 rounded-lg">
						<Database className="w-4 h-4 min-w-4 min-h-4" />
						Minhas Campanhas
					</TabsTrigger>
					<TabsTrigger value="interactions" className="flex items-center gap-1.5 px-2 py-2 rounded-lg">
						<MessageCircle className="w-4 h-4 min-w-4 min-h-4" />
						Interações
					</TabsTrigger>
					<TabsTrigger value="templates" className="flex items-center gap-1.5 px-2 py-2 rounded-lg">
						<MessageCircleIcon className="w-4 h-4 min-w-4 min-h-4" />
						Modelos de Mensagens
					</TabsTrigger>
				</TabsList>
				<TabsContent value="stats" className="flex flex-col gap-3">
					<CampaignsStatsView />
				</TabsContent>
				<TabsContent value="database" className="flex flex-col gap-3">
					<CampaignsDatabaseView />
				</TabsContent>
				<TabsContent value="interactions" className="flex flex-col gap-3">
					<CampaignsInteractionsView />
				</TabsContent>
				<TabsContent value="templates" className="flex flex-col gap-3">
					<CampaignTemplatesView organizationName={membership.organizacao.nome} />
				</TabsContent>
			</Tabs>
		</div>
	);
}
