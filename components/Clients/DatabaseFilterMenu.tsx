import React, { useState } from "react";

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import TextInput from "../Inputs/TextInput";

import { formatDateForInputValue, formatDateOnInputChange } from "@/lib/formatting";
import { useSaleQueryFilterOptions } from "@/lib/queries/stats/utils";
import type { TGetClientsInput } from "@/pages/api/clients";
import { RFMLabels } from "@/utils/rfm";
import { CustomersAcquisitionChannels } from "@/utils/select-options";
import DateInput from "../Inputs/DateInput";
import MultipleSelectInput from "../Inputs/MultipleSelectInput";
import NumberInput from "../Inputs/NumberInput";
import { Button } from "../ui/button";

type ClientsDatabaseFilterMenuProps = {
	filters: TGetClientsInput;
	updateFilters: (filters: Partial<TGetClientsInput>) => void;
	closeMenu: () => void;
};
function ClientsDatabaseFilterMenu({ filters, updateFilters, closeMenu }: ClientsDatabaseFilterMenuProps) {
	const [filtersHolder, setFiltersHolder] = useState<TGetClientsInput>(filters);
	const { data: filterOptions } = useSaleQueryFilterOptions();

	return (
		<Sheet open onOpenChange={closeMenu}>
			<SheetContent>
				<div className="flex h-full w-full flex-col">
					<SheetHeader>
						<SheetTitle>FILTRAR CLIENTES</SheetTitle>
						<SheetDescription>Escolha aqui parâmetros para filtrar o banco de clientes.</SheetDescription>
					</SheetHeader>

					<div className="scrollbar-thin scrollbar-track-primary/10 scrollbar-thumb-primary/30 flex h-full flex-col gap-y-4 overflow-y-auto overscroll-y-auto p-2">
						<div className="flex w-full flex-col gap-2">
							<TextInput
								label="PESQUISA"
								value={filtersHolder.search ?? ""}
								placeholder={"Preenha aqui o nome do cliente para filtro."}
								handleChange={(value) => setFiltersHolder((prev) => ({ ...prev, search: value }))}
								width={"100%"}
							/>
						</div>

						<div className="flex w-full flex-col gap-2">
							<h1 className="w-full text-center text-[0.65rem] tracking-tight text-primary/80">FILTRO DAS ESTASTÍCAS POR PERÍODO</h1>
							<DateInput
								label="DEPOIS DE"
								value={formatDateForInputValue(filtersHolder.statsPeriodAfter)}
								handleChange={(value) => setFiltersHolder((prev) => ({ ...prev, statsPeriodAfter: formatDateOnInputChange(value, "date") as Date }))}
								width="100%"
							/>
							<DateInput
								label="ANTES DE"
								value={formatDateForInputValue(filtersHolder.statsPeriodBefore)}
								handleChange={(value) => setFiltersHolder((prev) => ({ ...prev, statsPeriodBefore: formatDateOnInputChange(value, "date") as Date }))}
								width="100%"
							/>
						</div>
						<div className="flex w-full flex-col gap-2">
							<h1 className="w-full text-center text-[0.65rem] tracking-tight text-primary/80">FILTRO DAS ESTASTÍCAS POR TOTAIS DE COMPRAS</h1>
							<NumberInput
								label="VALOR > QUE"
								placeholder="Preencha aqui o valor para o filtro de mais compras que..."
								value={filtersHolder.statsTotalMin ?? null}
								handleChange={(value) => setFiltersHolder((prev) => ({ ...prev, statsTotalMin: value }))}
								width="100%"
							/>
							<NumberInput
								label="VALOR < QUE"
								placeholder="Preencha aqui o valor para o filtro de menos compras que..."
								value={filtersHolder.statsTotalMax ?? null}
								handleChange={(value) => setFiltersHolder((prev) => ({ ...prev, statsTotalMax: value }))}
								width="100%"
							/>
						</div>
						<div className="flex w-full flex-col gap-2">
							<h1 className="w-full text-center text-[0.65rem] tracking-tight text-primary/80">OUTROS FILTROS DAS ESTASTÍCAS</h1>

							<MultipleSelectInput
								label="NATUREZA DA VENDA"
								selected={filtersHolder.statsSaleNatures ?? []}
								options={filterOptions?.saleNatures || []}
								handleChange={(value) => setFiltersHolder((prev) => ({ ...prev, statsSaleNatures: value as string[] }))}
								onReset={() => setFiltersHolder((prev) => ({ ...prev, statsSaleNatures: [] }))}
								resetOptionLabel="NENHUMA DEFINIDA"
								width="100%"
							/>
							<MultipleSelectInput
								label="CANAIS DE AQUISIÇÃO"
								selected={filtersHolder.acquisitionChannels ?? []}
								options={CustomersAcquisitionChannels}
								handleChange={(value) => setFiltersHolder((prev) => ({ ...prev, acquisitionChannels: value as string[] }))}
								onReset={() => setFiltersHolder((prev) => ({ ...prev, acquisitionChannels: [] }))}
								resetOptionLabel="NENHUM DEFINIDO"
								width="100%"
							/>
							<MultipleSelectInput
								label="TÍTULOS DE SEGMENTAÇÃO"
								selected={filtersHolder.segmentationTitles ?? []}
								options={RFMLabels.map((s, index) => ({ id: index + 1, label: s.text, value: s.text })) || []}
								handleChange={(value) => setFiltersHolder((prev) => ({ ...prev, segmentationTitles: value as string[] }))}
								onReset={() => setFiltersHolder((prev) => ({ ...prev, segmentationTitles: [] }))}
								resetOptionLabel="NENHUM DEFINIDO"
								width="100%"
							/>
						</div>
					</div>
					<Button
						onClick={() => {
							updateFilters({ ...filtersHolder, page: 1 });
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

export default ClientsDatabaseFilterMenu;
