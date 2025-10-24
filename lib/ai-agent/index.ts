import type { Id } from "@/convex/_generated/dataModel";
import { createOpenAI } from "@ai-sdk/openai";
import { Output, generateText } from "ai";
import { Experimental_Agent as Agent } from "ai";
import z from "zod";

const AI_GATEWAY_KEY = process.env.AI_GATEWAY_API_KEY;

// Configure OpenAI with Vercel AI Gateway
const openai = createOpenAI({
	apiKey: AI_GATEWAY_KEY,
	baseURL: "https://gateway.ai.cloudflare.com/v1/YOUR_ACCOUNT_ID/YOUR_GATEWAY_ID/openai", // Update with your gateway URL
});

type TDetails = {
	id: string;
	cliente: {
		nome: string;
		telefone: string;
		email?: string;
		cpfCnpj?: string;
		cidade?: string;
		uf?: string;
		cep?: string;
		bairro?: string;
		endereco?: string;
		numeroOuIdentificador?: string;
	};
	ultimasMensagens: Array<{
		id: string;
		autorTipo: "cliente" | "usuario" | "ai";
		conteudoTipo?: "IMAGEM" | "DOCUMENTO" | "VIDEO" | "AUDIO";
		conteudoTexto?: string;
		conteudoMidiaUrl?: string;
		dataEnvio: number;
		atendimentoId?: string;
	}>;
	atendimentoAberto:
		| {
				id: string;
				descricao: string;
				status: "PENDENTE" | "EM_ANDAMENTO" | "CONCLUIDO";
		  }
		| false;
};

type AIResponse = string;

const SYSTEM_PROMPT = `Você é um assistente virtual de atendimento ao cliente para a empresa Ampère Mais, uma empresa especializada em materiais elétricos.

Seu papel é:
- Atender clientes de forma amigável e profissional
- Responder perguntas sobre produtos e serviços de materiais elétricos
- Coletar informações iniciais dos clientes
- Fornecer informações gerais sobre a empresa

Informações sobre a empresa:
- Nome: Ampère Mais
- Endereço: R. Vinte e Seis, 102 - Centro, Ituiutaba - MG, 38300-080
- Segmento: Materiais elétricos (cabeamento, iluminação, eletroeletrônica, etc)

Diretrizes de resposta:
- **Fluxo da Conversa: Inicie a primeira interação com uma saudação. Após a primeira mensagem, vá direto ao ponto e não repita a saudação (ex: "Olá, {NOME DO CLIENTE}") a cada nova resposta. A conversa deve ser contínua e fluida.**
- Seja breve e objetivo (máximo 2-3 parágrafos).
- Use linguagem clara e acessível. A comunicação é pelo WhatsApp, então a conversa deve ser natural e direta, como se fosse entre duas pessoas.
- Seja educado e empático.
- Use emojis quando apropriado para manter o tom amigável. 😊☀️
- Não invente informações que você não tem.
- **Diretrizes a Evitar: Não finalize todas as suas mensagens com frases de despedida ou de disponibilidade, como "Se precisar de mais alguma coisa, estou à disposição" ou "Qualquer outra dúvida, é só perguntar". Use esse tipo de frase apenas se o cliente parecer estar finalizando o contato ou se você tiver resolvido completamente uma grande questão.**
`;

export const agent = new Agent({
	model: "openai/gpt-4o",
	system: SYSTEM_PROMPT,
	tools: {},
	experimental_output: Output.object({
		schema: z.object({
			message: z.string(),
		}),
	}),
	toolChoice: "none",
});

export async function getAgentResponse({ details }: { details: TDetails }): Promise<AIResponse> {
	try {
		if (!details) {
			throw new Error("Detalhes não encontrados");
		}

		// Build conversation context
		const conversationHistory = details.ultimasMensagens
			.reverse() // Oldest first
			.map((msg: TDetails["ultimasMensagens"][0]) => {
				const role = msg.autorTipo === "cliente" ? "Cliente" : msg.autorTipo === "ai" ? "Você (AI)" : "Atendente Humano";
				let content = msg.conteudoTexto || "";

				if (msg.conteudoTipo && !content) {
					content = `[${msg.conteudoTipo}]`;
				}

				return `${role}: ${content}`;
			})
			.join("\n");

		const userPrompt = `Você está encarregando de responder ao cliente.

### INFORMAÇÕES DO CLIENTE
- Nome: ${details.cliente.nome}
- Telefone: ${details.cliente.telefone}
${details.cliente.email ? `- Email: ${details.cliente.email}` : ""}
${details.cliente.cpfCnpj ? `- CPF/CNPJ: ${details.cliente.cpfCnpj}` : ""}
${details.cliente.cidade ? `- Cidade: ${details.cliente.cidade}` : ""}
${details.cliente.uf ? `- UF: ${details.cliente.uf}` : ""}
${details.cliente.cep ? `- CEP: ${details.cliente.cep}` : ""}
${details.cliente.bairro ? `- Bairro: ${details.cliente.bairro}` : ""}
${details.cliente.endereco ? `- Endereço: ${details.cliente.endereco}` : ""}
${details.cliente.numeroOuIdentificador ? `- Número ou identificador: ${details.cliente.numeroOuIdentificador}` : ""}

### HISTÓRICO DA CONVERSA
${conversationHistory}

${
	details.atendimentoAberto
		? `
### ATENDIMENTO EM ABERTO
- ID: ${details.atendimentoAberto.id}
- Descrição: ${details.atendimentoAberto.descricao}
- Status: ${details.atendimentoAberto.status}
`
		: ""
}

Analise a conversa e responda apropriadamente. Lembre-se de retornar apenas JSON válido.`;

		// Generate response using AI
		const { text, experimental_output } = await agent.generate({
			prompt: userPrompt,
		});

		return experimental_output.message;
	} catch (error) {
		console.error("[AI_AGENT] Error generating response:", error);
		// Return a safe fallback
		return "Desculpe, estou com dificuldades técnicas. Vou transferir você para um de nossos atendentes.";
	}
}
