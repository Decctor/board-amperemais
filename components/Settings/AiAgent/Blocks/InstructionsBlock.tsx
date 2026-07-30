import TextareaInput from "@/components/Inputs/TextareaInput";
import type { TUseInternalAiAgentState } from "@/state-hooks/use-internal-ai-agent-state";

type InstructionsBlockProps = {
	state: TUseInternalAiAgentState["state"];
	updateAgent: TUseInternalAiAgentState["updateAgent"];
};

/**
 * Primeira camada do system prompt. É aqui que a organização define quem o agente é; as
 * regras de canal e as instruções de uso de ferramenta são montadas pelo sistema.
 */
export default function InstructionsBlock({ state, updateAgent }: InstructionsBlockProps) {
	return (
		<div className="flex w-full flex-col gap-2">
			<TextareaInput
				label="INSTRUÇÕES DO AGENTE"
				placeholder="Descreva quem é o agente, o tom que ele deve usar e as regras do seu negócio..."
				value={state.agente.instrucoes}
				handleChange={(value) => updateAgent({ instrucoes: value })}
				rows={16}
			/>
			<p className="text-xs text-muted-foreground">
				Defina a persona, o tom de voz e as políticas do seu negócio. Você não precisa repetir aqui as regras de WhatsApp (mensagens curtas, uma por vez)
				nem explicar as ferramentas — isso já é dito ao agente automaticamente. Informações factuais, como horários e políticas, ficam melhor na base de
				conhecimento abaixo.
			</p>
		</div>
	);
}
