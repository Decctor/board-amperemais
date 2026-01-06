"use client";
import ClientsDatabaseFilterMenu from "@/components/Clients/DatabaseFilterMenu";
import ErrorComponent from "@/components/Layouts/ErrorComponent";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import GeneralPaginationComponent from "@/components/Utils/Pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { getErrorMessage } from "@/lib/errors";
import { formatDateAsLocale, formatToMoney } from "@/lib/formatting";
import { useClients, useClientsBySearch, useClientsStats } from "@/lib/queries/clients";
import { cn } from "@/lib/utils";
import type { TGetClientsInput, TGetClientsOutputDefault } from "@/pages/api/clients";
import type { TGetClientsBySearchOutput } from "@/pages/api/clients/search";
import { BadgeDollarSign, CirclePlus, Info, ListFilter, Mail, Megaphone, Phone, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { BsCalendar } from "react-icons/bs";

type ClientsPageProps = {
	user: TAuthUserSession["user"];
};
export default function ClientsPage({ user }: ClientsPageProps) {
	const [newMainEntityModalIsOpen, setNewMainEntityModalIsOpen] = useState<boolean>(false);
	const [editMainEntityModal, setEditMainEntityModal] = useState<{ id: string | null; isOpen: boolean }>({ id: null, isOpen: false });
	const [filterMenuIsOpen, setFilterMenuIsOpen] = useState<boolean>(false);
	const {
		data: clientsResult,
		queryKey,
		isLoading,
		isError,
		isSuccess,
		error,
		filters,
		updateFilters,
	} = useClients({
		initialFilters: {},
	});

	const clients = clientsResult?.clients;
	const clientsShowing = clients ? clients.length : 0;
	const clientsMatched = clientsResult?.clientsMatched || 0;
	const totalPages = clientsResult?.totalPages;
	return (
		<div className="w-full h-full flex flex-col gap-3">
			<ClientsStats overallFilters={filters} />
			<div className="w-full flex items-center gap-2 flex-col-reverse lg:flex-row">
				<Input
					value={filters.search ?? ""}
					placeholder="Pesquisar cliente..."
					onChange={(e) => updateFilters({ search: e.target.value })}
					className="grow rounded-xl"
				/>
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
				itemsMatchedText={clientsMatched > 0 ? `${clientsMatched} clientes encontrados.` : `${clientsMatched} cliente encontrado.`}
				itemsShowingText={clientsShowing > 0 ? `Mostrando ${clientsShowing} clientes.` : `Mostrando ${clientsShowing} cliente.`}
			/>
			<ClientPageFilterShowcase queryParams={filters} updateQueryParams={updateFilters} />
			{isLoading ? <LoadingComponent /> : null}
			{isError ? <ErrorComponent msg={getErrorMessage(error)} /> : null}
			{isSuccess && clients ? (
				clients.length > 0 ? (
					clients.map((client, index: number) => <ClientPageCard key={client.id} client={client} />)
				) : (
					<p className="w-full tracking-tight text-center">Nenhum cliente encontrado.</p>
				)
			) : null}
			{filterMenuIsOpen ? (
				<ClientsDatabaseFilterMenu filters={filters} updateFilters={updateFilters} closeMenu={() => setFilterMenuIsOpen(false)} />
			) : null}
		</div>
	);
}

type ClientsStatsProps = {
	overallFilters: TGetClientsInput;
};
function ClientsStats({ overallFilters }: ClientsStatsProps) {
	const { data: clientsStats, isLoading: clientsStatsLoading } = useClientsStats({
		periodAfter: overallFilters.statsPeriodAfter,
		periodBefore: overallFilters.statsPeriodBefore,
		saleNatures: overallFilters.statsSaleNatures,
		excludedSalesIds: overallFilters.statsExcludedSalesIds,
		totalMin: overallFilters.statsTotalMin,
		totalMax: overallFilters.statsTotalMax,
		rankingBy: "purchases-total-qty",
	});

	console.log(clientsStats);

	return (
		<div className="w-full flex flex-col gap-3">
			<div className="w-full flex items-start flex-col lg:flex-row gap-3">
				<div></div>
			</div>
		</div>
	);
}

type ClientCardProps = {
	client: TGetClientsOutputDefault["clients"][number];
};
function ClientPageCard({ client }: ClientCardProps) {
	return (
		<div className={cn("bg-card border-primary/20 flex w-full flex-col gap-1 rounded-xl border px-3 py-4 shadow-2xs")}>
			<div className="w-full flex items-center justify-between gap-2">
				<div className="flex items-center gap-2 flex-wrap">
					<h1 className="text-xs font-bold tracking-tight lg:text-sm">{client.nome}</h1>
					<div className="flex items-center gap-1">
						<Phone className="w-4 h-4 min-w-4 min-h-4" />
						<h1 className="py-0.5 text-center text-[0.65rem] font-medium italic text-primary/80">{client.telefone}</h1>
					</div>
					{client.email ? (
						<div className="flex items-center gap-1">
							<Mail className="w-4 h-4 min-w-4 min-h-4" />
							<h1 className="py-0.5 text-center text-[0.65rem] font-medium italic text-primary/80">{client.email}</h1>
						</div>
					) : null}
					{client.canalAquisicao ? (
						<div className="flex items-center gap-1">
							<Megaphone width={15} height={15} />
							<h1 className="py-0.5 text-center text-[0.65rem] font-medium italic text-primary/80">{client.canalAquisicao || "N/A"}</h1>
						</div>
					) : null}
				</div>
				<div className="flex items-center gap-3 flex-col md:flex-row gap-y-1">
					<div className="flex items-center gap-3">
						<div className={cn("flex items-center gap-1.5 rounded-md px-1.5 py-1.5 text-[0.65rem] font-bold bg-primary/10 text-primary")}>
							<CirclePlus className="w-3 min-w-3 h-3 min-h-3" />
							<p className="text-xs font-bold tracking-tight uppercase">{client.estatisticas.comprasQtdeTotal}</p>
						</div>
						<div className={cn("flex items-center gap-1.5 rounded-md px-1.5 py-1.5 text-[0.65rem] font-bold bg-primary/10 text-primary")}>
							<BadgeDollarSign className="w-3 min-w-3 h-3 min-h-3" />
							<p className="text-xs font-bold tracking-tight uppercase">{formatToMoney(client.estatisticas.comprasValorTotal)}</p>
						</div>
					</div>
				</div>
			</div>
			<div className="w-full flex items-center justify-center lg:justify-end gap-2 flex-wrap">
				<div className={cn("flex items-center gap-1.5 text-[0.65rem] font-bold text-primary")}>
					<BsCalendar className="w-3 min-w-3 h-3 min-h-3" />
					<p className="text-xs font-medium tracking-tight uppercase">PRIMEIRA VENDA: {formatDateAsLocale(client.estatisticas.primeiraCompraData)}</p>
				</div>
				<div className={cn("flex items-center gap-1.5 text-[0.65rem] font-bold text-primary")}>
					<BsCalendar className="w-3 min-w-3 h-3 min-h-3" />
					<p className="text-xs font-medium tracking-tight uppercase">ÚLTIMA VENDA: {formatDateAsLocale(client.estatisticas.ultimaCompraData)}</p>
				</div>
				<Button variant="link" className="flex items-center gap-1.5" size="sm" asChild>
					<Link href={`/dashboard/commercial/clients/id/${client.id}`}>
						<Info className="w-3 min-w-3 h-3 min-h-3" />
						DETALHES
					</Link>
				</Button>
			</div>
		</div>
	);
}

type ClientPageFilterShowcaseProps = {
	queryParams: TGetClientsInput;
	updateQueryParams: (params: Partial<TGetClientsInput>) => void;
};
function ClientPageFilterShowcase({ queryParams, updateQueryParams }: ClientPageFilterShowcaseProps) {
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
			{queryParams.statsSaleNatures.length > 0 ? (
				<FilterTag
					label="NATUREZAS DAS VENDAS"
					value={queryParams.statsSaleNatures.map((nature) => nature).join(", ")}
					onRemove={() => updateQueryParams({ statsSaleNatures: [] })}
				/>
			) : null}
			{queryParams.acquisitionChannels.length > 0 ? (
				<FilterTag
					label="CANAIS DE AQUISIÇÃO"
					value={queryParams.acquisitionChannels.map((channel) => channel).join(", ")}
					onRemove={() => updateQueryParams({ acquisitionChannels: [] })}
				/>
			) : null}
			{queryParams.segmentationTitles.length > 0 ? (
				<FilterTag
					label="TÍTULOS DE SEGMENTAÇÃO"
					value={queryParams.segmentationTitles.map((title) => title).join(", ")}
					onRemove={() => updateQueryParams({ segmentationTitles: [] })}
				/>
			) : null}
			{queryParams.statsTotalMin || queryParams.statsTotalMax ? (
				<FilterTag
					label="VALOR"
					value={`${queryParams.statsTotalMin ? `> R$ ${queryParams.statsTotalMin}` : ""}${queryParams.statsTotalMin && queryParams.statsTotalMax ? " & " : ""}${queryParams.statsTotalMax ? `< R$ ${queryParams.statsTotalMax}` : ""}`}
					onRemove={() => updateQueryParams({ statsTotalMin: null, statsTotalMax: null })}
				/>
			) : null}
		</div>
	);
}
