import { getLastDayOfMonth } from "@/lib/dates";
import { getFirstDayOfMonth } from "@/lib/dates";
import { formatDateAsLocale } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import type { TSaleStatsGeneralQueryParams } from "@/schemas/query-params-utils";
import type { TUserSession } from "@/schemas/users";
import dayjs from "dayjs";
import { BadgeDollarSign, Cpu, Diamond, Filter, GitCompare, ShoppingCart, Tag } from "lucide-react";
import { useState } from "react";
import { BsCalendar } from "react-icons/bs";
import { FaUserTie } from "react-icons/fa";
import Header from "../Layouts/Header";
import StatsPeriodComparisonMenu from "../Modals/Stats/StatsPeriodComparisonMenu";
import { Button } from "../ui/button";
import GroupedStatsBlock from "./Blocks/GroupedStatsBlock";
import OverallStatsBlock from "./Blocks/OverallStatsBlock";
import SalesGraphBlock from "./Blocks/SalesGraphBlock";
import SalesQueryParamsMenu from "./SalesQueryParamsMenu";

const firstDayOfMonth = dayjs().startOf("month").toISOString();
const currentDay = dayjs().endOf("day").toISOString();

type TSalesStatsMainProps = {
	user: TUserSession;
};
export default function SalesStatsMain({ user }: TSalesStatsMainProps) {
	const userViewPermission = user.visualizacao;
	const userInitialSellersParam = userViewPermission === "GERAL" ? [] : [user.vendedor];

	const [comparisonMenuIsOpen, setComparisonMenuIsOpen] = useState(false);
	const [filterMenuIsOpen, setFilterMenuIsOpen] = useState(false);
	const [generalQueryParams, setGeneralQueryParams] = useState<TSaleStatsGeneralQueryParams>({
		period: {
			after: firstDayOfMonth,
			before: currentDay,
		},
		total: {},
		saleNatures: [],
		sellers: userInitialSellersParam,
		clientRFMTitles: [],
		productGroups: [],
		excludedSalesIds: [],
	});
	function updateGeneralQueryParams(newParams: Partial<TSaleStatsGeneralQueryParams>) {
		setGeneralQueryParams((prevParams) => ({ ...prevParams, ...newParams }));
	}
	return (
		<div className="flex h-full flex-col">
			<Header session={user} />
			<div className="flex w-full max-w-full grow flex-col overflow-x-hidden bg-background px-6 lg:px-12 py-6">
				<div className="flex w-full flex-col border-b border-primary pb-2 gap-2">
					<h1 className="text-base text-center lg:text-start lg:text-2xl font-black text-primary">Dashboard - Resultados Comerciais</h1>
					<div className="w-full flex items-center justify-center lg:justify-end px-2 flex-wrap-reverse lg:flex-wrap gap-2">
						{generalQueryParams.total.min || generalQueryParams.total.max ? (
							<div className="flex items-center gap-1">
								<BadgeDollarSign width={12} height={12} />
								<h1 className="py-0.5 text-center text-[0.6rem] font-medium italic text-primary/80">VALOR</h1>
								<h1 className="py-0.5 text-center text-[0.6rem] font-bold  text-primary">
									{generalQueryParams.total.min ? `MIN: R$ ${generalQueryParams.total.min}` : "N/A"} -{" "}
									{generalQueryParams.total.max ? `MAX: R$ ${generalQueryParams.total.max}` : "N/A"}
								</h1>
							</div>
						) : null}
						{generalQueryParams.saleNatures.length > 0 ? (
							<div className="flex items-center gap-1">
								<Diamond width={12} height={12} />
								<h1 className="py-0.5 text-center text-[0.6rem] font-medium italic text-primary/80">NATUREZA DA VENDA</h1>
								<h1 className="py-0.5 text-center text-[0.6rem] font-bold  text-primary">
									{generalQueryParams.saleNatures.map((nature) => nature).join(", ")}
								</h1>
							</div>
						) : null}
						{generalQueryParams.clientRFMTitles.length > 0 ? (
							<div className="flex items-center gap-1">
								<Tag width={12} height={12} />
								<h1 className="py-0.5 text-center text-[0.6rem] font-medium italic text-primary/80">CATEGORIA DE CLIENTES</h1>
								<h1 className="py-0.5 text-center text-[0.6rem] font-bold  text-primary">
									{generalQueryParams.clientRFMTitles.map((title) => title).join(", ")}
								</h1>
							</div>
						) : null}
						{generalQueryParams.productGroups.length > 0 ? (
							<div className="flex items-center gap-1">
								<ShoppingCart width={12} height={12} />
								<h1 className="py-0.5 text-center text-[0.6rem] font-medium italic text-primary/80">GRUPO DE PRODUTOS</h1>
								<h1 className="py-0.5 text-center text-[0.6rem] font-bold  text-primary">
									{generalQueryParams.productGroups.map((group) => group).join(", ")}
								</h1>
							</div>
						) : null}
						{generalQueryParams.sellers.length > 0 ? (
							<div className="flex items-center gap-1">
								<FaUserTie width={12} height={12} />
								<h1 className="py-0.5 text-center text-[0.6rem] font-medium italic text-primary/80">VENDEDOR</h1>
								<h1 className="py-0.5 text-center text-[0.6rem] font-bold  text-primary">{generalQueryParams.sellers.map((seller) => seller).join(", ")}</h1>
							</div>
						) : null}
						<div className="flex items-center gap-1">
							<BsCalendar width={10} height={10} />
							<h1 className="py-0.5 text-center text-[0.6rem] font-medium italic text-primary/80">PERÍODO</h1>
							<h1 className="py-0.5 text-center text-[0.6rem] font-bold  text-primary">
								{generalQueryParams.period.after
									? `${formatDateAsLocale(generalQueryParams.period.after)} - ${
											generalQueryParams.period.before ? formatDateAsLocale(generalQueryParams.period.before) : "N/A"
										}`
									: "NÃO DEFINIDO"}
							</h1>
						</div>
						<button
							type="button"
							onClick={() => setFilterMenuIsOpen((prev) => !prev)}
							className={cn("flex items-center gap-1 rounded-lg px-2 py-1 w-fit text-primary duration-300 ease-in-out", {
								"bg-gray-300  hover:bg-gray-200": filterMenuIsOpen,
								"bg-blue-300  hover:bg-blue-400": !filterMenuIsOpen,
							})}
						>
							<Filter size={15} />
							<h1 className="text-xs font-medium tracking-tight">{!filterMenuIsOpen ? "ABRIR MENU DE FILTROS" : "FECHAR MENU DE FILTROS"}</h1>
						</button>
					</div>
				</div>
				<div className="w-full flex flex-col grow gap-2 py-2">
					<div className="w-full flex items-center justify-end">
						<Button type="button" onClick={() => setComparisonMenuIsOpen(true)} className="flex gap-2">
							<GitCompare className="w-3 h-3 min-w-3 min-h-3" />
							COMPARAR PERÍODOS
						</Button>
					</div>
					<OverallStatsBlock generalQueryParams={generalQueryParams} user={user} />
					<SalesGraphBlock generalQueryParams={generalQueryParams} user={user} />
					<GroupedStatsBlock generalQueryParams={generalQueryParams} user={user} />
				</div>
			</div>
			{filterMenuIsOpen ? (
				<SalesQueryParamsMenu
					user={user}
					queryParams={generalQueryParams}
					updateQueryParams={updateGeneralQueryParams}
					closeMenu={() => setFilterMenuIsOpen(false)}
				/>
			) : null}
			{comparisonMenuIsOpen ? <StatsPeriodComparisonMenu closeMenu={() => setComparisonMenuIsOpen(false)} /> : null}
		</div>
	);
}
