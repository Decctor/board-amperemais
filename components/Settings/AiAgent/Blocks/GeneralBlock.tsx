import SelectInput from "@/components/Inputs/SelectInput";
import TextInput from "@/components/Inputs/TextInput";
import { Switch } from "@/components/ui/switch";
import { AI_AGENT_MODEL_OPTIONS } from "@/lib/ai/providers/models";
import type { TUseInternalAiAgentState } from "@/state-hooks/use-internal-ai-agent-state";
import { DEFAULT_AI_AGENT_MODEL } from "@/schemas/ai-agents";

type GeneralBlockProps = {
	state: TUseInternalAiAgentState["state"];
	updateAgent: TUseInternalAiAgentState["updateAgent"];
	updateModelConfig: TUseInternalAiAgentState["updateModelConfig"];
};

/** Identidade, estado e modelo. Um agente PAUSADO segue editável, mas não é executado. */
export default function GeneralBlock({ state, updateAgent, updateModelConfig }: GeneralBlockProps) {
	const isActive = state.agente.status === "ATIVO";
	const temperature = state.agente.modeloConfig.temperatura ?? 1;

	return (
		<div className="flex w-full flex-col gap-4">
			<div className="flex w-full flex-col gap-1 rounded-lg border border-border bg-card px-4 py-3">
				<div className="flex items-center justify-between gap-4">
					<div className="flex flex-col">
						<h3 className="text-sm font-bold tracking-tight">{isActive ? "AGENTE ATIVO" : "AGENTE PAUSADO"}</h3>
						<p className="text-xs text-muted-foreground">
							{isActive
								? "O agente responde automaticamente nos números com atendimento por IA habilitado."
								: "O agente não responde a ninguém. As configurações continuam editáveis."}
						</p>
					</div>
					<Switch checked={isActive} onCheckedChange={(checked) => updateAgent({ status: checked ? "ATIVO" : "PAUSADO" })} />
				</div>
			</div>

			<TextInput
				label="NOME DO AGENTE"
				placeholder="Ex.: Assistente da Loja"
				value={state.agente.nome}
				handleChange={(value) => updateAgent({ nome: value })}
			/>

			<SelectInput
				label="MODELO"
				value={state.agente.modeloConfig.modelo}
				options={AI_AGENT_MODEL_OPTIONS.map((option) => ({ id: option.value, value: option.value, label: option.label }))}
				handleChange={(value) => updateModelConfig({ modelo: value })}
				onReset={() => updateModelConfig({ modelo: DEFAULT_AI_AGENT_MODEL })}
				resetOptionLabel="MODELO PADRÃO"
			/>

			<div className="flex w-full flex-col gap-2">
				<div className="flex items-center justify-between">
					<span className="text-sm font-medium tracking-tight">CRIATIVIDADE</span>
					<span className="text-sm font-bold text-primary">{temperature.toFixed(1)}</span>
				</div>
				<input
					type="range"
					min={0}
					max={2}
					step={0.1}
					value={temperature}
					onChange={(event) => updateModelConfig({ temperatura: Number(event.target.value) })}
					className="w-full accent-primary"
					aria-label="Criatividade do agente"
				/>
				<p className="text-xs text-muted-foreground">
					Valores baixos deixam as respostas mais previsíveis e literais; valores altos, mais variadas. Para atendimento, entre 0,3 e 0,8 costuma funcionar
					melhor.
				</p>
			</div>
		</div>
	);
}
