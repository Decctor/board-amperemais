import { AiAgentCapacidadesSchema, AiAgentModeloConfigSchema, type TAiAgentCapacidades } from "@/schemas/ai-agents";
import type { DB, DBTransaction } from "@/services/drizzle";
import { aiAgents, organizations } from "@/services/drizzle/schema";
import { eq } from "drizzle-orm";
import { AgentInactiveError } from "../shared/errors";

type TDb = DB | DBTransaction;

/**
 * Instruções iniciais: um **vendedor**, não um atendente que responde perguntas.
 *
 * A versão anterior dizia "responda apenas o que foi perguntado; não despeje informação que
 * ninguém pediu" — e o agente obedecia. Nos testes de julho/2026 ele acumulava turnos
 * perguntando tensão, potência, marca e faixa de preço antes de mostrar qualquer produto, e
 * chegou a responder "encontrei 45 modelos, são muitas opções pra listar" pedindo que o cliente
 * filtrasse. Passividade não era defeito do modelo, era o texto sendo cumprido.
 *
 * Genéricas de propósito quanto ao negócio: descrevem postura comercial, não um ramo. Cabe à
 * organização personalizar tom, políticas e diferenciais na tela de configuração — e a base de
 * conhecimento complementa. Se a organização reescrever isto, a postura passa a ser dela; as
 * regras que não podem depender de persona (consultar antes de afirmar, não responder de
 * memória, executar a ferramenta no mesmo turno) vivem em `buildAgentSystemPrompt`.
 */
export function buildDefaultAgentInstructions(nomeOrganizacao: string): string {
	return `Você é vendedor(a) da ${nomeOrganizacao} e atende clientes pelo WhatsApp.

Seu objetivo é ajudar o cliente a escolher o produto certo e chegar a um orçamento — não apenas
responder perguntas. Você conhece o catálogo, compara opções e recomenda com convicção.

## Como você vende
- Aja com o que já tem. Assim que tiver uma pista do que o cliente procura, consulte o catálogo e
  mostre opções concretas com preço. Não junte requisitos antes de buscar.
- Ofereça antes de perguntar. Apresente de 3 a 6 opções cobrindo faixas diferentes (uma
  econômica, uma intermediária, uma melhor) e deixe o cliente descartar o que não serve.
- No máximo uma pergunta por mensagem, e só depois de já ter mostrado algo. Quem refina a escolha
  é o cliente reagindo às opções, não você levantando especificações.
- Recomende de verdade. Se o cliente não tem preferência, escolha por ele e diga em uma frase por
  que aquela é a melhor opção para o caso dele.
- Conduza ao fechamento. Ao primeiro sinal de escolha, monte o orçamento na mesma resposta, sem
  pedir confirmação extra.
- Trate o cliente pelo nome quando souber, e fale como uma pessoa da equipe, não como um robô.

## Honestidade comercial
- Preço, disponibilidade e características vêm sempre das ferramentas ou da base de conhecimento.
  Nunca estime e nunca deduza especificação a partir do nome do produto.
- Nunca diga que a empresa não tem um produto com base em uma busca filtrada: refaça a busca sem
  filtros e só então afirme.
- Não prometa desconto, exceção, condição comercial ou prazo por conta própria.
- Não peça senha, dados de cartão ou documentos em nenhuma hipótese.`;
}

/**
 * Todas as ferramentas habilitadas por padrão: o agente nasce útil, e desabilitar é a exceção
 * consciente. Ferramentas adicionadas depois nascem `habilitada: false` por serem opcionais no
 * schema — a organização decide ativar.
 */
export function buildDefaultAgentCapabilities(): TAiAgentCapacidades {
	return AiAgentCapacidadesSchema.parse({
		ferramentas: {
			"clientes.consultar_compras": { habilitada: true },
			"produtos.consultar": { habilitada: true },
			"cashback.consultar": { habilitada: true },
			"cupons.consultar": { habilitada: true },
			"atendimento.transferir_para_humano": { habilitada: true },
		},
	});
}

/**
 * Retorna o agente da organização, criando-o na primeira vez.
 *
 * O provisionamento é lazy (não há seed nem migração de dados): tanto a tela de configuração
 * quanto o webhook chamam esta função. `onConflictDoNothing` + re-select tornam a criação
 * segura sob concorrência — dois webhooks simultâneos não geram dois agentes, porque
 * `ai_agents_organizacao_unica_idx` garante um por organização.
 */
export async function ensureOrganizationAgent(db: TDb, organizacaoId: string) {
	const existing = await db.query.aiAgents.findFirst({ where: eq(aiAgents.organizacaoId, organizacaoId) });
	if (existing) return existing;

	const organization = await db.query.organizations.findFirst({
		where: eq(organizations.id, organizacaoId),
		columns: { nome: true },
	});
	if (!organization) throw new AgentInactiveError("Organização não encontrada para provisionar o agente de IA.");

	await db
		.insert(aiAgents)
		.values({
			organizacaoId,
			nome: "Agente de Atendimento",
			status: "ATIVO",
			instrucoes: buildDefaultAgentInstructions(organization.nome),
			modeloConfig: AiAgentModeloConfigSchema.parse({}),
			capacidades: buildDefaultAgentCapabilities(),
		})
		.onConflictDoNothing();

	const agent = await db.query.aiAgents.findFirst({ where: eq(aiAgents.organizacaoId, organizacaoId) });
	if (!agent) throw new AgentInactiveError("Não foi possível provisionar o agente de IA da organização.");
	return agent;
}
