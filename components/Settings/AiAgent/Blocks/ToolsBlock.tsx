import NumberInput from "@/components/Inputs/NumberInput";
import { Switch } from "@/components/ui/switch";
import type { TAiAgentToolNameEnum } from "@/schemas/enums";
import type { TUseInternalAiAgentState } from "@/state-hooks/use-internal-ai-agent-state";

type ToolsBlockProps = {
	state: TUseInternalAiAgentState["state"];
	toggleFerramenta: TUseInternalAiAgentState["toggleFerramenta"];
	updateLimites: TUseInternalAiAgentState["updateLimites"];
	updateAtendimento: TUseInternalAiAgentState["updateAtendimento"];
};

/**
 * As ferramentas são descritas pelo que o cliente consegue perguntar, não pelo nome técnico —
 * é assim que quem configura decide se faz sentido ligar cada uma.
 */
const FERRAMENTAS: Array<{ nome: TAiAgentToolNameEnum; titulo: string; descricao: string }> = [
	{
		nome: "clientes.consultar_compras",
		titulo: "Histórico de compras",
		descricao: 'Responde "o que eu comprei da última vez?" e reconhece o perfil do cliente (ticket médio, produtos favoritos).',
	},
	{
		nome: "produtos.consultar",
		titulo: "Catálogo de produtos",
		descricao: 'Responde "vocês têm esse produto?" e "quanto custa?", com preço e variações do seu catálogo.',
	},
	{
		nome: "cashback.consultar",
		titulo: "Cashback",
		descricao: 'Responde "quanto tenho de saldo?" e explica as regras do seu programa. Requer um programa de cashback ativo.',
	},
	{
		nome: "cupons.consultar",
		titulo: "Cupons",
		descricao: 'Responde "tenho algum cupom?" e confere se um código específico ainda vale para aquele cliente.',
	},
	{
		nome: "atendimento.transferir_para_humano",
		titulo: "Transferir para atendente",
		descricao: "Passa a conversa para uma pessoa da equipe quando o cliente pede ou quando o assunto exige decisão comercial.",
	},
];

export default function ToolsBlock({ state, toggleFerramenta, updateLimites, updateAtendimento }: ToolsBlockProps) {
	const { ferramentas, limites, atendimento } = state.agente.capacidades;

	return (
		<div className="flex w-full flex-col gap-6">
			<div className="flex w-full flex-col gap-2">
				{FERRAMENTAS.map((ferramenta) => (
					<div key={ferramenta.nome} className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card px-4 py-3">
						<div className="flex flex-col">
							<h3 className="text-sm font-bold tracking-tight">{ferramenta.titulo}</h3>
							<p className="text-xs text-muted-foreground">{ferramenta.descricao}</p>
						</div>
						<Switch
							checked={ferramentas[ferramenta.nome]?.habilitada === true}
							onCheckedChange={(checked) => toggleFerramenta(ferramenta.nome, checked)}
							aria-label={ferramenta.titulo}
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
							handleChange={(value) => updateAtendimento({ atrasoRespostaMs: Math.min(60, Math.max(0, value)) * 1000 })}
						/>
						<p className="text-xs text-muted-foreground">Agrupa mensagens enviadas em sequência antes de responder.</p>
					</div>

					<div className="flex flex-col gap-1">
						<NumberInput
							label="CONSULTAS POR RESPOSTA"
							placeholder="15"
							value={limites.maxChamadasFerramentasPorRun}
							handleChange={(value) => updateLimites({ maxChamadasFerramentasPorRun: Math.min(30, Math.max(1, Math.round(value))) })}
						/>
						<p className="text-xs text-muted-foreground">Quantas buscas o agente pode fazer para montar uma resposta.</p>
					</div>

					<div className="flex flex-col gap-1">
						<NumberInput
							label="RESPOSTAS POR DIA"
							placeholder="500"
							value={limites.maxRunsDiarios}
							handleChange={(value) => updateLimites({ maxRunsDiarios: Math.max(1, Math.round(value)) })}
						/>
						<p className="text-xs text-muted-foreground">Teto diário de segurança. Atingido o limite, o agente para até o dia seguinte.</p>
					</div>
				</div>
			</div>
		</div>
	);
}
