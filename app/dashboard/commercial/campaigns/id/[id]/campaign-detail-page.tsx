"use client";

import CampaignConfigView from "@/app/dashboard/commercial/campaigns/id/[id]/_components/campaign-config-view";
import PauseCampaignDialog from "@/app/dashboard/commercial/campaigns/id/[id]/_components/pause-campaign-dialog";
import { CampaignStatsView } from "@/app/dashboard/commercial/campaigns/id/[id]/campaign-result-page";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ErrorComponent from "@/components/Layouts/ErrorComponent";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import { buildCampaignStateFromEntity, buildCampaignUpdatePayload } from "@/components/Modals/Campaigns/Sections/utils";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { getErrorMessage } from "@/lib/errors";
import { updateCampaign } from "@/lib/mutations/campaigns";
import { useCampaignById } from "@/lib/queries/campaigns";
import { cn } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Database, Pause, PlayIcon, TrendingUp } from "lucide-react";
import Link from "next/link";
import { parseAsStringEnum, useQueryState } from "nuqs";
import { useState } from "react";
import { toast } from "sonner";

type CampaignResultPageProps = {
	campaignId: string;
	membership: NonNullable<TAuthUserSession["membership"]>;
};

export default function CampaignResultPage({ campaignId, membership }: CampaignResultPageProps) {
	const queryClient = useQueryClient();
	const [viewMode, setViewMode] = useQueryState("view", parseAsStringEnum(["stats", "config"]));
	const [pauseDialogOpen, setPauseDialogOpen] = useState(false);

	const { data: campaign, isLoading, isError, error } = useCampaignById({ id: campaignId });

	const { mutate: handleStatusMutation, isPending: statusIsPending } = useMutation({
		mutationKey: ["update-campaign-status", campaignId],
		mutationFn: updateCampaign,
		onSuccess: async (data) => {
			toast.success(data.message);
			await queryClient.invalidateQueries({ queryKey: ["campaign-by-id", campaignId] });
			await queryClient.invalidateQueries({ queryKey: ["campaigns"] });
			setPauseDialogOpen(false);
		},
		onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
	});

	function updateCampaignStatus(ativo: boolean) {
		if (!campaign) return;
		const state = buildCampaignStateFromEntity(campaign);
		state.campaign.ativo = ativo;
		handleStatusMutation(buildCampaignUpdatePayload(campaign.id, state));
	}

	if (isLoading) return <LoadingComponent />;
	if (isError || !campaign) return <ErrorComponent msg={getErrorMessage(error) ?? "Campanha não encontrada."} />;

	return (
		<div className="flex h-full w-full flex-col gap-3">
			<div className="flex w-full flex-col gap-2">
				<Button variant="ghost" size="sm" asChild className="flex w-fit items-center gap-1.5 px-2">
					<Link href="/dashboard/commercial/campaigns?view=database">
						<ArrowLeft className="h-4 w-4 min-h-4 min-w-4" />
						VOLTAR
					</Link>
				</Button>
				<div className="flex w-full flex-col items-start justify-between gap-3 lg:flex-row">
					<div className="flex flex-col items-start">
						<h1 className="text-lg font-bold tracking-tight">{campaign.titulo}</h1>
						{campaign.descricao ? <p className="text-sm font-medium tracking-tight text-muted-foreground">{campaign.descricao}</p> : null}
					</div>
					<div className="flex items-center gap-2">
						{campaign.ativo ? (
							<>
								<div
									className={cn(
										"flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-white",
										"bg-amber-500 dark:bg-amber-600",
									)}
								>
									<Check className="h-4 min-h-4 w-4 min-w-4" />
									<p className="text-[0.65rem] font-bold tracking-tight uppercase">ATIVA</p>
								</div>
								<Button
									variant="outline"
									size="sm"
									disabled={statusIsPending}
									className="flex items-center gap-1.5"
									onClick={() => setPauseDialogOpen(true)}
								>
									<Pause className="h-4 min-h-4 w-4 min-w-4" />
									PAUSAR
								</Button>
							</>
						) : (
							<Button
								variant="ghost"
								size="fit"
								disabled={statusIsPending}
								className="flex items-center gap-1.5 rounded-xl bg-green-500 px-3 py-1.5 text-white hover:bg-green-600 hover:text-white dark:bg-green-600 dark:hover:bg-green-700"
								onClick={() => updateCampaignStatus(true)}
							>
								<PlayIcon className="h-4 min-h-4 w-4 min-w-4" />
								ATIVAR
							</Button>
						)}
					</div>
				</div>
			</div>

			<Tabs value={viewMode ?? "stats"} onValueChange={(value) => setViewMode(value as "stats" | "config")}>
				<TabsList className="flex h-fit w-fit items-center gap-1.5 self-start rounded-lg px-2 py-1">
					<TabsTrigger value="stats" className="flex items-center gap-1.5 rounded-lg px-2 py-2">
						<TrendingUp className="h-4 w-4 min-h-4 min-w-4" />
						Estatísticas
					</TabsTrigger>
					<TabsTrigger value="config" className="flex items-center gap-1.5 rounded-lg px-2 py-2">
						<Database className="h-4 w-4 min-h-4 min-w-4" />
						Minha campanha
					</TabsTrigger>
				</TabsList>
				<TabsContent value="stats" className="flex flex-col gap-3">
					<CampaignStatsView campaignId={campaignId} />
				</TabsContent>
				<TabsContent value="config" className="flex flex-col gap-3">
					<CampaignConfigView campaign={campaign} membership={membership} />
				</TabsContent>
			</Tabs>

			<PauseCampaignDialog
				open={pauseDialogOpen}
				isPending={statusIsPending}
				onCancel={() => setPauseDialogOpen(false)}
				onConfirm={() => updateCampaignStatus(false)}
			/>
		</div>
	);
}
