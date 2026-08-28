import type { TAgentActorContext } from "./types";

/**
 * Prompts MCP — roteiros que o usuário escolhe no cliente (no Claude aparecem como comandos de
 * barra). São o mesmo artefato que um dia vira Agent Skill no bundle de distribuição.
 *
 * Cada um descreve **a sequência de ferramentas** e o formato da resposta. Sem isso o modelo
 * improvisa a ordem, chama `get_campaign_results` sem ter o id, e devolve uma tabela de números
 * crus onde o lojista queria saber o que fazer na segunda-feira.
 */

type TAgentPromptArgument = {
	name: string;
	description: string;
	required?: boolean;
};

type TAgentPromptDefinition = {
	name: string;
	title: string;
	description: string;
	arguments: TAgentPromptArgument[];
	modes: TAgentActorContext["mode"][];
	build: (args: Record<string, string | undefined>) => string;
};

const AGENT_PROMPTS: TAgentPromptDefinition[] = [
	{
		name: "revisao-comercial",
		title: "Revisão comercial do período",
		description: "Diagnóstico do resultado comercial: o que aconteceu, por que, e o que fazer a seguir.",
		modes: ["ORG", "PLATAFORMA"],
		arguments: [
			{ name: "periodo", description: "Período em linguagem natural ou datas ISO. Padrão: últimos 30 dias." },
			{ name: "organizacaoId", description: "Obrigatório em conexões de plataforma: id ou slug da organização." },
		],
		build: (args) =>
			[
				`Faça a revisão comercial${args.periodo ? ` do período: ${args.periodo}` : " dos últimos 30 dias"}.`,
				args.organizacaoId ? `Organização: ${args.organizacaoId}.` : "",
				"",
				"Siga esta ordem:",
				"1. `get_commercial_results` para o retrato do período com comparação ao anterior.",
				"2. `get_product_performance` para ver o que puxou o resultado para cima e para baixo.",
				"3. `list_segments` e depois `search_clients` se a composição do faturamento (recorrentes × novos) tiver mudado.",
				"4. `list_campaigns` e `get_campaign_results` nas campanhas ativas do período.",
				"",
				"Escreva em português do Brasil, para o dono da loja e não para um analista. Comece pelo veredito em uma frase.",
				"Cite número só quando ele sustentar uma afirmação. Termine com no máximo três ações concretas para a próxima semana,",
				"cada uma justificada por algo que você viu nos dados.",
				"Se uma métrica vier ausente, diga que não há dado — nunca a trate como zero.",
			]
				.filter(Boolean)
				.join("\n"),
	},
	{
		name: "clientes-em-risco",
		title: "Diagnóstico de clientes em risco",
		description: "Quem está prestes a parar de comprar, por que, e o que oferecer a cada grupo.",
		modes: ["ORG", "PLATAFORMA"],
		arguments: [
			{ name: "diasSemCompra", description: "Quantos dias sem comprar caracterizam risco nesta operação. Padrão: 60." },
			{ name: "organizacaoId", description: "Obrigatório em conexões de plataforma: id ou slug da organização." },
		],
		build: (args) =>
			[
				`Diagnostique os clientes em risco de abandono (sem comprar há ${args.diasSemCompra ?? "60"} dias ou mais).`,
				args.organizacaoId ? `Organização: ${args.organizacaoId}.` : "",
				"",
				"Siga esta ordem:",
				"1. `list_segments` para saber quais categorias RFM existem nesta organização — não presuma nomes.",
				"2. `search_clients` com `semCompraHaDias` para dimensionar o grupo e ver quem tem mais valor acumulado.",
				"3. `get_client_context` nos poucos clientes de maior valor, para entender o padrão de compra de cada um.",
				"4. `search_products` ou `get_product_performance` para escolher o que oferecer.",
				"",
				"Entregue: o tamanho do problema em faturamento em risco, dois ou três grupos com característica comum,",
				"e uma abordagem por grupo. Respeite `comunicacaoPausadaAte` — cliente com comunicação pausada não entra em campanha.",
				"Não invente contato: se o telefone vier mascarado, diga que a lista precisa ser aberta no painel.",
			]
				.filter(Boolean)
				.join("\n"),
	},
];

export function listPromptsForActor(actor: TAgentActorContext) {
	return AGENT_PROMPTS.filter((prompt) => prompt.modes.includes(actor.mode)).map((prompt) => ({
		name: prompt.name,
		title: prompt.title,
		description: prompt.description,
		arguments: prompt.arguments,
	}));
}

export function findPromptForActor(actor: TAgentActorContext, name: string): TAgentPromptDefinition | null {
	const prompt = AGENT_PROMPTS.find((candidate) => candidate.name === name);
	if (!prompt) return null;
	return prompt.modes.includes(actor.mode) ? prompt : null;
}

export function listAllAgentPrompts() {
	return [...AGENT_PROMPTS];
}
