import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

import { getAgentResponse } from "@/lib/ai-agent";
import { db } from "@/services/drizzle";
import { ConvexHttpClient } from "convex/browser";

import type { NextApiRequest, NextApiResponse } from "next";
import z from "zod";
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;

const GenerateAIResponseInputSchema = z.object({
	chatId: z.string({
		required_error: "O ID do chat é obrigatório",
		invalid_type_error: "O ID do chat deve ser uma string",
	}),
});

export type GenerateAIResponseInput = z.infer<typeof GenerateAIResponseInputSchema>;

const GenerateAIResponseOutputSchema = z.union([
	z.object({
		success: z.literal(true, {
			required_error: "A flag de sucesso é obrigatória",
			invalid_type_error: "A flag de sucesso deve ser um booleano",
		}),
		message: z.string({
			required_error: "A mensagem é obrigatória",
			invalid_type_error: "A mensagem deve ser uma string",
		}),
		metadata: z
			.object({
				toolsUsed: z.array(z.string()),
				serviceDescription: z.string(),
			})
			.optional(),
	}),
	z.object({
		success: z.literal(false, {
			required_error: "A flag de sucesso é obrigatória",
			invalid_type_error: "A flag de sucesso deve ser um booleano",
		}),
		error: z.string({
			required_error: "O erro é obrigatório",
			invalid_type_error: "O erro deve ser uma string",
		}),
		details: z.array(
			z.string({
				required_error: "Os detalhes são obrigatórios",
				invalid_type_error: "Os detalhes devem ser uma array de strings",
			}),
		),
	}),
]);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	// Only allow POST requests
	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	try {
		// First, we validate the input
		const validationResult = GenerateAIResponseInputSchema.safeParse(req.body);

		if (!validationResult.success) {
			return res.status(400).json({
				success: false,
				error: "Dados inválidos",
				details: validationResult.error.errors,
			});
		}

		const { chatId } = validationResult.data;

		// Second, we intialize the Convex Client and get the chat summary
		const convex = new ConvexHttpClient(CONVEX_URL as string);
		const chatSummary = await convex.query(api.queries.chat.getChatSummary, {
			chatId: chatId as Id<"chats">,
		});

		// Enrich client data with additional fields from database

		console.log("[INFO] [GENERATE_AI_RESPONSE] Calling AI Agent with:", {
			chatId: chatSummary.id,
			clientId: chatSummary.cliente.idApp,
		});

		// Generate AI response with enriched data
		const aiResponse = await getAgentResponse({
			details: {
				id: chatSummary.id,
				cliente: chatSummary.cliente,
				ultimasMensagens: chatSummary.ultimasMensagens,
				atendimentoAberto: chatSummary.atendimentoAberto,
			},
		});

		console.log("[API] [GERAR_RESPOSTA] AI Response generated:", {
			toolsUsed: aiResponse.metadata.toolsUsed,
			serviceDescription: aiResponse.metadata.serviceDescription,
		});

		// Return response with metadata
		const validatedResponse = GenerateAIResponseOutputSchema.parse({
			success: true,
			message: aiResponse.message,
			metadata: aiResponse.metadata,
		});

		return res.status(200).json(validatedResponse);
	} catch (error) {
		console.error("[API] [GERAR_RESPOSTA] Error:", error);
		const validatedResponse = GenerateAIResponseOutputSchema.parse({
			success: false,
			error: error instanceof Error ? error.message : "Erro desconhecido",
			details: [error instanceof Error ? error.message : "Erro desconhecido"],
		});
		return res.status(500).json(validatedResponse);
	}
}
export type TGenerateAIResponseOutput = z.infer<typeof GenerateAIResponseOutputSchema>;
