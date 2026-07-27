import { supabaseClient } from "@/services/supabase";

// Mesmo bucket de todo o resto (a separação aqui é por prefixo de caminho, não
// por bucket) — ver chat-media.ts.
export const SUPABASE_STORAGE_DESKTOP_AGENT_BUCKET = "files";

/**
 * URL pública do instalador de uma versão.
 *
 * Este módulo NÃO tem função de upload, de propósito: quem sobe o binário é o
 * CI do repo recompra-local-agent (packaging/publish-supabase.ps1), que já tem
 * o artefato e o SHA256 na mão. Uma tela de upload no CRM reintroduziria
 * exatamente os erros que o CI elimina — subir o arquivo errado, a versão
 * errada ou um build de debug.
 *
 * Servir o arquivo por uma rota do Next também não é opção: funções da Vercel
 * têm limite de ~4,5 MB de resposta e o instalador tem ~49 MB. O link aponta
 * direto para o Storage.
 */
export function getDesktopAgentInstallerUrl(storagePath: string): string {
	const {
		data: { publicUrl },
	} = supabaseClient.storage.from(SUPABASE_STORAGE_DESKTOP_AGENT_BUCKET).getPublicUrl(storagePath);
	return publicUrl;
}
