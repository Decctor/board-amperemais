import { v } from "convex/values";
import { WHATSAPP_REPORT_TEMPLATES } from "../../lib/whatsapp/templates";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { internalMutation, mutation } from "../_generated/server";

export const createService = internalMutation({
	args: {
		chatId: v.id("chats"),
		clienteId: v.id("clients"),
		descricao: v.string(),
		status: v.union(v.literal("PENDENTE"), v.literal("EM_ANDAMENTO"), v.literal("CONCLUIDO")),
	},
	handler: async (ctx, args) => {
		console.log("[INFO] [SERVICES] [CREATE_SERVICE] Creating service for chat:", args.chatId);

		const serviceId = await ctx.db.insert("services", {
			chatId: args.chatId,
			clienteId: args.clienteId,
			descricao: args.descricao,
			status: args.status,
			dataInicio: Date.now(),
		});

		console.log("[INFO] [SERVICES] [CREATE_SERVICE] Service created:", serviceId);

		return {
			data: {
				serviceId,
			},
			message: "Serviço criado com sucesso.",
		};
	},
});

export const updateService = mutation({
	args: {
		serviceId: v.id("services"),
		service: v.object({
			descricao: v.optional(v.string()),
			status: v.optional(v.union(v.literal("PENDENTE"), v.literal("EM_ANDAMENTO"), v.literal("CONCLUIDO"))),
			responsavel: v.optional(v.union(v.id("users"), v.literal("ai"))),
			dataInicio: v.optional(v.number()),
			dataFim: v.optional(v.number()),
		}),
	},
	handler: async (ctx, args) => {
		const updateService: Partial<Doc<"services">> = {};
		if (args.service.responsavel) updateService.responsavel = args.service.responsavel;
		if (args.service.status) updateService.status = args.service.status;
		if (args.service.dataInicio) updateService.dataInicio = args.service.dataInicio;
		if (args.service.dataFim) updateService.dataFim = args.service.dataFim;

		await ctx.db.patch(args.serviceId, updateService);

		return {
			data: {
				serviceId: args.serviceId,
			},
			message: "Serviço atualizado com sucesso.",
		};
	},
});

export const createServiceFromAI = internalMutation({
	args: {
		chatId: v.id("chats"),
		clienteId: v.id("clients"),
		descricao: v.string(),
	},
	handler: async (ctx, args) => {
		console.log("[INFO] [SERVICES] [CREATE_SERVICE_FROM_AI] Creating service from AI for chat:", args.chatId);

		const serviceId = await ctx.db.insert("services", {
			chatId: args.chatId,
			clienteId: args.clienteId,
			descricao: args.descricao,
			status: "PENDENTE",
			responsavel: "ai",
			dataInicio: Date.now(),
		});

		console.log("[INFO] [SERVICES] [CREATE_SERVICE_FROM_AI] Service created:", serviceId);

		return {
			success: true,
			serviceId,
		};
	},
});

export const transferServiceToHuman = mutation({
	args: {
		chatId: v.id("chats"),
		clienteIdApp: v.string(),
		reason: v.string(),
		conversationSummary: v.string(),
	},
	handler: async (ctx, args) => {
		console.log("[INFO] [SERVICES] [TRANSFER_TO_HUMAN] Transferring service to human for chat:", args.chatId, "Reason:", args.reason);

		// Check if there's already an open service for this chat
		const existingService = await ctx.db
			.query("services")
			.filter((q) => q.and(q.eq(q.field("chatId"), args.chatId), q.or(q.eq(q.field("status"), "PENDENTE"), q.eq(q.field("status"), "EM_ANDAMENTO"))))
			.first();

		if (existingService) {
			const users = await ctx.db.query("users").collect();

			const randomUser = users[Math.floor(Math.random() * users.length)];
			console.log("[INFO] [SERVICES] [TRANSFER_TO_HUMAN] Selected user:", {
				nome: randomUser.nome,
				telefone: randomUser.telefone,
			});
			// Update existing service to remove AI as responsible and add context
			await ctx.db.patch(existingService._id, {
				descricao: `${existingService.descricao}\n\n[TRANSFERÊNCIA AI]\nMotivo: ${args.reason}\nResumo: ${args.conversationSummary}`,
				responsavel: randomUser._id, // Remove AI, waiting for human assignment
			});

			if (randomUser.telefone) {
				const client = await ctx.db.get(existingService.clienteId);
				if (!client) {
					throw new Error("Cliente não encontrado.");
				}
				const chat = await ctx.db.get(existingService.chatId);
				if (!chat) {
					throw new Error("Chat não encontrado.");
				}
				console.log("[INFO] [SERVICES] [TRANSFER_TO_HUMAN] Scheduling WhatsApp notification to user:", randomUser.telefone);
				await ctx.scheduler.runAfter(500, internal.actions.whatsapp.sendWhatsappNotification, {
					notificationPayload: WHATSAPP_REPORT_TEMPLATES.SERVICE_TRANSFER_NOTIFICATIONS.getPayload({
						templateKey: "SERVICE_TRANSFER_NOTIFICATIONS",
						clientName: client.nome,
						clientePhoneNumber: client.telefone,
						toPhoneNumber: randomUser.telefone,
						serviceDescription: existingService.descricao,
					}).data,
					phoneNumber: randomUser.telefone,
					fromPhoneNumberId: chat.whatsappTelefoneId,
				});
			}
			console.log("[INFO] [SERVICES] [TRANSFER_TO_HUMAN] Updated existing service:", existingService._id);

			// Update existing service to add the human as responsible
			await ctx.db.patch(existingService._id, {
				responsavel: randomUser._id,
			});
			return {
				success: true,
				serviceId: existingService._id,
				updated: true,
			};
		}

		const client = await ctx.db
			.query("clients")
			.filter((q) => q.eq(q.field("idApp"), args.clienteIdApp))
			.first();
		if (!client) {
			throw new Error("Cliente não encontrado.");
		}
		// Create new service for human
		const serviceId = await ctx.db.insert("services", {
			chatId: args.chatId,
			clienteId: client._id,
			descricao: `[TRANSFERÊNCIA AI]\nMotivo: ${args.reason}\n\nResumo da Conversa:\n${args.conversationSummary}`,
			status: "PENDENTE",
			dataInicio: Date.now(),
		});

		console.log("[INFO] [SERVICES] [TRANSFER_TO_HUMAN] Created new service:", serviceId);

		return {
			success: true,
			serviceId,
			updated: false,
		};
	},
});

export const transferServiceToUser = mutation({
	args: {
		serviceId: v.id("services"),
		userIdApp: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		console.log("[INFO] [SERVICES] [TRANSFER_SERVICE_TO_USER] Transferring service:", args.serviceId, "to user:", args.userIdApp || "ai");

		// Get the service
		const service = await ctx.db.get(args.serviceId);
		if (!service) {
			throw new Error("Serviço não encontrado.");
		}

		// Validate service is in PENDENTE status
		if (service.status !== "PENDENTE") {
			throw new Error("Apenas serviços pendentes podem ser transferidos.");
		}

		let newResponsible: Id<"users"> | "ai" | undefined;

		if (args.userIdApp) {
			const user = await ctx.db
				.query("users")
				.filter((q) => q.eq(q.field("idApp"), args.userIdApp))
				.first();

			if (!user) {
				throw new Error("Usuário não encontrado no sistema.");
			}

			newResponsible = user._id;
		} else {
			// Transfer to AI
			newResponsible = "ai";
		}

		// Update service responsible
		await ctx.db.patch(args.serviceId, {
			responsavel: newResponsible,
		});

		console.log("[INFO] [SERVICES] [TRANSFER_SERVICE_TO_USER] Service transferred successfully");

		return {
			success: true,
			serviceId: args.serviceId,
			responsavel: newResponsible,
			message: "Responsabilidade transferida com sucesso.",
		};
	},
});
