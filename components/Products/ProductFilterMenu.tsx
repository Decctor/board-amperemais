"use client";
import MultipleSelectInput from "@/components/Inputs/MultipleSelectInput";
import SelectInput from "@/components/Inputs/SelectInput";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatDateForInputValue, formatDateOnInputChange } from "@/lib/formatting";
import { useSaleQueryFilterOptions } from "@/lib/queries/stats/utils";
import type { TGetProductStatsInput } from "@/pages/api/products/stats";
import { useState } from "react";
import DateInput from "../Inputs/DateInput";

type ProductFilterMenuProps = {
	queryParams: Omit<TGetProductStatsInput, "productId">;
	updateQueryParams: (params: Partial<Omit<TGetProductStatsInput, "productId">>) => void;
	closeMenu: () => void;
};

export default function ProductFilterMenu({ queryParams, updateQueryParams, closeMenu }: ProductFilterMenuProps) {
	const [queryParamsHolder, setQueryParamsHolder] = useState(queryParams);
	const { data: filterOptions } = useSaleQueryFilterOptions();

	return (
		<Sheet open onOpenChange={closeMenu}>
			<SheetContent>
				<div className="flex h-full w-full flex-col">
					<SheetHeader>
						<SheetTitle>FILTRAR PRODUTO</SheetTitle>
						<SheetDescription>Escolha aqui parâmetros para filtrar as estatísticas do produto.</SheetDescription>
					</SheetHeader>

					<div className="flex h-full flex-col gap-y-4 overflow-y-auto overscroll-y-auto p-2 scrollbar-thin scrollbar-track-primary/10 scrollbar-thumb-primary/30">
						<div className="flex w-full flex-col gap-2">
							<MultipleSelectInput
								label="NATUREZAS DA VENDA"
								selected={queryParamsHolder.saleNatures ?? []}
								options={filterOptions?.saleNatures ?? []}
								handleChange={(value) => setQueryParamsHolder((prev) => ({ ...prev, saleNatures: value as string[] | null }))}
								onReset={() => setQueryParamsHolder((prev) => ({ ...prev, saleNatures: null }))}
								resetOptionLabel="TODAS AS NATUREZAS"
								width="100%"
							/>
							<SelectInput
								label="VENDEDOR"
								value={queryParamsHolder.sellerId ?? null}
								options={filterOptions?.sellers ?? []}
								handleChange={(value) => setQueryParamsHolder((prev) => ({ ...prev, sellerId: value as string | null }))}
								resetOptionLabel="TODOS OS VENDEDORES"
								onReset={() => setQueryParamsHolder((prev) => ({ ...prev, sellerId: null }))}
								width="100%"
							/>
							<SelectInput
								label="PARCEIRO"
								value={queryParamsHolder.partnerId ?? null}
								options={filterOptions?.partners ?? []}
								handleChange={(value) => setQueryParamsHolder((prev) => ({ ...prev, partnerId: value as string | null }))}
								resetOptionLabel="TODOS OS PARCEIROS"
								onReset={() => setQueryParamsHolder((prev) => ({ ...prev, partnerId: null }))}
								width="100%"
							/>
						</div>
						<div className="flex w-full flex-col gap-2">
							<h1 className="w-full text-xs tracking-tight text-primary">FILTRO POR PERÍODO DAS ESTASTÍCAS</h1>
							<DateInput
								label="DEPOIS DE"
								value={formatDateForInputValue(queryParamsHolder.periodAfter)}
								handleChange={(value) => setQueryParamsHolder((prev) => ({ ...prev, periodAfter: formatDateOnInputChange(value, "string") as string }))}
								width="100%"
							/>
							<DateInput
								label="ANTES DE"
								value={formatDateForInputValue(queryParamsHolder.periodBefore)}
								handleChange={(value) =>
									setQueryParamsHolder((prev) => ({ ...prev, periodBefore: formatDateOnInputChange(value, "string", "end") as string }))
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
