"use client";
import ClientsGraphs from "@/components/Clients/ClientsGraphs";
import ClientsRanking from "@/components/Clients/ClientsRanking";
import ClientsDatabaseFilterMenu from "@/components/Clients/DatabaseFilterMenu";
import DateIntervalInput from "@/components/Inputs/DateIntervalInput";
import ErrorComponent from "@/components/Layouts/ErrorComponent";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import StatUnitCard from "@/components/Stats/StatUnitCard";
import GeneralPaginationComponent from "@/components/Utils/Pagination";
import { Button } from "@/components/ui/button";
import { FiltersShowcase } from "@/components/ui/filters-showcase";
import { Input } from "@/components/ui/input";
import { StatBadge } from "@/components/ui/stat-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { getErrorMessage } from "@/lib/errors";
import { formatDateAsLocale, formatDecimalPlaces, formatToMoney } from "@/lib/formatting";
import { useClients, useClientsOverallStats } from "@/lib/queries/clients";
import { cn } from "@/lib/utils";
import type { TGetClientsInput, TGetClientsOutputDefault } from "@/pages/api/clients";
import type { TGetClientsOverallStatsInput } from "@/pages/api/clients/stats/overall";
import dayjs from "dayjs";
import {
	FileSpreadsheet,
	BadgeDollarSign,
	BadgePercent,
	CirclePlus,
	Info,
	ListFilter,
	Mail,
	Megaphone,
	Phone,
	ShoppingCart,
	TrendingUp,
	UserPlus,
	UserRoundX,
	Users,
} from "lucide-react";
import Link from "next/link";
import { parseAsStringEnum, useQueryState } from "nuqs";
import { useState } from "react";
import { BsCalendar } from "react-icons/bs";

type ClientsPageProps = {
	user: TAuthUserSession["user"];
};
export default function ClientsPage({ user }: ClientsPageProps) {
	const [viewMode, setViewMode] = useQueryState("view", parseAsStringEnum(["stats", "database"]));
	return (
		<div className="w-full h-full flex flex-col gap-3">
			<Tabs value={viewMode ?? "stats"} onValueChange={(v: string) => setViewMode(v as "stats" | "database")}>
				<TabsList className="flex items-center gap-1.5 w-fit h-fit self-start rounded-lg px-2 py-1">
					<TabsTrigger value="stats" className="flex items-center gap-1.5 px-2 py-2 rounded-lg">
						<TrendingUp className="w-4 h-4 min-w-4 min-h-4" />
						Estatísticas
					</TabsTrigger>
					<TabsTrigger value="database" className="flex items-center gap-1.5 px-2 py-2 rounded-lg">
						<Users className="w-4 h-4 min-w-4 min-h-4" />
						Banco de Dados
					</TabsTrigger>
				</TabsList>
				<TabsContent value="stats">
					<ClientsStatsView />
				</TabsContent>
				<TabsContent value="database">
					<ClientsDatabaseView />
				</TabsContent>
			</Tabs>
		</div>
	);
}

function ClientsDatabaseView() {
	const [filterMenuIsOpen, setFilterMenuIsOpen] = useState<boolean>(false);
	const {
		data: clientsResult,
		isSuccess,
		isLoading,
		isError,
		error,
		filters,
		updateFilters,
	} = useClients({
		initialFilters: {
			statsPeriodAfter: dayjs().startOf("month").toDate(),
			statsPeriodBefore: dayjs().endOf("month").toDate(),
		},
	});
	const clients = clientsResult?.clients;
	const clientsShowing = clients ? clients.length : 0;
	const clientsMatched = clientsResult?.clientsMatched || 0;
	const totalPages = clientsResult?.totalPages;
	return (
		<div className="w-full flex flex-col gap-3">
			<div className="w-full flex items-center gap-2">
				<Input
					value={filters.search ?? ""}
					placeholder="Pesquisar cliente..."
					onChange={(e) => updateFilters({ search: e.target.value })}
					className="grow rounded-xl"
				/>
				<Button variant={"ghost"} className="flex items-center gap-2" size="sm" asChild>
					<Link href="/dashboard/commercial/clients/bulk-insert">
						<FileSpreadsheet className="w-4 h-4 min-w-4 min-h-4" />
						IMPORTAR CLIENTES
					</Link>
				</Button>
				<Button className="flex items-center gap-2" size="sm" onClick={() => setFilterMenuIsOpen(true)}>
					<ListFilter className="w-4 h-4 min-w-4 min-h-4" />
					<p className="hidden lg:block">FILTROS</p>
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

function ClientsStatsView() {
	const initialStartDate = dayjs().startOf("month");
	const initialEndDate = dayjs().endOf("month");
	const [filters, setFilters] = useState<TGetClientsOverallStatsInput>({
		periodAfter: initialStartDate.toDate(),
		periodBefore: initialEndDate.toDate(),
		comparingPeriodAfter: initialStartDate.subtract(1, "month").toDate(),
		comparingPeriodBefore: initialEndDate.subtract(1, "month").toDate(),
	});
	const { data: clientsOverallStats, isLoading: clientsOverallStatsLoading } = useClientsOverallStats({
		periodAfter: filters.periodAfter,
		periodBefore: filters.periodBefore,
		comparingPeriodAfter: filters.comparingPeriodAfter,
		comparingPeriodBefore: filters.comparingPeriodBefore,
	});

	console.log(clientsOverallStats);

	return (
		<div className="w-full flex flex-col gap-3">
			<div className="w-full flex items-center justify-end">
				<DateIntervalInput
					label="Período"
					labelClassName="hidden"
					className="hover:bg-accent hover:text-accent-foreground border-none shadow-none"
					value={{
						after: filters.periodAfter ? new Date(filters.periodAfter) : undefined,
						before: filters.periodBefore ? new Date(filters.periodBefore) : undefined,
					}}
					handleChange={(value) =>
						setFilters({
							periodAfter: value.after ? new Date(value.after) : null,
							periodBefore: value.before ? new Date(value.before) : null,
							comparingPeriodAfter: value.after ? dayjs(value.after).subtract(1, "month").toDate() : null,
							comparingPeriodBefore: value.before ? dayjs(value.before).subtract(1, "month").toDate() : null,
						})
					}
				/>
			</div>
			<div className="w-full flex items-start flex-col lg:flex-row gap-3">
				<StatUnitCard
					title="TOTAL DE CLIENTES"
					icon={<Users className="w-4 h-4 min-w-4 min-h-4" />}
					current={{
						value: clientsOverallStats?.totalClients.current || 0,
						format: (n) => formatDecimalPlaces(n),
					}}
					previous={
						clientsOverallStats?.totalClients.comparison
							? {
									value: clientsOverallStats?.totalClients.comparison || 0,
									format: (n) => formatDecimalPlaces(n),
								}
							: undefined
					}
				/>
				<StatUnitCard
					title="TOTAL DE CLIENTES NOVOS"
					icon={<UserPlus className="w-4 h-4 min-w-4 min-h-4" />}
					current={{
						value: clientsOverallStats?.totalNewClients.current || 0,
						format: (n) => formatDecimalPlaces(n),
					}}
					previous={
						clientsOverallStats?.totalNewClients.comparison
							? {
									value: clientsOverallStats?.totalNewClients.comparison || 0,
									format: (n) => formatDecimalPlaces(n),
								}
							: undefined
					}
				/>
				<StatUnitCard
					title="LTV"
					icon={<BadgeDollarSign className="w-4 h-4 min-w-4 min-h-4" />}
					current={{
						value: clientsOverallStats?.ltv.current || 0,
						format: (n) => formatToMoney(n),
					}}
					previous={
						clientsOverallStats?.ltv.comparison
							? {
									value: clientsOverallStats?.ltv.comparison || 0,
									format: (n) => formatToMoney(n),
								}
							: undefined
					}
				/>
				<StatUnitCard
					title="LIFETIME MÉDIO"
					icon={<BsCalendar className="w-4 h-4 min-w-4 min-h-4" />}
					current={{
						value: clientsOverallStats?.avgLifetime.current || 0,
						format: (n) => `${formatDecimalPlaces(n)} dias`,
					}}
					previous={
						clientsOverallStats?.avgLifetime.comparison
							? {
									value: clientsOverallStats?.avgLifetime.comparison || 0,
									format: (n) => `${formatDecimalPlaces(n)} dias`,
								}
							: undefined
					}
				/>
			</div>
			<div className="w-full flex items-start flex-col lg:flex-row gap-3">
				<StatUnitCard
					title="FATURAMENTO POR CLIENTES EXISTENTES"
					icon={<BadgeDollarSign className="w-4 h-4 min-w-4 min-h-4" />}
					current={{
						value: clientsOverallStats?.revenueFromRecurrentClients.current ? Number(clientsOverallStats?.revenueFromRecurrentClients.current) : 0,
						format: (n) => formatToMoney(n),
					}}
					previous={
						clientsOverallStats?.revenueFromRecurrentClients.comparison
							? {
									value: clientsOverallStats?.revenueFromRecurrentClients.comparison || 0,
									format: (n) => formatToMoney(n),
								}
							: undefined
					}
					footer={
						<div className="flex items-center gap-1">
							<p className="text-xs text-muted-foreground tracking-tight">REPRESENTATIVIDADE:</p>
							<p className="text-xs font-bold text-primary">{formatDecimalPlaces(clientsOverallStats?.revenueFromRecurrentClients.percentage || 0)}%</p>
						</div>
					}
					className="w-full lg:w-1/3"
				/>
				<StatUnitCard
					title="FATURAMENTO POR CLIENTES NOVOS"
					icon={<BadgeDollarSign className="w-4 h-4 min-w-4 min-h-4" />}
					current={{
						value: clientsOverallStats?.revenueFromNewClients.current ? Number(clientsOverallStats?.revenueFromNewClients.current) : 0,
						format: (n) => formatToMoney(n),
					}}
					previous={
						clientsOverallStats?.revenueFromNewClients.comparison
							? {
									value: clientsOverallStats?.revenueFromNewClients.comparison || 0,
									format: (n) => formatToMoney(n),
								}
							: undefined
					}
					footer={
						<div className="flex items-center gap-1">
							<p className="text-xs text-muted-foreground tracking-tight">REPRESENTATIVIDADE:</p>
							<p className="text-xs font-bold text-primary">{formatDecimalPlaces(clientsOverallStats?.revenueFromNewClients.percentage || 0)}%</p>
						</div>
					}
					className="w-full lg:w-1/3"
				/>
				<StatUnitCard
					title="FATURAMENTO AO CONSUMIDOR"
					icon={<UserRoundX className="w-4 h-4 min-w-4 min-h-4" />}
					current={{
						value: clientsOverallStats?.revenueFromNonIdentifiedClients.current ? Number(clientsOverallStats?.revenueFromNonIdentifiedClients.current) : 0,
						format: (n) => formatToMoney(n),
					}}
					previous={
						clientsOverallStats?.revenueFromNonIdentifiedClients.comparison
							? {
									value: clientsOverallStats?.revenueFromNonIdentifiedClients.comparison || 0,
									format: (n) => formatToMoney(n),
								}
							: undefined
					}
					footer={
						<div className="flex items-center gap-1">
							<p className="text-xs text-muted-foreground tracking-tight">REPRESENTATIVIDADE:</p>
							<p className="text-xs font-bold text-primary">{formatDecimalPlaces(clientsOverallStats?.revenueFromNonIdentifiedClients.percentage || 0)}%</p>
						</div>
					}
					className="w-full lg:w-1/3"
				/>
			</div>
			<div className="w-full flex items-start flex-col lg:flex-row gap-3 h-[550px]">
				<div className="w-full lg:w-1/2 h-full min-h-0">
					<ClientsGraphs
						periodAfter={filters.periodAfter}
						periodBefore={filters.periodBefore}
						comparingPeriodAfter={filters.comparingPeriodAfter}
						comparingPeriodBefore={filters.comparingPeriodBefore}
					/>
				</div>
				<div className="w-full lg:w-1/2 h-full min-h-0">
					<ClientsRanking
						periodAfter={filters.periodAfter}
						periodBefore={filters.periodBefore}
						comparingPeriodAfter={filters.comparingPeriodAfter}
						comparingPeriodBefore={filters.comparingPeriodBefore}
					/>
				</div>
			</div>
		</div>
	);
}

type ClientCardProps = {
	client: TGetClientsOutputDefault["clients"][number];
};
function ClientPageCard({ client }: ClientCardProps) {
	const clientCashbackBalance = client.saldos.length > 0 ? client.saldos[0] : null;
	return (
		<div className={cn("bg-card border-primary/20 flex w-full flex-col gap-1 rounded-xl border px-3 py-4 shadow-2xs")}>
			<div className="w-full flex items-center justify-between flex-col md:flex-row gap-2">
				<div className="flex items-center gap-2 flex-wrap">
					<h1 className="text-xs font-bold tracking-tight lg:text-sm">{client.nome}</h1>
					<div className={cn("flex items-center gap-1")}>
						<Phone className="w-4 h-4 min-w-4 min-h-4" />
						<h1 className="py-0.5 text-center text-[0.65rem] font-medium italic">{client.telefone || "NÃO DEFINIDO"}</h1>
					</div>
					{client.email ? (
						<div className="flex items-center gap-1">
							<Mail className="w-4 h-4 min-w-4 min-h-4" />
							<h1 className="py-0.5 text-center text-[0.65rem] font-medium italic">{client.email}</h1>
						</div>
					) : null}
					{client.canalAquisicao ? (
						<div className="flex items-center gap-1">
							<Megaphone className="w-4 h-4 min-w-4 min-h-4" />
							<h1 className="py-0.5 text-center text-[0.65rem] font-medium italic">{client.canalAquisicao || "N/A"}</h1>
						</div>
					) : null}
				</div>
				<div className="flex items-center gap-3 flex-col md:flex-row gap-y-1">
					<div className="flex items-center gap-3">
						<StatBadge
							icon={<CirclePlus className="w-4 min-w-4 h-4 min-h-4" />}
							value={client.estatisticas.comprasQtdeTotal}
							tooltipContent="Quantidade total de compras no período de filtro"
						/>
						<StatBadge
							icon={<BadgeDollarSign className="w-4 min-w-4 h-4 min-h-4" />}
							value={formatToMoney(client.estatisticas.comprasValorTotal)}
							tooltipContent="Valor total de compras no período de filtro"
						/>
						{clientCashbackBalance ? (
							<StatBadge
								icon={<BadgePercent className="w-4 min-w-4 h-4 min-h-4" />}
								value={`CASHBACK: ${formatToMoney(clientCashbackBalance.saldoValorDisponivel)}`}
								tooltipContent="Saldo em cashback disponível"
							/>
						) : null}
					</div>
				</div>
			</div>
			<div className="w-full flex items-center justify-center lg:justify-between gap-2 flex-wrap">
				<div className="flex items-center gap-2">
					{client.estatisticas.primeiraCompraData ? (
						<div className={cn("flex items-center gap-1.5 text-[0.65rem] font-bold text-primary")}>
							<BsCalendar className="w-3 min-w-3 h-3 min-h-3" />
							<p className="text-xs font-medium tracking-tight uppercase">PRIMEIRA VENDA: {formatDateAsLocale(client.estatisticas.primeiraCompraData)}</p>
						</div>
					) : null}
					{client.estatisticas.ultimaCompraData ? (
						<div className={cn("flex items-center gap-1.5 text-[0.65rem] font-bold text-primary")}>
							<BsCalendar className="w-3 min-w-3 h-3 min-h-3" />
							<p className="text-xs font-medium tracking-tight uppercase">ÚLTIMA VENDA: {formatDateAsLocale(client.estatisticas.ultimaCompraData)}</p>
						</div>
					) : null}
					{client.metadataGrupoProdutoMaisComprado ? (
						<div className={cn("flex items-center gap-1.5 text-[0.65rem] font-bold text-primary")}>
							<ShoppingCart className="w-3 min-w-3 h-3 min-h-3" />
							<p className="text-xs font-medium tracking-tight uppercase">PREFERÊNCIA: {client.metadataGrupoProdutoMaisComprado}</p>
						</div>
					) : null}
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
	const orderingFieldLabelMap: Record<NonNullable<TGetClientsInput["orderByField"]>, string> = {
		nome: "NOME",
		comprasValorTotal: "VALOR TOTAL DE COMPRAS",
		comprasQtdeTotal: "QUANTIDADE TOTAL DE COMPRAS",
		primeiraCompraData: "PRIMEIRA COMPRA",
		ultimaCompraData: "ÚLTIMA COMPRA",
	};
	const orderingDirectionLabel = queryParams.orderByDirection === "desc" ? "DECRESCENTE" : "CRESCENTE";
	const orderingFieldLabel = orderingFieldLabelMap[queryParams.orderByField || "nome"];

	return (
		<FiltersShowcase.Root>
			{queryParams.search && queryParams.search.trim().length > 0 && (
				<FiltersShowcase.Item label="PESQUISA" value={queryParams.search} onRemove={() => updateQueryParams({ search: "" })} />
			)}
			{queryParams.statsPeriodAfter && queryParams.statsPeriodBefore && (
				<FiltersShowcase.Item
					label="PERÍODO DAS ESTASTÍCAS"
					value={`${formatDateAsLocale(queryParams.statsPeriodAfter)} a ${formatDateAsLocale(queryParams.statsPeriodBefore)}`}
					onRemove={() => updateQueryParams({ statsPeriodAfter: null, statsPeriodBefore: null })}
				/>
			)}
			{queryParams.statsSaleNatures.length > 0 ? (
				<FiltersShowcase.Item
					label="NATUREZAS DAS VENDAS"
					value={queryParams.statsSaleNatures.map((nature) => nature).join(", ")}
					onRemove={() => updateQueryParams({ statsSaleNatures: [] })}
				/>
			) : null}
			{queryParams.acquisitionChannels.length > 0 ? (
				<FiltersShowcase.Item
					label="CANAIS DE AQUISIÇÃO"
					value={queryParams.acquisitionChannels.map((channel) => channel).join(", ")}
					onRemove={() => updateQueryParams({ acquisitionChannels: [] })}
				/>
			) : null}
			{queryParams.segmentationTitles.length > 0 ? (
				<FiltersShowcase.Item
					label="TÍTULOS DE SEGMENTAÇÃO"
					value={queryParams.segmentationTitles.map((title) => title).join(", ")}
					onRemove={() => updateQueryParams({ segmentationTitles: [] })}
				/>
			) : null}
			<FiltersShowcase.Item
				label="ORDENAÇÃO"
				value={`${orderingFieldLabel} (${orderingDirectionLabel})`}
				onRemove={() => updateQueryParams({ orderByField: "nome", orderByDirection: "asc" })}
			/>
		</FiltersShowcase.Root>
	);
}
