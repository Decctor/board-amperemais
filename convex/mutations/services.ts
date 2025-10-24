import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
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

export const transferServiceToHuman = internalMutation({
	args: {
		chatId: v.id("chats"),
		clienteId: v.id("clients"),
		reason: v.string(),
		conversationSummary: v.string(),
	},
	handler: async (ctx, args) => {
		console.log("[INFO] [SERVICES] [TRANSFER_TO_HUMAN] Transferring service to human for chat:", args.chatId, "Reason:", args.reason);

		// Check if there's already an open service for this chat
		const existingService = await ctx.db
			.query("services")
			.filter((q) => q.eq(q.field("chatId"), args.chatId) && q.eq(q.field("status"), "PENDENTE"))
			.first();

		if (existingService) {
			// Update existing service to remove AI as responsible and add context
			await ctx.db.patch(existingService._id, {
				descricao: `${existingService.descricao}\n\n[TRANSFERÊNCIA AI]\nMotivo: ${args.reason}\nResumo: ${args.conversationSummary}`,
				responsavel: undefined, // Remove AI, waiting for human assignment
			});

			console.log("[INFO] [SERVICES] [TRANSFER_TO_HUMAN] Updated existing service:", existingService._id);

			return {
				success: true,
				serviceId: existingService._id,
				updated: true,
			};
		}

		// Create new service for human
		const serviceId = await ctx.db.insert("services", {
			chatId: args.chatId,
			clienteId: args.clienteId,
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
