"use client";

import ErrorComponent from "@/components/Layouts/ErrorComponent";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/ui/section";
import type { TIfoodOptionGroupDTO } from "@/lib/integrations/ifood/catalog-types";
import { useIfoodOptionGroups } from "@/lib/queries/ifood";
import { useQueryClient } from "@tanstack/react-query";
import { Layers, Settings2, Store } from "lucide-react";
import { useState } from "react";
import { IfoodSectionEmpty } from "../shared/IfoodSectionEmpty";
import { IfoodSectionLoading } from "../shared/IfoodSectionLoading";
import { ControlIfoodOptionGroup } from "./ControlIfoodOptionGroup";

type IfoodOptionGroupsSectionProps = {
	merchantId: string | null;
	canManage: boolean;
};

/** Seção de grupos de complementos da loja, com gestão via modal. */
export function IfoodOptionGroupsSection({ merchantId, canManage }: IfoodOptionGroupsSectionProps) {
	const queryClient = useQueryClient();
	const { data: optionGroups, isLoading, isError, error, queryKey } = useIfoodOptionGroups({ merchantId });
	const [selectedGroup, setSelectedGroup] = useState<TIfoodOptionGroupDTO | null>(null);

	const groups = optionGroups ?? [];

	return (
		<Section.Root>
			<Section.Header>
				<Section.Icon>
					<Layers className="w-4 h-4 min-w-4 min-h-4" />
				</Section.Icon>
				<Section.Title>GRUPOS DE COMPLEMENTOS</Section.Title>
			</Section.Header>
			<Section.Body>
				{!merchantId ? (
					<IfoodSectionEmpty icon={Store} message="Selecione uma loja para ver os grupos de complementos." />
				) : isLoading ? (
					<IfoodSectionLoading rows={2} />
				) : isError ? (
					<ErrorComponent msg={error instanceof Error ? error.message : "Erro ao carregar os grupos de complementos."} />
				) : groups.length === 0 ? (
					<IfoodSectionEmpty icon={Layers} message="Nenhum grupo de complementos encontrado para esta loja." />
				) : (
					<div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
						{groups.map((group) => {
							const isPaused = group.status?.toUpperCase() === "UNAVAILABLE";
							return (
								<div key={group.id} className="flex w-full flex-col gap-2 rounded-lg border border-border bg-card px-3 py-2.5">
									<div className="flex w-full items-center justify-between gap-2">
										<span className="truncate text-sm font-bold tracking-tight">{group.nome ?? "Grupo sem nome"}</span>
										{canManage ? (
											<Button variant="ghost" size="icon-sm" onClick={() => setSelectedGroup(group)} title="Gerenciar grupo">
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

				{selectedGroup && merchantId ? (
					<ControlIfoodOptionGroup
						merchantId={merchantId}
						optionGroup={selectedGroup}
						closeModal={() => setSelectedGroup(null)}
						callbacks={{ onSuccess: () => queryClient.invalidateQueries({ queryKey }) }}
					/>
				) : null}
			</Section.Body>
		</Section.Root>
	);
}
