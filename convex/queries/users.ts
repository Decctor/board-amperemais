import { query } from "../_generated/server";

export const getUsers = query({
	handler: async (ctx) => {
		const users = await ctx.db.query("users").collect();

		return users.map((user) => ({
			_id: user._id,
			nome: user.nome,
			avatar_url: user.avatar_url,
			idApp: user.idApp,
		}));
	},
});
