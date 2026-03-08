"use client";

import TextInput from "@/components/Inputs/TextInput";
import TextareaInput from "@/components/Inputs/TextareaInput";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { TCampaignFlowState } from "@/schemas/campaign-flows";
import { FileText, Settings, Trash2, X } from "lucide-react";
import NumberInput from "../Inputs/NumberInput";
import SelectInput from "../Inputs/SelectInput";
import { NODE_TYPE_COLORS, NODE_TYPE_LABELS, getNodeSubtype } from "./flow-node-types";
import { NodeConfigRenderer } from "./node-configs/NodeConfigRenderer";

type FlowDetailsSidebarProps = {
	flow: TCampaignFlowState["campaignFlow"];
	updateFlow: (changes: Partial<TCampaignFlowState["campaignFlow"]>) => void;
	selectedNodeIndex: number | null;
	nodes: TCampaignFlowState["nos"];
	updateNode: (args: { index: number; changes: Partial<TCampaignFlowState["nos"][number]> }) => void;
	removeNode: (index: number) => void;
	organizationId: string;
	onClose: () => void;
};

export function FlowDetailsSidebar({
	flow,
	updateFlow,
	selectedNodeIndex,
	nodes,
	updateNode,
	removeNode,
	organizationId,
	onClose,
}: FlowDetailsSidebarProps) {
	const selectedNode = selectedNodeIndex != null ? nodes[selectedNodeIndex] : null;

	return (
		<div className="w-[340px] bg-card border-l flex flex-col h-full overflow-hidden">
			<div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
				<div className="flex items-center gap-2">
					{selectedNode ? (
						<>
							<Settings className="w-4 h-4 text-muted-foreground" />
							<h3 className="text-sm font-bold tracking-tight">CONFIGURAR NO</h3>
						</>
					) : (
						<>
							<FileText className="w-4 h-4 text-muted-foreground" />
							<h3 className="text-sm font-bold tracking-tight">DETALHES</h3>
						</>
					)}
				</div>
				<Button variant="ghost" size="icon" className="w-7 h-7" onClick={onClose}>
					<X className="w-4 h-4" />
				</Button>
			</div>

			<div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
				{selectedNode ? (
					<NodeConfigSection
						node={selectedNode}
						nodeIndex={selectedNodeIndex!}
						nodes={nodes}
						updateNode={updateNode}
						removeNode={removeNode}
						organizationId={organizationId}
					/>
				) : (
					<FlowConfigSection flow={flow} updateFlow={updateFlow} />
				)}
			</div>
		</div>
	);
}

function FlowConfigSection({
	flow,
	updateFlow,
}: {
	flow: TCampaignFlowState["campaignFlow"];
	updateFlow: (changes: Partial<TCampaignFlowState["campaignFlow"]>) => void;
}) {
	return (
		<>
			<div className="flex flex-col gap-3">
				<h4 className="text-xs font-bold tracking-tight text-muted-foreground uppercase">INFORMAÇÕES DO FLUXO</h4>
				<TextInput
					label="TITULO"
					value={flow.titulo}
					handleChange={(value) => updateFlow({ titulo: value })}
					placeholder="Preencha aqui o título do fluxo..."
				/>
				<TextareaInput
					label="DESCRIÇÃO"
					value={flow.descricao ?? ""}
					handleChange={(value) => updateFlow({ descricao: value || null })}
					placeholder="Preencha aqui uma breve descrição do fluxo..."
				/>
			</div>

			<Separator />

			<div className="flex flex-col gap-3">
				<h4 className="text-xs font-bold tracking-tight text-muted-foreground uppercase">TIPO E STATUS</h4>
				<SelectInput
					label="TIPO DO FLUXO"
					value={flow.tipo}
					handleChange={(value) => updateFlow({ tipo: value as typeof flow.tipo })}
					onReset={() => updateFlow({ tipo: "EVENTO" })}
					resetOptionLabel="SELECIONE O TIPO DO FLUXO..."
					options={[
						{ id: 1, value: "EVENTO", label: "POR EVENTO" },
						{ id: 2, value: "RECORRENTE", label: "POR RECORRENCIA" },
						{ id: 3, value: "UNICA", label: "USO ÚNICO	" },
					]}
				/>
				<SelectInput
					label="STATUS"
					value={flow.status}
					handleChange={(value) => updateFlow({ status: value as typeof flow.status })}
					onReset={() => updateFlow({ status: "RASCUNHO" })}
					resetOptionLabel="SELECIONE O STATUS..."
					options={[
						{ id: 1, value: "RASCUNHO", label: "RASCUNHO" },
						{ id: 2, value: "ATIVO", label: "ATIVO" },
						{ id: 3, value: "PAUSADO", label: "PAUSADO" },
						{ id: 4, value: "ARQUIVADO", label: "ARQUIVADO" },
					]}
				/>
			</div>

			<Separator />

			<div className="flex flex-col gap-3">
				<h4 className="text-xs font-bold tracking-tight text-muted-foreground uppercase">ATRIBUIÇÃO</h4>
				<SelectInput
					label="MODELO DE ATRIBUIÇÃO"
					value={flow.atribuicaoModelo}
					handleChange={(value) => updateFlow({ atribuicaoModelo: value as typeof flow.atribuicaoModelo })}
					onReset={() => updateFlow({ atribuicaoModelo: "LAST_TOUCH" })}
					resetOptionLabel="SELECIONE O MODELO DE ATRIBUIÇÃO..."
					options={[
						{ id: 1, value: "LAST_TOUCH", label: "ULTIMO TOQUE" },
						{ id: 2, value: "FIRST_TOUCH", label: "PRIMEIRO TOQUE" },
						{ id: 3, value: "LINEAR", label: "LINEAR" },
					]}
				/>
				<NumberInput
					label="JANELA DE ATRIBUIÇÃO (DIAS)"
					value={flow.atribuicaoJanelaDias as number | null | undefined}
					handleChange={(value) => updateFlow({ atribuicaoJanelaDias: Number(value) || 14 })}
					placeholder="Preencha aqui o número de dias para a janela de atribuição..."
				/>
			</div>
		</>
	);
}

function NodeConfigSection({
	node,
	nodeIndex,
	nodes,
	updateNode,
	removeNode,
	organizationId,
}: {
	node: TCampaignFlowState["nos"][number];
	nodeIndex: number;
	nodes: TCampaignFlowState["nos"];
	updateNode: (args: { index: number; changes: Partial<TCampaignFlowState["nos"][number]> }) => void;
	removeNode: (index: number) => void;
	organizationId: string;
}) {
	const subtypeInfo = getNodeSubtype(node.tipo, node.subtipo);
	const colors = NODE_TYPE_COLORS[node.tipo] ?? NODE_TYPE_COLORS.ACAO;
	const typeLabel = NODE_TYPE_LABELS[node.tipo] ?? node.tipo;

	return (
		<>
			<div className={cn("flex items-center gap-2 px-3 py-2 rounded-lg", colors.bg, colors.border, "border")}>
				<span className={cn("text-[0.65rem] font-bold tracking-widest uppercase", colors.text)}>{typeLabel}</span>
				<span className="text-[0.65rem] text-muted-foreground">{subtypeInfo?.categoria}</span>
			</div>

			<div className="flex flex-col gap-3">
				<h4 className="text-xs font-bold tracking-tight text-muted-foreground uppercase">ROTULO DO NÓ</h4>
				<TextInput
					label="ROTULO PERSONALIZADO"
					value={node.rotulo ?? ""}
					handleChange={(value) => updateNode({ index: nodeIndex, changes: { rotulo: value || null } })}
					placeholder={subtypeInfo?.rotulo ?? "Nome do nó"}
				/>
			</div>

			<Separator />

			<div className="flex flex-col gap-3">
				<h4 className="text-xs font-bold tracking-tight text-muted-foreground uppercase">CONFIGURAÇÃO</h4>
				<NodeSpecificConfig node={node} nodeIndex={nodeIndex} nodes={nodes} updateNode={updateNode} organizationId={organizationId} />
			</div>

			<Separator />

			<Button variant="destructive" size="sm" className="w-full flex items-center gap-2" onClick={() => removeNode(nodeIndex)}>
				<Trash2 className="w-4 h-4" />
				REMOVER NO
			</Button>
		</>
	);
}

function NodeSpecificConfig({
	node,
	nodeIndex,
	nodes,
	updateNode,
	organizationId,
}: {
	node: TCampaignFlowState["nos"][number];
	nodeIndex: number;
	nodes: TCampaignFlowState["nos"];
	updateNode: (args: { index: number; changes: Partial<TCampaignFlowState["nos"][number]> }) => void;
	organizationId: string;
}) {
	const config = node.configuracao as Record<string, unknown>;

	const updateConfig = (key: string, value: unknown) => {
		updateNode({
			index: nodeIndex,
			changes: { configuracao: { ...config, [key]: value } },
		});
	};

	return <NodeConfigRenderer node={node} nodes={nodes} config={config} organizationId={organizationId} updateConfig={updateConfig} />;
}
