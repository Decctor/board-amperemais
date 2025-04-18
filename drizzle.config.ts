export default {
	schema: "./services/drizzle/schema/*",
	dialect: "postgresql",
	dbCredentials: {
		url: process.env.SUPABASE_DB_URL,
	},
	tablesFilter: ["ampmais_*"],
};
