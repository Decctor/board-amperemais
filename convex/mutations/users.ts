import { v } from "convex/values";
import { mutation } from "../_generated/server";

export const createUser = mutation({
	args: {
		idApp: v.string(),
		nome: v.string(),
		email: v.string(),
		senha: v.string(),
		avatar: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		// Verifica se já existe um usuário com este email
		const existingUser = await ctx.db
			.query("users")
			.withIndex("by_email", (q) => q.eq("email", args.email))
			.first();

		if (existingUser) {
			throw new Error("Usuário com este email já existe");
		}

		const userId = await ctx.db.insert("users", {
			idApp: args.idApp,
			nome: args.nome,
			email: args.email,
			senha: args.senha,
			avatar: args.avatar,
		});

		return userId;
	},
});

export const updateUser = mutation({
	args: {
		userId: v.id("users"),
		nome: v.optional(v.string()),
		avatar: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const { userId, ...updates } = args;
		await ctx.db.patch(userId, updates);
		return userId;
	},
});
