"use node";
import { openai } from "@ai-sdk/openai";
import { generateText, experimental_transcribe as transcribe } from "ai";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";

type TGenerateAIResponseOutput =
	| {
			success: true;
			message: string;
			metadata?: {
				toolsUsed: string[];
				serviceDescription: string;
				escalation: {
					applicable: boolean;
					reason?: string;
				};
				tokensUsed: number;
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
			const chat = await ctx.runQuery(internal.queries.chat.getChatInternal, {
				chatId: args.chatId,
			});
			if (!chat) {
				throw new Error("Chat não encontrado.");
			}

			const lastMessageDate = chat.ultimaInteracaoClienteData ? new Date(chat.ultimaInteracaoClienteData) : null;
			const scheduleAtDate = args.scheduleAt ? new Date(args.scheduleAt) : null;
			console.log("[AI_ACTION] Dates state:", {
				lastMessageDate,
				scheduleAtDate,
			});
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
					chatId: args.chatId,
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
				serviceDescription: result.success && result.metadata ? result.metadata.serviceDescription : "",
				escalation: result.success && result.metadata ? result.metadata.escalation : { applicable: false, reason: undefined },
				tokensUsed: result.success && result.metadata ? result.metadata.tokensUsed : 0,
			});

			if (!result.success) {
				throw new Error(`Falha na geração da resposta da IA: ${result.error || "Erro desconhecido"}`);
			}

			// Send AI message
			await ctx.runMutation(internal.mutations.messages.createAIMessage, {
				chatId: args.chatId,
				contentText: result.message,
				serviceDescription: result.metadata?.serviceDescription || "",
				serviceEscalation: result.metadata?.escalation || { applicable: false, reason: undefined },
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

// Helper function to process audio files with Whisper
async function processAudio(fileBuffer: Buffer, mimeType: string): Promise<{ transcription: string; summary: string }> {
	console.log("[AI_MEDIA] Processing audio file");

	try {
		const transcriptionResponse = await transcribe({
			model: openai.transcription("whisper-1"),
			audio: fileBuffer,
		});

		const transcription = transcriptionResponse.text;

		// Generate summary using GPT-4
		const summaryResult = await generateText({
			model: openai("gpt-4o-mini"),
			prompt: `Resuma o seguinte áudio transcrito em português de forma concisa (máximo 3 linhas):\n\n${transcription}`,
		});

		return {
			transcription,
			summary: summaryResult.text,
		};
	} catch (error) {
		console.error("[AI_MEDIA] Error processing audio:", error);
		throw error;
	}
}

// Helper function to process images with GPT-4 Vision
async function processImage(fileBuffer: Buffer, mimeType: string): Promise<{ description: string; summary: string }> {
	console.log("[AI_MEDIA] Processing image file");

	try {
		// Convert buffer to base64
		const base64Image = fileBuffer.toString("base64");
		const dataUrl = `data:${mimeType};base64,${base64Image}`;

		// Generate detailed description using GPT-4 Vision
		const descriptionResult = await generateText({
			model: openai("gpt-4o"),
			messages: [
				{
					role: "user",
					content: [
						{
							type: "text",
							text:
								"Descreva esta imagem em português de forma detalhada, incluindo todos os elementos visuais relevantes, texto visível (se houver), e contexto geral.",
						},
						{
							type: "image",
							image: dataUrl,
						},
					],
				},
			],
		});

		// Generate concise summary
		const summaryResult = await generateText({
			model: openai("gpt-4o-mini"),
			prompt: `Resuma a seguinte descrição de imagem em português de forma concisa (máximo 2 linhas):\n\n${descriptionResult.text}`,
		});

		return {
			description: descriptionResult.text,
			summary: summaryResult.text,
		};
	} catch (error) {
		console.error("[AI_MEDIA] Error processing image:", error);
		throw error;
	}
}

// Helper function to process videos
async function processVideo(fileBuffer: Buffer, mimeType: string): Promise<{ analysis: string; summary: string }> {
	console.log("[AI_MEDIA] Processing video file");

	try {
		// For now, we'll extract the first frame as an image and analyze it
		// In production, you might want to extract audio and multiple frames
		// This is a simplified implementation

		// Note: Video processing is complex. For a complete solution, you'd need:
		// 1. Extract audio track and transcribe it
		// 2. Extract key frames
		// 3. Analyze frames with Vision API
		// For now, we'll provide a basic placeholder

		const analysis = `Vídeo recebido (${mimeType}). Processamento completo de vídeo requer extração de frames e áudio. Considere implementar com ffmpeg para análise completa.`;
		const summary = "Vídeo recebido - processamento básico";

		return { analysis, summary };
	} catch (error) {
		console.error("[AI_MEDIA] Error processing video:", error);
		throw error;
	}
}

// Helper function to process documents
async function processDocument(fileBuffer: Buffer, mimeType: string, filename?: string): Promise<{ extraction: string; summary: string }> {
	console.log("[AI_MEDIA] Processing document file");

	try {
		let textContent = "";

		// Try to extract text based on mime type
		if (mimeType === "application/pdf") {
			// For PDF files, we'd need a PDF parser library
			// For now, we'll use a placeholder
			textContent = `Documento PDF recebido: ${filename || "documento.pdf"}. Para extração completa de texto, considere adicionar a biblioteca 'pdf-parse'.`;
		} else if (mimeType.includes("text/") || mimeType.includes("application/json")) {
			// Plain text files
			textContent = fileBuffer.toString("utf-8");
		} else {
			textContent = `Documento recebido: ${filename || "documento"} (${mimeType})`;
		}

		// Generate key information extraction
		const extractionResult = await generateText({
			model: openai("gpt-4o-mini"),
			prompt: `Analise o seguinte documento e extraia as informações-chave mais importantes em português:\n\n${textContent}`,
		});

		// Generate summary
		const summaryResult = await generateText({
			model: openai("gpt-4o-mini"),
			prompt: `Resuma o seguinte documento em português de forma concisa (máximo 3 linhas):\n\n${extractionResult.text}`,
		});

		return {
			extraction: extractionResult.text,
			summary: summaryResult.text,
		};
	} catch (error) {
		console.error("[AI_MEDIA] Error processing document:", error);
		throw error;
	}
}

// Main action to process media with AI
export const processMediaWithAI = internalAction({
	args: {
		messageId: v.id("messages"),
		storageId: v.id("_storage"),
		mediaType: v.union(v.literal("IMAGEM"), v.literal("VIDEO"), v.literal("AUDIO"), v.literal("DOCUMENTO")),
		mimeType: v.string(),
		filename: v.optional(v.string()),
	},
	handler: async (ctx, args): Promise<{ success: boolean; processedText?: string; summary?: string; error?: string }> => {
		console.log("[AI_MEDIA] Processing media for message:", args.messageId, "Type:", args.mediaType);

		try {
			// Get file from Convex storage
			const fileBlob = await ctx.storage.get(args.storageId);
			if (!fileBlob) {
				throw new Error("Arquivo não encontrado no storage");
			}

			// Convert blob to buffer
			const fileBuffer = Buffer.from(await fileBlob.arrayBuffer());

			let processedText = "";
			let summary = "";

			// Process based on media type
			switch (args.mediaType) {
				case "AUDIO": {
					const audioResult = await processAudio(fileBuffer, args.mimeType);
					processedText = audioResult.transcription;
					summary = audioResult.summary;
					break;
				}
				case "IMAGEM": {
					const imageResult = await processImage(fileBuffer, args.mimeType);
					processedText = imageResult.description;
					summary = imageResult.summary;
					break;
				}
				case "VIDEO": {
					const videoResult = await processVideo(fileBuffer, args.mimeType);
					processedText = videoResult.analysis;
					summary = videoResult.summary;
					break;
				}
				case "DOCUMENTO": {
					const documentResult = await processDocument(fileBuffer, args.mimeType, args.filename);
					processedText = documentResult.extraction;
					summary = documentResult.summary;
					break;
				}
				default:
					throw new Error(`Tipo de mídia não suportado: ${args.mediaType}`);
			}

			// Update message with processed content
			await ctx.runMutation(internal.mutations.messages.updateMessageMediaProcessing, {
				messageId: args.messageId,
				conteudoMidiaTextoProcessado: processedText,
				conteudoMidiaTextoProcessadoResumo: summary,
			});

			console.log("[AI_MEDIA] Media processed successfully for message:", args.messageId);

			return {
				success: true,
				processedText,
				summary,
			};
		} catch (error) {
			console.error("[AI_MEDIA] Error processing media for message", args.messageId, ":", error);
			return {
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}
	},
});
