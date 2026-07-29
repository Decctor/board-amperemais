import { AiAgentCapacidadesSchema, AiAgentModeloConfigSchema, type TAiAgentCapacidades } from "@/schemas/ai-agents";
import type { DB, DBTransaction } from "@/services/drizzle";
import { aiAgents, organizations } from "@/services/drizzle/schema";
import { eq } from "drizzle-orm";
import { AgentInactiveError } from "../shared/errors";

type TDb = DB | DBTransaction;

/**
 * Instruções iniciais. Genéricas de propósito: descrevem comportamento de atendimento, não um
 * negócio específico. Cabe à organização personalizar tom, políticas e diferenciais na tela de
 * configuração — o que a base de conhecimento complementa.
 */
export function buildDefaultAgentInstructions(nomeOrganizacao: string): string {
	return `Você é o assistente virtual de atendimento da ${nomeOrganizacao}, conversando com clientes pelo WhatsApp.

## Como você atende
- Seja cordial, direto e resolutivo. Fale como uma pessoa da equipe, não como um robô.
- Trate o cliente pelo nome quando souber.
- Responda apenas o que foi perguntado; não despeje informação que ninguém pediu.
- Se não souber ou não tiver como confirmar algo, diga isso com naturalidade e ofereça
  encaminhar para um atendente.

## O que você NÃO faz
- Não invente preços, prazos, estoque, políticas ou promoções. Toda informação factual vem das
  suas ferramentas ou da base de conhecimento.
- Não prometa descontos, exceções ou condições comerciais por conta própria.
- Não peça dados sensíveis (senha, cartão, documentos) em nenhuma hipótese.`;
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
	const existente = await db.query.aiAgents.findFirst({ where: eq(aiAgents.organizacaoId, organizacaoId) });
	if (existente) return existente;

	const organizacao = await db.query.organizations.findFirst({
		where: eq(organizations.id, organizacaoId),
		columns: { nome: true },
	});
	if (!organizacao) throw new AgentInactiveError("Organização não encontrada para provisionar o agente de IA.");

	await db
		.insert(aiAgents)
		.values({
			organizacaoId,
			nome: "Agente de Atendimento",
			status: "ATIVO",
			instrucoes: buildDefaultAgentInstructions(organizacao.nome),
			modeloConfig: AiAgentModeloConfigSchema.parse({}),
			capacidades: buildDefaultAgentCapabilities(),
		})
		.onConflictDoNothing();

	const agente = await db.query.aiAgents.findFirst({ where: eq(aiAgents.organizacaoId, organizacaoId) });
	if (!agente) throw new AgentInactiveError("Não foi possível provisionar o agente de IA da organização.");
	return agente;
}
