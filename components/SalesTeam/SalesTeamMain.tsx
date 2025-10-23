import { getErrorMessage } from "@/lib/errors";
import { formatNameAsInitials, formatToMoney } from "@/lib/formatting";
import { useSellers } from "@/lib/queries/sellers";
import { cn } from "@/lib/utils";
import { TGetSellersOutput, type TGetSellersOutputDefault } from "@/pages/api/sellers";
import type { TUserSession } from "@/schemas/users";
import { useQueryClient } from "@tanstack/react-query";
import { AreaChart, BadgeDollarSign, CirclePlus, Filter, Mail, Pencil, Phone } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import ErrorComponent from "../Layouts/ErrorComponent";
import Header from "../Layouts/Header";
import EditSeller from "../Modals/Sellers/EditSeller";
import ViewSellerResults from "../Modals/Sellers/ViewSellerResults";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import SalesTeamFilterMenu from "./SalesTeamFilterMenu";
import SalesTeamFilterShowcase from "./SalesTeamFilterShowcase";

type SalesTeamMainProps = {
	user: TUserSession; // the user that is logged in
};
export default function SalesTeamMain({ user }: SalesTeamMainProps) {
	const queryClient = useQueryClient();
	const { data: sellers, queryKey, isLoading, isError, isSuccess, error, filters, updateFilters } = useSellers({});
	const [editSellerId, setEditSellerId] = useState<string | null>(null);
	const [viewSellerId, setViewSellerId] = useState<string | null>(null);
	const [filterMenuIsOpen, setFilterMenuIsOpen] = useState(false);

	const handleOnMutate = async () => await queryClient.cancelQueries({ queryKey: queryKey });
	const handleOnSettled = async () => await queryClient.invalidateQueries({ queryKey: queryKey });
	return (
		<div className="flex h-full flex-col">
			<Header session={user} />
			<div className="flex w-full max-w-full grow flex-col overflow-x-hidden bg-background px-6 lg:px-12 py-6 gap-6">
				<div className="flex w-full items-center justify-between border-b border-primary pb-2 gap-2">
					<h1 className="text-base text-center lg:text-start lg:text-2xl font-black text-primary">Dashboard - Time de Vendas</h1>
					<Button variant={"ghost"} onClick={() => setFilterMenuIsOpen(true)} className="flex gap-1.5">
						<Filter className="w-4 min-w-4 h-4 min-h-4" />
					</Button>
				</div>
				<SalesTeamFilterShowcase queryParams={filters} updateQueryParams={updateFilters} />
				{isLoading ? <p className="w-full flex items-center justify-center animate-pulse">Carregando vendedores...</p> : null}
				{isError ? <ErrorComponent msg={getErrorMessage(error)} /> : null}
				{isSuccess ? (
					<div className="w-full flex flex-col gap-1.5">
						{sellers.length > 0 ? (
							sellers.map((seller) => <SellerCard key={seller.id} seller={seller} handleEditClick={setEditSellerId} handleViewClick={setViewSellerId} />)
						) : (
							<p className="w-full flex items-center justify-center">Nenhum vendedor encontrado</p>
						)}
					</div>
				) : null}
			</div>
			{viewSellerId ? <ViewSellerResults sellerId={viewSellerId} session={user} closeModal={() => setViewSellerId(null)} /> : null}
			{editSellerId ? (
				<EditSeller
					sellerId={editSellerId}
					sessionUser={user}
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
	seller: TGetSellersOutputDefault[number];
	handleEditClick: (sellerId: string) => void;
	handleViewClick: (sellerId: string) => void;
};
function SellerCard({ seller, handleEditClick, handleViewClick }: SellerCardProps) {
	return (
		<div className={cn("bg-card border-primary/20 flex w-full flex-col gap-1 rounded-xl border px-3 py-4 shadow-xs")}>
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
						<Button variant="ghost" className="flex items-center gap-1.5" size="sm" onClick={() => handleEditClick(seller.id)}>
							<Pencil className="w-3 min-w-3 h-3 min-h-3" />
							EDITAR
						</Button>
						<Button variant="link" className="flex items-center gap-1.5" size="sm" asChild>
							<Link href={`/time-vendas/vendedor/id/${seller.id}`}>
								<AreaChart className="w-3 min-w-3 h-3 min-h-3" />
								RESULTADOS
							</Link>
						</Button>
						{/* <Button variant="ghost" className="flex items-center gap-1.5" size="sm" onClick={() => handleViewClick(seller.id)}>
							<AreaChart className="w-3 min-w-3 h-3 min-h-3" />
							RESULTADOS
						</Button> */}
					</div>
				</div>
			</div>
		</div>
	);
}
