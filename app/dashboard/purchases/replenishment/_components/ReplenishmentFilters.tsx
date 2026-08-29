"use client";

import MultipleSelectInput from "@/components/Inputs/MultipleSelectInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { TReplenishmentFilters } from "@/lib/queries/replenishment";
import { cn } from "@/lib/utils";
import { RotateCcw, Search } from "lucide-react";
import { REPLENISHMENT_STATUS_META, REPLENISHMENT_STATUS_ORDER } from "./replenishment-formatting";

// Atalhos de cobertura. São o filtro que a compradora usa de verdade — "me mostre o que tem menos
// de 20 dias" — e ficam como botões porque digitar o número toda vez é o que fazia a análise ser
// refeita na planilha em vez de na tela.
const COVERAGE_PRESETS = [7, 15, 20, 30, 45] as const;

type ReplenishmentFiltersProps = {
	filters: TReplenishmentFilters;
	grupos: string[];
	fornecedores: { id: string; nome: string }[];
	updateFilters: (filters: Partial<TReplenishmentFilters>) => void;
	resetFilters: () => void;
};

export function ReplenishmentFilters({ filters, grupos, fornecedores, updateFilters, resetFilters }: ReplenishmentFiltersProps) {
	return (
		<div className="flex w-full flex-col gap-3">
			<div className="flex w-full flex-col items-stretch gap-2 lg:flex-row lg:items-center">
				<div className="relative grow">
					<Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
					<Input
						value={filters.search}
						placeholder="Pesquisar produto por nome ou código..."
						onChange={(event) => updateFilters({ search: event.target.value })}
						className="rounded-xl pl-9"
					/>
				</div>
				<MultipleSelectInput
					label="Fornecedor"
					showLabel={false}
					selected={filters.supplierIds}
					options={fornecedores.map((fornecedor) => ({ id: fornecedor.id, value: fornecedor.id, label: fornecedor.nome }))}
					handleChange={(value) => updateFilters({ supplierIds: value })}
					resetOptionLabel="TODOS OS FORNECEDORES"
					onReset={() => updateFilters({ supplierIds: [] })}
					holderClassName="lg:w-56"
				/>
				<MultipleSelectInput
					label="Grupo"
					showLabel={false}
					selected={filters.groups}
					options={grupos.map((grupo) => ({ id: grupo, value: grupo, label: grupo }))}
					handleChange={(value) => updateFilters({ groups: value })}
					resetOptionLabel="TODOS OS GRUPOS"
					onReset={() => updateFilters({ groups: [] })}
					holderClassName="lg:w-52"
				/>
				<MultipleSelectInput
					label="Situação"
					showLabel={false}
					selected={filters.status}
					options={REPLENISHMENT_STATUS_ORDER.map((status) => ({ id: status, value: status, label: REPLENISHMENT_STATUS_META[status].label }))}
					handleChange={(value) => updateFilters({ status: value as TReplenishmentFilters["status"] })}
					resetOptionLabel="TODAS AS SITUAÇÕES"
					onReset={() => updateFilters({ status: [] })}
					holderClassName="lg:w-48"
				/>
				<Button variant="ghost" size="sm" onClick={resetFilters} className="shrink-0" title="Limpar todos os filtros">
					<RotateCcw className="h-4 w-4" />
					LIMPAR
				</Button>
			</div>

			<div className="flex w-full flex-wrap items-center gap-x-4 gap-y-2">
				<div className="flex flex-wrap items-center gap-1.5">
					<span className="text-muted-foreground text-[0.65rem] font-bold tracking-wider uppercase">Cobertura até</span>
					{COVERAGE_PRESETS.map((dias) => (
						<Button
							key={dias}
							variant={filters.coberturaMaximaDias === dias ? "default" : "outline"}
							size="sm"
							className={cn("h-7 rounded-full px-3 text-[0.7rem] font-bold")}
							onClick={() => updateFilters({ coberturaMaximaDias: filters.coberturaMaximaDias === dias ? null : dias, coberturaMinimaDias: null })}
						>
							{dias} DIAS
						</Button>
					))}
					<Input
						type="number"
						min={0}
						placeholder="outro"
						value={
							filters.coberturaMaximaDias != null && !COVERAGE_PRESETS.includes(filters.coberturaMaximaDias as never) ? filters.coberturaMaximaDias : ""
						}
						onChange={(event) => updateFilters({ coberturaMaximaDias: event.target.value ? Number(event.target.value) : null, coberturaMinimaDias: null })}
						className="h-7 w-20 rounded-full text-center text-[0.7rem] font-bold"
						aria-label="Cobertura máxima em dias"
					/>
				</div>

				<MultipleSelectInput
					label="Curva"
					showLabel={false}
					selected={filters.abcClasses}
					options={[
						{ id: "A", value: "A", label: "Curva A" },
						{ id: "B", value: "B", label: "Curva B" },
						{ id: "C", value: "C", label: "Curva C" },
					]}
					handleChange={(value) => updateFilters({ abcClasses: value as TReplenishmentFilters["abcClasses"] })}
					resetOptionLabel="TODAS AS CURVAS"
					onReset={() => updateFilters({ abcClasses: [] })}
					holderClassName="w-40"
				/>

				<label className="flex cursor-pointer items-center gap-2 text-[0.7rem] font-bold tracking-tight">
					<Switch checked={filters.apenasSugestoes} onCheckedChange={(checked) => updateFilters({ apenasSugestoes: checked })} />
					SÓ COM SUGESTÃO
				</label>
				<label
					className="flex cursor-pointer items-center gap-2 text-[0.7rem] font-bold tracking-tight"
					title="Itens de reposição mantidos de propósito com giro baixo (peças, garantia)"
				>
					<Switch checked={filters.incluirSobressalentes} onCheckedChange={(checked) => updateFilters({ incluirSobressalentes: checked })} />
					INCLUIR SOBRESSALENTES
				</label>
			</div>
		</div>
	);
}
