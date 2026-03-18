"use client";
import NewPurchase from "@/components/Modals/Purchases/NewPurchase";
import { Button } from "@/components/ui/button";
import { TAuthUserSession } from "@/lib/authentication/types";
import { usePurchases } from "@/lib/queries/purchases";
import { useQueryClient } from "@tanstack/react-query";
import { Factory, ListFilter, Plus, ShoppingCart, Truck, SquareArrowOutUpRight, Pencil } from "lucide-react";
import { BsCalendar, BsCalendarCheck, BsCalendarEvent, BsCalendarPlus } from "react-icons/bs";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import GeneralPaginationComponent from "@/components/Utils/Pagination";
import { getErrorMessage } from "@/lib/errors";
import LoadingComponent from "@/components/Layouts/LoadingComponent";

import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import ErrorComponent from "@/components/Layouts/ErrorComponent";
import type { TGetPurchasesOutputDefault } from "@/app/api/purchases/route";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDateAsLocale, formatNameAsInitials } from "@/lib/formatting";
import Link from "next/link";
type PurchasesPageProps = {
	user: TAuthUserSession["user"];
	membership: NonNullable<TAuthUserSession["membership"]>;
};

export default function PurchasesPage({ user, membership }: PurchasesPageProps) {
	const queryClient = useQueryClient();
	const [newPurchaseModalIsOpen, setNewPurchaseModalIsOpen] = useState(false);
	const { data, isLoading, isError, isSuccess, error, queryKey, filters, updateFilters } = usePurchases({ initialFilters: { page: 1, search: "" } });
	const purchases = data?.purchases ?? [];
	const purchasesMatched = data?.purchasesMatched ?? 0;
	const purchasesTotalPages = data?.totalPages ?? 0;
	const purchasesShowing = purchases.length;

	const handleOnMutate = async () => await queryClient.cancelQueries({ queryKey: queryKey });
	const handleOnSettled = async () => await queryClient.invalidateQueries({ queryKey: queryKey });
	return (
		<div className="w-full flex flex-col gap-3">
			<div className="w-full flex items-center gap-2 flex-col-reverse lg:flex-row">
				<Input
					value={filters.search ?? ""}
					placeholder="Pesquisar compra..."
					onChange={(e) => updateFilters({ search: e.target.value })}
					className="grow rounded-xl"
				/>

				<Button className="flex items-center gap-2" size="sm" onClick={() => setNewPurchaseModalIsOpen(true)}>
					<Plus className="w-4 h-4 min-w-4 min-h-4" />
					NOVA COMPRA
				</Button>
			</div>
			<GeneralPaginationComponent
				activePage={filters.page}
				queryLoading={isLoading}
				selectPage={(page) => updateFilters({ page })}
				totalPages={purchasesTotalPages || 0}
				itemsMatchedText={purchasesMatched > 0 ? `${purchasesMatched} compras encontradas.` : `${purchasesMatched} compra encontrada.`}
				itemsShowingText={purchasesShowing > 0 ? `Mostrando ${purchasesShowing} compras.` : `Mostrando ${purchasesShowing} compra.`}
			/>
			{isLoading ? <LoadingComponent /> : null}
			{isError ? <ErrorComponent msg={getErrorMessage(error)} /> : null}
			{isSuccess && purchases ? (
				purchases.length > 0 ? (
					purchases.map((purchase, index: number) => <PurchasePageCard key={purchase.id} purchase={purchase} />)
				) : (
					<Empty>
						<EmptyHeader>
							<EmptyMedia variant="icon">
								<ShoppingCart />
							</EmptyMedia>
							<EmptyTitle>Nenhuma compra encontrada</EmptyTitle>
							<EmptyDescription>Você não tem nenhuma compra ainda. Comece criando sua primeira compra.</EmptyDescription>
						</EmptyHeader>
						<EmptyContent className="flex-row justify-center gap-2">
							<Button onClick={() => setNewPurchaseModalIsOpen(true)}>CRIAR NOVA COMPRA</Button>
						</EmptyContent>
					</Empty>
				)
			) : null}
			{newPurchaseModalIsOpen ? (
				<NewPurchase
					user={user}
					closeModal={() => setNewPurchaseModalIsOpen(false)}
					callbacks={{ onMutate: handleOnMutate, onSettled: handleOnSettled }}
				/>
			) : null}
		</div>
	);
}

type PurchasePageCardProps = {
	purchase: TGetPurchasesOutputDefault["purchases"][number];
};
function PurchasePageCard({ purchase }: PurchasePageCardProps) {
	return (
		<div className="bg-card border-primary/20 flex w-full flex-col gap-1 rounded-xl border px-3 py-4 shadow-2xs">
			<div className="flex w-full flex-col items-center justify-between gap-2 lg:flex-row">
				<div className="flex items-center gap-2">
					<h1 className="text-xs font-bold tracking-tight lg:text-sm">{purchase.titulo}</h1>
				</div>
			</div>
			<div className="flex w-full flex-col items-center justify-between gap-2 lg:flex-row">
				<div className="flex w-full flex-wrap items-center justify-center gap-2 lg:min-w-fit lg:justify-end">
					<div className="flex items-center gap-1">
						<Factory className="w-4 h-4 min-w-4 min-h-4" />
						<h2 className="py-0.5 text-center text-[0.65rem] font-medium italic text-muted-foreground">FORNECEDOR</h2>
						<h2 className="py-0.5 text-center text-[0.65rem] font-bold text-foreground">{purchase.pedidoFornecedorNome || "N/A"}</h2>
					</div>
					<div className="flex items-center gap-1">
						<Truck className="w-4 h-4 min-w-4 min-h-4" />
						<h2 className="py-0.5 text-center text-[0.65rem] font-medium italic text-muted-foreground">TRANSPORTADORA</h2>
						<h2 className="py-0.5 text-center text-[0.65rem] font-bold text-foreground">{purchase.transporteTransportadoraNome || "N/A"}</h2>
					</div>
					<div className="flex items-center gap-1">
						<BsCalendar className="w-4 h-4 min-w-4 min-h-4" />
						<h2 className="py-0.5 text-center text-[0.65rem] font-medium italic text-muted-foreground">PEDIDO</h2>
						<h2 className="py-0.5 text-center text-[0.65rem] font-bold text-foreground">{formatDateAsLocale(purchase.pedidoData) || "PENDENTE"}</h2>
					</div>

					<div className="flex items-center gap-1">
						<BsCalendarEvent className="w-4 h-4 min-w-4 min-h-4" />
						<h2 className="py-0.5 text-center text-[0.65rem] font-medium italic text-muted-foreground">PREVISÃO</h2>
						<h2 className="py-0.5 text-center text-[0.65rem] font-bold text-foreground">
							{formatDateAsLocale(purchase.entregaDataRecebimentoPrevisao) || "N/A"}
						</h2>
					</div>
					<div className="flex items-center gap-1">
						<BsCalendarCheck className="w-4 h-4 min-w-4 min-h-4" />
						<h2 className="py-0.5 text-center text-[0.65rem] font-medium italic text-muted-foreground">EFETIVAÇÃO</h2>
						<h2 className="py-0.5 text-center text-[0.65rem] font-bold text-foreground">
							{formatDateAsLocale(purchase.entregaDataRecebimentoEfetivacao) || "N/A"}
						</h2>
					</div>
				</div>
			</div>

			<div className="flex w-full flex-col items-center justify-between gap-2 lg:flex-row">
				<div className="flex flex-wrap items-center gap-2">
					<div className="flex items-center gap-1">
						<BsCalendarPlus className="w-4 h-4 min-w-4 min-h-4" />
						<h2 className="text-[0.65rem] font-medium text-muted-foreground">{formatDateAsLocale(purchase.dataInsercao, true)}</h2>
					</div>
					{purchase.dataEfetivacao ? (
						<div className="flex items-center gap-1">
							<BsCalendarCheck className="w-4 h-4 min-w-4 min-h-4" color="#22c55e" />
							<h2 className="text-[0.65rem] font-medium text-muted-foreground">{formatDateAsLocale(purchase.dataEfetivacao, true)}</h2>
						</div>
					) : null}

					<div className="flex items-center gap-1">
						<Avatar className="h-5 w-5">
							<AvatarImage src={purchase.autor?.avatarUrl || undefined} alt={purchase.autor?.nome || "N/A"} />
							<AvatarFallback>{formatNameAsInitials(purchase.autor?.nome || "N/A")}</AvatarFallback>
						</Avatar>
						<h2 className="text-[0.65rem] font-medium text-muted-foreground">{purchase.autor?.nome || "N/A"}</h2>
					</div>
				</div>
				<Button variant="ghost" size="xs">
					<Pencil className="w-4 h-4 min-w-4 min-h-4" />
					<p>EDITAR</p>
				</Button>
			</div>
		</div>
	);
}
