import SelectInput from "@/components/Inputs/SelectInput";
import FiltersBlock from "@/components/Modals/Internal/CampaignAudiences/Blocks/Filters";
import { NewCampaignAudience } from "@/components/Modals/Internal/CampaignAudiences/NewCampaignAudience";
import { Button } from "@/components/ui/button";
import { useCampaignAudiences } from "@/lib/queries/campaign-audiences";
import type { TFilterTree } from "@/schemas/campaign-audiences";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import type { TFilterNodeConfigComponentProps } from "./types";

const DEFAULT_FILTER_TREE: TFilterTree = {
	logica: "AND",
	condicoes: [],
	grupos: [],
};

export function FilterConfig({ node, updateConfig }: TFilterNodeConfigComponentProps) {
	switch (node.subtipo) {
		case "FILTRAR-POR-PUBLICO":
			return <FilterByAudienceConfig node={node} updateConfig={updateConfig} />;

		case "FILTRAR-INLINE": {
			const filtros = node.configuracao.filtros ?? DEFAULT_FILTER_TREE;
			return <FiltersBlock filtros={filtros} setFilters={(value) => updateConfig({ filtros: value })} />;
		}

		default:
			return <p className="text-xs text-muted-foreground italic">Filtro sem configuracao adicional.</p>;
	}
}

function FilterByAudienceConfig({
	node,
	updateConfig,
}: {
	node: Extract<TFilterNodeConfigComponentProps["node"], { subtipo: "FILTRAR-POR-PUBLICO" }>;
	updateConfig: TFilterNodeConfigComponentProps["updateConfig"];
}) {
	const queryClient = useQueryClient();
	const [showCreateAudience, setShowCreateAudience] = useState(false);

	const { data: audiencesData, queryKey } = useCampaignAudiences({ initialFilters: { search: "", page: 1 } });

	const options = (audiencesData?.audiences ?? []).map((audience) => ({
		id: audience.id,
		value: audience.id,
		label: audience.titulo,
	}));

	return (
		<>
			{showCreateAudience && (
				<NewCampaignAudience
					closeModal={() => setShowCreateAudience(false)}
					callbacks={{
						onSuccess: ({ insertedId }) => {
							if (insertedId) updateConfig({ publicoId: insertedId });
						},
						onSettled: () => {
							queryClient.invalidateQueries({ queryKey });
						},
					}}
				/>
			)}

			<div className="flex flex-col gap-2">
				<div className="flex items-end gap-2">
					<div className="flex-1 min-w-0">
						<SelectInput
							label="PUBLICO"
							value={node.configuracao.publicoId}
							handleChange={(value) => updateConfig({ publicoId: value })}
							onReset={() => updateConfig({ publicoId: "" })}
							resetOptionLabel="SELECIONE O PUBLICO"
							options={options}
						/>
					</div>
					<Button type="button" variant="outline" size="sm" className="mb-0.5 gap-1.5 shrink-0" onClick={() => setShowCreateAudience(true)}>
						<Plus className="w-3.5 h-3.5" />
						CRIAR
					</Button>
				</div>

				<p className="text-xs text-muted-foreground">Selecione um publico salvo ou crie um novo sem sair do fluxo.</p>
			</div>
		</>
	);
}
