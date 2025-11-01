import { formatDateForInputValue, formatDateOnInputChange, formatToMoney } from "@/lib/formatting";
import { useRFMData } from "@/lib/queries/stats/rfm";
import { cn } from "@/lib/utils";
import type { TSalesRFMFilters } from "@/schemas/query-params-utils";
import type { TSale } from "@/schemas/sales";
import type { TUserSession } from "@/schemas/users";
import dayjs from "dayjs";
import React, { useState } from "react";
import { BsCalendar } from "react-icons/bs";
import { FaFastBackward } from "react-icons/fa";
import { IoMdPulse } from "react-icons/io";
import { MdAttachMoney } from "react-icons/md";
import { useDebounce } from "use-debounce";
import DateInput from "../Inputs/DateInput";
import MultipleSelectInput from "../Inputs/MultipleSelectInput";
import NumberInput from "../Inputs/NumberInput";
import TextInput from "../Inputs/TextInput";
const intervalStart = dayjs().subtract(12, "month").startOf("day").toISOString();
const intervalEnd = dayjs().endOf("day").toISOString();
type MatrixRFMAnalysisProps = {
	session: TUserSession;
	saleNatureOptions: string[];
	sellerOptions: string[];
};
function MatrixRFMAnalysis({ session, sellerOptions, saleNatureOptions }: MatrixRFMAnalysisProps) {
	const userViewPermissions = session.visualizacao;
	const [filters, setFilters] = useState<TSalesRFMFilters>({
		period: {
			after: intervalStart,
			before: intervalEnd,
		},
		total: {},
		saleNatures: [],
		sellers: userViewPermissions == "GERAL" ? [] : [session._id],
	});
	const [filtersDebounced] = useDebounce(filters, 1000);
	const { data, selectFilters, setSelectFilters } = useRFMData({ ...filtersDebounced });
	const gridItems = [
		{
			text: "NÃO PODE PERDÊ-LOS",
			color: "bg-blue-400",
			gridArea: "1 / 1 / 2 / 3",
			clientsQty: data?.filter((x) => x.rfmLabel == "NÃO PODE PERDÊ-LOS").length || 0,
		},
		{
			text: "CLIENTES LEAIS",
			color: "bg-green-400",
			gridArea: "1 / 3 / 3 / 6",
			clientsQty: data?.filter((x) => x.rfmLabel == "CLIENTES LEAIS").length || 0,
		},
		{ text: "CAMPEÕES", color: "bg-orange-400", gridArea: "1 / 5 / 2 / 6", clientsQty: data?.filter((x) => x.rfmLabel == "CAMPEÕES").length || 0 },
		{ text: "EM RISCO", color: "bg-yellow-400", gridArea: "2 / 1 / 4 / 3", clientsQty: data?.filter((x) => x.rfmLabel == "EM RISCO").length || 0 },
		{
			text: "PRECISAM DE ATENÇÃO",
			color: "bg-indigo-400",
			gridArea: "3 / 3 / 4 / 4",
			clientsQty: data?.filter((x) => x.rfmLabel == "PRECISAM DE ATENÇÃO").length || 0,
		},
		{
			text: "POTENCIAIS CLIENTES LEAIS",
			color: "bg-[#5C4033]",
			gridArea: "3 / 4 / 5 / 6",
			clientsQty: data?.filter((x) => x.rfmLabel == "POTENCIAIS CLIENTES LEAIS").length || 0,
		},
		{ text: "HIBERNANDO", color: "bg-purple-400", gridArea: "4 / 2 / 5 / 3", clientsQty: data?.filter((x) => x.rfmLabel == "HIBERNANDO").length || 0 },
		{
			text: "PRESTES A DORMIR",
			color: "bg-yellow-600",
			gridArea: "4 / 3 / 6 / 4",
			clientsQty: data?.filter((x) => x.rfmLabel == "PRESTES A DORMIR").length || 0,
		},
		{ text: "PERDIDOS", color: "bg-red-500", gridArea: "4 / 1 / 6 / 2", clientsQty: data?.filter((x) => x.rfmLabel == "PERDIDOS").length || 0 },
		{
			text: "PERDIDOS (extensão)",
			color: "bg-red-500",
			gridArea: "5 / 2 / 6 / 3",
			clientsQty: null,
		},
		{ text: "PROMISSORES", color: "bg-pink-400", gridArea: "5 / 4 / 6 / 5", clientsQty: data?.filter((x) => x.rfmLabel == "PROMISSORES").length || 0 },
		{
			text: "CLIENTES RECENTES",
			color: "bg-teal-400",
			gridArea: "5 / 5 / 6 / 6",
			clientsQty: data?.filter((x) => x.rfmLabel == "CLIENTES RECENTES").length || 0,
		},
	];

	return (
		<div className="w-full flex flex-col gap-2 rounded-xl border border-primary shadow-sm border-[#fead41] overflow-hidden">
			<div className="py-1 px-4 rounded-bl-none rounded-br-none flex items-center justify-between w-full bg-[#fead41]">
				<h1 className="text-[0.7rem] font-bold uppercase tracking-tight">ANÁLISE RFM</h1>
			</div>
			<div className="flex flex-col items-center gap-2 lg:flex-row px-2">
				<div className="w-full lg:w-[250px]">
					<NumberInput
						label="VALOR MÁX"
						placeholder="Valor máximo..."
						value={filters.total.max || null}
						handleChange={(value) => setFilters((prev) => ({ ...prev, total: { ...prev.total, max: value } }))}
						width="100%"
					/>
				</div>
				<div className="w-full lg:w-[250px]">
					<NumberInput
						label="VALOR MIN"
						placeholder="Valor mínimo..."
						value={filters.total.min || null}
						handleChange={(value) => setFilters((prev) => ({ ...prev, total: { ...prev.total, min: value } }))}
						width="100%"
					/>
				</div>
				<div className="w-full lg:w-[250px]">
					<MultipleSelectInput
						label="VENDEDOR"
						selected={filters.sellers}
						options={sellerOptions.map((s, index) => ({ id: index + 1, label: s, value: s }))}
						handleChange={(value) =>
							setFilters((prev) => ({
								...prev,
								sellers: value as string[],
							}))
						}
						selectedItemLabel="VENDEDOR"
						onReset={() => setFilters((prev) => ({ ...prev, sellers: [] }))}
						width="100%"
					/>
				</div>
				<div className="w-full lg:w-[250px]">
					<MultipleSelectInput
						label="NATUREZA DA VENDA"
						selected={filters.saleNatures}
						options={saleNatureOptions.map((s, index) => ({ id: index + 1, label: s, value: s })) || []}
						handleChange={(value) =>
							setFilters((prev) => ({
								...prev,
								saleNatures: value as TSale["natureza"][],
							}))
						}
						selectedItemLabel="NATUREZA DA VENDA"
						onReset={() => setFilters((prev) => ({ ...prev, saleNatures: [] }))}
						width="100%"
					/>
				</div>
				<div className="w-full lg:w-[150px]">
					<DateInput
						label="PERÍODO"
						value={formatDateForInputValue(filters.period.after)}
						handleChange={(value) =>
							setFilters((prev) => ({
								...prev,
								period: {
									...prev.period,
									after: (formatDateOnInputChange(value) as string) || intervalStart,
								},
							}))
						}
						width="100%"
					/>
				</div>
				<div className="w-full lg:w-[150px]">
					<DateInput
						label="PERÍODO"
						value={formatDateForInputValue(filters.period.before)}
						handleChange={(value) =>
							setFilters((prev) => ({
								...prev,
								period: {
									...prev.period,
									before: (formatDateOnInputChange(value) as string) || intervalEnd,
								},
							}))
						}
						width="100%"
					/>
				</div>
				<div className="w-full lg:w-[150px]">
					<MultipleSelectInput
						label="CATEGORIA DO CLIENTE"
						selected={selectFilters.rfmLabels}
						handleChange={(value) =>
							setSelectFilters((prev) => ({
								...prev,
								rfmLabels: value as string[],
							}))
						}
						onReset={() => setSelectFilters((prev) => ({ ...prev, rfmLabels: [] }))}
						options={gridItems.map((item) => ({ id: item.text, label: item.text, value: item.text }))}
						selectedItemLabel="NÃO DEFINIDO"
						width="100%"
					/>
				</div>
			</div>
			<div className="w-full flex items-center flex-col lg:flex-row gap-2 h-full p-6">
				<div className="w-full lg:w-1/2 h-full">
					<div className="flex min-h-[90px] h-full w-full flex-col rounded border border-primary shadow-sm overflow-hidden">
						<div className="py-1 px-4 rounded-bl-none rounded-br-none flex items-center justify-between w-full bg-[#fead41]">
							<h1 className="text-[0.7rem] font-bold uppercase tracking-tight">CLIENTES</h1>
						</div>
						<div className="px-1 lg:px-6 w-full py-2">
							<TextInput
								label="NOME DO CLIENTE"
								showLabel={false}
								placeholder="Filtre pelo nome do cliente..."
								value={selectFilters.clientName}
								handleChange={(value) => setSelectFilters((prev) => ({ ...prev, clientName: value }))}
							/>
						</div>

						<div className="px-1 lg:px-6 py-2 flex flex-col max-h-[500px] lg:max-h-[750px] w-full gap-2 grow scrollbar-thin scrollbar-track-primary/10 scrollbar-thumb-primary/30 overflow-y-auto overscroll-y-auto">
							{data?.map((client) => (
								<div key={client.clientId} className="border border-primary flex flex-col px-3 py-2 rounded w-full">
									<div className="w-full flex items-center justify-between gap-2">
										<div className="flex items-center gap-2">
											<h1 className="text-[0.6rem] font-bold tracking-tight lg:text-sm">{client.clientName}</h1>
											<h1 className={cn("px-2 py-1 rounded-lg text-white text-[0.6rem]", gridItems.find((x) => x.text == client.rfmLabel)?.color)}>
												{client.rfmLabel}
											</h1>
										</div>
									</div>
									<div className="flex items-center gap-2 flex-wrap">
										<div className="flex items-center gap-1">
											<IoMdPulse width={10} height={10} />
											<h1 className="py-0.5 text-center text-[0.6rem] font-medium italic text-primary/80">FREQUÊNCIA</h1>
											<h1 className="py-0.5 text-center text-[0.6rem] font-bold  text-primary">NOTA {client.rfmScore.frequency}</h1>
										</div>
										<div className="flex items-center gap-1">
											<FaFastBackward width={10} height={10} />
											<h1 className="py-0.5 text-center text-[0.6rem] font-medium italic text-primary/80">RECÊNCIA</h1>
											<h1 className="py-0.5 text-center text-[0.6rem] font-bold  text-primary">NOTA {client.rfmScore.recency}</h1>
										</div>
										<div className="flex items-center gap-1">
											<MdAttachMoney width={10} height={10} />
											<h1 className="py-0.5 text-center text-[0.6rem] font-medium italic text-primary/80">VALOR GASTO NO PERÍODO</h1>
											<h1 className="py-0.5 text-center text-[0.6rem] font-bold  text-primary">{formatToMoney(client.monetary)}</h1>
										</div>
										<div className="flex items-center gap-1">
											<BsCalendar width={10} height={10} />
											<h1 className="py-0.5 text-center text-[0.6rem] font-medium italic text-primary/80">DIAS DESDE ÚLTIMA COMPRA</h1>
											<h1 className="py-0.5 text-center text-[0.6rem] font-bold  text-primary">{client.recency ? `${client.recency} DIAS` : "N/A"}</h1>
										</div>
									</div>
								</div>
							))}
						</div>
					</div>
				</div>
				<div className="w-full lg:w-1/2 h-full">
					<div className="flex min-h-[90px] h-full w-full  flex-col rounded border border-primary shadow-sm overflow-hidden">
						<div className="py-1 px-4 rounded-bl-none rounded-br-none flex items-center justify-between w-full bg-[#fead41]">
							<h1 className="text-[0.7rem] font-bold uppercase tracking-tight">MATRIZ RFM</h1>
						</div>
						<div className="px-1 lg:px-6 py-2 flex w-full grow max-h-[500px] lg:max-h-[750px]">
							<div className="grid grid-cols-5 grid-rows-5 w-full h-full p-1 lg:p-4">
								{gridItems.map((item, index) => (
									<div
										key={index}
										className={`${item.color} flex flex-col gap-2 items-center justify-center p-2 text-white font-bold text-center`}
										style={{ gridArea: item.gridArea }}
									>
										<h1></h1>
										{item.text !== "PERDIDOS (extensão)" ? <h1 className="text-[0.5rem] lg:text-base">{item.text}</h1> : ""}
										{item.text !== "PERDIDOS (extensão)" ? (
											<div className="bg-black text-[0.6rem] h-8 w-8 min-h-8 min-w-8 lg:h-16 lg:w-16 lg:min-h-16 lg:min-w-16 p-2 rounded-full lg:text-sm font-bold text-white flex items-center justify-center">
												<h1>{item.clientsQty}</h1>
											</div>
										) : (
											""
										)}
									</div>
								))}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

export default MatrixRFMAnalysis;
