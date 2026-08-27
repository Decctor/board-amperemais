import SelectInput from "@/components/Inputs/SelectInput";
import SelectMultipleClientsInput from "@/components/Inputs/SelectMultipleClientsInput";
import type { TAiAgentScopeTypeEnum } from "@/schemas/enums";
import type { TUseInternalAiAgentState } from "@/state-hooks/use-internal-ai-agent-state";

type ScopeBlockProps = {
	state: TUseInternalAiAgentState["state"];
	updateScope: TUseInternalAiAgentState["updateScope"];
};

/**
 * Os modos são descritos pelo efeito prático, não pelo valor do enum — quem configura decide
 * lendo "o agente atende...", não "INCLUIR".
 */
const SCOPE_OPTIONS: Array<{ id: TAiAgentScopeTypeEnum; label: string; value: TAiAgentScopeTypeEnum }> = [
	{ id: "TODOS", label: "Todos os clientes", value: "TODOS" },
	{ id: "INCLUIR", label: "Apenas os clientes selecionados", value: "INCLUIR" },
	{ id: "EXCLUIR", label: "Todos, menos os clientes selecionados", value: "EXCLUIR" },
];

const SCOPE_DESCRIPTIONS: Record<TAiAgentScopeTypeEnum, string> = {
	TODOS: "O agente responde a qualquer cliente que escrever para um número com atendimento por IA habilitado.",
	INCLUIR:
		"Só os clientes marcados são atendidos pelo agente — use para testar com um grupo pequeno antes de liberar para todos. Sem nenhum cliente marcado, o agente não atende ninguém.",
	EXCLUIR:
		"Os clientes marcados nunca são atendidos pelo agente; a conversa deles fica para a equipe. Use para números internos, como o financeiro falando com um fornecedor.",
};

export default function ScopeBlock({ state, updateScope }: ScopeBlockProps) {
	const { escopo } = state.agente;
	const showClientPicker = escopo.tipo !== "TODOS";

	return (
		<div className="flex w-full flex-col gap-4">
			<div className="flex w-full flex-col gap-4 rounded-lg border border-border bg-card px-4 py-3">
				<SelectInput
					label="QUEM O AGENTE ATENDE"
					value={escopo.tipo}
					resetOptionLabel="Selecione uma opção"
					options={SCOPE_OPTIONS}
					handleChange={(value) => updateScope({ tipo: value as TAiAgentScopeTypeEnum })}
					onReset={() => updateScope({ tipo: "TODOS" })}
				/>
				<p className="text-xs text-muted-foreground">{SCOPE_DESCRIPTIONS[escopo.tipo]}</p>

				{showClientPicker ? (
					<div className="flex flex-col gap-1 border-t pt-4">
						<SelectMultipleClientsInput
							label={escopo.tipo === "INCLUIR" ? "CLIENTES ATENDIDOS" : "CLIENTES FORA DO ATENDIMENTO"}
							selected={escopo.clienteIds}
							handleChange={(clienteIds) => updateScope({ clienteIds })}
							onReset={() => updateScope({ clienteIds: [] })}
						/>
						{escopo.tipo === "INCLUIR" && escopo.clienteIds.length === 0 ? (
							<p className="text-xs text-destructive">Nenhum cliente selecionado: o agente não vai atender ninguém enquanto estiver assim.</p>
						) : (
							<p className="text-xs text-muted-foreground">
								{escopo.clienteIds.length} cliente{escopo.clienteIds.length === 1 ? "" : "s"} na lista.
							</p>
						)}
					</div>
				) : null}
			</div>

			<p className="text-xs text-muted-foreground">
				O escopo vale a partir da próxima mensagem, inclusive em conversas já em andamento. Tirar um cliente do escopo devolve a conversa dele para a fila
				da equipe. O playground continua funcionando em qualquer modo.
			</p>
		</div>
	);
}
