import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null = null;

/** Server-only Supabase client. Never import this module from a client component. */
export function getSupabaseAdminClient() {
	if (adminClient) return adminClient;
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !secretKey) throw new Error("Credenciais server-side do Supabase não configuradas.");
	adminClient = createClient(url, secretKey, {
		auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
	});
	return adminClient;
}
