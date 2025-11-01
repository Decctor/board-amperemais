import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatDateOnInputChange } from "@/lib/formatting";
import { formatDateForInputValue } from "@/lib/formatting";
import { useSaleQueryFilterOptions } from "@/lib/queries/stats/utils";
import type { TClientSearchQueryParams } from "@/schemas/clients";
import { TUserSession } from "@/schemas/users";
import { RFMLabels } from "@/utils/rfm";
import { CustomersAcquisitionChannels } from "@/utils/select-options";
import React, { useState } from "react";
import DateInput from "../Inputs/DateInput";
import MultipleSelectInput from "../Inputs/MultipleSelectInput";
import NumberInput from "../Inputs/NumberInput";
import MultipleSalesSelectInput from "../Inputs/SelectMultipleSalesInput";
import TextInput from "../Inputs/TextInput";
import { Button } from "../ui/button";

type RFMAnalysisQueryParamsMenuProps = {
	queryParams: TClientSearchQueryParams;
	updateQueryParams: (newParams: Partial<TClientSearchQueryParams>) => void;
	closeMenu: () => void;
};
function RFMAnalysisQueryParamsMenu({ queryParams, updateQueryParams, closeMenu }: RFMAnalysisQueryParamsMenuProps) {
	const [queryParamsHolder, setQueryParamsHolder] = useState<TClientSearchQueryParams>(queryParams);
	const { data: filterOptions } = useSaleQueryFilterOptions();

	return (
		<Sheet open onOpenChange={closeMenu}>
			<SheetContent>
				<div className="flex h-full w-full flex-col">
					<SheetHeader>
						<SheetTitle>FILTRAR CLIENTES</SheetTitle>
						<SheetDescription>Escolha aqui parâmetros para filtrar os clientes.</SheetDescription>
					</SheetHeader>
					<div className="flex h-full flex-col gap-y-4 overflow-y-auto overscroll-y-auto p-2 scrollbar-thin scrollbar-track-primary/10 scrollbar-thumb-primary/30">
						<div className="flex w-full flex-col gap-2">
							<TextInput
								label="NOME"
								value={queryParamsHolder.name}
								placeholder={"Preenha aqui o nome do cliente para filtro."}
								handleChange={(value) => setQueryParamsHolder((prev) => ({ ...prev, name: value }))}
								width={"100%"}
							/>
							<TextInput
								label="TELEFONE"
								value={queryParamsHolder.phone}
								placeholder={"Preenha aqui o telefone do cliente para filtro."}
								handleChange={(value) => setQueryParamsHolder((prev) => ({ ...prev, phone: value }))}
								width={"100%"}
							/>

							<MultipleSelectInput
								label="CANAL DE AQUISIÇÃO"
								selected={queryParamsHolder.acquisitionChannels}
								options={CustomersAcquisitionChannels.map((s, index) => ({ id: index + 1, label: s.label, value: s.value })) || []}
								handleChange={(value) =>
									setQueryParamsHolder((prev) => ({
										...prev,
										acquisitionChannels: value as string[],
									}))
								}
								selectedItemLabel="CANAL DE AQUISIÇÃO"
								onReset={() => setQueryParamsHolder((prev) => ({ ...prev, acquisitionChannels: [] }))}
								width="100%"
							/>
							<MultipleSelectInput
								label="CATEGORIA DE CLIENTES"
								selected={queryParamsHolder.rfmTitles}
								options={RFMLabels.map((s, index) => ({ id: index + 1, label: s.text, value: s.text })) || []}
								handleChange={(value) =>
									setQueryParamsHolder((prev) => ({
										...prev,
										rfmTitles: value as string[],
									}))
								}
								selectedItemLabel="CATEGORIA DE CLIENTES"
								onReset={() => setQueryParamsHolder((prev) => ({ ...prev, rfmTitles: [] }))}
								width="100%"
							/>
						</div>
						<h1 className="w-full text-center text-[0.75rem] tracking-tight text-primary/80">FILTRO PARA COMPRAS</h1>
						<MultipleSalesSelectInput
							label="VENDAS EXCLUÍDAS"
							selected={queryParamsHolder.excludedSalesIds}
							handleChange={(value) =>
								setQueryParamsHolder((prev) => ({
									...prev,
									excludedSalesIds: value as string[],
								}))
							}
							selectedItemLabel="VENDAS EXCLUÍDAS"
							onReset={() => setQueryParamsHolder((prev) => ({ ...prev, excludedSalesIds: [] }))}
							width="100%"
						/>
						<MultipleSelectInput
							label="NATUREZA DA VENDA"
							selected={queryParamsHolder.saleNatures}
							options={filterOptions?.saleNatures.map((s, index) => ({ id: index + 1, label: s, value: s })) || []}
							handleChange={(value) =>
								setQueryParamsHolder((prev) => ({
									...prev,
									saleNatures: value as TClientSearchQueryParams["saleNatures"],
								}))
							}
							selectedItemLabel="NATUREZA DA VENDA"
							onReset={() => setQueryParamsHolder((prev) => ({ ...prev, saleNatures: [] }))}
							width="100%"
						/>
						<div className="flex w-full flex-col gap-2">
							<h1 className="w-full text-center text-[0.65rem] tracking-tight text-primary/80">FILTRO POR INTERVALO DE QUANTIDADE</h1>
							<div className="flex w-full flex-col items-center gap-2 lg:flex-row">
								<div className="w-full lg:w-1/2">
									<NumberInput
										label="VALOR > QUE"
										value={queryParamsHolder.total.min || null}
										handleChange={(value) => setQueryParamsHolder((prev) => ({ ...prev, total: { ...prev.total, min: value } }))}
										placeholder="Preencha aqui o valor para o filtro de mais quantidade que..."
										width="100%"
									/>
								</div>
								<div className="w-full lg:w-1/2">
									<NumberInput
										label="VALOR < QUE"
										value={queryParamsHolder.total.max || null}
										handleChange={(value) => setQueryParamsHolder((prev) => ({ ...prev, total: { ...prev.total, max: value } }))}
										placeholder="Preencha aqui o valor para o filtro de menos quantidade que..."
										width="100%"
									/>
								</div>
							</div>
						</div>
						<div className="flex w-full flex-col gap-2">
							<h1 className="w-full text-center text-[0.65rem] tracking-tight text-primary/80">FILTRO POR PERÍODO</h1>
							<DateInput
								label="DEPOIS DE"
								value={formatDateForInputValue(queryParamsHolder.period.after)}
								handleChange={(value) =>
									setQueryParamsHolder((prev) => ({ ...prev, period: { ...prev.period, after: formatDateOnInputChange(value, "string") as string } }))
								}
								width="100%"
							/>
							<DateInput
								label="ANTES DE"
								value={formatDateForInputValue(queryParamsHolder.period.before)}
								handleChange={(value) =>
									setQueryParamsHolder((prev) => ({ ...prev, period: { ...prev.period, before: formatDateOnInputChange(value, "string") as string } }))
								}
								width="100%"
							/>
						</div>
					</div>
					<Button
						onClick={() => {
							updateQueryParams({ ...queryParamsHolder, page: 1 });
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

export default RFMAnalysisQueryParamsMenu;
