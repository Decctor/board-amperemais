import type { TGetUsersOutputDefault } from "@/app/api/users/route";
import type { TGetUtilsOutputDefault } from "@/app/api/utils/route";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { getErrorMessage } from "@/lib/errors";
import { formatDateAsLocale, formatDateBirthdayAsLocale, formatNameAsInitials } from "@/lib/formatting";
import { useUsers } from "@/lib/queries/users";
import { useUtilsByIdentifier } from "@/lib/queries/utils";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { Cake, Calendar, Filter, Mail, Pencil, Phone, Plus, Trophy, UserRound, UsersRound } from "lucide-react";
import { useState } from "react";
import ErrorComponent from "../Layouts/ErrorComponent";
import LoadingComponent from "../Layouts/LoadingComponent";
import NewSalesPromoCampaign from "../Modals/Utils/SalesPromoCampaign/NewSalesPromoCampaign";
import { Button } from "../ui/button";

type SettingsSalesPromoCampaignsProps = {
	user: TAuthUserSession["user"];
};
export default function SettingsSalesPromoCampaigns({ user }: SettingsSalesPromoCampaignsProps) {
	const queryClient = useQueryClient();
	const { data: salesPromoCampaigns, queryKey, isLoading, isError, isSuccess, error } = useUtilsByIdentifier({ identifier: "SALES_PROMO_CAMPAIGN" });
	const [newSalesPromoCampaignModalIsOpen, setNewSalesPromoCampaignModalIsOpen] = useState(false);
	const [editSalesPromoCampaignModalId, setEditSalesPromoCampaignModalId] = useState<string | null>(null);

	const handleOnMutate = async () => await queryClient.cancelQueries({ queryKey });
	const handleOnSettled = async () => await queryClient.invalidateQueries({ queryKey });
	return (
		<div className={cn("flex w-full flex-col gap-3")}>
			<div className="flex items-center justify-end gap-2">
				<div className="flex items-center gap-2">
					<Button size="sm" className="flex items-center gap-2" onClick={() => setNewSalesPromoCampaignModalIsOpen(true)}>
						<Plus className="w-4 h-4 min-w-4 min-h-4" />
						NOVA CAMPANHA DE PROMOÇÃO DE VENDAS
					</Button>
				</div>
			</div>
			<div className="w-full flex flex-col gap-1.5">
				{isLoading ? <LoadingComponent /> : null}
				{isError ? <ErrorComponent msg={getErrorMessage(error)} /> : null}
				{isSuccess
					? salesPromoCampaigns.map((salesPromoCampaign, index: number) => {
							if (salesPromoCampaign.identificador !== "SALES_PROMO_CAMPAIGN") return null;
							return (
								<SalesPromoCampaignCard key={salesPromoCampaign.id} salesPromoCampaign={salesPromoCampaign} handleClick={setEditSalesPromoCampaignModalId} />
							);
						})
					: null}
			</div>
			{newSalesPromoCampaignModalIsOpen ? (
				<NewSalesPromoCampaign
					closeModal={() => setNewSalesPromoCampaignModalIsOpen(false)}
					callbacks={{ onMutate: handleOnMutate, onSettled: handleOnSettled }}
				/>
			) : null}
		</div>
	);
}

type SalesPromoCampaignCardProps = {
	salesPromoCampaign: TGetUtilsOutputDefault[number];
	handleClick: (id: string) => void;
};
function SalesPromoCampaignCard({ salesPromoCampaign, handleClick }: SalesPromoCampaignCardProps) {
	const utilData = salesPromoCampaign.valor;
	if (utilData.identificador !== "SALES_PROMO_CAMPAIGN") return null;
	return (
		<div className={cn("bg-card border-primary/20 flex w-full flex-col sm:flex-row gap-3 rounded-xl border px-3 py-4 shadow-2xs h-full")}>
			<div className="flex h-full grow flex-col gap-1.5">
				<h1 className="text-xs font-bold tracking-tight lg:text-sm">{utilData.dados.titulo}</h1>
				<div className="w-full flex flex-items-center gap-1.5 grow flex-wrap">
					<div className="flex items-center gap-1">
						<Calendar className="w-4 h-4 min-w-4 min-h-4" />
						<h1 className="py-0.5 text-center text-[0.65rem] font-medium italic text-primary/80">
							{formatDateAsLocale(utilData.dados.periodoEstatistico.inicio)} - {formatDateAsLocale(utilData.dados.periodoEstatistico.fim)}
						</h1>
					</div>
					{utilData.dados.rastrearRankingVendedores ? (
						<div className="flex items-center gap-1">
							<Trophy className="w-4 h-4 min-w-4 min-h-4" />
							<h1 className="py-0.5 text-center text-[0.65rem] font-medium italic text-primary/80">RANKING DE VENDEDORES</h1>
						</div>
					) : null}

					{utilData.dados.rastrearRankingProdutos ? (
						<div className="flex items-center gap-1">
							<Trophy className="w-4 h-4 min-w-4 min-h-4" />
							<h1 className="py-0.5 text-center text-[0.65rem] font-medium italic text-primary/80">RANKING DE PRODUTOS</h1>
						</div>
					) : null}
					{utilData.dados.rastrearRankingParceiros ? (
						<div className="flex items-center gap-1">
							<Trophy className="w-4 h-4 min-w-4 min-h-4" />
							<h1 className="py-0.5 text-center text-[0.65rem] font-medium italic text-primary/80">RANKING DE PARCEIROS</h1>
						</div>
					) : null}
				</div>
				<div className="w-full flex items-center justify-end">
					<Button variant="ghost" className="flex items-center gap-1.5" size="sm" onClick={() => handleClick(salesPromoCampaign.id)}>
						<Pencil className="w-3 min-w-3 h-3 min-h-3" />
						EDITAR
					</Button>
				</div>
			</div>
		</div>
	);
}
