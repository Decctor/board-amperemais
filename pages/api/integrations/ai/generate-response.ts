import { getAgentResponse } from "@/lib/ai-agent";
import { db } from "@/services/drizzle";

import type { NextApiRequest, NextApiResponse } from "next";
import z from "zod";

const GenerateAIResponseInputSchema = z.object({
	chatSummary: z.object({
		id: z.string(),
		cliente: z.object({
			idApp: z.string(),
			nome: z.string(),
			telefone: z.string(),
			email: z.string().optional(),
			cpfCnpj: z.string().optional(),
		}),
		ultimasMensagens: z.array(
			z.object({
				id: z.string(),
				autorTipo: z.union([z.literal("cliente"), z.literal("usuario"), z.literal("ai")]),
				conteudoTipo: z.union([z.literal("IMAGEM"), z.literal("DOCUMENTO"), z.literal("VIDEO"), z.literal("AUDIO")]).optional(),
				conteudoTexto: z.string().optional(),
				conteudoMidiaUrl: z.string().optional(),
				dataEnvio: z.number(),
				atendimentoId: z.string().optional(),
			}),
		),
		atendimentoAberto: z.union([
			z.object({
				id: z.string(),
				descricao: z.string(),
				status: z.union([z.literal("PENDENTE"), z.literal("EM_ANDAMENTO"), z.literal("CONCLUIDO")]),
			}),
			z.literal(false),
		]),
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
				transferToHuman: z.boolean(),
				ticketCreated: z.boolean(),
				escalationReason: z.string().optional(),
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
		// Validate input
		const validationResult = GenerateAIResponseInputSchema.safeParse(req.body);

		if (!validationResult.success) {
			return res.status(400).json({
				success: false,
				error: "Dados inválidos",
				details: validationResult.error.errors,
			});
		}

		const { chatSummary } = validationResult.data;

		// Fetch full client data including RFM analysis
		const client = await db.query.clients.findFirst({
			where: (fields, { eq }) => eq(fields.id, chatSummary.cliente.idApp),
		});

		if (!client) {
			return res.status(400).json({
				success: false,
				error: "Cliente não encontrado",
				details: ["Cliente não encontrado"],
			});
		}

		// Enrich client data with additional fields from database
		const enrichedCliente = {
			...chatSummary.cliente,
			cidade: client.nome, // You might want to add these fields to your schema if available
			uf: undefined,
			cep: undefined,
			bairro: undefined,
			endereco: undefined,
			numeroOuIdentificador: undefined,
		};

		// Generate AI response with enriched data
		const aiResponse = await getAgentResponse({
			details: {
				id: chatSummary.id,
				cliente: enrichedCliente,
				ultimasMensagens: chatSummary.ultimasMensagens,
				atendimentoAberto: chatSummary.atendimentoAberto,
			},
		});

		console.log("[API] [GERAR_RESPOSTA] AI Response generated:", {
			toolsUsed: aiResponse.metadata.toolsUsed,
			transferToHuman: aiResponse.metadata.transferToHuman,
			ticketCreated: aiResponse.metadata.ticketCreated,
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
