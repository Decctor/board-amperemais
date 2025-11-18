import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { formatDateOnInputChange } from "@/lib/formatting";
import { formatDateForInputValue } from "@/lib/formatting";
import { useSaleQueryFilterOptions } from "@/lib/queries/stats/utils";
import type { TSaleStatsGeneralQueryParams } from "@/schemas/query-params-utils";
import type { TSale } from "@/schemas/sales";
import { RFMLabels } from "@/utils/rfm";
import React, { useState } from "react";
import DateInput from "../Inputs/DateInput";
import MultipleSelectInput from "../Inputs/MultipleSelectInput";
import NumberInput from "../Inputs/NumberInput";
import MultipleSalesSelectInput from "../Inputs/SelectMultipleSalesInput";
import { Button } from "../ui/button";

type SalesQueryParamsMenuProps = {
	user: TAuthUserSession["user"];
	queryParams: TSaleStatsGeneralQueryParams;
	updateQueryParams: (newParams: Partial<TSaleStatsGeneralQueryParams>) => void;
	closeMenu: () => void;
};
function SalesQueryParamsMenu({ user, queryParams, updateQueryParams, closeMenu }: SalesQueryParamsMenuProps) {
	const [queryParamsHolder, setQueryParamsHolder] = useState<TSaleStatsGeneralQueryParams>(queryParams);
	const { data: filterOptions } = useSaleQueryFilterOptions();

	const selectableSellersIds = user.permissoes.resultados.escopo ? user.permissoes.resultados.escopo : null;

	const selectableSellers = selectableSellersIds
		? filterOptions?.sellers.filter((s) => selectableSellersIds.includes(s))
		: filterOptions?.sellers || [];
	return (
		<Sheet open onOpenChange={closeMenu}>
			<SheetContent>
				<div className="flex h-full w-full flex-col">
					<SheetHeader>
						<SheetTitle>FILTRAR RESULTADOS COMERCIAIS</SheetTitle>
						<SheetDescription>Escolha aqui parâmetros para filtrar os resultados comerciais.</SheetDescription>
					</SheetHeader>
					<div className="flex h-full flex-col gap-y-4 overflow-y-auto overscroll-y-auto p-2 scrollbar-thin scrollbar-track-primary/10 scrollbar-thumb-primary/30">
						<div className="flex w-full flex-col gap-2">
							<MultipleSelectInput
								label="VENDEDOR"
								selected={queryParamsHolder.sellers}
								options={selectableSellers?.map((s, index) => ({ id: index + 1, label: s, value: s })) || []}
								handleChange={(value) =>
									setQueryParamsHolder((prev) => ({
										...prev,
										sellers: value as string[],
									}))
								}
								selectedItemLabel="VENDEDOR"
								onReset={() => setQueryParamsHolder((prev) => ({ ...prev, sellers: [] }))}
								width="100%"
							/>
							<MultipleSelectInput
								label="GRUPO DE PRODUTOS"
								selected={queryParamsHolder.productGroups}
								options={filterOptions?.productsGroups.map((s, index) => ({ id: index + 1, label: s, value: s })) || []}
								handleChange={(value) =>
									setQueryParamsHolder((prev) => ({
										...prev,
										productGroups: value as string[],
									}))
								}
								selectedItemLabel="GRUPO DE PRODUTOS"
								onReset={() => setQueryParamsHolder((prev) => ({ ...prev, productGroups: [] }))}
								width="100%"
							/>
							<MultipleSelectInput
								label="CATEGORIA DE CLIENTES"
								selected={queryParamsHolder.clientRFMTitles}
								options={RFMLabels.map((s, index) => ({ id: index + 1, label: s.text, value: s.text })) || []}
								handleChange={(value) =>
									setQueryParamsHolder((prev) => ({
										...prev,
										clientRFMTitles: value as string[],
									}))
								}
								selectedItemLabel="CATEGORIA DE CLIENTES"
								onReset={() => setQueryParamsHolder((prev) => ({ ...prev, clientRFMTitles: [] }))}
								width="100%"
							/>
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
										saleNatures: value as TSale["natureza"][],
									}))
								}
								selectedItemLabel="NATUREZA DA VENDA"
								onReset={() => setQueryParamsHolder((prev) => ({ ...prev, saleNatures: [] }))}
								width="100%"
							/>
						</div>
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
									setQueryParamsHolder((prev) => ({ ...prev, period: { ...prev.period, after: formatDateOnInputChange(value, "string", "start") as string } }))
								}
								width="100%"
							/>
							<DateInput
								label="ANTES DE"
								value={formatDateForInputValue(queryParamsHolder.period.before)}
								handleChange={(value) =>
									setQueryParamsHolder((prev) => ({ ...prev, period: { ...prev.period, before: formatDateOnInputChange(value, "string", "end") as string } }))
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

export default SalesQueryParamsMenu;
