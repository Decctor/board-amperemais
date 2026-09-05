"use client";

import type { TGetFiscalTaxGroupsOutputDefault } from "@/app/api/fiscal/tax-groups/route";
import ErrorComponent from "@/components/Layouts/ErrorComponent";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import ControlFiscalTaxGroup from "@/components/Modals/FiscalTaxGroup/ControlFiscalTaxGroup";
import NewFiscalTaxGroup from "@/components/Modals/FiscalTaxGroup/NewFiscalTaxGroup";
import { Button } from "@/components/ui/button";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { getErrorMessage } from "@/lib/errors";
import { useFiscalTaxGroups } from "@/lib/queries/fiscal";
import { useQueryClient } from "@tanstack/react-query";
import { Percent, Plus } from "lucide-react";
import { useState } from "react";

export function CompanyFiscalTaxGroups() {
	const queryClient = useQueryClient();
	const [newTaxGroupMenuIsOpen, setNewTaxGroupMenuIsOpen] = useState(false);
	const [editingTaxGroupId, setEditingTaxGroupId] = useState<string | null>(null);
	const { data, queryKey, isLoading, isError, isSuccess, error } = useFiscalTaxGroups();

	const handleOnMutate = async () => await queryClient.cancelQueries({ queryKey: queryKey });
	const handleOnSettled = async () => await queryClient.invalidateQueries({ queryKey: queryKey });
	return (
		<SectionWrapper title="GRUPOS TRIBUTÁRIOS" icon={<Percent className="h-4 w-4" />}>
			<span id="fiscal-section-tax-groups" />
			{isLoading ? <LoadingComponent /> : null}
			{isError ? <ErrorComponent msg={getErrorMessage(error)} /> : null}
			{isSuccess ? (
				data.length > 0 ? (
					<div className="flex flex-col gap-2 w-full">
						{data.map((taxGroup) => (
							<CompanyFiscalTaxGroup key={taxGroup.id} taxGroup={taxGroup} handleEditClick={() => setEditingTaxGroupId(taxGroup.id)} />
						))}
					</div>
				) : (
					<div className="flex items-center justify-center py-6">
						<p className="text-sm text-muted-foreground">Nenhum grupo tributário encontrado.</p>
					</div>
				)
			) : null}
			<div className="w-full flex items-center justify-center">
				<Button variant={"ghost"} size={"fit"} className="flex items-center gap-1 px-2 py-1 text-xs" onClick={() => setNewTaxGroupMenuIsOpen(true)}>
					<Plus className="w-4 h-4 min-w-4 min-h-4" />
					ADICIONAR
				</Button>
			</div>
			{newTaxGroupMenuIsOpen ? (
				<NewFiscalTaxGroup closeModal={() => setNewTaxGroupMenuIsOpen(false)} callbacks={{ onMutate: handleOnMutate, onSettled: handleOnSettled }} />
			) : null}
			{editingTaxGroupId ? (
				<ControlFiscalTaxGroup
					taxGroupId={editingTaxGroupId}
					closeModal={() => setEditingTaxGroupId(null)}
					callbacks={{ onMutate: handleOnMutate, onSettled: handleOnSettled }}
				/>
			) : null}
		</SectionWrapper>
	);
}

type CompanyFiscalTaxGroupProps = {
	taxGroup: TGetFiscalTaxGroupsOutputDefault[number];
	handleEditClick: () => void;
};
function CompanyFiscalTaxGroup({ taxGroup, handleEditClick }: CompanyFiscalTaxGroupProps) {
	const regrasAtivas = taxGroup.regras?.length ?? 0;
	return (
		<button
			type="button"
			onClick={handleEditClick}
			className="w-full flex flex-col gap-1 rounded-lg border p-3 text-left transition hover:border-primary/40"
		>
			<div className="w-full flex items-center justify-between gap-2">
				<h3 className="text-sm font-bold tracking-tight uppercase">{taxGroup.nome}</h3>
				<span className={`text-[10px] font-bold uppercase tracking-tight ${taxGroup.ativo ? "text-green-600" : "text-muted-foreground"}`}>
					{taxGroup.ativo ? "ATIVO" : "INATIVO"}
				</span>
			</div>
			<div className="w-full flex items-center gap-2 flex-wrap">
				<span className="text-xs font-medium tracking-tight text-primary/70">CSOSN {taxGroup.csosn}</span>
				<span className="text-xs font-medium tracking-tight text-primary/70">PIS {taxGroup.cstPis}</span>
				<span className="text-xs font-medium tracking-tight text-primary/70">COFINS {taxGroup.cstCofins}</span>
				{taxGroup.temSubstituicaoTributaria ? <span className="text-xs font-medium tracking-tight text-amber-600">ICMS-ST</span> : null}
				{regrasAtivas > 0 ? <span className="text-xs font-medium tracking-tight text-primary/70">{regrasAtivas} regra(s)</span> : null}
			</div>
			{taxGroup.descricao ? <p className="text-xs text-muted-foreground">{taxGroup.descricao}</p> : null}
		</button>
	);
}
