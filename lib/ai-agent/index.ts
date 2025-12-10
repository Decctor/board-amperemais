import type { Id } from "@/convex/_generated/dataModel";
import { createOpenAI } from "@ai-sdk/openai";
import { Experimental_Agent as Agent, Output, stepCountIs } from "ai";
import z from "zod";
import { ENHANCED_SYSTEM_PROMPT, detectEscalationNeeded } from "./prompts";
import { agentTools } from "./tools";

// const AI_GATEWAY_KEY = process.env.AI_GATEWAY_API_KEY;
const AI_GATEWAY_KEY = process.env.OPENAI_API_KEY;

// Configure OpenAI with Vercel AI Gateway
const openai = createOpenAI({
	apiKey: AI_GATEWAY_KEY,
	// baseURL: "https://gateway.ai.cloudflare.com/v1/YOUR_ACCOUNT_ID/YOUR_GATEWAY_ID/openai", // Update with your gateway URL
});

type TDetails = {
	id: string;
	cliente: {
		idApp: string; // ID in the main database (Drizzle)
		nome: string;
		telefone: string;
		email?: string | null;
		cpfCnpj?: string;
		localizacaoCep?: string;
		localizacaoEstado?: string;
		localizacaoCidade?: string;
		localizacaoBairro?: string;
		localizacaoLogradouro?: string;
		localizacaoNumero?: string;
		localizacaoComplemento?: string;
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
	atendimentoAberto: {
		id: string;
		descricao: string;
		status: "PENDENTE" | "EM_ANDAMENTO" | "CONCLUIDO";
	} | null;
};

type AIResponse = {
	message: string;
	metadata: {
		toolsUsed: string[];
		serviceDescription: string;
	};
};

export const agent = new Agent({
	model: openai("gpt-5"),
	system: ENHANCED_SYSTEM_PROMPT,
	tools: agentTools,
	experimental_output: Output.object({
		schema: z.object({
			message: z
				.string()
				.describe("Mensagem CONCISA para WhatsApp. MÁXIMO 3-5 frases curtas. Seja DIRETO e OBJETIVO. Use apenas 1 emoji (máximo). Não repita saudações."),
			serviceDescription: z.string().describe("Descrição atualizada do atendimento para uso interno (pode ser detalhado)."),
		}),
	}),
	stopWhen: stepCountIs(20),
});

export async function getAgentResponse({ details }: { details: TDetails }): Promise<AIResponse> {
	const toolsUsed: string[] = [];
	const ticketCreated = false;

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

		console.log("[AI_AGENT] Conversation history:", conversationHistory);

		// Check if immediate escalation is needed based on keywords
		const lastClientMessage = details.ultimasMensagens.find((msg) => msg.autorTipo === "cliente");
		const lastMessageText = lastClientMessage?.conteudoTexto || "";

		// Pre-check: Auto-transfer for obvious cases to save API calls and ensure reliability
		const shouldAutoTransfer = detectEscalationNeeded(lastMessageText);
		if (shouldAutoTransfer && lastMessageText) {
			console.log("[AI_AGENT] Auto-transfer triggered by keywords:", lastMessageText);
			return {
				message: "Vou transferir você para nossa equipe que pode ajudar melhor com isso! 😊",
				metadata: {
					toolsUsed: ["auto_transfer_precheck"],
					serviceDescription: `Transferência automática detectada. Última mensagem: ${lastMessageText}`,
				},
			};
		}

		const userPrompt = `Você está encarregado de responder ao cliente.

### INFORMAÇÕES DO CLIENTE
- ID no Sistema: ${details.cliente.idApp}
- Nome: ${details.cliente.nome}
- Telefone: ${details.cliente.telefone}
${details.cliente.email ? `- Email: ${details.cliente.email}` : ""}
${details.cliente.cpfCnpj ? `- CPF/CNPJ: ${details.cliente.cpfCnpj}` : ""}
${details.cliente.localizacaoCep ? `- CEP: ${details.cliente.localizacaoCep}` : ""}
${details.cliente.localizacaoEstado ? `- Estado: ${details.cliente.localizacaoEstado}` : ""}
${details.cliente.localizacaoCidade ? `- Cidade: ${details.cliente.localizacaoCidade}` : ""}
${details.cliente.localizacaoBairro ? `- Bairro: ${details.cliente.localizacaoBairro}` : ""}
${details.cliente.localizacaoLogradouro ? `- Logradouro: ${details.cliente.localizacaoLogradouro}` : ""}
${details.cliente.localizacaoNumero ? `- Número: ${details.cliente.localizacaoNumero}` : ""}
${details.cliente.localizacaoComplemento ? `- Complemento: ${details.cliente.localizacaoComplemento}` : ""}

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


Analise a conversa e responda apropriadamente. Use suas ferramentas quando necessário para fornecer um atendimento personalizado e de alta qualidade.`;

		// Generate response using AI with tools
		const result = await agent.generate({
			prompt: userPrompt,
		});

		console.log("[AI_AGENT] Complete result:", result);
		const experimental_output = result.experimental_output;
		if (!experimental_output) {
			console.log("[AI_AGENT] No experimental_output");
			throw new Error("Não foi possível gerar a resposta da IA");
		}
		return {
			message: experimental_output.message,
			metadata: {
				toolsUsed,
				serviceDescription: experimental_output.serviceDescription,
			},
		};
	} catch (error) {
		console.error("[AI_AGENT] Error generating response:", error);
		// Return a safe fallback
		return {
			message: "Desculpe, estou com dificuldades técnicas. Vou transferir você para um de nossos atendentes.",
			metadata: {
				toolsUsed,
				serviceDescription: "Erro técnico no agente AI",
			},
		};
	}
}
