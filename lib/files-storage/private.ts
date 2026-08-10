import "server-only";
import { PRIVATE_FILES_BUCKET } from "@/lib/files-storage/buckets";
import { getSupabaseAdminClient } from "@/services/supabase/admin";

export { PRIVATE_FILES_BUCKET };

export async function storePrivateFile({
	path,
	data,
	contentType,
	upsert = false,
}: {
	path: string;
	data: ArrayBuffer;
	contentType: string;
	upsert?: boolean;
}) {
	if (path.startsWith("/") || path.includes("..")) throw new Error("Caminho privado inválido.");
	const { data: uploaded, error } = await getSupabaseAdminClient().storage.from(PRIVATE_FILES_BUCKET).upload(path, data, { contentType, upsert });
	if (error) throw error;
	return uploaded.path;
}

export async function downloadPrivateFile(path: string) {
	if (path.startsWith("/") || path.includes("..")) throw new Error("Caminho privado inválido.");
	const { data, error } = await getSupabaseAdminClient().storage.from(PRIVATE_FILES_BUCKET).download(path);
	if (error) throw error;
	return data.arrayBuffer();
}
