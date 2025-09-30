import { v } from "convex/values";
import { mutation } from "../_generated/server";

export const createClient = mutation({
	args: {
		idApp: v.string(),
		nome: v.string(),
		email: v.string(),
		telefone: v.string(),
		telefoneBase: v.string(),
		whatsappNome: v.optional(v.string()),
		whatsappId: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		// Verifica se já existe um cliente com este email
		const existingClient = await ctx.db
			.query("clients")
			.withIndex("by_email", (q) => q.eq("email", args.email))
			.first();

		if (existingClient) {
			return existingClient._id;
		}

		const clientId = await ctx.db.insert("clients", {
			idApp: args.idApp,
			nome: args.nome,
			email: args.email,
			telefone: args.telefone,
			telefoneBase: args.telefoneBase,
			whatsappNome: args.whatsappNome,
			whatsappId: args.whatsappId,
		});

		return clientId;
	},
});

export const updateClient = mutation({
	args: {
		clientId: v.id("clients"),
		nome: v.optional(v.string()),
		email: v.optional(v.string()),
		telefone: v.optional(v.string()),
		whatsappNome: v.optional(v.string()),
		whatsappId: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const { clientId, ...updates } = args;
		await ctx.db.patch(clientId, updates);
		return clientId;
	},
});
