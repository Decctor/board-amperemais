"use node";
import { v } from "convex/values";
import {
	downloadMediaFromWhatsapp,
	sendBasicWhatsappMessage,
	sendMediaWhatsappMessage,
	sendTemplateWhatsappMessage,
	uploadMediaToWhatsapp,
} from "../../lib/whatsapp";
import { internal } from "../_generated/api";
import { action, internalAction } from "../_generated/server";

export const sendWhatsappMessage = internalAction({
	args: {
		fromPhoneNumberId: v.string(),
		messageId: v.id("messages"),
		phoneNumber: v.string(),
		content: v.string(),
	},
	handler: async (ctx, args) => {
		try {
			console.log("[WHATSAPP_ACTION] Sending text message:", args.messageId);
			const response = await sendBasicWhatsappMessage({
				fromPhoneNumberId: args.fromPhoneNumberId,
				toPhoneNumber: args.phoneNumber,
				content: args.content,
			});

			// Update message with WhatsApp message ID
			await ctx.runMutation(internal.mutations.messages.updateMessageAfterSend, {
				messageId: args.messageId,
				whatsappMessageId: response.whatsappMessageId,
				success: true,
			});

			return { success: true, whatsappMessageId: response.whatsappMessageId };
		} catch (error) {
			console.error("[WHATSAPP_ACTION] Error sending message:", error);

			// Mark message as failed
			await ctx.runMutation(internal.mutations.messages.updateMessageAfterSend, {
				messageId: args.messageId,
				success: false,
			});

			throw error;
		}
	},
});

export const sendWhatsappMediaMessage = internalAction({
	args: {
		fromPhoneNumberId: v.string(),
		messageId: v.id("messages"),
		phoneNumber: v.string(),
		storageId: v.id("_storage"),
		mediaType: v.optional(v.union(v.literal("IMAGEM"), v.literal("VIDEO"), v.literal("AUDIO"), v.literal("DOCUMENTO"))),
		mimeType: v.optional(v.string()),
		filename: v.optional(v.string()),
		caption: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		try {
			console.log("[WHATSAPP_ACTION] Sending media message:", args.messageId);

			// Get file from Convex storage
			const fileBlob = await ctx.storage.get(args.storageId);
			if (!fileBlob) {
				throw new Error("Arquivo não encontrado no storage");
			}

			// Convert blob to buffer
			const fileBuffer = Buffer.from(await fileBlob?.arrayBuffer());

			// Determine WhatsApp media type
			let whatsappMediaType: "image" | "document" = "document";
			if (args.mediaType === "IMAGEM" || args.mimeType?.startsWith("image/")) {
				whatsappMediaType = "image";
			}

			// Upload media to WhatsApp
			const uploadResponse = await uploadMediaToWhatsapp({
				fromPhoneNumberId: args.fromPhoneNumberId,
				fileBuffer,
				mimeType: args.mimeType || "application/octet-stream",
				filename: args.filename || "arquivo",
			});

			// Send media message
			const sendResponse = await sendMediaWhatsappMessage({
				fromPhoneNumberId: args.fromPhoneNumberId,
				toPhoneNumber: args.phoneNumber,
				mediaId: uploadResponse.mediaId,
				mediaType: whatsappMediaType,
				caption: args.caption,
				filename: args.filename,
			});

			// Update message with WhatsApp message ID
			await ctx.runMutation(internal.mutations.messages.updateMessageAfterSend, {
				messageId: args.messageId,
				whatsappMessageId: sendResponse.whatsappMessageId,
				success: true,
			});

			return { success: true, whatsappMessageId: sendResponse.whatsappMessageId };
		} catch (error) {
			console.error("[WHATSAPP_ACTION] Error sending media message:", error);

			// Mark message as failed
			await ctx.runMutation(internal.mutations.messages.updateMessageAfterSend, {
				messageId: args.messageId,
				success: false,
			});

			throw error;
		}
	},
});

export const sendWhatsappTemplate = internalAction({
	args: {
		fromPhoneNumberId: v.string(),
		messageId: v.id("messages"),
		phoneNumber: v.string(),
		templatePayload: v.any(),
	},
	handler: async (ctx, args) => {
		try {
			console.log("[WHATSAPP_ACTION] Sending template message:", args.messageId);
			const response = await sendTemplateWhatsappMessage({
				fromPhoneNumberId: args.fromPhoneNumberId,
				templatePayload: args.templatePayload,
			});

			// Update message with WhatsApp message ID
			await ctx.runMutation(internal.mutations.messages.updateMessageAfterSend, {
				messageId: args.messageId,
				whatsappMessageId: response.whatsappMessageId,
				success: true,
			});

			return { success: true, whatsappMessageId: response.whatsappMessageId };
		} catch (error) {
			console.error("[WHATSAPP_ACTION] Error sending template:", error);

			// Mark message as failed
			await ctx.runMutation(internal.mutations.messages.updateMessageAfterSend, {
				messageId: args.messageId,
				success: false,
			});

			throw error;
		}
	},
});

export const downloadAndStoreWhatsappMedia = action({
	args: {
		mediaId: v.string(),
		mimeType: v.string(),
		filename: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		try {
			console.log("[WHATSAPP_ACTION] Downloading media:", args.mediaId);

			// Download media from WhatsApp
			const downloadResponse = await downloadMediaFromWhatsapp({
				mediaId: args.mediaId,
			});

			// Store in Convex storage
			const blob = new Blob([downloadResponse.fileBuffer as unknown as ArrayBuffer], { type: downloadResponse.mimeType });
			const storageId = await ctx.storage.store(blob);

			return {
				storageId,
				mimeType: downloadResponse.mimeType,
				fileSize: downloadResponse.fileSize,
				filename: args.filename,
			};
		} catch (error) {
			console.error("[WHATSAPP_ACTION] Error downloading media:", error);
			throw error;
		}
	},
});
