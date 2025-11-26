import { formatDateForInputValue, formatDateOnInputChange } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import type { TGetSellersDefaultInput } from "@/pages/api/sellers";
import { ArrowDownNarrowWide } from "lucide-react";
import { ArrowUpNarrowWide } from "lucide-react";
import { useState } from "react";
import DateInput from "../Inputs/DateInput";
import TextInput from "../Inputs/TextInput";
import { Button } from "../ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../ui/sheet";

type SalesTeamFilterMenuProps = {
	queryParams: TGetSellersDefaultInput;
	updateQueryParams: (params: Partial<TGetSellersDefaultInput>) => void;
	closeMenu: () => void;
};
function SalesTeamFilterMenu({ queryParams, updateQueryParams, closeMenu }: SalesTeamFilterMenuProps) {
	const [queryParamsHolder, setQueryParamsHolder] = useState<TGetSellersDefaultInput>(queryParams);

	const SORTING_FIELDS = [
		{
			id: 1,
			label: "NOME",
			value: "nome",
		},
		{
			id: 2,
			label: "DATA DE INSERÇÃO",
			value: "dataInsercao",
		},
		{
			id: 3,
			label: "VALOR TOTAL DE VENDAS",
			value: "vendasValorTotal",
		},
		{
			id: 4,
			label: "QUANTIDADE TOTAL DE VENDAS",
			value: "vendasQtdeTotal",
		},
	];
	return (
		<Sheet open onOpenChange={closeMenu}>
			<SheetContent>
				<div className="flex h-full w-full flex-col">
					<SheetHeader>
						<SheetTitle>FILTRAR VENDEDORES</SheetTitle>
						<SheetDescription>Escolha aqui parâmetros para filtrar o banco de vendedores.</SheetDescription>
					</SheetHeader>

					<div className="flex h-full flex-col gap-y-4 overflow-y-auto overscroll-y-auto p-2 scrollbar-thin scrollbar-track-primary/10 scrollbar-thumb-primary/30">
						<div className="flex w-full flex-col gap-2">
							<TextInput
								label="NOME DO VENDEDOR"
								value={queryParamsHolder.search ?? ""}
								placeholder={"Preenha aqui o nome do vendedor para filtro."}
								handleChange={(value) => setQueryParamsHolder((prev) => ({ ...prev, search: value }))}
								width={"100%"}
							/>
						</div>
						<div className="flex w-full flex-col gap-2">
							<h1 className="w-full text-xs tracking-tight text-primary">ORDENAÇÃO</h1>
							<div className="flex items-center gap-2 justify-center flex-wrap">
								<button
									type="button"
									onClick={() => setQueryParamsHolder((prev) => ({ ...prev, orderByDirection: "asc" }))}
									className={cn("flex items-center gap-1 rounded-lg px-2 py-1 text-primary duration-300 ease-in-out", {
										"bg-primary/50  text-primary-foreground hover:bg-primary/40": queryParamsHolder.orderByDirection === "asc",
										"bg-transparent text-primary hover:bg-primary/20": queryParamsHolder.orderByDirection !== "asc",
									})}
								>
									<ArrowUpNarrowWide size={12} />
									<h1 className="text-xs font-medium tracking-tight">ORDEM CRESCENTE</h1>
								</button>
								<button
									type="button"
									onClick={() => setQueryParamsHolder((prev) => ({ ...prev, orderByDirection: "desc" }))}
									className={cn("flex items-center gap-1 rounded-lg px-2 py-1 text-primary duration-300 ease-in-out", {
										"bg-primary/50  text-primary-foreground hover:bg-primary/40": queryParamsHolder.orderByDirection === "desc",
										"bg-transparent text-primary hover:bg-primary/20": queryParamsHolder.orderByDirection !== "desc",
									})}
								>
									<ArrowDownNarrowWide size={12} />
									<h1 className="text-xs font-medium tracking-tight">ORDEM DECRESCENTE</h1>
								</button>
							</div>
							{SORTING_FIELDS.map((option) => (
								<button
									key={option.value}
									type="button"
									className={cn("w-full flex items-center text-xs tracking-tight px-2 py-1 rounded-lg", {
										"bg-primary/50  text-primary-foreground hover:bg-primary/40": queryParamsHolder.orderByField === option.value,
										"bg-transparent text-primary hover:bg-primary/20": queryParamsHolder.orderByField !== option.value,
									})}
									onClick={() =>
										setQueryParamsHolder((prev) => ({
											...prev,
											orderByField: option.value as TGetSellersDefaultInput["orderByField"],
										}))
									}
								>
									<h1>{option.label}</h1>
								</button>
							))}
						</div>
						<div className="flex w-full flex-col gap-2">
							<h1 className="w-full text-xs tracking-tight text-primary">FILTRO POR PERÍODO DAS ESTASTÍCAS</h1>
							<DateInput
								label="DEPOIS DE"
								value={formatDateForInputValue(queryParamsHolder.statsPeriodAfter)}
								handleChange={(value) => setQueryParamsHolder((prev) => ({ ...prev, statsPeriodAfter: formatDateOnInputChange(value, "date") as Date }))}
								width="100%"
							/>
							<DateInput
								label="ANTES DE"
								value={formatDateForInputValue(queryParamsHolder.statsPeriodBefore)}
								handleChange={(value) =>
									setQueryParamsHolder((prev) => ({ ...prev, statsPeriodBefore: formatDateOnInputChange(value, "date", "end") as Date }))
								}
								width="100%"
							/>
						</div>
					</div>
					<Button
						onClick={() => {
							updateQueryParams({ ...queryParamsHolder });
							closeMenu();
						}}
					>
						FILTRAR
					</Button>
				</div>
			</SheetContent>
		</Sheet>
	);
}

export default SalesTeamFilterMenu;
