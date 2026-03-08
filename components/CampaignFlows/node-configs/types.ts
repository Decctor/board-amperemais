import type { TCampaignFlowState } from "@/schemas/campaign-flows";

export type TNodeConfigComponentProps = {
	node: TCampaignFlowState["nos"][number];
	nodes: TCampaignFlowState["nos"];
	config: Record<string, unknown>;
	organizationId: string;
	updateConfig: (key: string, value: unknown) => void;
};
