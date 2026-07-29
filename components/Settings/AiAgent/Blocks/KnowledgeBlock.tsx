import TextInput from "@/components/Inputs/TextInput";
import TextareaInput from "@/components/Inputs/TextareaInput";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { TUseInternalAiAgentState } from "@/state-hooks/use-internal-ai-agent-state";
import { Plus, Trash2 } from "lucide-react";

type KnowledgeBlockProps = {
	state: TUseInternalAiAgentState["state"];
	addKnowledgeBlock: TUseInternalAiAgentState["addKnowledgeBlock"];
	updateKnowledgeBlock: TUseInternalAiAgentState["updateKnowledgeBlock"];
	removeKnowledgeBlock: TUseInternalAiAgentState["removeKnowledgeBlock"];
};

/**
 * Blocos de texto injetados no system prompt. Um bloco desativado continua salvo, mas sai do
 * contexto do agente — é o caminho para promoções sazonais e políticas temporárias.
 */
export default function KnowledgeBlock({ state, addKnowledgeBlock, updateKnowledgeBlock, removeKnowledgeBlock }: KnowledgeBlockProps) {
	// Blocos marcados para remoção seguem no estado (para o backend deletá-los), mas somem daqui.
	const visiveis = state.conhecimento.map((bloco, index) => ({ bloco, index })).filter(({ bloco }) => !bloco.deletar);

	return (
		<div className="flex w-full flex-col gap-4">
			<p className="text-xs text-muted-foreground">
				Informações que o agente trata como verdade sobre a sua empresa: horário de funcionamento, formas de pagamento, política de trocas, prazos de
				entrega, diferenciais. Um bloco por assunto funciona melhor do que um texto único e longo.
			</p>

			{visiveis.length === 0 ? (
				<div className="flex w-full flex-col items-center gap-2 rounded-lg border border-dashed border-border px-4 py-8 text-center">
					<p className="text-sm font-medium">Nenhum bloco de conhecimento</p>
					<p className="text-xs text-muted-foreground">Sem isso, o agente só sabe o que estiver nas instruções e nas consultas ao seu sistema.</p>
				</div>
			) : null}

			{visiveis.map(({ bloco, index }) => (
				<div key={bloco.id ?? `novo-${index}`} className="flex w-full flex-col gap-3 rounded-lg border border-border bg-card px-4 py-3">
					<div className="flex items-center justify-between gap-4">
						<div className="flex-1">
							<TextInput
								label="TÍTULO"
								placeholder="Ex.: Horário de funcionamento"
								value={bloco.titulo}
								handleChange={(value) => updateKnowledgeBlock(index, { titulo: value })}
							/>
						</div>
						<div className="flex items-center gap-3 pt-6">
							<Switch
								checked={bloco.ativo}
								onCheckedChange={(checked) => updateKnowledgeBlock(index, { ativo: checked })}
								aria-label={`Ativar bloco ${bloco.titulo || index + 1}`}
							/>
							<Button variant="ghost" size="icon-sm" onClick={() => removeKnowledgeBlock(index)} aria-label="Remover bloco">
								<Trash2 className="h-4 w-4 text-destructive" />
							</Button>
						</div>
					</div>

					<TextareaInput
						label="CONTEÚDO"
						placeholder="Ex.: Atendemos de segunda a sexta, das 8h às 18h, e aos sábados até as 13h."
						value={bloco.conteudo}
						handleChange={(value) => updateKnowledgeBlock(index, { conteudo: value })}
						rows={5}
					/>
				</div>
			))}

			<Button variant="outline" size="sm" className="flex items-center gap-2 self-start" onClick={addKnowledgeBlock}>
				<Plus className="h-4 w-4" />
				ADICIONAR BLOCO
			</Button>
		</div>
	);
}
