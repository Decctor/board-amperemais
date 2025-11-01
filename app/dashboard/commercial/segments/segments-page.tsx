"use client";

import ErrorComponent from "@/components/Layouts/ErrorComponent";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import RFMAnalysisQueryParamsMenu from "@/components/RFMAnalysis/RFMAnalysisQueryParamsMenu";
import { Button } from "@/components/ui/button";
import GeneralPaginationComponent from "@/components/Utils/Pagination";
import { getErrorMessage } from "@/lib/errors";
import { getExcelFromJSON } from "@/lib/excel-utils";
import { formatDateAsLocale, formatToMoney } from "@/lib/formatting";
import { useClientsBySearch } from "@/lib/queries/clients";
import { fetchClientExportation } from "@/lib/queries/exportations";
import { useRFMLabelledStats } from "@/lib/queries/stats/rfm-labelled";
import { cn } from "@/lib/utils";
import type { TGetClientsBySearchOutput } from "@/pages/api/clients/search";
import type { TClientSearchQueryParams } from "@/schemas/clients";
import type { TUserSession } from "@/schemas/users";
import { RFMLabels } from "@/utils/rfm";
import { AspectRatio } from "@radix-ui/react-aspect-ratio";
import dayjs from "dayjs";
import { BadgeDollarSign, Download, Filter, Grid3x3, Info, Mail, Megaphone, Phone, ShoppingCart, UsersRound, X } from "lucide-react";
import { useState } from "react";
import { BsCalendar } from "react-icons/bs";
import { toast } from "sonner";

const initialPeriodStart = dayjs().startOf("month").toISOString();
const initialPeriodEnd = dayjs().endOf("day").toISOString();
type SegmentsPageProps = {
	user: TUserSession;
};
export default function SegmentsPage({ user }: SegmentsPageProps) {
	return (
		<div className="w-full h-full flex flex-col gap-3">
			<div className="w-full flex items-stretch gap-3 flex-col md:flex-row">
				<div className="w-full md:w-1/2">
					<SegmentsPageMatrixRFM />
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
	const [filterMenuIsOpen, setFilterMenuIsOpen] = useState(false);
	const {
		data: clientsResult,
		isLoading,
		isError,
		isSuccess,
		error,
		queryParams,
		updateQueryParams,
	} = useClientsBySearch({
		initialParams: {
			period: {
				after: initialPeriodStart,
				before: initialPeriodEnd,
			},
		},
	});
	const clients = clientsResult?.clients;
	const clientsShowing = clients ? clients.length : 0;
	const clientsMatched = clientsResult?.clientsMatched || 0;
	const totalPages = clientsResult?.totalPages;

	async function handleExportData() {
		try {
			const data = await fetchClientExportation({ filters: queryParams });
			getExcelFromJSON(data, `CLIENTES ${dayjs().format("DD-MM-YYYY")}`);

			return toast.success("Dados exportados com sucesso !");
		} catch (error) {
			const msg = getErrorMessage(error);
			return toast.error(msg);
		}
	}
	return (
		<div className={cn("bg-card border-primary/20 flex w-full flex-col gap-1 rounded-xl border px-3 py-4 shadow-xs h-full")}>
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
					<Button variant="ghost" size="sm" className="flex items-center gap-2" onClick={() => setFilterMenuIsOpen(true)}>
						<Filter className="w-4 h-4 min-w-4 min-h-4" />
						FILTROS
					</Button>
				</div>
			</div>

			<SegmentsPageClientsFiltersShowcase queryParams={queryParams} updateQueryParams={updateQueryParams} />
			<div className="w-full flex-1 max-h-[700px] flex flex-col gap-2 overflow-y-auto overscroll-y-auto scrollbar-thin scrollbar-track-primary/10 scrollbar-thumb-primary/30 px-2">
				<GeneralPaginationComponent
					activePage={queryParams.page}
					queryLoading={isLoading}
					selectPage={(page) => updateQueryParams({ page })}
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
									after: queryParams.period.after ? new Date(queryParams.period.after) : new Date(),
									before: queryParams.period.before ? new Date(queryParams.period.before) : new Date(),
								}}
							/>
						))
					) : (
						<p className="w-full tracking-tight text-center">Nenhum cliente encontrado.</p>
					)
				) : null}
			</div>
			{filterMenuIsOpen ? (
				<RFMAnalysisQueryParamsMenu queryParams={queryParams} updateQueryParams={updateQueryParams} closeMenu={() => setFilterMenuIsOpen(false)} />
			) : null}
		</div>
	);
}
type SegmentsPageClientsFiltersShowcaseProps = {
	queryParams: TClientSearchQueryParams;
	updateQueryParams: (params: Partial<TClientSearchQueryParams>) => void;
};
function SegmentsPageClientsFiltersShowcase({ queryParams, updateQueryParams }: SegmentsPageClientsFiltersShowcaseProps) {
	function FilterTag({ label, value, onRemove }: { label: string; value: string; onRemove?: () => void }) {
		return (
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
	}
	return (
		<div className="flex items-center justify-center lg:justify-end flex-wrap gap-2">
			{queryParams.name ? <FilterTag label="NOME" value={queryParams.name} onRemove={() => updateQueryParams({ name: "" })} /> : null}
			{queryParams.phone ? <FilterTag label="TELEFONE" value={queryParams.phone} onRemove={() => updateQueryParams({ phone: "" })} /> : null}
			{queryParams.rfmTitles.length > 0 ? (
				<FilterTag
					label="CATEGORIA"
					value={queryParams.rfmTitles.map((title) => title).join(", ")}
					onRemove={() => updateQueryParams({ rfmTitles: [] })}
				/>
			) : null}
			{queryParams.total.min || queryParams.total.max ? (
				<FilterTag
					label="VALOR"
					value={`${queryParams.total.min ? `MIN: R$ ${queryParams.total.min}` : "N/A"} - ${queryParams.total.max ? `MAX: R$ ${queryParams.total.max}` : "N/A"}`}
					onRemove={() => updateQueryParams({ total: { min: null, max: null } })}
				/>
			) : null}
			{queryParams.saleNatures.length > 0 ? (
				<FilterTag
					label="NATUREZA DA VENDA"
					value={queryParams.saleNatures.map((nature) => nature).join(", ")}
					onRemove={() => updateQueryParams({ saleNatures: [] })}
				/>
			) : null}
			{queryParams.acquisitionChannels.length > 0 ? (
				<FilterTag
					label="CANAL DE AQUISIÇÃO"
					value={queryParams.acquisitionChannels.map((channel) => channel).join(", ")}
					onRemove={() => updateQueryParams({ acquisitionChannels: [] })}
				/>
			) : null}
			{queryParams.period.after && queryParams.period.before ? (
				<FilterTag
					label="PERÍODO"
					value={`${formatDateAsLocale(queryParams.period.after)} a ${formatDateAsLocale(queryParams.period.before)}`}
					onRemove={() => updateQueryParams({ period: { after: null, before: null } })}
				/>
			) : null}
		</div>
	);
}
type SegmentsPageClientCardProps = {
	client: TGetClientsBySearchOutput["clients"][number];
	period: { after: Date; before: Date };
};
function SegmentsPageClientCard({ client, period }: SegmentsPageClientCardProps) {
	function getRFMColor(rfmLabel: string) {
		const rfm = RFMLabels.find((x) => x.text === rfmLabel);
		return rfm?.backgroundCollor || "bg-gray-400";
	}

	return (
		<div className={cn("bg-card border-primary/20 flex w-full flex-col gap-1 rounded-xl border px-3 py-4 shadow-xs")}>
			<div className="w-full flex items-center justify-between gap-2 flex-col lg:flex-row">
				<div className="flex items-center gap-2 flex-wrap">
					<h1 className="text-xs font-bold tracking-tight lg:text-sm">{client.nome}</h1>
					<div className="flex items-center gap-1">
						<Phone width={10} height={10} />
						<h1 className="py-0.5 text-center text-[0.65rem] font-medium italic text-primary/80">{client.telefone}</h1>
					</div>
					{client.email ? (
						<div className="flex items-center gap-1">
							<Mail width={10} height={10} />
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
						<BsCalendar width={10} height={10} />
						<h1 className="py-0.5 text-center text-[0.6rem] font-medium italic text-primary/80">ÚLTIMA COMPRA</h1>
						<h1 className="py-0.5 text-center text-[0.65rem] font-bold  text-primary">{formatDateAsLocale(client.ultimaCompraData) || "N/A"}</h1>
					</div>
					<div className="flex items-center gap-1">
						<BsCalendar width={10} height={10} />
						<h1 className="py-0.5 text-center text-[0.6rem] font-medium italic text-primary/80">PRIMEIRA COMPRA</h1>
						<h1 className="py-0.5 text-center text-[0.65rem] font-bold  text-primary">{formatDateAsLocale(client.primeiraCompraData) || "N/A"}</h1>
					</div>
				</div>
				<div className="flex w-full flex-wrap items-center justify-center gap-2 lg:min-w-fit lg:justify-end">
					<div className="flex items-center gap-1">
						<ShoppingCart width={14} height={14} />
						<h1 className="py-0.5 text-center text-[0.6rem] font-medium italic text-primary/80">Nº DE COMPRAS NO PERÍODO</h1>
						<h1 className="py-0.5 text-center text-[0.65rem] font-bold  text-primary">{client.metadados.periodoNumeroCompras}</h1>
					</div>
					<div className="flex items-center gap-1">
						<BadgeDollarSign width={14} height={14} />
						<h1 className="py-0.5 text-center text-[0.6rem] font-medium italic text-primary/80">TOTAL COMPRO NO PERÍODO</h1>
						<h1 className="py-0.5 text-center text-[0.65rem] font-bold  text-primary">{formatToMoney(client.metadados.periodoValorCompro)}</h1>
					</div>
				</div>
			</div>
		</div>
	);
}

/**
 * RFM MATRIX RELATED COMPONENTS
 */

function SegmentsPageMatrixRFM() {
	const { data: rfmStats } = useRFMLabelledStats();
	return (
		<div className={cn("bg-card border-primary/20 flex w-full flex-col gap-1 rounded-xl border px-3 py-4 shadow-xs")}>
			<div className="flex items-center justify-between gap-2 flex-col lg:flex-row">
				<div className="flex items-center gap-2">
					<Grid3x3 className="w-4 h-4 min-w-4 min-h-4" />
					<h1 className="text-xs font-medium tracking-tight uppercase">MATRIZ RFM</h1>
				</div>
				<div className="px-2 py-1 flex items-center gap-1 rounded-lg bg-primary/10 text-primary/80 text-[0.65rem] font-medium tracking-tight text-center">
					<Info className="w-4 h-4 min-w-4 min-h-4" />
					Os números representam uma análise de matriz RFM nos últimos 12 meses. Os dados são atualizados diariamente.
				</div>
			</div>
			<AspectRatio ratio={10 / 10}>
				<div className="grid grid-cols-5 grid-rows-5 w-full h-full p-1 lg:p-4">
					{rfmStats?.map((item, index) => (
						<div
							key={`${item.rfmLabel}-${index}`}
							className={`${item.backgroundCollor} flex flex-col gap-2 items-center justify-center p-2 text-primary-foreground font-bold text-center`}
							style={{ gridArea: item.gridArea }}
						>
							{item.rfmLabel !== "PERDIDOS (extensão)" ? <h1 className="text-[0.4rem] lg:text-base">{item.rfmLabel}</h1> : ""}
							{item.rfmLabel !== "PERDIDOS (extensão)" ? (
								<div className="bg-primary h-5 w-5 min-h-5 min-w-5 lg:h-16 lg:w-16 lg:min-h-16 lg:min-w-16 p-2 rounded-full flex items-center justify-center">
									<h1 className="text-[0.4rem] lg:text-sm font-bold text-primary-foreground">{item.clientsQty}</h1>
								</div>
							) : (
								""
							)}
						</div>
					))}
				</div>
			</AspectRatio>
		</div>
	);
}
