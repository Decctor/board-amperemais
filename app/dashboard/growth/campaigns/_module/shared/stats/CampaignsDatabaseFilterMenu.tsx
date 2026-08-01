import type { TGetCampaignsInput } from "@/app/api/campaigns/route";
import DateInput from "@/components/Inputs/DateInput";
import MultipleSelectInput from "@/components/Inputs/MultipleSelectInput";
import TextInput from "@/components/Inputs/TextInput";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatDateForInputValue, formatDateOnInputChange } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import { CampaignTriggerTypeOptions } from "@/utils/select-options";
import { useState } from "react";

type CampaignsDatabaseFilterMenuProps = {
	filters: Omit<TGetCampaignsInput, "id">;
	updateFilters: (filters: Partial<Omit<TGetCampaignsInput, "id">>) => void;
	closeMenu: () => void;
};

const BOOLEAN_OPTIONS = [
	{
		key: "activeOnly",
		label: "APENAS ATIVAS",
	},
	{
		key: "actionWhatsappOnly",
		label: "COM AÇÃO WHATSAPP",
	},
	{
		key: "cashbackGenerationOnly",
		label: "COM GERAÇÃO DE CASHBACK",
	},
] as const;

export default function CampaignsDatabaseFilterMenu({ filters, updateFilters, closeMenu }: CampaignsDatabaseFilterMenuProps) {
	const [filtersHolder, setFiltersHolder] = useState<Omit<TGetCampaignsInput, "id">>(filters);

	return (
		<Sheet open onOpenChange={closeMenu}>
			<SheetContent>
				<div className="flex h-full w-full flex-col">
					<SheetHeader>
						<SheetTitle>FILTRAR CAMPANHAS</SheetTitle>
						<SheetDescription>Escolha aqui os parâmetros para filtrar as campanhas.</SheetDescription>
					</SheetHeader>

					<div className="scrollbar-thin scrollbar-track-primary/10 scrollbar-thumb-primary/30 flex h-full flex-col gap-y-4 overflow-y-auto overscroll-y-auto p-2">
						<div className="flex w-full flex-col gap-2">
							<TextInput
								label="PESQUISA"
								value={filtersHolder.search ?? ""}
								placeholder="Preencha aqui a pesquisa para filtro."
								handleChange={(value) => setFiltersHolder((prev) => ({ ...prev, search: value }))}
							/>
						</div>

						<div className="flex w-full flex-col gap-2">
							<MultipleSelectInput
								label="TIPOS DE GATILHO"
								selected={filtersHolder.triggerTypes ?? []}
								options={CampaignTriggerTypeOptions}
								handleChange={(value) =>
									setFiltersHolder((prev) => ({
										...prev,
										triggerTypes: value as TGetCampaignsInput["triggerTypes"],
									}))
								}
								onReset={() => setFiltersHolder((prev) => ({ ...prev, triggerTypes: [] }))}
								resetOptionLabel="TODOS"
							/>
						</div>

						<div className="flex w-full flex-col gap-2">
							<h1 className="w-full text-center text-[0.65rem] tracking-tight text-foreground/80">OUTROS FILTROS</h1>
							<div className="flex flex-wrap items-center justify-center gap-2">
								{BOOLEAN_OPTIONS.map((option) => (
									<button
										key={option.key}
										type="button"
										className={cn("rounded-lg px-2 py-1 text-xs tracking-tight duration-300 ease-in-out", {
											"bg-primary/50 text-foreground-foreground hover:bg-primary/40": Boolean(filtersHolder[option.key]),
											"bg-transparent text-foreground hover:bg-primary/20": !filtersHolder[option.key],
										})}
										onClick={() =>
											setFiltersHolder((prev) => ({
												...prev,
												[option.key]: !prev[option.key],
											}))
										}
									>
										{option.label}
									</button>
								))}
							</div>
						</div>

						<div className="flex w-full flex-col gap-2">
							<h1 className="w-full text-center text-[0.65rem] tracking-tight text-foreground/80">FILTRO DAS ESTATÍSTICAS POR PERÍODO</h1>
							<DateInput
								label="DEPOIS DE"
								value={formatDateForInputValue(filtersHolder.statsPeriodAfter)}
								handleChange={(value) =>
									setFiltersHolder((prev) => ({
										...prev,
										statsPeriodAfter: formatDateOnInputChange(value, "date") as Date,
									}))
								}
							/>
							<DateInput
								label="ANTES DE"
								value={formatDateForInputValue(filtersHolder.statsPeriodBefore)}
								handleChange={(value) =>
									setFiltersHolder((prev) => ({
										...prev,
										statsPeriodBefore: formatDateOnInputChange(value, "date", "end") as Date,
									}))
								}
							/>
						</div>
					</div>

					<Button
						onClick={() => {
							updateFilters({ ...filtersHolder });
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
