"use client";
import type { TGetCampaignInteractionsOutputItems } from "@/app/api/campaigns/interactions/route";
import type { TGetCampaignsInput, TGetCampaignsOutputDefault } from "@/app/api/campaigns/route";
import CampaignsBySegmentation from "@/components/Campaigns/CampaignsBySegmentation";
import CampaignsFunnel from "@/components/Campaigns/CampaignsFunnel";
import CampaignsGraphs from "@/components/Campaigns/CampaignsGraphs";
import CampaignsRanking from "@/components/Campaigns/CampaignsRanking";
import { CampaignStatsConversionsBlock } from "@/components/Campaigns/CampaignStatsConversionsBlock";
import ClientHoverCard from "@/components/Clients/ClientHoverCard";
import DateIntervalInput from "@/components/Inputs/DateIntervalInput";
import ErrorComponent from "@/components/Layouts/ErrorComponent";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import StatUnitCard from "@/components/Stats/StatUnitCard";
import GeneralPaginationComponent from "@/components/Utils/Pagination";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { InteractiveFilter, type InteractiveFilterOption } from "@/components/ui/interactive-filter";
import { Input } from "@/components/ui/input";
import { StatBadge } from "@/components/ui/stat-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { getErrorMessage } from "@/lib/errors";
import { formatDateAsLocale, formatDecimalPlaces, formatToMoney } from "@/lib/formatting";
import { retryCampaignInteraction } from "@/lib/mutations/campaigns";
import { useCampaignInteractionsLogs, useCampaignStatsOverall, useCampaigns, useConversionQuality } from "@/lib/queries/campaigns";
import { cn } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import {
	AlertTriangle,
	AreaChart,
	BadgeDollarSign,
	Calendar,
	CircleCheck,
	CircleX,
	Clock,
	Coins,
	Database,
	Grid3x3,
	ListFilter,
	MessageCircle,
	MousePointerClick,
	PencilIcon,
	Plus,
	RefreshCw,
	Send,
	SparklesIcon,
	TrendingUp,
	UserPlus,
	UserRound,
	UserRoundCheck,
	Zap,
	Eye,
	CalendarCheck,
	MessageCircleIcon,
} from "lucide-react";
import Link from "next/link";
import { parseAsStringEnum, useQueryState } from "nuqs";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { BsCalendarPlus } from "react-icons/bs";
import SettingsWhatsappTemplates from "@/components/Settings/SettingsWhatsappTemplates";
import { CampaignTriggerTypeOptions, InteractionsSentStatusOptions } from "@/utils/select-options";
import type { TCampaignTriggerTypeEnum } from "@/schemas/enums";
import TestCampaign from "@/components/Modals/Campaigns/TestCampaign";
import TemplatePreview from "@/components/Modals/WhatsappTemplates/Blocks/TemplatePreview";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { formatInteractiveDateRangeSummary, formatInteractiveOptionSummary } from "@/lib/interactive-filter-formatting";
type CampaignsPageProps = {
	user: TAuthUserSession["user"];
	membership: NonNullable<TAuthUserSession["membership"]>;
};
export default function CampaignsPage({ user, membership }: CampaignsPageProps) {
	const [viewMode, setViewMode] = useQueryState("view", parseAsStringEnum(["stats", "database", "interactions", "templates"]));

	return (
		<div className="w-full h-full flex flex-col gap-3">
			<Tabs value={viewMode ?? "stats"} onValueChange={(v: string) => setViewMode(v as "stats" | "database" | "interactions")}>
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
					<SettingsWhatsappTemplates user={user} membership={membership} />
				</TabsContent>
			</Tabs>
		</div>
	);
}

type CampaignsDatabaseInlineFiltersProps = {
	filters: TGetCampaignsInput;
	updateFilters: (filters: Partial<TGetCampaignsInput>) => void;
};
function CampaignsDatabaseInlineFilters({ filters, updateFilters }: CampaignsDatabaseInlineFiltersProps) {
	const triggerOptions = CampaignTriggerTypeOptions as InteractiveFilterOption<TCampaignTriggerTypeEnum>[];
	const hasTriggerTypes = (filters.triggerTypes ?? []).length > 0;
	const hasActiveOnly = Boolean(filters.activeOnly);
	const hasActionWhatsappOnly = Boolean(filters.actionWhatsappOnly);
	const hasCashbackGenerationOnly = Boolean(filters.cashbackGenerationOnly);

	return (
		<div className="flex w-full flex-wrap items-center gap-2">
			<InteractiveFilter.Root className="w-fit">
				<InteractiveFilter.Trigger>
					<InteractiveFilter.Icon>
						<Calendar className="h-4 w-4" />
						<InteractiveFilter.Label>PERÍODO DOS CARDS</InteractiveFilter.Label>
					</InteractiveFilter.Icon>
					<InteractiveFilter.Value>{formatInteractiveDateRangeSummary(filters.statsPeriodAfter, filters.statsPeriodBefore)}</InteractiveFilter.Value>
					<InteractiveFilter.Clear onClear={() => updateFilters({ statsPeriodAfter: null, statsPeriodBefore: null })} />
				</InteractiveFilter.Trigger>
				<InteractiveFilter.Content className="w-auto p-0">
					<InteractiveFilter.DateRangeContent
						value={{
							from: filters.statsPeriodAfter ? new Date(filters.statsPeriodAfter) : undefined,
							to: filters.statsPeriodBefore ? new Date(filters.statsPeriodBefore) : undefined,
						}}
						onChange={(period) => updateFilters({ statsPeriodAfter: period.from ?? null, statsPeriodBefore: period.to ?? null })}
					/>
				</InteractiveFilter.Content>
			</InteractiveFilter.Root>

			{hasTriggerTypes ? (
				<InteractiveFilter.Root className="w-fit">
					<InteractiveFilter.Trigger>
						<InteractiveFilter.Icon>
							<Zap className="h-4 w-4" />
							<InteractiveFilter.Label>GATILHOS</InteractiveFilter.Label>
						</InteractiveFilter.Icon>
						<InteractiveFilter.Value>{formatInteractiveOptionSummary(triggerOptions, filters.triggerTypes ?? [])}</InteractiveFilter.Value>
						<InteractiveFilter.Clear onClear={() => updateFilters({ triggerTypes: [] })} />
					</InteractiveFilter.Trigger>
					<InteractiveFilter.Content className="w-80 p-0">
						<CampaignTriggerFilterContent options={triggerOptions} filters={filters} updateFilters={updateFilters} />
					</InteractiveFilter.Content>
				</InteractiveFilter.Root>
			) : null}

			{hasActiveOnly ? (
				<CampaignBooleanFilter
					label="APENAS ATIVAS"
					value={Boolean(filters.activeOnly)}
					onChange={(activeOnly) => updateFilters({ activeOnly })}
					onClear={() => updateFilters({ activeOnly: false })}
				/>
			) : null}
			{hasActionWhatsappOnly ? (
				<CampaignBooleanFilter
					label="AÇÃO WHATSAPP"
					value={Boolean(filters.actionWhatsappOnly)}
					onChange={(actionWhatsappOnly) => updateFilters({ actionWhatsappOnly })}
					onClear={() => updateFilters({ actionWhatsappOnly: false })}
				/>
			) : null}
			{hasCashbackGenerationOnly ? (
				<CampaignBooleanFilter
					label="GERA CASHBACK"
					value={Boolean(filters.cashbackGenerationOnly)}
					onChange={(cashbackGenerationOnly) => updateFilters({ cashbackGenerationOnly })}
					onClear={() => updateFilters({ cashbackGenerationOnly: false })}
				/>
			) : null}

			<InteractiveFilter.AddFilterRoot className="w-fit">
				<InteractiveFilter.AddFilterTrigger>
					<ListFilter className="h-4 w-4" />
					<InteractiveFilter.Label>ADICIONAR FILTRO</InteractiveFilter.Label>
				</InteractiveFilter.AddFilterTrigger>
				<InteractiveFilter.AddFilterContent>
					<InteractiveFilter.AddFilterSection heading="Filtros">
						{!hasTriggerTypes ? (
							<InteractiveFilter.AddFilterItem id="triggerTypes" label="GATILHOS" icon={<Zap className="h-4 w-4" />}>
								<CampaignTriggerFilterContent options={triggerOptions} filters={filters} updateFilters={updateFilters} />
							</InteractiveFilter.AddFilterItem>
						) : null}
						{!hasActiveOnly ? (
							<InteractiveFilter.AddFilterItem id="activeOnly" label="APENAS ATIVAS" icon={<ListFilter className="h-4 w-4" />}>
								<InteractiveFilter.BooleanContent
									value={Boolean(filters.activeOnly)}
									onChange={(activeOnly) => updateFilters({ activeOnly })}
									label="APENAS ATIVAS"
									trueLabel="ATIVAR"
									falseLabel="DESATIVAR"
								/>
							</InteractiveFilter.AddFilterItem>
						) : null}
						{!hasActionWhatsappOnly ? (
							<InteractiveFilter.AddFilterItem id="actionWhatsappOnly" label="AÇÃO WHATSAPP" icon={<ListFilter className="h-4 w-4" />}>
								<InteractiveFilter.BooleanContent
									value={Boolean(filters.actionWhatsappOnly)}
									onChange={(actionWhatsappOnly) => updateFilters({ actionWhatsappOnly })}
									label="AÇÃO WHATSAPP"
									trueLabel="ATIVAR"
									falseLabel="DESATIVAR"
								/>
							</InteractiveFilter.AddFilterItem>
						) : null}
						{!hasCashbackGenerationOnly ? (
							<InteractiveFilter.AddFilterItem id="cashbackGenerationOnly" label="GERA CASHBACK" icon={<ListFilter className="h-4 w-4" />}>
								<InteractiveFilter.BooleanContent
									value={Boolean(filters.cashbackGenerationOnly)}
									onChange={(cashbackGenerationOnly) => updateFilters({ cashbackGenerationOnly })}
									label="GERA CASHBACK"
									trueLabel="ATIVAR"
									falseLabel="DESATIVAR"
								/>
							</InteractiveFilter.AddFilterItem>
						) : null}
					</InteractiveFilter.AddFilterSection>
				</InteractiveFilter.AddFilterContent>
			</InteractiveFilter.AddFilterRoot>
		</div>
	);
}

function CampaignTriggerFilterContent({
	options,
	filters,
	updateFilters,
}: {
	options: InteractiveFilterOption<TCampaignTriggerTypeEnum>[];
	filters: TGetCampaignsInput;
	updateFilters: (filters: Partial<TGetCampaignsInput>) => void;
}) {
	return (
		<InteractiveFilter.MultiContent
			options={options}
			value={filters.triggerTypes ?? []}
			onChange={(triggerTypes) => updateFilters({ triggerTypes })}
			onClear={() => updateFilters({ triggerTypes: [] })}
			clearLabel="TODOS"
		/>
	);
}

function CampaignBooleanFilter({
	label,
	value,
	onChange,
	onClear,
}: {
	label: string;
	value: boolean;
	onChange: (value: boolean) => void;
	onClear: () => void;
}) {
	return (
		<InteractiveFilter.Root className="w-fit">
			<InteractiveFilter.Trigger>
				<InteractiveFilter.Icon>
					<ListFilter className="h-4 w-4" />
					<InteractiveFilter.Label>{label}</InteractiveFilter.Label>
				</InteractiveFilter.Icon>
				<InteractiveFilter.Value>{value ? "SIM" : "NÃO"}</InteractiveFilter.Value>
				<InteractiveFilter.Clear onClear={onClear} />
			</InteractiveFilter.Trigger>
			<InteractiveFilter.Content className="w-64 p-0">
				<InteractiveFilter.BooleanContent value={value} onChange={onChange} onClear={onClear} label={label} trueLabel="ATIVAR" falseLabel="DESATIVAR" />
			</InteractiveFilter.Content>
		</InteractiveFilter.Root>
	);
}
function CampaignsDatabaseView() {
	const [testingCampaignId, setTestingCampaignId] = useState<string | null>(null);
	const initialStatsPeriodAfter = dayjs().startOf("month").toDate();
	const initialStatsPeriodBefore = dayjs().endOf("month").toDate();
	const {
		data: campaignsResult,
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
			statsPeriodAfter: initialStatsPeriodAfter,
			statsPeriodBefore: initialStatsPeriodBefore,
		},
	});
	return (
		<div className="w-full flex flex-col gap-3">
			<div className="w-full flex items-center justify-end gap-2">
				<Button className="flex items-center gap-2" size="sm" asChild>
					<Link href="/dashboard/commercial/campaigns/builder">
						<Plus className="w-4 h-4 min-w-4 min-h-4" />
						NOVA CAMPANHA
					</Link>
				</Button>
			</div>
			<div className="w-full flex items-center gap-2 flex-col-reverse lg:flex-row">
				<Input
					value={filters.search ?? ""}
					placeholder="Pesquisar campanha..."
					onChange={(e) => updateFilters({ search: e.target.value })}
					className="grow rounded-xl"
				/>

				<DateIntervalInput
					label="Período dos cards"
					labelClassName="hidden"
					className="hover:bg-accent hover:text-accent-foreground border-none shadow-none"
					value={{
						after: filters.statsPeriodAfter ? new Date(filters.statsPeriodAfter) : undefined,
						before: filters.statsPeriodBefore ? new Date(filters.statsPeriodBefore) : undefined,
					}}
					handleChange={(value) =>
						updateFilters({
							statsPeriodAfter: value.after ? new Date(value.after) : null,
							statsPeriodBefore: value.before ? new Date(value.before) : null,
						})
					}
				/>
			</div>
			<CampaignsDatabaseInlineFilters filters={filters} updateFilters={updateFilters} />
			{isLoading ? <p className="w-full flex items-center justify-center animate-pulse">Carregando campanhas...</p> : null}
			{isError ? <ErrorComponent msg={getErrorMessage(error)} /> : null}
			{isSuccess ? (
				<div className="w-full flex flex-col gap-1.5">
					{campaignsResult && campaignsResult.length > 0 ? (
						campaignsResult.map((campaign) => (
							<CampaignsPageCampaignCard key={campaign.id} campaign={campaign} onTestCampaign={() => setTestingCampaignId(campaign.id)} />
						))
					) : (
						<p className="w-full flex items-center justify-center">Nenhuma campanha encontrada</p>
					)}
				</div>
			) : null}
			{testingCampaignId ? <TestCampaign campaignId={testingCampaignId} closeModal={() => setTestingCampaignId(null)} /> : null}
		</div>
	);
}

function CampaignsInteractionsView() {
	const {
		data: interactionsResult,
		isLoading,
		isError,
		isSuccess,
		error,
		filters,
		updateFilters,
	} = useCampaignInteractionsLogs({
		initialFilters: {
			page: 1,
			search: "",
			status: [],
			orderByField: "agendamentoData",
			orderByDirection: "desc",
		},
	});

	const interactionsItems = interactionsResult?.items ?? [];
	const interactionsShowing = interactionsItems.length;
	const interactionsMatched = interactionsResult?.interactionsMatched ?? 0;
	const totalPages = interactionsResult?.totalPages ?? 0;

	return (
		<div className="w-full flex flex-col gap-3">
			<div className="w-full flex items-center gap-2 flex-col-reverse lg:flex-row">
				<Input
					value={filters.search ?? ""}
					placeholder="Pesquisar interações (título, descrição, cliente)..."
					onChange={(e) =>
						updateFilters({
							search: e.target.value,
							page: 1,
						})
					}
					className="grow rounded-xl"
				/>
			</div>
			<CampaignInteractionsInlineFilters filters={filters} updateFilters={updateFilters} />

			<GeneralPaginationComponent
				activePage={filters.page}
				queryLoading={isLoading}
				selectPage={(page) => updateFilters({ page })}
				totalPages={totalPages}
				itemsMatchedText={`${interactionsMatched} ${interactionsMatched === 1 ? "interação encontrada." : "interações encontradas."}`}
				itemsShowingText={`${interactionsShowing} ${interactionsShowing === 1 ? "interação exibida." : "interações exibidas."}`}
			/>

			{isLoading ? <LoadingComponent /> : null}
			{isError ? <ErrorComponent msg={getErrorMessage(error)} /> : null}
			{isSuccess ? (
				<div className="w-full flex flex-col gap-1.5">
					{interactionsItems.length > 0 ? (
						interactionsItems.map((interaction) => <CampaignInteractionLogCard key={interaction.id} interaction={interaction} />)
					) : (
						<p className="w-full flex items-center justify-center">Nenhuma interação encontrada</p>
					)}
				</div>
			) : null}
		</div>
	);
}

function CampaignInteractionsInlineFilters({
	filters,
	updateFilters,
}: {
	filters: ReturnType<typeof useCampaignInteractionsLogs>["filters"];
	updateFilters: ReturnType<typeof useCampaignInteractionsLogs>["updateFilters"];
}) {
	const statusOptions = InteractionsSentStatusOptions as InteractiveFilterOption<(typeof filters.status)[number]>[];
	const orderFieldOptions = [
		{ id: "agendamentoData", label: "DATA DE AGENDAMENTO", value: "agendamentoData" },
		{ id: "dataExecucao", label: "DATA DE EXECUÇÃO", value: "dataExecucao" },
		{ id: "dataEnvio", label: "DATA DE ENVIO", value: "dataEnvio" },
	] as const satisfies InteractiveFilterOption<NonNullable<typeof filters.orderByField>>[];
	const orderDirectionOptions = [
		{ id: "asc", label: "ORDEM CRESCENTE", value: "asc" },
		{ id: "desc", label: "ORDEM DECRESCENTE", value: "desc" },
	] as const satisfies InteractiveFilterOption<NonNullable<typeof filters.orderByDirection>>[];
	const hasOrderByField = Boolean(filters.orderByField && filters.orderByField !== "agendamentoData");
	const hasOrderByDirection = Boolean(filters.orderByDirection && filters.orderByDirection !== "desc");

	return (
		<div className="flex w-full flex-wrap items-center gap-2">
			<InteractiveFilter.Root className="w-fit">
				<InteractiveFilter.Trigger>
					<InteractiveFilter.Icon>
						<ListFilter className="h-4 w-4" />
						<InteractiveFilter.Label>STATUS</InteractiveFilter.Label>
					</InteractiveFilter.Icon>
					<InteractiveFilter.Value>{formatInteractiveOptionSummary(statusOptions, filters.status ?? [])}</InteractiveFilter.Value>
					<InteractiveFilter.Clear onClear={() => updateFilters({ status: [], page: 1 })} />
				</InteractiveFilter.Trigger>
				<InteractiveFilter.Content className="w-72 p-0">
					<InteractiveFilter.MultiContent
						options={statusOptions}
						value={filters.status ?? []}
						onChange={(status) => updateFilters({ status, page: 1 })}
						onClear={() => updateFilters({ status: [], page: 1 })}
						clearLabel="TODOS"
					/>
				</InteractiveFilter.Content>
			</InteractiveFilter.Root>

			{hasOrderByField ? (
				<CampaignInteractionSingleFilter
					label="ORDENAR POR"
					options={[...orderFieldOptions]}
					value={filters.orderByField!}
					onChange={(orderByField) => updateFilters({ orderByField, page: 1 })}
				/>
			) : null}
			{hasOrderByDirection ? (
				<CampaignInteractionSingleFilter
					label="DIREÇÃO"
					options={[...orderDirectionOptions]}
					value={filters.orderByDirection!}
					onChange={(orderByDirection) => updateFilters({ orderByDirection, page: 1 })}
				/>
			) : null}

			<InteractiveFilter.AddFilterRoot className="w-fit">
				<InteractiveFilter.AddFilterTrigger>
					<ListFilter className="h-4 w-4" />
					<InteractiveFilter.Label>ADICIONAR FILTRO</InteractiveFilter.Label>
				</InteractiveFilter.AddFilterTrigger>
				<InteractiveFilter.AddFilterContent>
					<InteractiveFilter.AddFilterSection heading="Filtros">
						{!hasOrderByField ? (
							<InteractiveFilter.AddFilterItem id="orderByField" label="ORDENAR POR" icon={<ListFilter className="h-4 w-4" />}>
								<InteractiveFilter.SingleContent
									options={[...orderFieldOptions]}
									value={filters.orderByField}
									onChange={(orderByField) => updateFilters({ orderByField, page: 1 })}
								/>
							</InteractiveFilter.AddFilterItem>
						) : null}
						{!hasOrderByDirection ? (
							<InteractiveFilter.AddFilterItem id="orderByDirection" label="DIREÇÃO" icon={<ListFilter className="h-4 w-4" />}>
								<InteractiveFilter.SingleContent
									options={[...orderDirectionOptions]}
									value={filters.orderByDirection}
									onChange={(orderByDirection) => updateFilters({ orderByDirection, page: 1 })}
								/>
							</InteractiveFilter.AddFilterItem>
						) : null}
					</InteractiveFilter.AddFilterSection>
				</InteractiveFilter.AddFilterContent>
			</InteractiveFilter.AddFilterRoot>
		</div>
	);
}

function CampaignInteractionSingleFilter<T extends string>({
	label,
	options,
	value,
	onChange,
}: {
	label: string;
	options: InteractiveFilterOption<T>[];
	value: T;
	onChange: (value: T) => void;
}) {
	return (
		<InteractiveFilter.Root className="w-fit">
			<InteractiveFilter.Trigger>
				<InteractiveFilter.Icon>
					<ListFilter className="h-4 w-4" />
					<InteractiveFilter.Label>{label}</InteractiveFilter.Label>
				</InteractiveFilter.Icon>
				<InteractiveFilter.Value>{options.find((option) => option.value === value)?.label ?? "PADRÃO"}</InteractiveFilter.Value>
			</InteractiveFilter.Trigger>
			<InteractiveFilter.Content className="w-72 p-0">
				<InteractiveFilter.SingleContent options={options} value={value} onChange={onChange} />
			</InteractiveFilter.Content>
		</InteractiveFilter.Root>
	);
}

function CampaignInteractionLogCard({ interaction }: { interaction: TGetCampaignInteractionsOutputItems[number] }) {
	const queryClient = useQueryClient();
	const { mutate: handleRetryInteraction, isPending: retryIsPending } = useMutation({
		mutationKey: ["retry-campaign-interaction", interaction.id],
		mutationFn: async () => await retryCampaignInteraction({ interactionId: interaction.id }),
		onSuccess: async (response) => {
			toast.success(response.message);
			await queryClient.invalidateQueries({ queryKey: ["campaign-interactions-logs"] });
		},
		onError: (error) => {
			toast.error(getErrorMessage(error));
		},
	});
	const scheduleDateText = interaction.agendamentoDataReferencia ? dayjs(interaction.agendamentoDataReferencia).format("DD/MM/YYYY") : "Não definido";
	const scheduleBlockText = interaction.agendamentoBlocoReferencia ?? "--:--";
	const executionDateText = interaction.dataExecucao ? formatDateAsLocale(interaction.dataExecucao, true) : "Não executada";
	const sentStatusConfig = useMemo(() => {
		return InteractionsSentStatusOptions.find((status) => status.value === interaction.statusEnvio);
	}, [interaction.statusEnvio]);

	return (
		<div className={cn("bg-card border-primary/20 flex w-full flex-col gap-2 rounded-xl border px-3 py-4 shadow-2xs")}>
			<div className="w-full flex flex-col gap-0.5">
				<div className="w-full flex items-center justify-between gap-2">
					<div className="flex items-center gap-3">
						<h1 className="text-xs font-bold tracking-tight lg:text-sm">{interaction.campanha?.titulo ?? "CAMPANHA NÃO ENCONTRADA"}</h1>
						<ClientHoverCard clientId={interaction.cliente.id}>
							<Chip.Root variant="secondary" size="md" shape="xl" className="cursor-pointer">
								<Chip.Icon>
									<UserRound className="w-4 h-4 min-w-4 min-h-4" />
								</Chip.Icon>
								<Chip.Label caps>{interaction.cliente.nome ?? "NÃO INFORMADO"}</Chip.Label>
							</Chip.Root>
						</ClientHoverCard>
					</div>
					<div className="flex items-center gap-3">
						{interaction.erroEnvio && !interaction.dataExecucao ? (
							<Button size="sm" variant="ghost" onClick={() => handleRetryInteraction()} disabled={retryIsPending} className="flex items-center gap-1.5">
								<RefreshCw
									className={cn("w-4 h-4 min-w-4 min-h-4", {
										"animate-spin": retryIsPending,
									})}
								/>
								{retryIsPending ? "REENVIANDO..." : "TENTAR NOVAMENTE"}
							</Button>
						) : null}
						{interaction.erroEnvio ? (
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger asChild>
										<Chip.Root variant="ghost" size="xs" shape="md" className={cn(sentStatusConfig?.className, "border-none")}>
											<Chip.Icon>{sentStatusConfig?.icon}</Chip.Icon>
											<Chip.Label caps weight="bold">
												{sentStatusConfig?.label}
											</Chip.Label>
										</Chip.Root>
									</TooltipTrigger>
									<TooltipContent>
										<p className="text-xs font-medium tracking-tight text-red-500">{sentStatusConfig?.message(interaction.erroEnvio)}</p>
									</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						) : null}
					</div>
				</div>
				<p className="text-xs font-medium tracking-tight text-muted-foreground">{interaction.descricao}</p>
			</div>
			<div className="w-full flex items-center justify-between gap-2 flex-wrap">
				<div className="flex items-center gap-2">
					<div className="flex items-center gap-1.5">
						<BsCalendarPlus className="w-4 h-4 min-w-4 min-h-4" />
						<h1 className="py-0.5 text-center text-[0.65rem] font-medium italic">DATA DE CRIAÇÃO: {formatDateAsLocale(interaction.dataInsercao, true)}</h1>
					</div>
				</div>
				<div className="flex items-center gap-2">
					{interaction.dataExecucao ? (
						<Chip.Root variant="success" size="md" shape="pill">
							<Chip.Icon>
								<CalendarCheck className="w-4 h-4 min-w-4 min-h-4" />
							</Chip.Icon>
							<Chip.Label className="block py-0.5 text-center italic font-medium leading-tight">{executionDateText}</Chip.Label>
						</Chip.Root>
					) : (
						<Chip.Root variant="secondary" size="md" shape="pill" className="px-2 py-1 sm:px-3 sm:py-1.5">
							<Chip.Icon>
								<Calendar className="w-4 h-4 min-w-4 min-h-4" />
							</Chip.Icon>
							<Chip.Label className="block py-0.5 text-center italic font-medium leading-tight">
								AGENDADO PARA: {scheduleDateText} ({scheduleBlockText})
							</Chip.Label>
						</Chip.Root>
					)}
				</div>
			</div>
		</div>
	);
}

function CampaignsStatsView() {
	const initialStartDate = dayjs().startOf("month");
	const initialEndDate = dayjs().endOf("month");
	const [filters, setFilters] = useState<{
		startDate: Date | null;
		endDate: Date | null;
	}>({
		startDate: initialStartDate.toDate(),
		endDate: initialEndDate.toDate(),
	});
	const [comparingFilters, setComparingFilters] = useState<{
		startDate: Date | null;
		endDate: Date | null;
	}>({
		startDate: initialStartDate.subtract(1, "month").toDate(),
		endDate: initialEndDate.subtract(1, "month").toDate(),
	});
	const { data: analytics, isLoading } = useCampaignStatsOverall({
		startDate: filters.startDate ?? undefined,
		endDate: filters.endDate ?? undefined,
	});

	const { data: qualityData } = useConversionQuality({
		startDate: filters.startDate ?? undefined,
		endDate: filters.endDate ?? undefined,
	});

	const totals = analytics?.totais;

	// Calculate quality percentages
	const aquisicoes = qualityData?.distribuicaoTipos.find((t) => t.tipo === "AQUISICAO");
	const reativacoes = qualityData?.distribuicaoTipos.find((t) => t.tipo === "REATIVACAO");
	const aceleracoes = qualityData?.distribuicaoTipos.find((t) => t.tipo === "ACELERACAO");

	return (
		<div className="w-full flex flex-col gap-3">
			<div className="w-full flex items-center justify-end">
				<DateIntervalInput
					label="Período"
					labelClassName="hidden"
					className="hover:bg-accent hover:text-accent-foreground border-none shadow-none"
					value={{
						after: filters.startDate ? new Date(filters.startDate) : undefined,
						before: filters.endDate ? new Date(filters.endDate) : undefined,
					}}
					handleChange={(value) => {
						const newStartDate = value.after ? new Date(value.after) : null;
						const newEndDate = value.before ? new Date(value.before) : null;

						setFilters({
							startDate: newStartDate,
							endDate: newEndDate,
						});

						// Auto-update comparison period
						if (newStartDate && newEndDate) {
							const diffDays = dayjs(newEndDate).diff(dayjs(newStartDate), "day");
							setComparingFilters({
								startDate: dayjs(newStartDate)
									.subtract(diffDays + 1, "day")
									.toDate(),
								endDate: dayjs(newStartDate).subtract(1, "day").toDate(),
							});
						}
					}}
				/>
			</div>

			{/* Primary KPIs */}
			<div className="w-full flex items-start flex-col lg:flex-row gap-3">
				<StatUnitCard
					title="TOTAL DE CAMPANHAS"
					icon={<Grid3x3 className="w-4 h-4 min-w-4 min-h-4" />}
					current={{
						value: totals?.campanhas || 0,
						format: (n) => formatDecimalPlaces(n),
					}}
				/>
				<StatUnitCard
					title="INTERAÇÕES"
					icon={<MessageCircle className="w-4 h-4 min-w-4 min-h-4" />}
					current={{
						value: totals?.interacoes || 0,
						format: (n) => formatDecimalPlaces(n),
					}}
				/>
				<StatUnitCard
					title="CONVERSÕES"
					icon={<MousePointerClick className="w-4 h-4 min-w-4 min-h-4" />}
					current={{
						value: totals?.conversoes || 0,
						format: (n) => formatDecimalPlaces(n),
					}}
				/>
				<StatUnitCard
					title="TAXA DE CONVERSÃO"
					icon={<TrendingUp className="w-4 h-4 min-w-4 min-h-4" />}
					current={{
						value: totals?.taxaConversaoGeral || 0,
						format: (n) => `${formatDecimalPlaces(n)}%`,
					}}
				/>
				<StatUnitCard
					title="RECEITA GERADA"
					icon={<BadgeDollarSign className="w-4 h-4 min-w-4 min-h-4" />}
					current={{
						value: totals?.receita || 0,
						format: (n) => formatToMoney(n),
					}}
				/>
			</div>
			{/* Conversion Quality KPIs */}
			<div className="w-full flex items-start flex-col lg:flex-row gap-3">
				<StatUnitCard
					title="AQUISIÇÕES"
					subtitle="Novos clientes"
					icon={<UserPlus className="w-4 h-4 min-w-4 min-h-4" />}
					current={{
						value: aquisicoes?.quantidade || 0,
						format: (n) => formatDecimalPlaces(n),
					}}
				/>
				<StatUnitCard
					title="REATIVAÇÕES"
					subtitle="Clientes resgatados"
					icon={<RefreshCw className="w-4 h-4 min-w-4 min-h-4" />}
					current={{
						value: reativacoes?.quantidade || 0,
						format: (n) => formatDecimalPlaces(n),
					}}
				/>
				<StatUnitCard
					title="ACELERAÇÕES"
					subtitle="Compraram mais rápido"
					icon={<Zap className="w-4 h-4 min-w-4 min-h-4" />}
					current={{
						value: aceleracoes?.quantidade || 0,
						format: (n) => formatDecimalPlaces(n),
					}}
				/>
				<StatUnitCard
					title="ANTECIPAÇÃO MÉDIA"
					subtitle="Dias economizados"
					icon={<TrendingUp className="w-4 h-4 min-w-4 min-h-4" />}
					current={{
						value: qualityData?.impactoFrequencia?.mediasDiasAntecipados || 0,
						format: (n) => `${formatDecimalPlaces(n)} dias`,
					}}
				/>
				<StatUnitCard
					title="IMPACTO NO TICKET"
					subtitle="Variação média"
					icon={<BadgeDollarSign className="w-4 h-4 min-w-4 min-h-4" />}
					current={{
						value: qualityData?.impactoMonetario?.deltaMonetarioPercentualMedio || 0,
						format: (n) => `${n > 0 ? "+" : ""}${formatDecimalPlaces(n)}%`,
					}}
				/>
			</div>
			<CampaignStatsConversionsBlock startDate={filters.startDate} endDate={filters.endDate} />
			<div className="w-full flex items-start flex-col lg:flex-row gap-3 h-[550px]">
				<div className="w-full lg:w-1/2 h-full min-h-0">
					<CampaignsGraphs
						startDate={filters.startDate ?? null}
						endDate={filters.endDate ?? null}
						comparingStartDate={comparingFilters.startDate}
						comparingEndDate={comparingFilters.endDate}
					/>
				</div>
				<div className="w-full lg:w-1/2 h-full min-h-0">
					<CampaignsRanking
						startDate={filters.startDate ?? null}
						endDate={filters.endDate ?? null}
						comparingStartDate={comparingFilters.startDate}
						comparingEndDate={comparingFilters.endDate}
					/>
				</div>
			</div>
			<div className="w-full h-[400px]">
				<CampaignsFunnel startDate={filters.startDate ?? null} endDate={filters.endDate ?? null} />
			</div>
			<div className="w-full h-[550px]">
				<CampaignsBySegmentation startDate={filters.startDate ?? null} endDate={filters.endDate ?? null} />
			</div>
			{/* <div className="w-full h-[450px]">
				<CampaignsConversionQuality startDate={filters.startDate ?? null} endDate={filters.endDate ?? null} />
			</div> */}
		</div>
	);
}

function CampaignsPageCampaignCard({ campaign, onTestCampaign }: { campaign: TGetCampaignsOutputDefault[number]; onTestCampaign: () => void }) {
	const stats = campaign.estatisticas ?? {
		envios: 0,
		entregues: 0,
		convertidos: 0,
		taxaConversao: 0,
		receita: 0,
	};

	const triggerType = useMemo(() => {
		return CampaignTriggerTypeOptions.find((t) => t.value === campaign.gatilhoTipo);
	}, [campaign.gatilhoTipo]);
	return (
		<div className={cn("bg-card border-primary/20 flex w-full flex-col gap-1 rounded-xl border px-3 py-4 shadow-2xs")}>
			<div className="w-full flex flex-col gap-0.5">
				<div className="w-full flex items-center justify-between gap-2 flex-col-reverse lg:flex-row">
					<div className="flex items-center gap-2">
						<h1 className="text-xs font-bold tracking-tight lg:text-sm">{campaign.titulo}</h1>
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<Chip.Root variant="ghost" size="md" shape="xl" className="cursor-default text-primary">
										<Chip.Icon>
											<Grid3x3 className="w-4 min-w-4 h-4 min-h-4" />
										</Chip.Icon>
										<Chip.Label caps weight="bold">
											{campaign.segmentacoes.length} SEGMENTAÇÕES
										</Chip.Label>
									</Chip.Root>
								</TooltipTrigger>
								<TooltipContent className="max-w-xs">Incluindo {campaign.segmentacoes.map((s) => s.segmentacao).join(", ")}</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					</div>
					<div className="flex items-center gap-2">
						<HoverCard openDelay={200}>
							<HoverCardTrigger asChild>
								<Button type="button" size="sm" variant="ghost" className="flex items-center gap-1.5">
									<Eye className="h-3.5 w-3.5" />
									PREVIEW DO TEMPLATE
								</Button>
							</HoverCardTrigger>
							<HoverCardContent
								className="w-[360px] p-2 overflow-auto max-h-[70vh] scrollbar-thin scrollbar-track-primary/10 scrollbar-thumb-primary/30"
								side="left"
								align="center"
							>
								<TemplatePreview components={campaign.whatsappTemplate.componentes} />
							</HoverCardContent>
						</HoverCard>
						{!campaign.whatsappConexaoTelefoneId ? (
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger asChild>
										<Chip.Root variant="brand" size="md" shape="xl">
											<Chip.Icon>
												<AlertTriangle className="w-4 min-w-4 h-4 min-h-4" />
											</Chip.Icon>
											<Chip.Label caps weight="bold">WHATSAPP NÃO CONFIGURADO</Chip.Label>
										</Chip.Root>
									</TooltipTrigger>
									<TooltipContent className="max-w-xs">Sem uma conexão de Whatsapp, a campanha não poderá ser executada.</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						) : null}

						<Chip.Root variant={campaign.ativo ? "positiveSolid" : "neutralSolid"} size="md" shape="xl">
							<Chip.Icon>
								<CircleCheck className="w-4 min-w-4 h-4 min-h-4" />
							</Chip.Icon>
							<Chip.Label caps weight="bold">{campaign.ativo ? "ATIVO" : "INATIVO"}</Chip.Label>
						</Chip.Root>
					</div>
				</div>
				<p className="text-xs font-medium tracking-tight text-muted-foreground">{campaign.descricao}</p>
			</div>
			{/** CONFIG BADGES */}
			<div className="w-full flex items-center justify-start gap-2 flex-wrap">
				<StatBadge
					icon={<SparklesIcon className="w-4 h-4 min-w-4 min-h-4" />}
					value={`GATILHO: ${triggerType?.label}`}
					tooltipContent={triggerType?.description}
				/>
				<StatBadge
					icon={<Coins className="w-4 h-4 min-w-4 min-h-4" />}
					value={campaign.cashbackGeracaoAtivo ? "GERAÇÃO DE CASHBACK ATIVA" : "GERAÇÃO DE CASHBACK INATIVA"}
					tooltipContent="Configuração de geração de cashback para clientes que ativarem esta campanha."
				/>
			</div>
			<div className="w-full flex items-center justify-center lg:justify-between gap-2 flex-wrap">
				<div className="flex items-center gap-2 flex-wrap py-1.5">
					<StatBadge
						icon={<MessageCircle className="w-4 h-4 min-w-4 min-h-4" />}
						value={`${formatDecimalPlaces(stats.envios)} ENVIOS`}
						tooltipContent="Total de mensagens enviadas no período selecionado."
					/>
					{/* <StatBadge
						icon={<UserRoundCheck className="w-4 h-4 min-w-4 min-h-4" />}
						value={`${formatDecimalPlaces(stats.entregues)} ENTREGUES`}
						tooltipContent="Mensagens com status DELIVERED ou READ."
					/> */}
					<StatBadge
						icon={<MousePointerClick className="w-4 h-4 min-w-4 min-h-4" />}
						value={`${formatDecimalPlaces(stats.convertidos)} CONVERTIDOS`}
						tooltipContent="Quantidade de conversões atribuídas à campanha no período."
					/>
					<StatBadge
						icon={<TrendingUp className="w-4 h-4 min-w-4 min-h-4" />}
						value={`${formatDecimalPlaces(stats.taxaConversao)}% TAXA`}
						tooltipContent="Taxa de conversão calculada por convertidos/envios."
					/>
					<StatBadge
						icon={<BadgeDollarSign className="w-4 h-4 min-w-4 min-h-4" />}
						value={formatToMoney(stats.receita)}
						tooltipContent="Receita total atribuída às conversões da campanha."
					/>
				</div>
				<div className="flex items-center gap-1.5">
					<Button variant="ghost" className="flex items-center gap-1.5" size="sm" onClick={onTestCampaign}>
						<Send className="w-3 min-w-3 h-3 min-h-3" />
						TESTAR
					</Button>
					<Button variant="ghost" className="flex items-center gap-1.5" size="sm" asChild>
						<Link href={`/dashboard/commercial/campaigns/builder?campaignId=${campaign.id}`}>
							<PencilIcon className="w-3 min-w-3 h-3 min-h-3" />
							EDITAR
						</Link>
					</Button>
					<Button variant="link" className="flex items-center gap-1.5" size="sm" asChild>
						<Link href={`/dashboard/commercial/campaigns/id/${campaign.id}`}>
							<AreaChart className="w-3 min-w-3 h-3 min-h-3" />
							VER RESULTADOS
						</Link>
					</Button>
				</div>
			</div>
		</div>
	);
}
