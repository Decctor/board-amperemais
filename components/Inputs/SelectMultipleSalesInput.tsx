import React, { useEffect, useRef, useState } from "react";
import { HiCheck } from "react-icons/hi";
import { IoMdArrowDropdown, IoMdArrowDropup } from "react-icons/io";
import { Drawer, DrawerContent } from "../ui/drawer";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { useSalesSimplifiedSearch } from "@/lib/queries/sales";
import type { TSalesSimplifiedSearchResult } from "@/pages/api/sales/simplified-search";
import ErrorComponent from "../Layouts/ErrorComponent";
import { getErrorMessage } from "@/lib/errors";
import { BadgeDollarSign } from "lucide-react";
import { formatToMoney } from "@/lib/formatting";
import GeneralPaginationComponent from "../Utils/Pagination";
import { cn } from "@/lib/utils";

type SelectInputProps<T> = {
	width?: string;
	label: string;
	labelClassName?: string;
	holderClassName?: string;
	showLabel?: boolean;
	selected: (string | number)[] | null;
	editable?: boolean;
	selectedItemLabel: string;
	handleChange: (value: T[]) => void;
	onReset: () => void;
};

function MultipleSalesSelectInput<T>({
	width,
	label,
	labelClassName,
	holderClassName,
	showLabel = true,
	selected,
	editable = true,
	selectedItemLabel,
	handleChange,
	onReset,
}: SelectInputProps<T>) {
	const { data: salesResult, isLoading, isError, isSuccess, error, params, updateParams } = useSalesSimplifiedSearch();
	const sales = salesResult?.sales;
	const salesMatched = salesResult?.salesMatched || 0;
	const salesShowing = sales?.length || 0;
	const totalPages = salesResult?.totalPages || 0;

	function getValueID({ sales, selected }: { selected: (string | number)[] | null; sales: TSalesSimplifiedSearchResult["sales"] }) {
		if (sales && selected) {
			const filteredOptions = sales.filter((sale) => selected.includes(sale.id));
			if (filteredOptions) {
				const arrOfIds = filteredOptions.map((option) => option.id);
				return arrOfIds;
			}
			return null;
		}
		return null;
	}

	const ref = useRef<any>(null);
	const isDesktop = useMediaQuery("(min-width: 768px)");

	const [selectMenuIsOpen, setSelectMenuIsOpen] = useState<boolean>(false);
	const [selectedIds, setSelectedIds] = useState<(string | number)[] | null>(getValueID({ sales: sales ?? [], selected }));

	const [dropdownDirection, setDropdownDirection] = useState<"up" | "down">("down");

	const inputIdentifier = label.toLowerCase().replace(" ", "_");
	function handleSelect({ id, sales }: { id: string | number; sales: TSalesSimplifiedSearchResult["sales"] }) {
		const ids = selectedIds ? [...selectedIds] : [];
		if (!ids?.includes(id)) {
			setSelectedIds((prev) => [...(prev || []), id]);
			handleChange([...ids, id] as T[]);
		} else {
			setSelectedIds((prev) => prev?.filter((item) => item !== id) || []);
			handleChange(ids.filter((item) => item !== id) as T[]);
		}
	}

	function resetState() {
		onReset();
		setSelectedIds(null);
		setSelectMenuIsOpen(false);
	}
	function onClickOutside() {
		updateParams({ search: "" });
		setSelectMenuIsOpen(false);
	}

	// useEffect(() => {
	//   setSelectedIds(getValueID({ sales: sales ?? [], selected }))
	// }, [sales, selected])
	useEffect(() => {
		const handleClickOutside = (event: any) => {
			if (ref.current && !ref.current.contains(event.target) && isDesktop) {
				onClickOutside();
			}
		};
		document.addEventListener("click", (e) => handleClickOutside(e), true);
		return () => {
			document.removeEventListener("click", (e) => handleClickOutside(e), true);
		};
	}, [onClickOutside]);
	useEffect(() => {
		if (selectMenuIsOpen && ref.current) {
			const rect = ref.current.getBoundingClientRect();
			const spaceBelow = window.innerHeight - rect.bottom;
			const spaceAbove = rect.top;

			if (spaceBelow < 250 && spaceAbove > spaceBelow) {
				setDropdownDirection("up");
			} else {
				setDropdownDirection("down");
			}
		}
	}, [selectMenuIsOpen]);

	console.log(selectedIds);
	if (isDesktop)
		return (
			<div ref={ref} draggable={false} className={`relative flex w-full flex-col gap-1 lg:w-[${width ? width : "350px"}]`}>
				{showLabel ? (
					<label htmlFor={inputIdentifier} className={cn("text-sm tracking-tight text-primary/80 font-medium", labelClassName)}>
						{label}
					</label>
				) : null}

				<div
					className={cn(
						"flex h-full min-h-[46.6px] w-full items-center justify-between rounded-md border bg-white p-3 text-sm shadow-xs duration-500 ease-in-out dark:bg-[#121212]",
						selectMenuIsOpen ? "border-primary" : "border-primary/20",
						holderClassName,
					)}
				>
					{selectMenuIsOpen ? (
						<input
							type="text"
							value={params.search}
							onChange={(e) => updateParams({ search: e.target.value })}
							placeholder="Filtre o item desejado..."
							className="h-full w-full text-sm italic outline-hidden"
						/>
					) : (
						<button
							type="button"
							onClick={() => {
								if (editable) setSelectMenuIsOpen((prev) => !prev);
							}}
							className="grow cursor-pointer text-primary"
						>
							{selectedIds && selectedIds.length > 0 && sales
								? sales.filter((item) => selectedIds.includes(item.id)).length > 1
									? "MÚLTIPLAS SELEÇÕES"
									: sales.filter((item) => selectedIds.includes(item.id))[0]?.cliente.nome
								: "NÃO DEFINIDO"}
						</button>
					)}
					{selectMenuIsOpen ? (
						<IoMdArrowDropup
							style={{ cursor: "pointer" }}
							onClick={() => {
								if (editable) setSelectMenuIsOpen((prev) => !prev);
							}}
						/>
					) : (
						<IoMdArrowDropdown
							style={{ cursor: "pointer" }}
							onClick={() => {
								if (editable) setSelectMenuIsOpen((prev) => !prev);
							}}
						/>
					)}
				</div>
				{selectMenuIsOpen ? (
					<div
						className={`absolute ${
							dropdownDirection === "down" ? "top-[75px]" : "bottom-[75px]"
						} scrollbar-thin scrollbar-track-primary/10 scrollbar-thumb-primary/30 z-100 flex h-[250px] max-h-[250px] w-full flex-col self-center overflow-y-auto overscroll-y-auto rounded-md border border-primary/20 bg-white p-2 py-1 shadow-xs dark:bg-[#121212]`}
					>
						<button
							type="button"
							onClick={() => resetState()}
							className={`flex w-full cursor-pointer items-center rounded p-1 px-2 hover:bg-primary/20 ${!selectedIds ? "bg-primary/20" : ""}`}
						>
							<p className="grow text-sm font-medium text-primary">{selectedItemLabel}</p>
							{!selectedIds ? <HiCheck style={{ color: "#fead61", fontSize: "20px" }} /> : null}
						</button>
						<div className="my-2 h-px w-full bg-gray-200" />
						{isLoading ? <p className="w-full text-center text-xs tracking-tight text-primary/80">Carregando...</p> : null}
						{isError ? <ErrorComponent msg={getErrorMessage(error)} /> : null}
						{isSuccess ? (
							sales ? (
								<>
									<GeneralPaginationComponent
										activePage={params.page}
										queryLoading={isLoading}
										selectPage={(page) => updateParams({ page })}
										totalPages={totalPages}
										itemsMatchedText={salesMatched > 1 ? `${salesMatched} vendas encontradas.` : `${salesMatched} venda encontrada.`}
										itemsShowingText={salesShowing > 1 ? `Mostrando ${salesShowing} vendas.` : `Mostrando ${salesShowing} venda.`}
										showSteppersText={false}
										pageIconSize={"sm"}
									/>
									{sales.map((item, index) => (
										<button
											type="button"
											onClick={() => {
												if (editable) handleSelect({ id: item.id, sales: sales });
											}}
											key={item.id ? item.id : index}
											className={`flex w-full cursor-pointer items-center rounded p-1 px-2 hover:bg-primary/20 ${
												selectedIds?.includes(item.id) ? "bg-primary/20" : ""
											}`}
										>
											<div className="grow flex items-center gap-1">
												<p className="text-xs font-medium text-primary">{item.cliente.nome}</p>
												<div className="min-w-fit flex items-center gap-1">
													<BadgeDollarSign size={12} />
													<p className="text-[0.65rem] font-medium text-primary/80">{formatToMoney(item.valorTotal)}</p>
												</div>
											</div>
											{selectedIds?.includes(item.id) ? <HiCheck style={{ color: "#fead61", fontSize: "20px" }} /> : null}
										</button>
									))}
								</>
							) : (
								<p className="w-full text-center text-sm italic text-primary">Sem opções disponíveis.</p>
							)
						) : null}
					</div>
				) : (
					false
				)}
			</div>
		);
	return (
		<Drawer open={selectMenuIsOpen} onOpenChange={setSelectMenuIsOpen}>
			<div ref={ref} draggable={false} className={`relative flex w-full flex-col gap-1 lg:w-[${width ? width : "350px"}]`}>
				{showLabel ? (
					<label htmlFor={inputIdentifier} className={cn("text-sm tracking-tight text-primary/80 font-medium", labelClassName)}>
						{label}
					</label>
				) : null}

				<div
					className={cn(
						"flex h-full min-h-[46.6px] w-full items-center justify-between rounded-md border bg-white p-3 text-sm shadow-xs duration-500 ease-in-out dark:bg-[#121212]",
						selectMenuIsOpen ? "border-primary" : "border-primary/20",
						holderClassName,
					)}
				>
					<button
						type="button"
						onClick={() => {
							if (editable) setSelectMenuIsOpen((prev) => !prev);
						}}
						className="grow cursor-pointer text-primary"
					>
						{selectedIds && selectedIds.length > 0 && sales
							? sales.filter((item) => selectedIds.includes(item.id)).length > 1
								? "MÚLTIPLAS SELEÇÕES"
								: sales.filter((item) => selectedIds.includes(item.id))[0]?.cliente.nome
							: "NÃO DEFINIDO"}
					</button>
					<IoMdArrowDropdown
						style={{ cursor: "pointer" }}
						onClick={() => {
							if (editable) setSelectMenuIsOpen((prev) => !prev);
						}}
					/>
				</div>
				<DrawerContent className="gap-2 p-2">
					<p className="w-full text-center text-xs tracking-tight text-primary/80">
						{selectedIds && selectedIds.length > 0 && sales
							? sales.filter((item) => selectedIds.includes(item.id)).length > 3
								? "Múltiplas opções selecionadas."
								: `Selecionando: ${sales
										.filter((item) => selectedIds.includes(item.id))
										.map((o) => o.cliente)
										.join(",")}.`
							: "Nenhuma opção selecionada."}
					</p>
					<input
						type="text"
						value={params.search}
						onChange={(e) => updateParams({ search: e.target.value })}
						placeholder="Filtre o item desejado..."
						className="w-full bg-transparent p-2 text-sm italic outline-hidden"
					/>
					<button
						type="button"
						onClick={() => resetState()}
						className={`flex w-full cursor-pointer items-center rounded p-1 px-2 hover:bg-primary/20 ${!selectedIds ? "bg-primary/20" : ""}`}
					>
						<p className="grow text-sm font-medium text-primary">{selectedItemLabel}</p>
						{!selectedIds ? <HiCheck style={{ color: "#fead61", fontSize: "20px" }} /> : null}
					</button>
					<div className="my-2 h-px w-full bg-gray-200" />
					<div className="scrollbar-thin scrollbar-track-primary/10 scrollbar-thumb-primary/30 flex h-[200px] min-h-[200px] flex-col gap-2 overflow-y-auto overscroll-y-auto lg:h-[350px] lg:max-h-[350px]">
						{isLoading ? <p className="w-full text-center text-xs tracking-tight text-primary/80">Carregando...</p> : null}
						{isError ? <ErrorComponent msg={getErrorMessage(error)} /> : null}
						{isSuccess ? (
							sales ? (
								<>
									<GeneralPaginationComponent
										activePage={params.page}
										queryLoading={isLoading}
										selectPage={(page) => updateParams({ page })}
										totalPages={totalPages}
										itemsMatchedText={salesMatched > 1 ? `${salesMatched} vendas encontradas.` : `${salesMatched} venda encontrada.`}
										itemsShowingText={salesShowing > 1 ? `Mostrando ${salesShowing} vendas.` : `Mostrando ${salesShowing} venda.`}
										showSteppersText={false}
										pageIconSize={"sm"}
									/>
									{sales.map((item, index) => (
										<button
											type="button"
											onClick={() => {
												if (editable) handleSelect({ id: item.id, sales: sales });
											}}
											key={item.id ? item.id : index}
											className={`flex w-full cursor-pointer items-center rounded p-1 px-2 hover:bg-primary/20 ${
												selectedIds?.includes(item.id) ? "bg-primary/20" : ""
											}`}
										>
											<div className="grow flex items-center gap-1">
												<p className="text-xs font-medium text-primary">{item.cliente.nome}</p>
												<div className="min-w-fit flex items-center gap-1">
													<BadgeDollarSign size={12} />
													<p className="text-[0.65rem] font-medium text-primary/80">{formatToMoney(item.valorTotal)}</p>
												</div>
											</div>
											{selectedIds?.includes(item.id) ? <HiCheck style={{ color: "#fead61", fontSize: "20px" }} /> : null}
										</button>
									))}
								</>
							) : (
								<p className="w-full text-center text-sm italic text-primary">Sem opções disponíveis.</p>
							)
						) : null}
					</div>
				</DrawerContent>
			</div>
		</Drawer>
	);
}

export default MultipleSalesSelectInput;
