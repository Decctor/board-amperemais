"use client";
import type { TGetPartnersInput, TGetPartnersOutputDefault } from "@/app/api/partners/route";
import ErrorComponent from "@/components/Layouts/ErrorComponent";
import EditPartner from "@/components/Modals/Partners/EditPartner";
import PartnersFilterMenu from "@/components/Partners/PartnersFilterMenu";
import PartnersStats from "@/components/Partners/PartnersStats";
import GeneralPaginationComponent from "@/components/Utils/Pagination";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { getErrorMessage } from "@/lib/errors";
import { formatDateAsLocale, formatToMoney } from "@/lib/formatting";
import { formatNameAsInitials } from "@/lib/formatting";
import { usePartners } from "@/lib/queries/partners";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { IdCard, ListFilter, X } from "lucide-react";
import { AreaChart, BadgeDollarSign, CirclePlus, Mail, Pencil, Phone } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { BsCalendar } from "react-icons/bs";

type PartnersPageProps = {
	user: TAuthUserSession["user"];
};
export default function PartnersPage({ user }: PartnersPageProps) {
	const queryClient = useQueryClient();
	const [filterMenuIsOpen, setFilterMenuIsOpen] = useState<boolean>(false);
	const [editPartnerModalId, setEditPartnerModalId] = useState<string | null>(null);
	const {
		data: partnersResult,
		queryKey,
		isLoading,
		isError,
		isSuccess,
		error,
		queryParams,
		updateQueryParams,
	} = usePartners({
		initialParams: {
			search: "",
			statsPeriodAfter: dayjs().startOf("month").toDate(),
			statsPeriodBefore: dayjs().endOf("month").toDate(),
			statsSaleNatures: [],
			statsExcludedSalesIds: [],
			statsTotalMin: null,
			statsTotalMax: null,
		},
	});
	const partners = partnersResult?.partners;
	const partnersShowing = partners ? partners.length : 0;
	const partnersMatched = partnersResult?.partnersMatched || 0;
	const totalPages = partnersResult?.totalPages;
	const handleOnMutate = async () => await queryClient.cancelQueries({ queryKey: queryKey });
	const handleOnSettled = async () => await queryClient.invalidateQueries({ queryKey: queryKey });
	return (
		<div className="w-full h-full flex flex-col gap-3">
			<PartnersStats overallFilters={queryParams} />
			<div className="w-full flex items-center gap-2 flex-col-reverse lg:flex-row">
				<Input
					value={queryParams.search ?? ""}
					placeholder="Pesquisar parceiro..."
					onChange={(e) => updateQueryParams({ search: e.target.value })}
					className="grow rounded-xl"
				/>
				<Button className="flex items-center gap-2" size="sm" onClick={() => setFilterMenuIsOpen(true)}>
					<ListFilter className="w-4 h-4 min-w-4 min-h-4" />
					FILTROS
				</Button>
			</div>
			<GeneralPaginationComponent
				activePage={queryParams.page}
				queryLoading={isLoading}
				selectPage={(page) => updateQueryParams({ page })}
				totalPages={totalPages || 0}
				itemsMatchedText={partnersMatched > 0 ? `${partnersMatched} parceiros encontrados.` : `${partnersMatched} parceiro encontrado.`}
				itemsShowingText={partnersShowing > 0 ? `Mostrando ${partnersShowing} parceiros.` : `Mostrando ${partnersShowing} parceiro.`}
			/>
			<PartnersPageFilterShowcase queryParams={queryParams} updateQueryParams={updateQueryParams} />
			{isLoading ? <p className="w-full flex items-center justify-center animate-pulse">Carregando parceiros...</p> : null}
			{isError ? <ErrorComponent msg={getErrorMessage(error)} /> : null}
			{isSuccess ? (
				<div className="w-full flex flex-col gap-1.5">
					{partners && partners.length > 0 ? (
						partners.map((partner) => <PartnersPagePartnerCard key={partner.id} partner={partner} handleEditClick={setEditPartnerModalId} />)
					) : (
						<p className="w-full flex items-center justify-center">Nenhum parceiro encontrado</p>
					)}
				</div>
			) : null}

			{filterMenuIsOpen ? (
				<PartnersFilterMenu queryParams={queryParams} updateQueryParams={updateQueryParams} closeMenu={() => setFilterMenuIsOpen(false)} />
			) : null}
			{editPartnerModalId ? (
				<EditPartner
					partnerId={editPartnerModalId}
					user={user}
					closeModal={() => setEditPartnerModalId(null)}
					callbacks={{ onMutate: handleOnMutate, onSettled: handleOnSettled }}
				/>
			) : null}
		</div>
	);
}

type PartnersPageFilterShowcaseProps = {
	queryParams: TGetPartnersInput;
	updateQueryParams: (params: Partial<TGetPartnersInput>) => void;
};

function PartnersPageFilterShowcase({ queryParams, updateQueryParams }: PartnersPageFilterShowcaseProps) {
	const FilterTag = ({
		label,
		value,
		onRemove,
	}: {
		label: string;
		value: string;
		onRemove?: () => void;
	}) => (
		<div className="flex items-center gap-1 bg-secondary text-[0.65rem] rounded-lg px-2 py-1">
			<p className="text-primary/80">
				{label}: <strong>{value}</strong>
			</p>
			{onRemove && (
				<button type="button" onClick={onRemove} className="bg-transparent text-primary hover:bg-primary/20 rounded-lg p-1">
					<X size={12} />
				</button>
			)}
		</div>
	);
	return (
		<div className="flex items-center justify-center lg:justify-end flex-wrap gap-2">
			{queryParams.search && queryParams.search.trim().length > 0 && (
				<FilterTag label="PESQUISA" value={queryParams.search} onRemove={() => updateQueryParams({ search: "" })} />
			)}
			{queryParams.statsPeriodAfter && queryParams.statsPeriodBefore && (
				<FilterTag
					label="PERÍODO DAS ESTASTÍCAS"
					value={`${formatDateAsLocale(queryParams.statsPeriodAfter)} a ${formatDateAsLocale(queryParams.statsPeriodBefore)}`}
					onRemove={() => updateQueryParams({ statsPeriodAfter: null, statsPeriodBefore: null })}
				/>
			)}
			{queryParams.statsSaleNatures && queryParams.statsSaleNatures.length > 0 && (
				<FilterTag
					label="NATUREZAS DAS VENDAS"
					value={queryParams.statsSaleNatures.join(", ")}
					onRemove={() => updateQueryParams({ statsSaleNatures: [] })}
				/>
			)}
			{queryParams.statsTotalMin || queryParams.statsTotalMax ? (
				<FilterTag
					label="VALOR"
					value={`${queryParams.statsTotalMin ? `> ${formatToMoney(queryParams.statsTotalMin)}` : ""}${queryParams.statsTotalMin && queryParams.statsTotalMax ? " & " : ""}${queryParams.statsTotalMax ? `< ${formatToMoney(queryParams.statsTotalMax)}` : ""}`}
					onRemove={() => updateQueryParams({ statsTotalMin: null, statsTotalMax: null })}
				/>
			) : null}
		</div>
	);
}

function PartnersPagePartnerCard({
	partner,
	handleEditClick,
}: { partner: TGetPartnersOutputDefault["partners"][number]; handleEditClick: (id: string) => void }) {
	return (
		<div className={cn("bg-card border-primary/20 flex w-full flex-col gap-1 rounded-xl border px-3 py-4 shadow-2xs")}>
			<div className="flex items-center justify-between flex-col md:flex-row gap-3">
				<div className="flex items-center gap-3">
					<Avatar className="w-6 h-6 min-w-6 min-h-6">
						<AvatarImage src={partner.avatarUrl ?? undefined} alt={partner.nome} />
						<AvatarFallback>{formatNameAsInitials(partner.nome)}</AvatarFallback>
					</Avatar>
					<h1 className="text-xs font-bold tracking-tight uppercase">{partner.nome}</h1>
					{partner.cpfCnpj ? (
						<div className="flex items-center gap-1.5">
							<IdCard className="w-3 min-w-3 h-3 min-h-3" />
							<p className="text-xs tracking-tight uppercase">{partner.cpfCnpj ?? "CPF/CNPJ NÃO INFORMADO"}</p>
						</div>
					) : null}
					{partner.telefone ? (
						<div className="flex items-center gap-1.5">
							<Phone className="w-3 min-w-3 h-3 min-h-3" />
							<p className="text-xs tracking-tight uppercase">{partner.telefone ?? "TELEFONE NÃO INFORMADO"}</p>
						</div>
					) : null}
					{partner.email ? (
						<div className="flex items-center gap-1.5">
							<Mail className="w-3 min-w-3 h-3 min-h-3" />
							<p className="text-xs tracking-tight uppercase">{partner.email}</p>
						</div>
					) : null}
				</div>
				<div className="flex items-center gap-3 flex-col md:flex-row gap-y-1">
					<div className="flex items-center gap-3">
						<div className={cn("flex items-center gap-1.5 rounded-md px-1.5 py-1.5 text-[0.65rem] font-bold bg-primary/10 text-primary")}>
							<CirclePlus className="w-3 min-w-3 h-3 min-h-3" />
							<p className="text-xs font-bold tracking-tight uppercase">{partner.estatisticas.vendasQtdeTotal}</p>
						</div>
						<div className={cn("flex items-center gap-1.5 rounded-md px-1.5 py-1.5 text-[0.65rem] font-bold bg-primary/10 text-primary")}>
							<BadgeDollarSign className="w-3 min-w-3 h-3 min-h-3" />
							<p className="text-xs font-bold tracking-tight uppercase">{formatToMoney(partner.estatisticas.vendasValorTotal)}</p>
						</div>
					</div>
				</div>
			</div>
			<div className="w-full flex items-center justify-center lg:justify-end gap-2 flex-wrap">
				<div className={cn("flex items-center gap-1.5 text-[0.65rem] font-bold text-primary")}>
					<BsCalendar className="w-3 min-w-3 h-3 min-h-3" />
					<p className="text-xs font-medium tracking-tight uppercase">PRIMEIRA VENDA: {formatDateAsLocale(partner.estatisticas.dataPrimeiraVenda)}</p>
				</div>
				<div className={cn("flex items-center gap-1.5 text-[0.65rem] font-bold text-primary")}>
					<BsCalendar className="w-3 min-w-3 h-3 min-h-3" />
					<p className="text-xs font-medium tracking-tight uppercase">ÚLTIMA VENDA: {formatDateAsLocale(partner.estatisticas.dataUltimaVenda)}</p>
				</div>
				<Button
					variant="ghost"
					className="flex items-center gap-1.5"
					size="sm"
					onClick={(e) => {
						handleEditClick(partner.id);
					}}
				>
					<Pencil className="w-3 min-w-3 h-3 min-h-3" />
					EDITAR
				</Button>
			</div>
		</div>
	);
}
