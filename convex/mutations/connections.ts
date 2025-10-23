import { v } from "convex/values";
import { mutation } from "../_generated/server";

export const syncWhatsappConnection = mutation({
	args: {
		token: v.string(),
		dataExpiracao: v.number(),
		metaAutorAppId: v.string(),
		metaEscopo: v.array(v.string()),
		telefones: v.array(
			v.object({
				nome: v.string(),
				whatsappBusinessAccountId: v.string(),
				whatsappTelefoneId: v.string(),
				numero: v.string(),
			}),
		),
	},
	handler: async (ctx, args) => {
		const whatsappConnection = await ctx.db.query("whatsappConnections").first();
		if (whatsappConnection) {
			await ctx.db.patch(whatsappConnection._id, {
				token: args.token,
				dataExpiracao: args.dataExpiracao,
				metaAutorAppId: args.metaAutorAppId,
				metaEscopo: args.metaEscopo,
				telefones: args.telefones,
			});
			return {
				whatsappConnectionId: whatsappConnection._id,
			};
		}
		const insertedWhatsappConnectionId = await ctx.db.insert("whatsappConnections", {
			token: args.token,
			dataExpiracao: args.dataExpiracao,
			metaAutorAppId: args.metaAutorAppId,
			metaEscopo: args.metaEscopo,
			telefones: args.telefones,
		});
		return {
			whatsappConnectionId: insertedWhatsappConnectionId,
		};
	},
});

export const disconnectWhatsappConnection = mutation({
	args: {
		whatsappConnectionId: v.id("whatsappConnections"),
	},
	handler: async (ctx, args) => {
		await ctx.db.delete(args.whatsappConnectionId);
		return {
			success: true,
		};
	},
});
