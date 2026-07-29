import NumberInput from "@/components/Inputs/NumberInput";
import { Switch } from "@/components/ui/switch";
import type { TAiAgentToolNameEnum } from "@/schemas/enums";
import type { TUseInternalAiAgentState } from "@/state-hooks/use-internal-ai-agent-state";

type ToolsBlockProps = {
	state: TUseInternalAiAgentState["state"];
	toggleTool: TUseInternalAiAgentState["toggleTool"];
	updateLimits: TUseInternalAiAgentState["updateLimits"];
	updateAttendanceSettings: TUseInternalAiAgentState["updateAttendanceSettings"];
};

/**
 * As ferramentas são descritas pelo que o cliente consegue perguntar, não pelo nome técnico —
 * é assim que quem configura decide se faz sentido ligar cada uma.
 */
const TOOLS: Array<{ name: TAiAgentToolNameEnum; title: string; description: string }> = [
	{
		name: "clientes.consultar_compras",
		title: "Histórico de compras",
		description: 'Responde "o que eu comprei da última vez?" e reconhece o perfil do cliente (ticket médio, produtos favoritos).',
	},
	{
		name: "produtos.consultar",
		title: "Catálogo de produtos",
		description: 'Responde "vocês têm esse produto?" e "quanto custa?", com preço e variações do seu catálogo.',
	},
	{
		name: "cashback.consultar",
		title: "Cashback",
		description: 'Responde "quanto tenho de saldo?" e explica as regras do seu programa. Requer um programa de cashback ativo.',
	},
	{
		name: "cupons.consultar",
		title: "Cupons",
		description: 'Responde "tenho algum cupom?" e confere se um código específico ainda vale para aquele cliente.',
	},
	{
		name: "atendimento.transferir_para_humano",
		title: "Transferir para atendente",
		description: "Passa a conversa para uma pessoa da equipe quando o cliente pede ou quando o assunto exige decisão comercial.",
	},
];

export default function ToolsBlock({ state, toggleTool, updateLimits, updateAttendanceSettings }: ToolsBlockProps) {
	const { ferramentas, limites, atendimento } = state.agente.capacidades;

	return (
		<div className="flex w-full flex-col gap-6">
			<div className="flex w-full flex-col gap-2">
				{TOOLS.map((tool) => (
					<div key={tool.name} className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card px-4 py-3">
						<div className="flex flex-col">
							<h3 className="text-sm font-bold tracking-tight">{tool.title}</h3>
							<p className="text-xs text-muted-foreground">{tool.description}</p>
						</div>
						<Switch
							checked={ferramentas[tool.name]?.habilitada === true}
							onCheckedChange={(checked) => toggleTool(tool.name, checked)}
							aria-label={tool.title}
						/>
					</div>
				))}
			</div>

			<div className="flex w-full flex-col gap-4 border-t pt-4">
				<h3 className="text-xs font-medium uppercase tracking-tight text-muted-foreground">LIMITES</h3>

				<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
					<div className="flex flex-col gap-1">
						<NumberInput
							label="ESPERA ANTES DE RESPONDER (SEGUNDOS)"
							placeholder="5"
							value={Math.round(atendimento.atrasoRespostaMs / 1000)}
							handleChange={(value) => updateAttendanceSettings({ atrasoRespostaMs: Math.min(60, Math.max(0, value)) * 1000 })}
						/>
						<p className="text-xs text-muted-foreground">Agrupa mensagens enviadas em sequência antes de responder.</p>
					</div>

					<div className="flex flex-col gap-1">
						<NumberInput
							label="CONSULTAS POR RESPOSTA"
							placeholder="15"
							value={limites.maxChamadasFerramentasPorRun}
							handleChange={(value) => updateLimits({ maxChamadasFerramentasPorRun: Math.min(30, Math.max(1, Math.round(value))) })}
						/>
						<p className="text-xs text-muted-foreground">Quantas buscas o agente pode fazer para montar uma resposta.</p>
					</div>

					<div className="flex flex-col gap-1">
						<NumberInput
							label="RESPOSTAS POR DIA"
							placeholder="500"
							value={limites.maxRunsDiarios}
							handleChange={(value) => updateLimits({ maxRunsDiarios: Math.max(1, Math.round(value)) })}
						/>
						<p className="text-xs text-muted-foreground">Teto diário de segurança. Atingido o limite, o agente para até o dia seguinte.</p>
					</div>
				</div>
			</div>
		</div>
	);
}
