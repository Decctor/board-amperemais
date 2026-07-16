"use client";

import ErrorComponent from "@/components/Layouts/ErrorComponent";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import { Button } from "@/components/ui/button";
import type { TIfoodOptionGroupDTO } from "@/lib/integrations/ifood/catalog-types";
import { useIfoodOptionGroups } from "@/lib/queries/ifood";
import { useQueryClient } from "@tanstack/react-query";
import { Layers, Settings2 } from "lucide-react";
import { useState } from "react";
import { ControlIfoodOptionGroup } from "./ControlIfoodOptionGroup";

type OptionGroupsSectionProps = {
	merchantId: string;
	canManage: boolean;
};

/** Seção de grupos de complementos da loja, com gestão via modal. */
export function OptionGroupsSection({ merchantId, canManage }: OptionGroupsSectionProps) {
	const queryClient = useQueryClient();
	const { data: optionGroups, isLoading, isError, error, queryKey } = useIfoodOptionGroups({ merchantId });
	const [selectedGroup, setSelectedGroup] = useState<TIfoodOptionGroupDTO | null>(null);

	return (
		<div className="flex w-full flex-col gap-3">
			<h3 className="text-xs font-medium tracking-tight uppercase">Grupos de complementos</h3>
			{isLoading ? (
				<LoadingComponent />
			) : isError ? (
				<ErrorComponent msg={error instanceof Error ? error.message : "Erro ao carregar os grupos de complementos."} />
			) : (optionGroups ?? []).length === 0 ? (
				<div className="flex w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border p-6 text-center">
					<Layers className="h-5 w-5 text-muted-foreground" />
					<p className="text-sm text-muted-foreground">Nenhum grupo de complementos encontrado para esta loja.</p>
				</div>
			) : (
				<div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
					{(optionGroups ?? []).map((group) => {
						const isPaused = group.status?.toUpperCase() === "UNAVAILABLE";
						return (
							<div key={group.id} className="bg-card border-border flex w-full flex-col gap-2 rounded-xl border px-3 py-3 shadow-2xs">
								<div className="flex w-full items-center justify-between gap-2">
									<span className="truncate text-sm font-bold tracking-tight">{group.nome ?? "Grupo sem nome"}</span>
									{canManage ? (
										<Button variant="ghost" size="sm" onClick={() => setSelectedGroup(group)} title="Gerenciar grupo">
											<Settings2 className="h-4 w-4" />
										</Button>
									) : null}
								</div>
								<div className="flex items-center gap-2">
									<span className="text-xs text-muted-foreground">
										{group.opcoes.length} {group.opcoes.length === 1 ? "opção" : "opções"}
									</span>
									{isPaused ? <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[0.65rem] font-semibold text-red-600">PAUSADO</span> : null}
								</div>
							</div>
						);
					})}
				</div>
			)}

			{selectedGroup ? (
				<ControlIfoodOptionGroup
					merchantId={merchantId}
					optionGroup={selectedGroup}
					closeModal={() => setSelectedGroup(null)}
					callbacks={{ onSuccess: () => queryClient.invalidateQueries({ queryKey }) }}
				/>
			) : null}
		</div>
	);
}
