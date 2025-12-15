import { api } from "@/convex/_generated/api";
import { formatPhoneAsBase } from "@/lib/formatting";
import {
	isMessageEvent,
	isStatusUpdate,
	isTemplateEvent,
	mapWhatsAppStatusToAppStatus,
	parseStatusUpdate,
	parseTemplateCategoryUpdate,
	parseTemplateQualityUpdate,
	parseTemplateStatusUpdate,
	parseWebhookIncomingMessage,
} from "@/lib/whatsapp/parsing";
import { db } from "@/services/drizzle";
import { clients } from "@/services/drizzle/schema";
import { whatsappTemplates } from "@/services/drizzle/schema/whatsapp-templates";

import { ConvexHttpClient } from "convex/browser";
import { eq } from "drizzle-orm";
import type { NextApiRequest, NextApiResponse } from "next";

const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN;
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	// Webhook verification (GET request)
	if (req.method === "GET") {
		console.log("[INFO] [WHATSAPP_WEBHOOK] [VERIFY] Query received:", req.query);
		const mode = req.query["hub.mode"];
		const token = req.query["hub.verify_token"];
		const challenge = req.query["hub.challenge"];

		// Check if a token and mode were sent
		if (mode && token) {
			// Check the mode and token sent are correct
			if (mode === "subscribe" && token === VERIFY_TOKEN) {
				// Respond with 200 OK and challenge token from the request
				console.log("WEBHOOK_VERIFIED");
				return res.status(200).send(challenge);
			}

			// Responds with '403 Forbidden' if verify tokens do not match
			console.log("WEBHOOK_VERIFICATION_FAILED");
			return res.status(403).json({ error: "Verification failed" });
		}

		return res.status(400).json({ error: "Missing parameters" });
	}

	// Webhook events (POST request)
	if (req.method === "POST") {
		const body = req.body;

		// Log incoming messages
		console.log("[INFO] [WHATSAPP_WEBHOOK] [POST] Incoming webhook message:", JSON.stringify(body, null, 2));

		// Check if this is a WhatsApp Business Account event
		if (body.object === "whatsapp_business_account") {
			// Initialize Convex client
			if (!CONVEX_URL) {
				console.error("[WHATSAPP_WEBHOOK] Convex URL not configured");
				return res.status(500).json({ error: "Internal server error" });
			}

			const convex = new ConvexHttpClient(CONVEX_URL);

			try {
				if (isTemplateEvent(body)) {
					// Parse template status update
					const statusUpdate = parseTemplateStatusUpdate(body);
					if (statusUpdate?.status) {
						console.log("[WHATSAPP_WEBHOOK] Template status update:", {
							id: statusUpdate.messageTemplateId,
							name: statusUpdate.messageTemplateName,
							status: statusUpdate.status,
							reason: statusUpdate.reason,
						});

						const updateResult = await db
							.update(whatsappTemplates)
							.set({
								status: statusUpdate.status,
								...(statusUpdate.reason && { rejeicao: statusUpdate.reason }),
							})
							.where(eq(whatsappTemplates.whatsappTemplateId, statusUpdate.messageTemplateId))
							.returning({
								id: whatsappTemplates.id,
							});

						if (updateResult.length > 0) {
							console.log(`[WHATSAPP_WEBHOOK] Template status updated: ${statusUpdate.messageTemplateName} -> ${statusUpdate.status}`);
						} else {
							console.warn(`[WHATSAPP_WEBHOOK] Template not found in database: ${statusUpdate.messageTemplateName} (${statusUpdate.messageTemplateId})`);
						}
					}

					// Parse template quality update
					const qualityUpdate = parseTemplateQualityUpdate(body);
					if (qualityUpdate?.quality) {
						console.log("[WHATSAPP_WEBHOOK] Template quality update:", {
							id: qualityUpdate.messageTemplateId,
							name: qualityUpdate.messageTemplateName,
							quality: qualityUpdate.quality,
							previousQuality: qualityUpdate.previousQuality,
							currentLimit: qualityUpdate.currentLimit,
						});

						const updateResult = await db
							.update(whatsappTemplates)
							.set({
								qualidade: qualityUpdate.quality,
							})
							.where(eq(whatsappTemplates.whatsappTemplateId, qualityUpdate.messageTemplateId))
							.returning({
								id: whatsappTemplates.id,
							});

						if (updateResult.length > 0) {
							console.log(`[WHATSAPP_WEBHOOK] Template quality updated: ${qualityUpdate.messageTemplateName} -> ${qualityUpdate.quality}`);
						} else {
							console.warn(`[WHATSAPP_WEBHOOK] Template not found in database: ${qualityUpdate.messageTemplateName} (${qualityUpdate.messageTemplateId})`);
						}
					}

					// Parse template category update
					const categoryUpdate = parseTemplateCategoryUpdate(body);
					if (categoryUpdate?.category) {
						console.log("[WHATSAPP_WEBHOOK] Template category update:", {
							id: categoryUpdate.messageTemplateId,
							name: categoryUpdate.messageTemplateName,
							category: categoryUpdate.category,
							previousCategory: categoryUpdate.previousCategory,
						});

						// Validate category is one of the allowed values
						const validCategories = ["authentication", "marketing", "utility"];
						const normalizedCategory = categoryUpdate.category.toLowerCase();

						const CATEGORY_MAP: Record<string, "AUTENTICAÇÃO" | "MARKETING" | "UTILIDADE"> = {
							authentication: "AUTENTICAÇÃO",
							marketing: "MARKETING",
							utility: "UTILIDADE",
						};
						if (validCategories.includes(normalizedCategory)) {
							const updateResult = await db
								.update(whatsappTemplates)
								.set({
									categoria: CATEGORY_MAP[normalizedCategory as keyof typeof CATEGORY_MAP],
								})
								.where(eq(whatsappTemplates.whatsappTemplateId, categoryUpdate.messageTemplateId))
								.returning({
									id: whatsappTemplates.id,
								});

							if (updateResult.length > 0) {
								console.log(`[WHATSAPP_WEBHOOK] Template category updated: ${categoryUpdate.messageTemplateName} -> ${normalizedCategory}`);
							} else {
								console.warn(
									`[WHATSAPP_WEBHOOK] Template not found in database: ${categoryUpdate.messageTemplateName} (${categoryUpdate.messageTemplateId})`,
								);
							}
						} else {
							console.warn(`[WHATSAPP_WEBHOOK] Invalid category received: ${categoryUpdate.category}`);
						}
					}
				}
				if (isStatusUpdate(body)) {
					// Check if this is a status update
					const statusUpdate = parseStatusUpdate(body);
					if (statusUpdate) {
						const { status, whatsappStatus } = mapWhatsAppStatusToAppStatus(statusUpdate.status);

						await convex.mutation(api.mutations.messages.updateMessageStatus, {
							whatsappMessageId: statusUpdate.whatsappMessageId,
							status,
							whatsappStatus,
						});

						console.log("[WHATSAPP_WEBHOOK] Status updated for message:", statusUpdate.whatsappMessageId);
					}
				}
				// Check if this is an incoming message
				else if (isMessageEvent(body)) {
					console.log("[INFO] [WHATSAPP_WEBHOOK] Handling incoming message:", body);
					const incomingMessage = parseWebhookIncomingMessage(body);

					let clientId: string | null = null;
					const existingClient = await db.query.clients.findFirst({
						where: eq(clients.telefoneBase, formatPhoneAsBase(incomingMessage?.fromPhoneNumber as string)),
					});
					if (existingClient) {
						console.log("[INFO] [WHATSAPP_WEBHOOK] Client already exists:", existingClient);
						clientId = existingClient.id;
					} else {
						console.log("[INFO] [WHATSAPP_WEBHOOK] Client does not exist, inserting new client:", incomingMessage?.fromPhoneNumber);
						const insertClientResponse = await db
							.insert(clients)
							.values({
								nome: incomingMessage?.profileName as string,
								telefone: incomingMessage?.fromPhoneNumber as string,
								telefoneBase: formatPhoneAsBase(incomingMessage?.fromPhoneNumber as string),
							})
							.returning({
								id: clients.id,
							});
						clientId = insertClientResponse[0]?.id;
					}
					if (incomingMessage) {
						let mediaStorageData = null;

						// Handle media messages
						if (incomingMessage.mediaId && incomingMessage.mimeType) {
							try {
								// Download and store media
								mediaStorageData = await convex.action(api.actions.whatsapp.downloadAndStoreWhatsappMedia, {
									mediaId: incomingMessage.mediaId,
									mimeType: incomingMessage.mimeType,
									filename: incomingMessage.filename,
								});
								console.log("[WHATSAPP_WEBHOOK] Media downloaded and stored:", mediaStorageData.storageId);
							} catch (error) {
								console.error("[WHATSAPP_WEBHOOK] Error downloading media:", error);
								// Continue without media if download fails
							}
						}

						// Determine media type
						let midiaTipo: "IMAGEM" | "DOCUMENTO" | "VIDEO" | "AUDIO" | undefined;
						if (incomingMessage.messageType === "image") {
							midiaTipo = "IMAGEM";
						} else if (incomingMessage.messageType === "document") {
							midiaTipo = "DOCUMENTO";
						} else if (incomingMessage.messageType === "video") {
							midiaTipo = "VIDEO";
						} else if (incomingMessage.messageType === "audio") {
							midiaTipo = "AUDIO";
						}

						// Create message in Convex
						await convex.mutation(api.mutations.messages.createMessage, {
							cliente: {
								idApp: clientId,
								nome: incomingMessage.profileName,
								telefone: incomingMessage.fromPhoneNumber,
								telefoneBase: formatPhoneAsBase(incomingMessage.fromPhoneNumber as string),
							},
							autor: {
								idApp: clientId,
								tipo: "cliente",
							},
							conteudo: {
								texto: incomingMessage.textContent || incomingMessage.caption,
								midiaTipo,
								midiaStorageId: mediaStorageData?.storageId,
								midiaMimeType: mediaStorageData?.mimeType,
								midiaFileName: mediaStorageData?.filename,
								midiaFileSize: mediaStorageData?.fileSize,
								midiaWhatsappId: incomingMessage.mediaId,
							},
							whatsappMessageId: incomingMessage.whatsappMessageId,
							whatsappPhoneNumberId: incomingMessage.whatsappPhoneNumberId,
						});

						console.log("[WHATSAPP_WEBHOOK] Message created from:", incomingMessage.fromPhoneNumber, "Type:", incomingMessage.messageType);
					}
				}

				// Always return 200 OK to acknowledge receipt (must be within 20 seconds)
				return res.status(200).json({ success: true });
			} catch (error) {
				console.error("[WHATSAPP_WEBHOOK] Error processing webhook:", error);
				// Still return 200 to prevent WhatsApp from retrying
				return res.status(200).json({ success: true });
			}
		}

		// Return a '404 Not Found' if event is not from a WhatsApp Business Account
		return res.status(404).json({ error: "Event not supported" });
	}

	// Handle other HTTP methods
	return res.status(405).json({ error: "Method not allowed" });
}
