import { query } from "../_generated/server";

export const getMigrationData = query({
	handler: async (ctx) => {
		const users = await ctx.db.query("users").collect();
		const chats = await ctx.db.query("chats").collect();
		const messages = await ctx.db.query("messages").collect();
		const services = await ctx.db.query("services").collect();
		const clients = await ctx.db.query("clients").collect();
		return {
			users,
			clients,
			chats,
			messages,
			services,
		};
	},
});
