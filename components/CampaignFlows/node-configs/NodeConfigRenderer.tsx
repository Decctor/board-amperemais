import { ActionConfig } from "./ActionConfig";
import { ConditionConfig } from "./ConditionConfig";
import { DelayConfig } from "./DelayConfig";
import { FilterConfig } from "./FilterConfig";
import { TriggerConfig } from "./TriggerConfig";
import type { TNodeConfigComponentProps } from "./types";

export function NodeConfigRenderer(props: TNodeConfigComponentProps) {
	switch (props.node.tipo) {
		case "GATILHO":
			return <TriggerConfig {...props} />;
		case "ACAO":
			return <ActionConfig {...props} />;
		case "DELAY":
			return <DelayConfig {...props} />;
		case "CONDICAO":
			return <ConditionConfig {...props} />;
		case "FILTRO":
			return <FilterConfig {...props} />;
		default:
			return <p className="text-xs text-muted-foreground italic">Configuracao automatica para este tipo de no.</p>;
	}
}
