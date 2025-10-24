"use node";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";

type TGenerateAIResponseOutput =
	| {
			success: true;
			message: string;
			metadata?: {
				toolsUsed: string[];
				transferToHuman: boolean;
				ticketCreated: boolean;
				escalationReason?: string;
			};
	  }
	| {
			success: false;
			error: string;
			details: string[];
	  };

const NEXT_API_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const generateAIResponse = internalAction({
	args: {
		chatId: v.id("chats"),
		scheduleAt: v.string(),
	},
	handler: async (ctx, args): Promise<{ success: boolean; transferred?: boolean; error?: string }> => {
		try {
			console.log("[AI_ACTION] Generating AI response for chat", args.chatId);

			// Get chat summary
			const chatSummary = await ctx.runQuery(internal.queries.chat.getChatSummary, {
				chatId: args.chatId,
			});

			if (!chatSummary) {
				throw new Error("Chat not found");
			}

			const lastMessageDate = chatSummary.ultimaMensagemData ? new Date(chatSummary.ultimaMensagemData) : null;
			const scheduleAtDate = args.scheduleAt ? new Date(args.scheduleAt) : null;
			if (lastMessageDate && scheduleAtDate && lastMessageDate > scheduleAtDate) {
				console.log("[AI_ACTION] New messages arrived after schedule, skipping...");
				return {
					success: true,
					transferred: false,
				};
			}

			// Call the Next.js API endpoint with chat summary
			const response: Response = await fetch(`${NEXT_API_URL}/api/integrations/ai/generate-response`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					chatSummary,
				}),
			});

			if (!response.ok) {
				throw new Error(`API request failed with status ${response.status}`);
			}

			const result: TGenerateAIResponseOutput = await response.json();
			console.log("[AI_ACTION] AI response result:", {
				success: result.success,
				hasMetadata: result.success ? !!result.metadata : false,
				toolsUsed: result.success && result.metadata ? result.metadata.toolsUsed : [],
				transferToHuman: result.success && result.metadata ? result.metadata.transferToHuman : false,
			});

			if (!result.success) {
				throw new Error(`Falha na geração da resposta da IA: ${result.error || "Erro desconhecido"}`);
			}

			// Get chat details
			const chat = await ctx.runQuery(internal.queries.chat.getChatInternal, {
				chatId: args.chatId,
			});

			if (!chat) {
				throw new Error("Chat não encontrado.");
			}

			// Handle transfer to human if needed
			if (result.metadata?.transferToHuman) {
				console.log("[AI_ACTION] Transfer to human requested. Reason:", result.metadata.escalationReason);

				// Create or update service ticket for human handoff
				const conversationSummary = chatSummary.ultimasMensagens
					.slice(0, 5)
					.reverse()
					.map((msg) => {
						const role = msg.autorTipo === "cliente" ? "Cliente" : msg.autorTipo === "ai" ? "AI" : "Atendente";
						return `${role}: ${msg.conteudoTexto || "[mídia]"}`;
					})
					.join("\n");

				await ctx.runMutation(internal.mutations.services.transferServiceToHuman, {
					chatId: args.chatId,
					clienteId: chat.clienteId,
					reason: result.metadata.escalationReason || "Solicitação de transferência pelo agente AI",
					conversationSummary,
				});

				// Still send the AI message before transferring
				await ctx.runMutation(internal.mutations.messages.createAIMessage, {
					chatId: args.chatId,
					conteudo: {
						texto: result.message,
					},
				});

				return {
					success: true,
					transferred: true,
				};
			}

			// Handle service ticket creation if needed (without transfer)
			if (result.metadata?.ticketCreated) {
				console.log("[AI_ACTION] Service ticket creation requested");

				// Extract ticket description from the AI response or use a default
				const ticketDescription = result.message.substring(0, 500); // Use first 500 chars of response

				await ctx.runMutation(internal.mutations.services.createServiceFromAI, {
					chatId: args.chatId,
					clienteId: chat.clienteId,
					descricao: ticketDescription,
				});

				console.log("[AI_ACTION] Service ticket created successfully");
			}

			// Send AI message
			await ctx.runMutation(internal.mutations.messages.createAIMessage, {
				chatId: args.chatId,
				conteudo: {
					texto: result.message,
				},
			});

			return {
				success: true,
				transferred: false,
			};
		} catch (error) {
			console.error("[AI_ACTION] Error generating AI response for chat", args.chatId, ":", error);
			// Don't throw - we don't want to fail the whole process
			return {
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}
	},
});
