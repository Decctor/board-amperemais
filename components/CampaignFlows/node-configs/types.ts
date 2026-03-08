import type { TCampaignFlowState } from "@/schemas/campaign-flows";

type TFlowNode = TCampaignFlowState["nos"][number];

type TNodeConfigComponentProps<TNode extends TFlowNode> = {
	node: TNode;
	nodes: TCampaignFlowState["nos"];
	organizationId: string;
	updateConfig: (changes: Partial<TNode["configuracao"]>) => void;
};

export type TTriggerNodeConfigComponentProps = TNodeConfigComponentProps<Extract<TFlowNode, { tipo: "GATILHO" }>>;
export type TActionNodeConfigComponentProps = TNodeConfigComponentProps<Extract<TFlowNode, { tipo: "ACAO" }>>;
export type TDelayNodeConfigComponentProps = TNodeConfigComponentProps<Extract<TFlowNode, { tipo: "DELAY" }>>;
export type TConditionNodeConfigComponentProps = TNodeConfigComponentProps<Extract<TFlowNode, { tipo: "CONDICAO" }>>;
export type TFilterNodeConfigComponentProps = TNodeConfigComponentProps<Extract<TFlowNode, { tipo: "FILTRO" }>>;

export type TAnyNodeConfigComponentProps = TNodeConfigComponentProps<TFlowNode>;
