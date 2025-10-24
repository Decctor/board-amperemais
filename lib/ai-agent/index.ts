import type { Id } from "@/convex/_generated/dataModel";
import { createOpenAI } from "@ai-sdk/openai";
import { Experimental_Agent as Agent } from "ai";
import { ENHANCED_SYSTEM_PROMPT, detectEscalationNeeded } from "./prompts";
import { agentTools } from "./tools";

const AI_GATEWAY_KEY = process.env.AI_GATEWAY_API_KEY;

// Configure OpenAI with Vercel AI Gateway
const openai = createOpenAI({
	apiKey: AI_GATEWAY_KEY,
	baseURL: "https://gateway.ai.cloudflare.com/v1/YOUR_ACCOUNT_ID/YOUR_GATEWAY_ID/openai", // Update with your gateway URL
});

type TDetails = {
	id: string;
	cliente: {
		idApp: string; // ID in the main database (Drizzle)
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

export type AIResponse = {
	message: string;
	metadata: {
		toolsUsed: string[];
		transferToHuman: boolean;
		ticketCreated: boolean;
		escalationReason?: string;
	};
};

export const agent = new Agent({
	model: openai("gpt-4o"),
	system: ENHANCED_SYSTEM_PROMPT,
	tools: agentTools,
});

export async function getAgentResponse({ details }: { details: TDetails }): Promise<AIResponse> {
	const toolsUsed: string[] = [];
	let transferToHuman = false;
	const ticketCreated = false;
	let escalationReason: string | undefined;

	try {
		if (!details) {
			throw new Error("Detalhes não encontrados");
		}

		// Build conversation context
		const conversationHistory = details.ultimasMensagens
			.slice()
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

		// Check if immediate escalation is needed based on keywords
		const lastClientMessage = details.ultimasMensagens.find((msg) => msg.autorTipo === "cliente");
		const needsEscalation = lastClientMessage?.conteudoTexto && detectEscalationNeeded(lastClientMessage.conteudoTexto);

		const userPrompt = `Você está encarregado de responder ao cliente.

### INFORMAÇÕES DO CLIENTE
- ID no Sistema: ${details.cliente.idApp}
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

### ID DO CHAT
${details.id}

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

${
	needsEscalation
		? "\n### ⚠️ ATENÇÃO: Detectado possível necessidade de escalação baseado em palavras-chave. Avalie se deve usar a ferramenta transfer_to_human.\n"
		: ""
}

Analise a conversa e responda apropriadamente. Use suas ferramentas quando necessário para fornecer um atendimento personalizado e de alta qualidade.`;

		// Generate response using AI with tools
		const result = await agent.generate({
			prompt: userPrompt,
		});

		// Track which tools were used by checking the text for tool usage patterns
		// The Experimental_Agent API doesn't expose step details in the same way
		// So we'll infer from the response text and track basic usage
		const responseText = result.text || "Desculpe, não consegui processar sua solicitação.";

		// Simple heuristic: check if response mentions key actions
		// In production, you'd want more sophisticated tracking
		if (responseText.toLowerCase().includes("transferir") || responseText.toLowerCase().includes("atendente")) {
			transferToHuman = true;
			escalationReason = "Transferência identificada na resposta";
		}

		console.log("[AI_AGENT] Generation complete:", {
			hasResponse: !!responseText,
			transferToHuman,
			ticketCreated,
		});

		return {
			message: responseText,
			metadata: {
				toolsUsed,
				transferToHuman,
				ticketCreated,
				escalationReason,
			},
		};
	} catch (error) {
		console.error("[AI_AGENT] Error generating response:", error);
		// Return a safe fallback
		return {
			message: "Desculpe, estou com dificuldades técnicas. Vou transferir você para um de nossos atendentes.",
			metadata: {
				toolsUsed,
				transferToHuman: true,
				ticketCreated: false,
				escalationReason: "Erro técnico no agente AI",
			},
		};
	}
}
