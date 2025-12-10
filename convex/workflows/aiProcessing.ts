import { v } from "convex/values";
import { internal } from "../_generated/api";
import { workflow } from "./index";

export const aiMessageProcessingWorkflow = workflow.define({
	args: {
		messageId: v.id("messages"),
		chatId: v.id("chats"),
		media: v.optional(
			v.object({
				storageId: v.id("_storage"),
				mediaType: v.union(v.literal("IMAGEM"), v.literal("VIDEO"), v.literal("AUDIO"), v.literal("DOCUMENTO")),
				mimeType: v.optional(v.string()),
				filename: v.optional(v.string()),
			}),
		),
		sendAIResponse: v.boolean(),
	},
	returns: v.object({ success: v.boolean() }),
	handler: async (step, args): Promise<{ success: boolean }> => {
		console.log("[AI_WORKFLOW] Starting AI processing workflow for message:", args.messageId);

		let mediaProcessingFailed = false;

		// STEP 1: Process media if present
		if (args.media) {
			console.log("[AI_WORKFLOW] Processing media for message:", args.messageId);

			const mediaResult = await step.runAction(
				internal.actions.ai.processMediaWithAI,
				{
					messageId: args.messageId,
					storageId: args.media.storageId,
					mediaType: args.media.mediaType,
					mimeType: args.media.mimeType || "application/octet-stream",
					filename: args.media.filename,
				},
				{
					name: "process-media",
					retry: {
						maxAttempts: 3,
						initialBackoffMs: 100,
						base: 2,
					},
				},
			);

			if (!mediaResult.success) {
				console.error("[AI_WORKFLOW] Media processing failed after retries for message:", args.messageId);
				mediaProcessingFailed = true;
				// Cancel AI response generation by returning early
				return { success: false };
			}

			console.log("[AI_WORKFLOW] Media processed successfully for message:", args.messageId);
		}

		// STEP 2: Generate AI response if needed
		// Only if:
		// - requiresAIResponse is true
		// - author is a client
		// - media processing didn't fail
		if (args.sendAIResponse && !mediaProcessingFailed) {
			console.log("[AI_WORKFLOW] Scheduling AI response generation for chat:", args.chatId);

			const aiResponseResult = await step.runAction(
				internal.actions.ai.generateAIResponse,
				{
					chatId: args.chatId,
					scheduleAt: new Date().toISOString(),
				},
				{
					name: "generate-ai-response",
					runAfter: 5000, // 5 second delay
					retry: false, // Don't retry AI response generation
				},
			);

			if (aiResponseResult.success) {
				console.log("[AI_WORKFLOW] AI response generated successfully for chat:", args.chatId);
			} else {
				console.error("[AI_WORKFLOW] AI response generation failed for chat:", args.chatId, "Error:", aiResponseResult.error);
				return { success: false };
			}
		}
		return { success: true };
	},
});
