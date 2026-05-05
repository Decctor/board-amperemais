"use client";

import { TSyncSegmentationsInput } from "@/app/api/segmentations/sync/route";
import CheckboxInput from "@/components/Inputs/CheckboxInput";
import MultipleSalesSelectInput from "@/components/Inputs/SelectMultipleSalesInput";
import ErrorComponent from "@/components/Layouts/ErrorComponent";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import EditRFMConfig from "@/components/Modals/RFMConfig/EditRFMConfig";
import NewRFMConfig from "@/components/Modals/RFMConfig/NewRFMConfig";
import GeneralPaginationComponent from "@/components/Utils/Pagination";
import ResponsiveMenuV2 from "@/components/Utils/ResponsiveMenuV2";
import ResponsiveMenuViewOnly from "@/components/Utils/ResponsiveMenuViewOnly";
import { Button } from "@/components/ui/button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { InteractiveFilter, type InteractiveFilterOption } from "@/components/ui/interactive-filter";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { getErrorMessage } from "@/lib/errors";
import { getExcelFromJSON } from "@/lib/excel-utils";
import { formatDateAsLocale, formatToMoney } from "@/lib/formatting";
import { formatInteractiveCountSummary, formatInteractiveDateRangeSummary, formatInteractiveOptionSummary } from "@/lib/interactive-filter-formatting";
import { syncSegmentations } from "@/lib/mutations/segmentations";
import { useClients, useClientsBySearch } from "@/lib/queries/clients";
import { fetchClientExportation } from "@/lib/queries/exportations";
import { useSaleQueryFilterOptions } from "@/lib/queries/stats/utils";
import { useRFMLabelledStats } from "@/lib/queries/stats/rfm-labelled";
import { cn } from "@/lib/utils";
import type { TGetClientsInput, TGetClientsOutputDefault } from "@/pages/api/clients";
import { RFMLabels, type TRFMConfig } from "@/utils/rfm";
import { AspectRatio } from "@radix-ui/react-aspect-ratio";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import {
	BadgeDollarSign,
	Download,
	Grid3x3,
	Info,
	Mail,
	Megaphone,
	Phone,
	RefreshCcw,
	Settings2,
	ShoppingCart,
	UsersRound,
	Filter,
} from "lucide-react";
import { useState } from "react";
import { BsCalendar } from "react-icons/bs";
import { toast } from "sonner";
import { CustomersAcquisitionChannels } from "@/utils/select-options";

type SegmentsPageProps = {
	user: TAuthUserSession["user"];
	orgRFMConfig: TRFMConfig | null;
};
export default function SegmentsPage({ user, orgRFMConfig }: SegmentsPageProps) {
	return (
		<div className="w-full h-full flex flex-col gap-3">
			<div className="w-full flex items-stretch gap-3 flex-col md:flex-row">
				<div className="w-full md:w-1/2">
					<SegmentsPageMatrixRFM user={user} orgRFMConfig={orgRFMConfig} />
				</div>
				<div className="w-full md:w-1/2">
					<SegmentsPageClients />
				</div>
			</div>
		</div>
	);
}

/**
 *
 * CLIENTS RELATED COMPONENTS
 */
function SegmentsPageClients() {
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

	async function handleExportData() {
		try {
			const data = await fetchClientExportation({
				filters: {
					acquisitionChannels: filters.acquisitionChannels,
					page: filters.page,
					name: filters.search ?? "",
					excludedSalesIds: filters.statsExcludedSalesIds,
					period: {
						after: filters.statsPeriodAfter ? filters.statsPeriodAfter.toISOString() : null,
						before: filters.statsPeriodBefore ? filters.statsPeriodBefore.toISOString() : null,
					},
					phone: filters.search ?? "",
					rfmTitles: filters.segmentationTitles,
					saleNatures: filters.statsSaleNatures,
					total: { min: null, max: null },
				},
			});
			getExcelFromJSON(data, `CLIENTES ${dayjs().format("DD-MM-YYYY")}`);

			return toast.success("Dados exportados com sucesso !");
		} catch (error) {
			const msg = getErrorMessage(error);
			return toast.error(msg);
		}
	}
	return (
		<div className={cn("bg-card border-primary/20 flex w-full flex-col gap-1 rounded-xl border px-3 py-4 shadow-2xs h-full")}>
			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-2">
					<UsersRound className="w-4 h-4 min-w-4 min-h-4" />
					<h1 className="text-xs font-medium tracking-tight uppercase">CLIENTES</h1>
				</div>
				<div className="flex items-center gap-2">
					<Button variant="ghost" size="sm" className="flex items-center gap-2" onClick={handleExportData}>
						<Download className="w-4 h-4 min-w-4 min-h-4" />
						EXPORTAR
					</Button>
				</div>
			</div>

			<SegmentsClientsInlineFilters filters={filters} updateFilters={updateFilters} />
			<div className="w-full flex-1 max-h-[700px] flex flex-col gap-2 overflow-y-auto overscroll-y-auto scrollbar-thin scrollbar-track-primary/10 scrollbar-thumb-primary/30 px-2">
				<GeneralPaginationComponent
					activePage={filters.page}
					queryLoading={isLoading}
					selectPage={(page) => updateFilters({ page })}
					totalPages={totalPages || 0}
					itemsMatchedText={clientsMatched > 0 ? `${clientsMatched} clientes encontrados.` : `${clientsMatched} cliente encontrado.`}
					itemsShowingText={clientsShowing > 0 ? `Mostrando ${clientsShowing} clientes.` : `Mostrando ${clientsShowing} cliente.`}
				/>
				{isLoading ? <LoadingComponent /> : null}
				{isError ? <ErrorComponent msg={getErrorMessage(error)} /> : null}
				{isSuccess && clients ? (
					clients.length > 0 ? (
						clients.map((client, index: number) => (
							<SegmentsPageClientCard
								key={client.id}
								client={client}
								period={{
									after: filters.statsPeriodAfter ? new Date(filters.statsPeriodAfter) : new Date(),
									before: filters.statsPeriodBefore ? new Date(filters.statsPeriodBefore) : new Date(),
								}}
							/>
						))
					) : (
						<p className="w-full tracking-tight text-center">Nenhum cliente encontrado.</p>
					)
				) : null}
			</div>
		</div>
	);
}

type SegmentsClientsInlineFiltersProps = {
	filters: TGetClientsInput;
	updateFilters: (params: Partial<TGetClientsInput>) => void;
};

function SegmentsClientsInlineFilters({ filters, updateFilters }: SegmentsClientsInlineFiltersProps) {
	const { data: filterOptions } = useSaleQueryFilterOptions();
	const saleNatureOptions = (filterOptions?.saleNatures ?? []) as InteractiveFilterOption<string>[];
	const acquisitionChannelOptions = CustomersAcquisitionChannels as InteractiveFilterOption<string>[];
	const segmentationOptions = RFMLabels.map((item, index) => ({ id: index + 1, label: item.text, value: item.text })) satisfies InteractiveFilterOption<string>[];
	const hasAcquisitionChannels = (filters.acquisitionChannels ?? []).length > 0;
	const hasSegmentationTitles = (filters.segmentationTitles ?? []).length > 0;
	const hasSaleNatures = (filters.statsSaleNatures ?? []).length > 0;
	const hasExcludedSales = (filters.statsExcludedSalesIds ?? []).length > 0;

	return (
		<div className="flex w-full flex-wrap items-center gap-2">
			<InteractiveFilter.Root className="w-fit">
				<InteractiveFilter.Trigger>
					<InteractiveFilter.Icon>
						<BsCalendar className="h-4 w-4" />
						<InteractiveFilter.Label>PERÍODO</InteractiveFilter.Label>
					</InteractiveFilter.Icon>
					<InteractiveFilter.Value>{formatInteractiveDateRangeSummary(filters.statsPeriodAfter, filters.statsPeriodBefore)}</InteractiveFilter.Value>
					<InteractiveFilter.Clear onClear={() => updateFilters({ statsPeriodAfter: null, statsPeriodBefore: null, page: 1 })} />
				</InteractiveFilter.Trigger>
				<InteractiveFilter.Content className="w-auto p-0">
					<InteractiveFilter.DateRangeContent value={{ from: filters.statsPeriodAfter ? new Date(filters.statsPeriodAfter) : undefined, to: filters.statsPeriodBefore ? new Date(filters.statsPeriodBefore) : undefined }} onChange={(period) => updateFilters({ statsPeriodAfter: period.from ?? null, statsPeriodBefore: period.to ?? null, page: 1 })} />
				</InteractiveFilter.Content>
			</InteractiveFilter.Root>

			{hasAcquisitionChannels ? <SegmentsMultiFilter label="AQUISIÇÃO" options={acquisitionChannelOptions} value={filters.acquisitionChannels ?? []} onChange={(acquisitionChannels) => updateFilters({ acquisitionChannels, page: 1 })} onClear={() => updateFilters({ acquisitionChannels: [], page: 1 })} /> : null}
			{hasSegmentationTitles ? <SegmentsMultiFilter label="SEGMENTAÇÃO" options={segmentationOptions} value={filters.segmentationTitles ?? []} onChange={(segmentationTitles) => updateFilters({ segmentationTitles, page: 1 })} onClear={() => updateFilters({ segmentationTitles: [], page: 1 })} /> : null}
			{hasSaleNatures ? <SegmentsMultiFilter label="NATUREZAS" options={saleNatureOptions} value={filters.statsSaleNatures ?? []} onChange={(statsSaleNatures) => updateFilters({ statsSaleNatures, page: 1 })} onClear={() => updateFilters({ statsSaleNatures: [], page: 1 })} /> : null}
			{hasExcludedSales ? <SegmentsExcludedSalesFilter filters={filters} updateFilters={updateFilters} /> : null}

			<InteractiveFilter.AddFilterRoot className="w-fit">
				<InteractiveFilter.AddFilterTrigger><Filter className="h-4 w-4" /><InteractiveFilter.Label>ADICIONAR FILTRO</InteractiveFilter.Label></InteractiveFilter.AddFilterTrigger>
				<InteractiveFilter.AddFilterContent>
					<InteractiveFilter.AddFilterSection heading="Filtros">
						{!hasAcquisitionChannels ? <InteractiveFilter.AddFilterItem id="acquisition" label="AQUISIÇÃO" icon={<Filter className="h-4 w-4" />}><InteractiveFilter.MultiContent options={acquisitionChannelOptions} value={filters.acquisitionChannels ?? []} onChange={(acquisitionChannels) => updateFilters({ acquisitionChannels, page: 1 })} onClear={() => updateFilters({ acquisitionChannels: [], page: 1 })} clearLabel="TODOS" /></InteractiveFilter.AddFilterItem> : null}
						{!hasSegmentationTitles ? <InteractiveFilter.AddFilterItem id="segmentation" label="SEGMENTAÇÃO" icon={<Filter className="h-4 w-4" />}><InteractiveFilter.MultiContent options={segmentationOptions} value={filters.segmentationTitles ?? []} onChange={(segmentationTitles) => updateFilters({ segmentationTitles, page: 1 })} onClear={() => updateFilters({ segmentationTitles: [], page: 1 })} clearLabel="TODOS" /></InteractiveFilter.AddFilterItem> : null}
						{!hasSaleNatures ? <InteractiveFilter.AddFilterItem id="saleNatures" label="NATUREZAS" icon={<Filter className="h-4 w-4" />}><InteractiveFilter.MultiContent options={saleNatureOptions} value={filters.statsSaleNatures ?? []} onChange={(statsSaleNatures) => updateFilters({ statsSaleNatures, page: 1 })} onClear={() => updateFilters({ statsSaleNatures: [], page: 1 })} clearLabel="TODAS" /></InteractiveFilter.AddFilterItem> : null}
						{!hasExcludedSales ? <InteractiveFilter.AddFilterItem id="excludedSales" label="VENDAS EXCLUÍDAS" icon={<Filter className="h-4 w-4" />}><SegmentsExcludedSalesFilterContent filters={filters} updateFilters={updateFilters} /></InteractiveFilter.AddFilterItem> : null}
					</InteractiveFilter.AddFilterSection>
				</InteractiveFilter.AddFilterContent>
			</InteractiveFilter.AddFilterRoot>
		</div>
	);
}

function SegmentsExcludedSalesFilter({ filters, updateFilters }: SegmentsClientsInlineFiltersProps) {
	return <InteractiveFilter.Root className="w-fit"><InteractiveFilter.Trigger><InteractiveFilter.Icon><Filter className="h-4 w-4" /><InteractiveFilter.Label>VENDAS EXCLUÍDAS</InteractiveFilter.Label></InteractiveFilter.Icon><InteractiveFilter.Value>{formatInteractiveCountSummary(filters.statsExcludedSalesIds ?? [])}</InteractiveFilter.Value><InteractiveFilter.Clear onClear={() => updateFilters({ statsExcludedSalesIds: [], page: 1 })} /></InteractiveFilter.Trigger><InteractiveFilter.Content className="w-80 p-3"><SegmentsExcludedSalesFilterContent filters={filters} updateFilters={updateFilters} /></InteractiveFilter.Content></InteractiveFilter.Root>;
}

function SegmentsExcludedSalesFilterContent({ filters, updateFilters }: SegmentsClientsInlineFiltersProps) {
	return <MultipleSalesSelectInput label="VENDAS EXCLUÍDAS" selected={filters.statsExcludedSalesIds ?? []} handleChange={(statsExcludedSalesIds) => updateFilters({ statsExcludedSalesIds: statsExcludedSalesIds as string[], page: 1 })} onReset={() => updateFilters({ statsExcludedSalesIds: [], page: 1 })} resetOptionLabel="VENDAS EXCLUÍDAS" width="100%" />;
}

function SegmentsMultiFilter({
	label,
	options,
	value,
	onChange,
	onClear,
}: {
	label: string;
	options: InteractiveFilterOption<string>[];
	value: string[];
	onChange: (value: string[]) => void;
	onClear: () => void;
}) {
	return (
		<InteractiveFilter.Root className="w-fit">
			<InteractiveFilter.Trigger>
				<InteractiveFilter.Icon>
					<Filter className="h-4 w-4" />
					<InteractiveFilter.Label>{label}</InteractiveFilter.Label>
				</InteractiveFilter.Icon>
				<InteractiveFilter.Value>{formatInteractiveOptionSummary(options, value)}</InteractiveFilter.Value>
				<InteractiveFilter.Clear onClear={onClear} />
			</InteractiveFilter.Trigger>
			<InteractiveFilter.Content className="w-72 p-0">
				<InteractiveFilter.MultiContent options={options} value={value} onChange={onChange} onClear={onClear} clearLabel="TODOS" />
			</InteractiveFilter.Content>
		</InteractiveFilter.Root>
	);
}

type SegmentsPageClientCardProps = {
	client: TGetClientsOutputDefault["clients"][number];
	period: { after: Date; before: Date };
};
function SegmentsPageClientCard({ client, period }: SegmentsPageClientCardProps) {
	function getRFMColor(rfmLabel: string) {
		const rfm = RFMLabels.find((x) => x.text === rfmLabel);
		return rfm?.backgroundCollor || "bg-gray-400";
	}

	return (
		<div className={cn("bg-card border-primary/20 flex w-full flex-col gap-1 rounded-xl border px-3 py-4 shadow-2xs")}>
			<div className="w-full flex items-center justify-between gap-2 flex-col lg:flex-row">
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
				<div className="flex items-center gap-2 flex-wrap">
					<h1 className={cn("px-2 py-0.5 rounded-lg text-white text-[0.6rem]", getRFMColor(client.analiseRFMTitulo || ""))}>{client.analiseRFMTitulo}</h1>
				</div>
			</div>
			<div className="flex w-full flex-col items-center justify-between gap-2 lg:flex-row">
				<div className="flex w-full flex-wrap items-center justify-center gap-2 lg:grow lg:justify-start">
					<div className="flex items-center gap-1">
						<BsCalendar className="w-4 h-4 min-w-4 min-h-4" />
						<h1 className="py-0.5 text-center text-[0.6rem] font-medium italic text-primary/80">ÚLTIMA COMPRA</h1>
						<h1 className="py-0.5 text-center text-[0.65rem] font-bold  text-primary">{formatDateAsLocale(client.ultimaCompraData) || "N/A"}</h1>
					</div>
					<div className="flex items-center gap-1">
						<BsCalendar className="w-4 h-4 min-w-4 min-h-4" />
						<h1 className="py-0.5 text-center text-[0.6rem] font-medium italic text-primary/80">PRIMEIRA COMPRA</h1>
						<h1 className="py-0.5 text-center text-[0.65rem] font-bold  text-primary">{formatDateAsLocale(client.primeiraCompraData) || "N/A"}</h1>
					</div>
				</div>
				<div className="flex w-full flex-wrap items-center justify-center gap-2 lg:min-w-fit lg:justify-end">
					<div className="flex items-center gap-1">
						<ShoppingCart width={14} height={14} />
						<h1 className="py-0.5 text-center text-[0.6rem] font-medium italic text-primary/80">Nº DE COMPRAS NO PERÍODO</h1>
						<h1 className="py-0.5 text-center text-[0.65rem] font-bold  text-primary">{client.estatisticas.comprasQtdeTotal}</h1>
					</div>
					<div className="flex items-center gap-1">
						<BadgeDollarSign width={14} height={14} />
						<h1 className="py-0.5 text-center text-[0.6rem] font-medium italic text-primary/80">TOTAL COMPRO NO PERÍODO</h1>
						<h1 className="py-0.5 text-center text-[0.65rem] font-bold  text-primary">{formatToMoney(client.estatisticas.comprasValorTotal)}</h1>
					</div>
				</div>
			</div>
		</div>
	);
}

/**
 * RFM MATRIX RELATED COMPONENTS
 */

const RFM_SEGMENT_STYLES: Record<string, { gradient: string; text: string; badge: string; badgeText: string }> = {
	CAMPEÕES: {
		gradient: "bg-gradient-to-br from-orange-400 via-orange-500 to-amber-600",
		text: "text-white",
		badge: "bg-white/20 border border-white/30 backdrop-blur-sm",
		badgeText: "text-white",
	},
	"CLIENTES LEAIS": {
		gradient: "bg-gradient-to-br from-emerald-400 via-emerald-500 to-green-600",
		text: "text-white",
		badge: "bg-white/20 border border-white/30 backdrop-blur-sm",
		badgeText: "text-white",
	},
	"POTENCIAIS CLIENTES LEAIS": {
		gradient: "bg-gradient-to-br from-amber-800 via-amber-900 to-yellow-950",
		text: "text-amber-100",
		badge: "bg-amber-100/20 border border-amber-100/30 backdrop-blur-sm",
		badgeText: "text-amber-100",
	},
	"CLIENTES RECENTES": {
		gradient: "bg-gradient-to-br from-teal-400 via-teal-500 to-cyan-600",
		text: "text-white",
		badge: "bg-white/20 border border-white/30 backdrop-blur-sm",
		badgeText: "text-white",
	},
	PROMISSORES: {
		gradient: "bg-gradient-to-br from-pink-400 via-pink-500 to-rose-600",
		text: "text-white",
		badge: "bg-white/20 border border-white/30 backdrop-blur-sm",
		badgeText: "text-white",
	},
	"PRECISAM DE ATENÇÃO": {
		gradient: "bg-gradient-to-br from-indigo-400 via-indigo-500 to-violet-600",
		text: "text-white",
		badge: "bg-white/20 border border-white/30 backdrop-blur-sm",
		badgeText: "text-white",
	},
	"PRESTES A DORMIR": {
		gradient: "bg-gradient-to-br from-yellow-500 via-yellow-600 to-amber-700",
		text: "text-white",
		badge: "bg-white/20 border border-white/30 backdrop-blur-sm",
		badgeText: "text-white",
	},
	"EM RISCO": {
		gradient: "bg-gradient-to-br from-yellow-300 via-yellow-400 to-amber-500",
		text: "text-yellow-950",
		badge: "bg-yellow-950/15 border border-yellow-950/20 backdrop-blur-sm",
		badgeText: "text-yellow-950",
	},
	"NÃO PODE PERDÊ-LOS": {
		gradient: "bg-gradient-to-br from-blue-400 via-blue-500 to-sky-600",
		text: "text-white",
		badge: "bg-white/20 border border-white/30 backdrop-blur-sm",
		badgeText: "text-white",
	},
	HIBERNANDO: {
		gradient: "bg-gradient-to-br from-purple-400 via-purple-500 to-violet-600",
		text: "text-white",
		badge: "bg-white/20 border border-white/30 backdrop-blur-sm",
		badgeText: "text-white",
	},
	PERDIDOS: {
		gradient: "bg-gradient-to-br from-red-400 via-red-500 to-rose-700",
		text: "text-white",
		badge: "bg-white/20 border border-white/30 backdrop-blur-sm",
		badgeText: "text-white",
	},
};

const DEFAULT_SEGMENT_STYLE = {
	gradient: "bg-gradient-to-br from-gray-400 to-gray-500",
	text: "text-white",
	badge: "bg-white/20 border border-white/30",
	badgeText: "text-white",
};

function getSegmentStyle(label: string) {
	return RFM_SEGMENT_STYLES[label] || DEFAULT_SEGMENT_STYLE;
}

/**
 * Layout config per segment.
 * PERDIDOS spans a 2×2 grid area and uses clip-path to carve an L-shape
 * (cutting out the top-right quadrant where HIBERNANDO sits).
 * Content is pushed to the bottom-left quadrant of that L.
 */
type SegmentLayout = {
	clipPath?: string;
	/** Extra classes for content alignment (defaults to centered) */
	contentWrapper?: string;
};

function getSegmentLayout(label: string): SegmentLayout {
	if (label === "PERDIDOS") {
		return {
			// L-shape: full left column + bottom-right quadrant. Cuts top-right.
			clipPath: "polygon(0 0, 50% 0, 50% 50%, 100% 50%, 100% 100%, 0 100%)",
			// Place content in the bottom-left quadrant of the 2×2 block
			contentWrapper: "absolute bottom-0 left-0 w-1/2 h-1/2",
		};
	}
	return {};
}

function SegmentsPageMatrixRFM({ user, orgRFMConfig }: { user: TAuthUserSession["user"]; orgRFMConfig: TRFMConfig | null }) {
	const queryClient = useQueryClient();

	const [syncMenuIsOpen, setSyncMenuIsOpen] = useState(false);
	const [configMenuIsOpen, setConfigMenuIsOpen] = useState(false);
	const { data: rfmStats, queryKey } = useRFMLabelledStats();

	function formatDecimal(value: number, fractionDigits = 1) {
		if (!Number.isFinite(value)) return "0";

		return new Intl.NumberFormat("pt-BR", {
			minimumFractionDigits: fractionDigits,
			maximumFractionDigits: fractionDigits,
		}).format(value);
	}

	const handleOnMutate = async () => await queryClient.cancelQueries({ queryKey: queryKey });
	const handleOnSettled = async () => await queryClient.invalidateQueries({ queryKey: queryKey });

	return (
		<div className={cn("bg-card border-primary/20 flex w-full flex-col gap-2 rounded-xl border px-3 py-4 shadow-2xs")}>
			<div className="flex items-center justify-between gap-2 flex-col lg:flex-row">
				<div className="flex items-center gap-2">
					<Grid3x3 className="w-4 h-4 min-w-4 min-h-4" />
					<h1 className="text-xs font-medium tracking-tight uppercase">MATRIZ RFM</h1>
				</div>
				<div className="flex items-center gap-2">
					<Button variant="ghost" size="sm" className="flex items-center gap-2" onClick={() => setConfigMenuIsOpen(true)}>
						<Settings2 className="w-4 h-4 min-w-4 min-h-4" />
						CONFIGURAR
					</Button>
					<Button variant="ghost" size="sm" className="flex items-center gap-2" onClick={() => setSyncMenuIsOpen(true)}>
						<RefreshCcw className="w-4 h-4 min-w-4 min-h-4" />
						SINCRONIZAR
					</Button>
				</div>
			</div>
			<div className="w-fit self-center px-2 py-1 flex items-center gap-1 rounded-lg bg-primary/10 text-primary/80 text-[0.65rem] font-medium tracking-tight text-center">
				<Info className="w-3 h-3 min-w-3 min-h-3 shrink-0" />
				<span>Análise RFM dos últimos 12 meses. Passe o mouse no bloco para detalhes.</span>
			</div>
			<AspectRatio ratio={1}>
				<div className="grid grid-cols-5 grid-rows-5 w-full h-full gap-0.5">
					{rfmStats?.map((item, index) => {
						const style = getSegmentStyle(item.rfmLabel);
						const layout = getSegmentLayout(item.rfmLabel);
						const hasClipPath = !!layout.clipPath;

						const content = (
							<>
								{/* Segment label */}
								<h2
									className={cn(
										"relative z-10 text-[0.35rem] leading-tight lg:text-[0.7rem] xl:text-[0.7rem] font-semibold tracking-wide uppercase text-center",
										style.text,
									)}
								>
									{item.rfmLabel}
								</h2>

								{/* Client count badge */}
								<div
									className={cn(
										"relative z-10 flex items-center justify-center rounded-full",
										style.badge,
										"h-6 w-6 min-h-6 min-w-6 lg:h-12 lg:w-12 lg:min-h-12 lg:min-w-12",
									)}
								>
									<span className={cn("text-[0.5rem] lg:text-sm font-bold tabular-nums", style.badgeText)}>{item.clientsQty}</span>
								</div>

								{/* Revenue */}
								<p className={cn("relative z-10 hidden lg:block text-[0.6rem] xl:text-[0.65rem] font-medium tracking-tight opacity-85", style.text)}>
									{formatToMoney(item.segmentPeriodStats.totalRevenue)}
								</p>
							</>
						);

						const block = (
							<div
								className={cn(
									style.gradient,
									"relative rounded-lg shadow-sm cursor-pointer",
									"transition-all duration-200 hover:shadow-md hover:brightness-105 hover:scale-[1.02]",
									"overflow-hidden",
									// When there's no clip-path, center content directly
									!hasClipPath && "flex flex-col items-center justify-center gap-1 lg:gap-2 p-1.5 lg:p-3",
								)}
								style={{
									gridArea: item.gridArea,
									...(layout.clipPath ? { clipPath: layout.clipPath } : {}),
								}}
							>
								{/* Subtle inner highlight */}
								<div className="absolute inset-0 rounded-lg bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />

								{hasClipPath && layout.contentWrapper ? (
									// Content positioned in a specific quadrant (e.g. bottom-left for L-shaped PERDIDOS)
									<div className={cn(layout.contentWrapper, "flex flex-col items-center justify-center gap-1 lg:gap-2 p-1.5 lg:p-3")}>{content}</div>
								) : (
									content
								)}
							</div>
						);

						return (
							<HoverCard key={`${item.rfmLabel}-${index}`} openDelay={150}>
								<HoverCardTrigger asChild>{block}</HoverCardTrigger>
								<HoverCardContent className="w-[280px] p-4" side="right" sideOffset={8}>
									<div className="w-full flex flex-col gap-2">
										<div className="flex items-center gap-2">
											<div className={cn("w-2.5 h-2.5 rounded-full shrink-0", style.gradient)} />
											<h3 className="text-sm font-bold tracking-tight">{item.rfmLabel}</h3>
										</div>
										<p className="text-[0.7rem] text-muted-foreground -mt-1">
											Últimos 12 meses · {item.clientsQty} {item.clientsQty === 1 ? "cliente" : "clientes"}
										</p>
										<div className="w-full h-px bg-border" />
										<div className="flex flex-col gap-1.5">
											<div className="w-full flex items-center justify-between gap-3 text-[0.75rem]">
												<p className="text-muted-foreground">Receita total</p>
												<p className="font-semibold">{formatToMoney(item.segmentPeriodStats.totalRevenue)}</p>
											</div>
											<div className="w-full flex items-center justify-between gap-3 text-[0.75rem]">
												<p className="text-muted-foreground">Total de compras</p>
												<p className="font-semibold">{item.segmentPeriodStats.totalPurchasesQty}</p>
											</div>
											<div className="w-full flex items-center justify-between gap-3 text-[0.75rem]">
												<p className="text-muted-foreground">Ticket médio</p>
												<p className="font-semibold">{formatToMoney(item.segmentPeriodStats.avgTicket)}</p>
											</div>
											<div className="w-full flex items-center justify-between gap-3 text-[0.75rem]">
												<p className="text-muted-foreground">Ciclo médio de compra</p>
												<p className="font-semibold">{formatDecimal(item.segmentPeriodStats.avgPurchaseCycleDays)} dias</p>
											</div>
											<div className="w-full flex items-center justify-between gap-3 text-[0.75rem]">
												<p className="text-muted-foreground">Basket médio</p>
												<p className="font-semibold">{formatDecimal(item.segmentPeriodStats.avgBasketSize, 2)} itens</p>
											</div>
										</div>
									</div>
								</HoverCardContent>
							</HoverCard>
						);
					})}
				</div>
			</AspectRatio>
			{syncMenuIsOpen ? (
				<SegmentsPageMatrixRFMSyncMenu
					closeMenu={() => setSyncMenuIsOpen(false)}
					callbacks={{
						onMutate: handleOnMutate,
						onSettled: handleOnSettled,
					}}
				/>
			) : null}
			{configMenuIsOpen ? (
				orgRFMConfig ? (
					<EditRFMConfig user={user} rfmConfig={orgRFMConfig} closeModal={() => setConfigMenuIsOpen(false)} />
				) : (
					<NewRFMConfig user={user} closeModal={() => setConfigMenuIsOpen(false)} />
				)
			) : null}
		</div>
	);
}

type SegmentsPageMatrixRFMSyncMenuProps = {
	closeMenu: () => void;
	callbacks?: {
		onMutate?: (variables: TSyncSegmentationsInput) => void;
		onSuccess?: () => void;
		onError?: (error: Error) => void;
		onSettled?: () => void;
	};
};
function SegmentsPageMatrixRFMSyncMenu({ closeMenu, callbacks }: SegmentsPageMatrixRFMSyncMenuProps) {
	const [params, setParams] = useState<TSyncSegmentationsInput>({
		runCampaigns: false,
	});

	const { mutate: handleSyncSegmentations, isPending } = useMutation({
		mutationKey: ["sync-segmentations"],
		mutationFn: syncSegmentations,
		onMutate: (variables) => {
			callbacks?.onMutate?.(variables);
		},
		onSuccess: (data) => {
			toast.success(data.message);
		},
		onError: (error) => {
			toast.error(getErrorMessage(error));
		},
		onSettled: async () => {
			callbacks?.onSettled?.();
		},
	});
	return (
		<ResponsiveMenuV2
			menuTitle="SINCRONIZAR SEGMENTAÇÕES"
			menuDescription="Sincronize as segmentações RFM para atualizar os dados da matriz."
			menuActionButtonText="SINCRONIZAR"
			menuCancelButtonText="CANCELAR"
			actionFunction={() => handleSyncSegmentations({ runCampaigns: false })}
			closeMenu={closeMenu}
			actionIsLoading={isPending}
			stateIsLoading={false}
			stateError={null}
		>
			<p className="text-sm text-muted-foreground">Esta ação irá recomputar as segmentações RFM de toda a sua base de clientes.</p>
			<CheckboxInput
				checked={params.runCampaigns}
				labelTrue="DESEJO EXECUTAR AS CAMPANHAS"
				labelFalse="DESEJO EXECUTAR AS CAMPANHAS"
				handleChange={(value) => setParams({ ...params, runCampaigns: value })}
			/>
		</ResponsiveMenuV2>
	);
}

