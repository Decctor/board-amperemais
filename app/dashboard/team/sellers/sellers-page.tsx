"use client";
import ErrorComponent from "@/components/Layouts/ErrorComponent";
import EditSeller from "@/components/Modals/Sellers/EditSeller";
import ViewSellerResults from "@/components/Modals/Sellers/ViewSellerResults";
import SalesTeamFilterMenu from "@/components/SalesTeam/SalesTeamFilterMenu";
import SalesTeamFilterShowcase from "@/components/SalesTeam/SalesTeamFilterShowcase";
import GeneralPaginationComponent from "@/components/Utils/Pagination";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { getErrorMessage } from "@/lib/errors";
import { formatNameAsInitials, formatToMoney } from "@/lib/formatting";
import { useSellers } from "@/lib/queries/sellers";
import { cn } from "@/lib/utils";
import type { TGetSellersOutputDefault } from "@/pages/api/sellers";
import { useQueryClient } from "@tanstack/react-query";
import { AreaChart, BadgeDollarSign, CirclePlus, ListFilter, Mail, Pencil, Phone } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type SellersPageProps = {
	user: TAuthUserSession["user"];
};
export default function SellersPage({ user }: SellersPageProps) {
	const queryClient = useQueryClient();
	const [editSellerId, setEditSellerId] = useState<string | null>(null);
	const [filterMenuIsOpen, setFilterMenuIsOpen] = useState(false);
	const { data: sellersResult, queryKey, isLoading, isError, isSuccess, error, filters, updateFilters } = useSellers({});
	const handleOnMutate = async () => await queryClient.cancelQueries({ queryKey: queryKey });
	const handleOnSettled = async () => await queryClient.invalidateQueries({ queryKey: queryKey });

	const sellers = sellersResult?.sellers;
	const sellersShowing = sellers ? sellers.length : 0;
	const sellersMatched = sellersResult?.sellersMatched || 0;
	const totalPages = sellersResult?.totalPages;
	return (
		<div className="w-full h-full flex flex-col gap-3">
			<div className="w-full flex items-center justify-end gap-2">
				<Button className="flex items-center gap-2" size="sm" onClick={() => setFilterMenuIsOpen(true)}>
					<ListFilter className="w-4 h-4 min-w-4 min-h-4" />
					FILTROS
				</Button>
			</div>
			<GeneralPaginationComponent
				activePage={filters.page}
				queryLoading={isLoading}
				selectPage={(page) => updateFilters({ page })}
				totalPages={totalPages || 0}
				itemsMatchedText={sellersMatched > 0 ? `${sellersMatched} vendedores encontrados.` : `${sellersMatched} vendedor encontrado.`}
				itemsShowingText={sellersShowing > 0 ? `Mostrando ${sellersShowing} vendedores.` : `Mostrando ${sellersShowing} vendedor.`}
			/>
			<SalesTeamFilterShowcase queryParams={filters} updateQueryParams={updateFilters} />
			{isLoading ? <p className="w-full flex items-center justify-center animate-pulse">Carregando vendedores...</p> : null}
			{isError ? <ErrorComponent msg={getErrorMessage(error)} /> : null}
			{isSuccess && sellers ? (
				<div className="w-full flex flex-col gap-1.5">
					{sellers.length > 0 ? (
						sellers.map((seller) => (
							<SellersPageSellerCard
								key={seller.id}
								seller={seller}
								handleEditClick={setEditSellerId}
								userHasEditPermission={
									user.permissoes.resultados.visualizar && (!user.permissoes.resultados.escopo || user.permissoes.resultados.escopo?.includes(seller.id))
								}
								userHasViewPermission={
									user.permissoes.resultados.visualizar && (!user.permissoes.resultados.escopo || user.permissoes.resultados.escopo?.includes(seller.id))
								}
							/>
						))
					) : (
						<p className="w-full flex items-center justify-center">Nenhum vendedor encontrado</p>
					)}
				</div>
			) : null}
			{editSellerId ? (
				<EditSeller
					sellerId={editSellerId}
					user={user}
					closeModal={() => setEditSellerId(null)}
					callbacks={{ onMutate: handleOnMutate, onSettled: handleOnSettled }}
				/>
			) : null}
			{filterMenuIsOpen ? (
				<SalesTeamFilterMenu queryParams={filters} updateQueryParams={updateFilters} closeMenu={() => setFilterMenuIsOpen(false)} />
			) : null}
		</div>
	);
}

type SellerCardProps = {
	seller: TGetSellersOutputDefault["sellers"][number];
	handleEditClick: (sellerId: string) => void;
	userHasViewPermission: boolean;
	userHasEditPermission: boolean;
};
function SellersPageSellerCard({ seller, handleEditClick, userHasViewPermission, userHasEditPermission }: SellerCardProps) {
	return (
		<div className={cn("bg-card border-primary/20 flex w-full flex-col gap-1 rounded-xl border px-3 py-4 shadow-2xs")}>
			<div className="flex items-center justify-between flex-col md:flex-row gap-3">
				<div className="flex items-center gap-3">
					<Avatar className="w-6 h-6 min-w-6 min-h-6">
						<AvatarImage src={seller.avatarUrl ?? undefined} alt={seller.nome} />
						<AvatarFallback>{formatNameAsInitials(seller.nome)}</AvatarFallback>
					</Avatar>
					<h1 className="text-xs font-bold tracking-tight uppercase">{seller.nome}</h1>
					{seller.telefone ? (
						<div className="flex items-center gap-1.5">
							<Phone className="w-3 min-w-3 h-3 min-h-3" />
							<p className="text-xs tracking-tight uppercase">{seller.telefone ?? "TELEFONE NÃO INFORMADO"}</p>
						</div>
					) : null}
					{seller.email ? (
						<div className="flex items-center gap-1.5">
							<Mail className="w-3 min-w-3 h-3 min-h-3" />
							<p className="text-xs tracking-tight uppercase">{seller.email}</p>
						</div>
					) : null}
				</div>
				<div className="flex items-center gap-3 flex-col md:flex-row gap-y-1">
					<div className="flex items-center gap-3">
						<div className={cn("flex items-center gap-1.5 rounded-md px-1.5 py-1.5 text-[0.65rem] font-bold bg-primary/10 text-primary")}>
							<CirclePlus className="w-3 min-w-3 h-3 min-h-3" />
							<p className="text-xs font-bold tracking-tight uppercase">{seller.estatisticas.vendasQtdeTotal}</p>
						</div>
						<div className={cn("flex items-center gap-1.5 rounded-md px-1.5 py-1.5 text-[0.65rem] font-bold bg-primary/10 text-primary")}>
							<BadgeDollarSign className="w-3 min-w-3 h-3 min-h-3" />
							<p className="text-xs font-bold tracking-tight uppercase">{formatToMoney(seller.estatisticas.vendasValorTotal)}</p>
						</div>
					</div>
					<div className="flex items-center gap-3">
						{userHasEditPermission ? (
							<Button variant="ghost" className="flex items-center gap-1.5" size="sm" onClick={() => handleEditClick(seller.id)}>
								<Pencil className="w-3 min-w-3 h-3 min-h-3" />
								EDITAR
							</Button>
						) : null}
						{userHasViewPermission ? (
							<Button variant="link" className="flex items-center gap-1.5" size="sm" asChild>
								<Link href={`/dashboard/team/sellers/id/${seller.id}`}>
									<AreaChart className="w-3 min-w-3 h-3 min-h-3" />
									RESULTADOS
								</Link>
							</Button>
						) : null}
					</div>
				</div>
			</div>
		</div>
	);
}
