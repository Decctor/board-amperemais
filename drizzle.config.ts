import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
	schema: "./services/drizzle/schema/*",
	out: "./drizzle",
	dialect: "postgresql",
	dbCredentials: {
		url: process.env.SUPABASE_DB_URL!,
	},
	tablesFilter: ["ampmais_*"],
});
