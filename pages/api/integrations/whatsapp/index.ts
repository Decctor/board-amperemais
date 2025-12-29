import { api } from "@/convex/_generated/api";
import { formatPhoneAsBase } from "@/lib/formatting";
import {
	isMessageEchoEvent,
	isMessageEvent,
	isStatusUpdate,
	isTemplateEvent,
	mapWhatsAppStatusToAppStatus,
	parseStatusUpdate,
	parseTemplateCategoryUpdate,
	parseTemplateQualityUpdate,
	parseTemplateStatusUpdate,
	parseWebhookIncomingMessage,
	parseWebhookMessageEcho,
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

						// Note: WhatsApp webhook updates templates by whatsappTemplateId which is unique across organizations
						// The update will affect the template regardless of organization, which is correct behavior
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

					if (!incomingMessage) {
						console.error("[WHATSAPP_WEBHOOK] Failed to parse incoming message");
						return res.status(200).json({ success: true });
					}

					// Determine organization from whatsappPhoneNumberId
					let organizacaoId: string | null = null;
					let whatsappToken: string | null = null;
					try {
						const whatsappConnection = await convex.query(api.queries.connections.getWhatsappConnectionByPhoneNumberId, {
							whatsappPhoneNumberId: incomingMessage.whatsappPhoneNumberId,
						});

						if (whatsappConnection) {
							organizacaoId = whatsappConnection.organizacaoId as string;
							whatsappToken = whatsappConnection.token as string;
							console.log("[INFO] [WHATSAPP_WEBHOOK] Found organization:", organizacaoId);
						} else {
							console.warn("[WHATSAPP_WEBHOOK] No WhatsApp connection found for phone number ID:", incomingMessage.whatsappPhoneNumberId);
							return res.status(200).json({ success: true });
						}
					} catch (error) {
						console.error("[WHATSAPP_WEBHOOK] Error querying WhatsApp connection:", error);
						return res.status(200).json({ success: true });
					}

					// Now search for client within the organization
					let clientId: string | null = null;
					const existingClient = await db.query.clients.findFirst({
						where: (fields, { and, eq }) =>
							and(eq(fields.telefoneBase, formatPhoneAsBase(incomingMessage.fromPhoneNumber as string)), eq(fields.organizacaoId, organizacaoId)),
					});

					if (existingClient) {
						console.log("[INFO] [WHATSAPP_WEBHOOK] Client already exists:", existingClient);
						clientId = existingClient.id;
					} else {
						console.log("[INFO] [WHATSAPP_WEBHOOK] Client does not exist, creating new client:", incomingMessage.fromPhoneNumber);
						try {
							const insertedClient = await db
								.insert(clients)
								.values({
									organizacaoId: organizacaoId,
									nome: incomingMessage.profileName,
									telefone: incomingMessage.fromPhoneNumber,
									telefoneBase: formatPhoneAsBase(incomingMessage.fromPhoneNumber as string),
									canalAquisicao: "WHATSAPP",
								})
								.returning({ id: clients.id });

							clientId = insertedClient[0]?.id ?? null;
							console.log("[INFO] [WHATSAPP_WEBHOOK] New client created:", clientId);
						} catch (error) {
							console.error("[WHATSAPP_WEBHOOK] Error creating client:", error);
							// Continue without client - message will be handled but not linked to a client in the app
						}
					}

					// Skip message processing if we couldn't determine client and organization
					if (!incomingMessage || !clientId) {
						console.warn("[WHATSAPP_WEBHOOK] Cannot process message without client ID");
						return res.status(200).json({ success: true });
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
							whatsappToken: whatsappToken as string,
						});

						console.log("[WHATSAPP_WEBHOOK] Message created from:", incomingMessage.fromPhoneNumber, "Type:", incomingMessage.messageType);
					}
				}
				// Handle SMB Message Echoes (WhatsApp Coexistence)
				// These are messages sent from the WhatsApp Business phone app
				else if (isMessageEchoEvent(body)) {
					console.log("[INFO] [WHATSAPP_WEBHOOK] Handling message echo (Coexistence):", body);
					const messageEcho = parseWebhookMessageEcho(body);

					if (!messageEcho) {
						console.error("[WHATSAPP_WEBHOOK] Failed to parse message echo");
						return res.status(200).json({ success: true });
					}

					// Determine organization from whatsappPhoneNumberId
					let organizacaoId: string | null = null;
					try {
						const whatsappConnection = await convex.query(api.queries.connections.getWhatsappConnectionByPhoneNumberId, {
							whatsappPhoneNumberId: messageEcho.whatsappPhoneNumberId,
						});

						if (whatsappConnection) {
							organizacaoId = whatsappConnection.organizacaoId as string;
							console.log("[INFO] [WHATSAPP_WEBHOOK] [ECHO] Found organization:", organizacaoId);
						} else {
							console.warn("[WHATSAPP_WEBHOOK] [ECHO] No WhatsApp connection found for phone number ID:", messageEcho.whatsappPhoneNumberId);
							return res.status(200).json({ success: true });
						}
					} catch (error) {
						console.error("[WHATSAPP_WEBHOOK] [ECHO] Error querying WhatsApp connection:", error);
						return res.status(200).json({ success: true });
					}

					// Search for the client (recipient) within the organization
					let clientId: string | null = null;
					const existingClient = await db.query.clients.findFirst({
						where: (fields, { and, eq }) =>
							and(eq(fields.telefoneBase, formatPhoneAsBase(messageEcho.toPhoneNumber as string)), eq(fields.organizacaoId, organizacaoId)),
					});

					if (existingClient) {
						console.log("[INFO] [WHATSAPP_WEBHOOK] [ECHO] Client already exists:", existingClient);
						clientId = existingClient.id;
					} else {
						console.log("[INFO] [WHATSAPP_WEBHOOK] [ECHO] Client does not exist, creating new client:", messageEcho.toPhoneNumber);
						try {
							const insertedClient = await db
								.insert(clients)
								.values({
									organizacaoId: organizacaoId,
									nome: messageEcho.toPhoneNumber, // Use phone number as name since we don't have profile info for echoes
									telefone: messageEcho.toPhoneNumber,
									telefoneBase: formatPhoneAsBase(messageEcho.toPhoneNumber as string),
									canalAquisicao: "WHATSAPP",
								})
								.returning({ id: clients.id });

							clientId = insertedClient[0]?.id ?? null;
							console.log("[INFO] [WHATSAPP_WEBHOOK] [ECHO] New client created:", clientId);
						} catch (error) {
							console.error("[WHATSAPP_WEBHOOK] [ECHO] Error creating client:", error);
						}
					}

					// Skip message processing if we couldn't determine client
					if (!clientId) {
						console.warn("[WHATSAPP_WEBHOOK] [ECHO] Cannot process message echo without client ID");
						return res.status(200).json({ success: true });
					}

					let mediaStorageData = null;

					// Handle media messages
					if (messageEcho.mediaId && messageEcho.mimeType) {
						try {
							// Download and store media
							mediaStorageData = await convex.action(api.actions.whatsapp.downloadAndStoreWhatsappMedia, {
								mediaId: messageEcho.mediaId,
								mimeType: messageEcho.mimeType,
								filename: messageEcho.filename,
							});
							console.log("[WHATSAPP_WEBHOOK] [ECHO] Media downloaded and stored:", mediaStorageData.storageId);
						} catch (error) {
							console.error("[WHATSAPP_WEBHOOK] [ECHO] Error downloading media:", error);
						}
					}

					// Determine media type
					let midiaTipo: "IMAGEM" | "DOCUMENTO" | "VIDEO" | "AUDIO" | undefined;
					if (messageEcho.messageType === "image") {
						midiaTipo = "IMAGEM";
					} else if (messageEcho.messageType === "document") {
						midiaTipo = "DOCUMENTO";
					} else if (messageEcho.messageType === "video") {
						midiaTipo = "VIDEO";
					} else if (messageEcho.messageType === "audio") {
						midiaTipo = "AUDIO";
					}

					// Create message in Convex as a message FROM the business (echo)
					// The author should be "usuario" type to indicate it came from the business side
					await convex.mutation(api.mutations.messages.createEchoMessage, {
						cliente: {
							idApp: clientId,
							nome: existingClient?.nome || messageEcho.toPhoneNumber,
							telefone: messageEcho.toPhoneNumber,
							telefoneBase: formatPhoneAsBase(messageEcho.toPhoneNumber as string),
						},
						conteudo: {
							texto: messageEcho.textContent || messageEcho.caption,
							midiaTipo,
							midiaStorageId: mediaStorageData?.storageId,
							midiaMimeType: mediaStorageData?.mimeType,
							midiaFileName: mediaStorageData?.filename,
							midiaFileSize: mediaStorageData?.fileSize,
							midiaWhatsappId: messageEcho.mediaId,
						},
						whatsappMessageId: messageEcho.whatsappMessageId,
						whatsappPhoneNumberId: messageEcho.whatsappPhoneNumberId,
					});

					console.log("[WHATSAPP_WEBHOOK] [ECHO] Message echo created to:", messageEcho.toPhoneNumber, "Type:", messageEcho.messageType);
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
