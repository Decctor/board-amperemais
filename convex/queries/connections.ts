import { query } from "../_generated/server";

export const getWhatsappConnection = query({
	args: {},
	handler: async (ctx, args) => {
		const whatsappConnection = await ctx.db.query("whatsappConnections").first();
		return whatsappConnection ?? null;
	},
});
