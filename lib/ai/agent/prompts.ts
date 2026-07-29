import type { TAiAgentCapacidades } from "@/schemas/ai-agents";
import type { TAiAgentToolNameEnum } from "@/schemas/enums";
import { getEnabledAgentTools } from "../tools/registry";

/**
 * System prompt montado em camadas:
 *
 *  1. instruções da organização (persona, tom, políticas)
 *  2. regras operacionais fixas do canal
 *  3. regras **condicionais às ferramentas habilitadas**
 *  4. inventário de ferramentas
 *  5. base de conhecimento
 *
 * A camada 3 é a que mais importa: um agente sem a ferramenta de cashback não deve receber
 * instruções sobre cashback. Regras para capacidades que o agente não tem só diluem a tarefa
 * real e induzem promessas que ele não pode cumprir.
 */
export function buildAgentSystemPrompt({
	instrucoes,
	capacidades,
	knowledgeContext,
}: {
	instrucoes: string;
	capacidades: TAiAgentCapacidades;
	knowledgeContext: string;
}): string {
	const has = (name: TAiAgentToolNameEnum) => capacidades.ferramentas[name]?.habilitada === true;
	const parts: string[] = [instrucoes.trim()];

	parts.push(`## Regras do canal (WhatsApp)
- Responda em português brasileiro, com mensagens curtas: 3 a 5 frases no máximo.
- No máximo 1 emoji por mensagem, e só quando somar algo.
- Uma única mensagem por vez. Não quebre a resposta em várias.
- Não repita saudação se a conversa já começou.
- Nunca afirme algo que você não confirmou por ferramenta ou pela base de conhecimento. Na
  dúvida, diga que vai confirmar.
- Nunca peça senha, dados de cartão ou documentos.`);

	const conditionalRules: string[] = [];

	if (has("clientes.consultar_compras")) {
		conditionalRules.push(
			"- Antes de falar sobre pedidos, compras ou preferências do cliente, consulte o histórico de compras. Use a visão RESUMO para entender o perfil e a LISTA para falar de uma compra específica.",
		);
	}
	if (has("produtos.consultar")) {
		conditionalRules.push(
			"- Consulte o catálogo antes de citar produto, preço ou disponibilidade. Se o cliente descrever o item de forma vaga, use a visão GRUPOS para entender as categorias e então busque pelo termo.",
		);
	}
	if (has("cashback.consultar")) {
		conditionalRules.push(
			"- Para qualquer pergunta sobre saldo, pontos, cashback ou recompensas, consulte a ferramenta de cashback. Nunca estime saldo nem prometa acúmulo sem confirmar as regras do programa.",
		);
	}
	if (has("cupons.consultar")) {
		conditionalRules.push(
			"- Para perguntas sobre cupons, descontos ou promoções, consulte os cupons do cliente. Ao oferecer um cupom, informe sempre o código, o benefício e as condições (valor mínimo, validade).",
		);
	}
	if (has("atendimento.transferir_para_humano")) {
		conditionalRules.push(
			"- Transfira para um atendente humano quando o cliente pedir, quando demonstrar insatisfação, quando houver reclamação ou problema com pedido, ou quando o assunto exigir decisão comercial. Ao transferir, avise o cliente de que um atendente vai continuar.",
		);
	} else {
		conditionalRules.push(
			"- Você não pode transferir esta conversa. Se não conseguir resolver, oriente o cliente a procurar a equipe pelos canais que a empresa divulga.",
		);
	}

	parts.push(`## Como usar suas ferramentas\n${conditionalRules.join("\n")}`);

	const enabledTools = getEnabledAgentTools(capacidades);
	if (enabledTools.length > 0) {
		parts.push(`## Ferramentas disponíveis\n${enabledTools.map((tool) => `- ${tool.name}`).join("\n")}`);
	} else {
		parts.push("## Ferramentas disponíveis\nNenhuma. Responda apenas com o que estiver na base de conhecimento e no contexto da conversa.");
	}

	if (knowledgeContext.trim()) {
		parts.push(`## Base de conhecimento da empresa\nUse estas informações como verdade sobre a empresa.\n\n${knowledgeContext.trim()}`);
	}

	parts.push(`## Formato da resposta
Devolva:
- "mensagem": o texto exato a enviar ao cliente, ou null se não houver nada a dizer agora
  (por exemplo, logo após transferir para um humano que já vai assumir).
- "resumoAtendimento": um resumo interno e objetivo do estado do atendimento, para a equipe.
  Não é visto pelo cliente.`);

	return parts.join("\n\n");
}
