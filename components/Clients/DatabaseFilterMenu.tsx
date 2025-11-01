import React, { useState } from "react";

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { TClientSearchQueryParams } from "@/schemas/clients";
import TextInput from "../Inputs/TextInput";

import { formatDateForInputValue, formatDateOnInputChange } from "@/lib/formatting";
import DateInput from "../Inputs/DateInput";
import { Button } from "../ui/button";

type ClientsDatabaseFilterMenuProps = {
	queryParams: TClientSearchQueryParams;
	updateQueryParams: (params: Partial<TClientSearchQueryParams>) => void;
	closeMenu: () => void;
};
function ClientsDatabaseFilterMenu({ queryParams, updateQueryParams, closeMenu }: ClientsDatabaseFilterMenuProps) {
	const [queryParamsHolder, setQueryParamsHolder] = useState<TClientSearchQueryParams>(queryParams);

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
								label="NOME"
								value={queryParamsHolder.name}
								placeholder={"Preenha aqui o nome do cliente para filtro."}
								handleChange={(value) => setQueryParamsHolder((prev) => ({ ...prev, name: value }))}
								width={"100%"}
							/>
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

export default ClientsDatabaseFilterMenu;
