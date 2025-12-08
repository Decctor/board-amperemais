import type { TGetPartnersInput } from "@/app/api/partners/route";
import { formatDateForInputValue, formatDateOnInputChange } from "@/lib/formatting";
import { useSaleQueryFilterOptions } from "@/lib/queries/stats/utils";
import { useState } from "react";
import DateInput from "../Inputs/DateInput";
import MultipleSelectInput from "../Inputs/MultipleSelectInput";
import NumberInput from "../Inputs/NumberInput";
import TextInput from "../Inputs/TextInput";
import { Button } from "../ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../ui/sheet";

type PartnersFilterMenuProps = {
	queryParams: TGetPartnersInput;
	updateQueryParams: (params: Partial<TGetPartnersInput>) => void;
	closeMenu: () => void;
};
function PartnersFilterMenu({ queryParams, updateQueryParams, closeMenu }: PartnersFilterMenuProps) {
	const [queryParamsHolder, setQueryParamsHolder] = useState<TGetPartnersInput>(queryParams);
	const { data: filterOptions } = useSaleQueryFilterOptions();

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
						<SheetTitle>FILTRAR PARCEIROS</SheetTitle>
						<SheetDescription>Escolha aqui parâmetros para filtrar o banco de parceiros.</SheetDescription>
					</SheetHeader>

					<div className="flex h-full flex-col gap-y-4 overflow-y-auto overscroll-y-auto p-2 scrollbar-thin scrollbar-track-primary/10 scrollbar-thumb-primary/30">
						<div className="flex w-full flex-col gap-2">
							<TextInput
								label="PESQUISA"
								value={queryParamsHolder.search ?? ""}
								placeholder={"Preenha aqui o filtro de pesquisa..."}
								handleChange={(value) => setQueryParamsHolder((prev) => ({ ...prev, search: value }))}
								width={"100%"}
							/>
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
						<div className="flex w-full flex-col gap-2">
							<h1 className="w-full text-xs tracking-tight text-primary">FILTRO DAS ESTATISTICAS POR VALOR TOTAL DE VENDAS</h1>
							<NumberInput
								label="VALOR > QUE"
								placeholder="Preencha aqui o valor para o filtro de mais compras que..."
								value={queryParamsHolder.statsTotalMin ?? null}
								handleChange={(value) => setQueryParamsHolder((prev) => ({ ...prev, statsTotalMin: value }))}
								width="100%"
							/>
							<NumberInput
								label="VALOR < QUE"
								placeholder="Preencha aqui o valor para o filtro de menos compras que..."
								value={queryParamsHolder.statsTotalMax ?? null}
								handleChange={(value) => setQueryParamsHolder((prev) => ({ ...prev, statsTotalMax: value }))}
								width="100%"
							/>
						</div>
						<div className="flex w-full flex-col gap-2">
							<h1 className="w-full text-xs tracking-tight text-primary">OUTROS FILTROS DAS ESTASTÍCAS</h1>
							<MultipleSelectInput
								label="NATUREZA DA VENDA"
								selected={queryParamsHolder.statsSaleNatures ?? []}
								options={filterOptions?.saleNatures || []}
								handleChange={(value) => setQueryParamsHolder((prev) => ({ ...prev, statsSaleNatures: value as string[] }))}
								onReset={() => setQueryParamsHolder((prev) => ({ ...prev, statsSaleNatures: [] }))}
								selectedItemLabel="NENHUMA DEFINIDA"
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

export default PartnersFilterMenu;
