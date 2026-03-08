import { ActionConfig } from "./ActionConfig";
import { ConditionConfig } from "./ConditionConfig";
import { DelayConfig } from "./DelayConfig";
import { FilterConfig } from "./FilterConfig";
import { TriggerConfig } from "./TriggerConfig";
import type {
	TActionNodeConfigComponentProps,
	TAnyNodeConfigComponentProps,
	TConditionNodeConfigComponentProps,
	TDelayNodeConfigComponentProps,
	TFilterNodeConfigComponentProps,
	TTriggerNodeConfigComponentProps,
} from "./types";

export function NodeConfigRenderer(props: TAnyNodeConfigComponentProps) {
	switch (props.node.tipo) {
		case "GATILHO":
			return <TriggerConfig {...(props as TTriggerNodeConfigComponentProps)} />;
		case "ACAO":
			return <ActionConfig {...(props as TActionNodeConfigComponentProps)} />;
		case "DELAY":
			return <DelayConfig {...(props as TDelayNodeConfigComponentProps)} />;
		case "CONDICAO":
			return <ConditionConfig {...(props as TConditionNodeConfigComponentProps)} />;
		case "FILTRO":
			return <FilterConfig {...(props as TFilterNodeConfigComponentProps)} />;
		default:
			return <p className="text-xs text-muted-foreground italic">Configuracao automatica para este tipo de no.</p>;
	}
}
