import { buildAssistantTools } from "@/lib/ai-business-assistant/data-tools";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { errorHandler } from "@/lib/app-api";
import { streamText, gateway } from "ai";
import createHttpError from "http-errors";
import { type NextRequest } from "next/server";

const SYSTEM_PROMPT = `Você é o Assistente de Negócios da Recompra — um consultor especializado em varejo, fidelização de clientes e CRM.

Você tem acesso a ferramentas que consultam os dados reais da organização em tempo real. Use-as sempre que precisar de dados específicos para responder a pergunta.

REGRAS:
- Responda sempre em português brasileiro, de forma direta e objetiva.
- Use dados concretos (números, percentuais, nomes) quando disponíveis.
- Seja conciso mas informativo — responda em 2-4 parágrafos no máximo.
- Quando identificar uma oportunidade de ação concreta (criar campanha, segmentar clientes, ajustar cashback), inclua um bloco JSON ao final da sua resposta no seguinte formato:

\`\`\`action-card
{
  "tipo": "campaign" | "cashback" | "insight",
  "titulo": "Título curto da ação (máx 60 chars)",
  "descricao": "Descrição da ação sugerida (máx 150 chars)",
  "dados": {
    // Para tipo "campaign": { "clienteIds": ["id1", "id2"], "mensagemSugerida": "..." }
    // Para tipo "cashback": { "descricao": "ajuste sugerido" }
    // Para tipo "insight": { "url": "/dashboard/..." }
  }
}
\`\`\`

Inclua o bloco action-card APENAS quando houver uma ação concreta e valiosa a sugerir. Não inclua para perguntas meramente informativas.`;

async function aiBusinessAssistantRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session?.membership) {
		throw new createHttpError.Unauthorized("Você não está autenticado.");
	}

	const organizacaoId = session.membership.organizacao.id;
	const body = await request.json();
	const { messages } = body as { messages: Array<{ role: string; content: string }> };

	if (!messages || !Array.isArray(messages)) {
		throw new createHttpError.BadRequest("Mensagens inválidas.");
	}

	const tools = buildAssistantTools(organizacaoId);

	const result = streamText({
		model: gateway("openai/gpt-4o"),
		system: SYSTEM_PROMPT,
		messages: messages as Parameters<typeof streamText>[0]["messages"],
		tools,
		maxSteps: 5,
	});

	return result.toDataStreamResponse();
}

export async function POST(request: NextRequest) {
	try {
		return await aiBusinessAssistantRoute(request);
	} catch (error) {
		return errorHandler(error);
	}
}
