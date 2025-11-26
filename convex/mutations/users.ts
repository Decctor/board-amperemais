import { v } from "convex/values";
import { mutation } from "../_generated/server";

export const createUser = mutation({
	args: {
		user: v.object({
			nome: v.string(),
			email: v.string(),
			avatar_url: v.optional(v.string()),
			idApp: v.string(),
		}),
	},
	handler: async (ctx, args) => {
		const insertedUserId = await ctx.db.insert("users", args.user);
		if (!insertedUserId) {
			throw new Error("Oops, houve um erro desconhecido ao criar usuário.");
		}
		return {
			data: {
				insertedUserId,
			},
			message: "Usuário criado com sucesso.",
		};
	},
});
