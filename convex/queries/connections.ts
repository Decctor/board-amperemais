import { v } from "convex/values";
import { query } from "../_generated/server";

export const getWhatsappConnection = query({
	args: {
		organizacaoId: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		if (args.organizacaoId !== undefined) {
			const whatsappConnection = await ctx.db
				.query("whatsappConnections")
				.withIndex("by_organizacaoId", (q) => q.eq("organizacaoId", args.organizacaoId!))
				.first();
			return whatsappConnection ?? null;
		}
		// Fallback for backward compatibility
		const whatsappConnection = await ctx.db.query("whatsappConnections").first();
		return whatsappConnection ?? null;
	},
});

export const getWhatsappConnectionByPhoneNumberId = query({
	args: {
		whatsappPhoneNumberId: v.string(),
	},
	handler: async (ctx, args) => {
		const connections = await ctx.db.query("whatsappConnections").collect();
		for (const connection of connections) {
			const phoneMatch = connection.telefones.find((tel) => tel.whatsappTelefoneId === args.whatsappPhoneNumberId);
			if (phoneMatch) {
				return connection;
			}
		}
		return null;
	},
});
