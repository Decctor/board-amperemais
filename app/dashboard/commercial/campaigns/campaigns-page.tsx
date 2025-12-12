"use client";
import type { TGetCampaignsOutputDefault } from "@/app/api/campaigns/route";
import ErrorComponent from "@/components/Layouts/ErrorComponent";
import ControlCampaign from "@/components/Modals/Campaigns/ControlCampaign";
import NewCampaign from "@/components/Modals/Campaigns/NewCampaign";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { getErrorMessage } from "@/lib/errors";
import { useCampaigns } from "@/lib/queries/campaigns";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { CircleCheck, Grid3x3, ListFilter, PencilIcon, Plus } from "lucide-react";
import { useState } from "react";

type CampaignsPageProps = {
	user: TAuthUserSession["user"];
};
export default function CampaignsPage({ user }: CampaignsPageProps) {
	const queryClient = useQueryClient();
	const [filterMenuIsOpen, setFilterMenuIsOpen] = useState<boolean>(false);
	const [newCampaignModalIsOpen, setNewCampaignModalIsOpen] = useState<boolean>(false);
	const [editCampaignModalId, setEditCampaignModalId] = useState<string | null>(null);
	const {
		data: campaignsResult,
		queryKey,
		isLoading,
		isError,
		isSuccess,
		error,
		filters,
		updateFilters,
	} = useCampaigns({
		initialFilters: {
			search: "",
			activeOnly: true,
		},
	});
	const handleOnMutate = async () => await queryClient.cancelQueries({ queryKey: queryKey });
	const handleOnSettled = async () => await queryClient.invalidateQueries({ queryKey: queryKey });
	return (
		<div className="w-full h-full flex flex-col gap-3">
			<div className="w-full flex items-center justify-end gap-2">
				<Button className="flex items-center gap-2" size="sm" onClick={() => setNewCampaignModalIsOpen(true)}>
					<Plus className="w-4 h-4 min-w-4 min-h-4" />
					NOVA CAMPANHA
				</Button>
			</div>
			<div className="w-full flex items-center gap-2 flex-col-reverse lg:flex-row">
				<Input
					value={filters.search ?? ""}
					placeholder="Pesquisar campanha..."
					onChange={(e) => updateFilters({ search: e.target.value })}
					className="grow rounded-xl"
				/>
				<Button className="flex items-center gap-2" size="sm" onClick={() => setFilterMenuIsOpen(true)}>
					<ListFilter className="w-4 h-4 min-w-4 min-h-4" />
					FILTROS
				</Button>
			</div>

			{isLoading ? <p className="w-full flex items-center justify-center animate-pulse">Carregando campanhas...</p> : null}
			{isError ? <ErrorComponent msg={getErrorMessage(error)} /> : null}
			{isSuccess ? (
				<div className="w-full flex flex-col gap-1.5">
					{campaignsResult && campaignsResult.length > 0 ? (
						campaignsResult.map((campaign) => (
							<CampaignsPageCampaignCard key={campaign.id} campaign={campaign} handleEditClick={() => setEditCampaignModalId(campaign.id)} />
						))
					) : (
						<p className="w-full flex items-center justify-center">Nenhuma campanha encontrada</p>
					)}
				</div>
			) : null}

			{newCampaignModalIsOpen ? (
				<NewCampaign
					user={user}
					closeModal={() => setNewCampaignModalIsOpen(false)}
					callbacks={{ onMutate: handleOnMutate, onSettled: handleOnSettled }}
				/>
			) : null}
			{editCampaignModalId ? (
				<ControlCampaign
					campaignId={editCampaignModalId}
					user={user}
					closeModal={() => setEditCampaignModalId(null)}
					callbacks={{ onMutate: handleOnMutate, onSettled: handleOnSettled }}
				/>
			) : null}
		</div>
	);
}

function CampaignsPageCampaignCard({ campaign, handleEditClick }: { campaign: TGetCampaignsOutputDefault[number]; handleEditClick: () => void }) {
	return (
		<div className={cn("bg-card border-primary/20 flex w-full flex-col gap-1 rounded-xl border px-3 py-4 shadow-2xs")}>
			<div className="w-full flex flex-col gap-0.5">
				<div className="w-full flex items-center justify-between gap-2">
					<h1 className="text-xs font-bold tracking-tight lg:text-sm">{campaign.titulo}</h1>
					<div
						className={cn("flex items-center gap-1.5 rounded-md px-1.5 py-1.5 text-[0.65rem] font-bold bg-primary/10 text-primary", {
							"bg-green-500 dark:bg-green-600 text-white": campaign.ativo,
							"bg-gray-500 dark:bg-gray-600 text-white": !campaign.ativo,
						})}
					>
						<CircleCheck className="w-4 min-w-4 h-4 min-h-4" />
						<p className="text-xs font-bold tracking-tight uppercase">{campaign.ativo ? "ATIVO" : "INATIVO"}</p>
					</div>
				</div>
				<p className="text-xs font-medium tracking-tight text-muted-foreground">{campaign.descricao}</p>
			</div>
			<div className="w-full flex items-center justify-between gap-2 flex-wrap">
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<div className={cn("flex items-center gap-1.5 rounded-md px-1.5 py-1.5 text-[0.65rem] font-bold bg-primary/10 text-primary")}>
								<Grid3x3 className="w-4 min-w-4 h-4 min-h-4" />
								<p className="text-xs font-bold tracking-tight uppercase">{campaign.segmentacoes.length} SEGMENTAÇÔES</p>
							</div>
						</TooltipTrigger>
						<TooltipContent className="max-w-xs">Incluindo {campaign.segmentacoes.map((s) => s.segmentacao).join(", ")}</TooltipContent>
					</Tooltip>
				</TooltipProvider>
				<Button variant="ghost" className="flex items-center gap-1.5" size="sm" onClick={handleEditClick}>
					<PencilIcon className="w-3 min-w-3 h-3 min-h-3" />
					EDITAR
				</Button>
			</div>
		</div>
	);
}
