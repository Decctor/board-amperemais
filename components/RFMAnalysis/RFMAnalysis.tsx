import type { TUserSession } from "@/schemas/users";
import React, { useState } from "react";
import Header from "../Layouts/Header";
import { Filter, PencilLine, Phone, Tag } from "lucide-react";
import { useRFMLabelledStats } from "@/lib/queries/stats/rfm-labelled";
import { AspectRatio } from "@radix-ui/react-aspect-ratio";
import { useClientsBySearch } from "@/lib/queries/clients";
import LoadingComponent from "../Layouts/LoadingComponent";
import ErrorComponent from "../Layouts/ErrorComponent";
import { getErrorMessage } from "@/lib/errors";
import { IoMdPulse } from "react-icons/io";
import { cn } from "@/lib/utils";
import { RFMLabels } from "@/utils/rfm";
import GeneralPaginationComponent from "../Utils/Pagination";
import { BsCalendar } from "react-icons/bs";
import { formatDateAsLocale, formatToMoney } from "@/lib/formatting";
import type { TClientSimplifiedWithSalesDTO } from "@/schemas/clients";
import { BadgeDollarSign, Megaphone, ShoppingCart } from "lucide-react";
import { FaDownload, FaPhone } from "react-icons/fa";
import { MdEmail } from "react-icons/md";
import RFMAnalysisQueryParamsMenu from "./RFMAnalysisQueryParamsMenu";
import { getFirstDayOfMonth } from "@/lib/dates";
import { getLastDayOfMonth } from "@/lib/dates";
import { fetchClientExportation } from "@/lib/queries/exportations";
import { getExcelFromJSON } from "@/lib/excel-utils";
import dayjs from "dayjs";
import { toast } from "sonner";
import type { TGetClientsBySearchOutput } from "@/pages/api/clients/search";

const currentDate = new Date();
const firstDayOfMonth = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth()).toISOString();
const lastDayOfMonth = getLastDayOfMonth(currentDate.getFullYear(), currentDate.getMonth()).toISOString();

type RFMAnalysisProps = {
	user: TUserSession;
};
function RFMAnalysis({ user }: RFMAnalysisProps) {
	const { data: rfmStats } = useRFMLabelledStats();
	return (
		<div className="flex h-full flex-col">
			<Header session={user} />
			<div className="flex w-full max-w-full grow flex-col overflow-x-hidden bg-[#f8f9fa] p-6">
				<div className="flex w-full justify-between border-b border-primary pb-2 gap-2">
					<h1 className="text-2xl font-black text-black">Dashboard - Análise RFM</h1>
				</div>
				<div className="w-full flex flex-col grow gap-2 py-2">
					<ClientsBlock />

					<div className="w-full lg:w-1/2 flex flex-col rounded border border-primary shadow-sm self-center">
						<div className="py-1 px-4 rounded-bl-none rounded-br-none flex items-center justify-between w-full bg-[#fead41]">
							<h1 className="text-[0.7rem] font-bold uppercase tracking-tight">MATRIZ RFM</h1>
						</div>
						<p className="text-center px-6 mb-2 mt-4 text-xs font-medium italic text-primary/80">
							Os números representam uma análise de matriz RFM nos últimos 12 meses. Os dados são atualizados diariamente.
						</p>
						<AspectRatio ratio={10 / 10}>
							<div className="grid grid-cols-5 grid-rows-5 w-full h-full p-1 lg:p-4">
								{rfmStats?.map((item, index) => (
									<div
										key={`${item.rfmLabel}-${index}`}
										className={`${item.backgroundCollor} flex flex-col gap-2 items-center justify-center p-2 text-white font-bold text-center`}
										style={{ gridArea: item.gridArea }}
									>
										{item.rfmLabel !== "PERDIDOS (extensão)" ? <h1 className="text-[0.4rem] lg:text-base">{item.rfmLabel}</h1> : ""}
										{item.rfmLabel !== "PERDIDOS (extensão)" ? (
											<div className="bg-black h-5 w-5 min-h-5 min-w-5 lg:h-16 lg:w-16 lg:min-h-16 lg:min-w-16 p-2 rounded-full flex items-center justify-center">
												<h1 className="text-[0.4rem] lg:text-sm font-bold text-white">{item.clientsQty}</h1>
											</div>
										) : (
											""
										)}
									</div>
								))}
							</div>
						</AspectRatio>
					</div>
				</div>
			</div>
		</div>
	);
}

export default RFMAnalysis;

function ClientsBlock() {
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
				after: firstDayOfMonth,
				before: lastDayOfMonth,
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
		<div className="flex min-h-[90px] w-full flex-col rounded-xl border border-primary shadow-sm overflow-hidden gap-2">
			<div className="py-1 px-4 rounded-bl-none rounded-br-none flex items-center justify-between w-full bg-[#15599a] text-white">
				<h1 className="text-[0.7rem] font-bold uppercase tracking-tight">CLIENTES</h1>
			</div>
			<div className="w-full flex items-center justify-center lg:justify-end px-2 flex-wrap-reverse lg:flex-wrap gap-2">
				<button type="button" className="text-black hover:text-cyan-500 p-1 rounded-full" onClick={() => handleExportData()}>
					<FaDownload size={10} />
				</button>
				{queryParams.name ? (
					<div className="flex items-center gap-1">
						<PencilLine width={15} height={15} />
						<h1 className="py-0.5 text-center text-[0.6rem] font-medium italic text-primary/80">NOME</h1>
						<h1 className="py-0.5 text-center text-[0.6rem] font-bold  text-primary">{queryParams.name}</h1>
					</div>
				) : null}
				{queryParams.phone ? (
					<div className="flex items-center gap-1">
						<Phone width={15} height={15} />
						<h1 className="py-0.5 text-center text-[0.6rem] font-medium italic text-primary/80">TELEFONE</h1>
						<h1 className="py-0.5 text-center text-[0.6rem] font-bold  text-primary">{queryParams.phone}</h1>
					</div>
				) : null}
				{queryParams.rfmTitles.length > 0 ? (
					<div className="flex items-center gap-1">
						<Tag width={15} height={15} />
						<h1 className="py-0.5 text-center text-[0.6rem] font-medium italic text-primary/80">CATEGORIA</h1>
						<h1 className="py-0.5 text-center text-[0.6rem] font-bold  text-primary">
							{queryParams.rfmTitles.length > 0 ? queryParams.rfmTitles.map((title) => title).join(", ") : "N/A"}
						</h1>
					</div>
				) : null}
				{queryParams.acquisitionChannels.length > 0 ? (
					<div className="flex items-center gap-1">
						<Megaphone width={15} height={15} />
						<h1 className="py-0.5 text-center text-[0.6rem] font-medium italic text-primary/80">CANAL DE AQUISIÇÃO</h1>
						<h1 className="py-0.5 text-center text-[0.6rem] font-bold  text-primary">
							{queryParams.acquisitionChannels.length > 0 ? queryParams.acquisitionChannels.map((channel) => channel).join(", ") : "N/A"}
						</h1>
					</div>
				) : null}
				<div className="flex items-center gap-1">
					<BsCalendar width={10} height={10} />
					<h1 className="py-0.5 text-center text-[0.6rem] font-medium italic text-primary/80">PERÍODO</h1>
					<h1 className="py-0.5 text-center text-[0.6rem] font-bold  text-primary">
						{queryParams.period.after
							? `${formatDateAsLocale(queryParams.period.after)} - ${queryParams.period.before ? formatDateAsLocale(queryParams.period.before) : "N/A"}`
							: "NÃO DEFINIDO"}
					</h1>
				</div>
				<button
					type="button"
					onClick={() => setFilterMenuIsOpen((prev) => !prev)}
					className={cn("flex items-center gap-1 rounded-lg px-2 py-1 w-fit text-black duration-300 ease-in-out", {
						"bg-gray-300  hover:bg-gray-200": filterMenuIsOpen,
						"bg-blue-300  hover:bg-blue-400": !filterMenuIsOpen,
					})}
				>
					<Filter size={15} />
					<h1 className="text-xs font-medium tracking-tight">{!filterMenuIsOpen ? "ABRIR MENU DE FILTROS" : "FECHAR MENU DE FILTROS"}</h1>
				</button>
			</div>
			<div className="px-6 py-2 flex w-full flex-col gap-2 overflow-y-auto overscroll-y-auto max-h-[750px] scrollbar-thin scrollbar-track-gray-100 scrollbar-thumb-gray-300">
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
							<ClientCard
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

type ClientCardProps = {
	client: TGetClientsBySearchOutput["clients"][number];
	period: { after: Date; before: Date };
};
function ClientCard({ client, period }: ClientCardProps) {
	function getRFMColor(rfmLabel: string) {
		const rfm = RFMLabels.find((x) => x.text === rfmLabel);
		return rfm?.backgroundCollor || "bg-gray-400";
	}
	function getSalesStatsInPeriod(sales: TGetClientsBySearchOutput["clients"][number]["compras"]) {
		const totalValue = sales.reduce((acc, sale) => acc + sale.valorTotal, 0);
		return { purchases: sales.length, purchasesTotal: totalValue };
	}
	const salesStats = getSalesStatsInPeriod(client.compras);
	return (
		<div className="flex w-full flex-col gap-1 rounded border border-primary bg-[#fff] p-2 shadow-sm dark:bg-[#121212]">
			<div className="w-full flex items-center justify-between gap-2 flex-col lg:flex-row">
				<div className="flex items-center gap-2">
					<h1 className="text-[0.6rem] font-bold tracking-tight lg:text-sm">{client.nome}</h1>
					<h1 className={cn("px-2 py-0.5 rounded-lg text-white text-[0.6rem]", getRFMColor(client.analiseRFMTitulo || ""))}>{client.analiseRFMTitulo}</h1>
				</div>
				<div className="flex items-center gap-2 flex-wrap">
					<div className="flex items-center gap-1">
						<BsCalendar width={10} height={10} />
						<h1 className="py-0.5 text-center text-[0.6rem] font-medium italic text-primary/80">ÚLTIMA COMPRA</h1>
						<h1 className="py-0.5 text-center text-[0.6rem] font-bold  text-primary">{formatDateAsLocale(client.ultimaCompraData) || "N/A"}</h1>
					</div>
					<div className="flex items-center gap-1">
						<BsCalendar width={10} height={10} />
						<h1 className="py-0.5 text-center text-[0.6rem] font-medium italic text-primary/80">PRIMEIRA COMPRA</h1>
						<h1 className="py-0.5 text-center text-[0.6rem] font-bold  text-primary">{formatDateAsLocale(client.primeiraCompraData) || "N/A"}</h1>
					</div>
				</div>
			</div>
			<div className="flex w-full flex-col items-center justify-between gap-2 lg:flex-row">
				<div className="flex w-full flex-wrap items-center justify-center gap-2 lg:grow lg:justify-start">
					<div className="flex items-center gap-1">
						<FaPhone width={10} height={10} />
						<h1 className="py-0.5 text-center text-[0.6rem] font-medium italic text-primary/80">{client.telefone}</h1>
					</div>
					<div className="flex items-center gap-1">
						<MdEmail width={10} height={10} />
						<h1 className="py-0.5 text-center text-[0.6rem] font-medium italic text-primary/80">{client.email}</h1>
					</div>
					<div className="flex items-center gap-1">
						<Megaphone width={15} height={15} />
						<h1 className="py-0.5 text-center text-[0.6rem] font-medium italic text-primary/80">{client.canalAquisicao || "N/A"}</h1>
					</div>
				</div>
				<div className="flex w-full flex-wrap items-center justify-center gap-2 lg:min-w-fit lg:justify-end">
					<div className="flex items-center gap-1">
						<ShoppingCart width={14} height={14} />
						<h1 className="py-0.5 text-center text-[0.6rem] font-medium italic text-primary/80">COMPRAS NO PERÍODO</h1>
						<h1 className="py-0.5 text-center text-[0.6rem] font-bold  text-primary">{salesStats.purchases}</h1>
					</div>
					<div className="flex items-center gap-1">
						<BadgeDollarSign width={14} height={14} />
						<h1 className="py-0.5 text-center text-[0.6rem] font-medium italic text-primary/80">VALOR TOTAL DAS COMPRAS</h1>
						<h1 className="py-0.5 text-center text-[0.6rem] font-bold  text-primary">{formatToMoney(salesStats.purchasesTotal)}</h1>
					</div>
				</div>
			</div>
		</div>
	);
}
