import { supabaseClient } from "@/services/supabase";

export const SUPABASE_STORAGE_FILES_BUCKET = "files";

type UploadPublicAssetParams = {
	/** Caminho completo no bucket, definido por quem chama. */
	storagePath: string;
	body: Buffer | Blob;
	contentType: string;
	/** Usado só na mensagem de erro, para o log dizer qual arquivo falhou. */
	errorLabel?: string;
};

/**
 * Sobe um arquivo gerado no servidor para um caminho determinístico no bucket
 * público `files` e devolve a URL pública.
 *
 * Difere dos outros helpers de upload por dois motivos, que são o ponto: o
 * caminho vem de quem chama (nada de timestamp no nome) e o upload é `upsert`.
 * Junto, isso torna o upload idempotente — reprocessar o mesmo relatório ou
 * reenviar o mesmo convite sobrescreve o arquivo em vez de acumular órfãos.
 *
 * Para upload de arquivo enviado pelo usuário use `uploadFile` (navegador) ou
 * `uploadChatMedia` (mídia de atendimento).
 */
export async function uploadPublicAsset({
	storagePath,
	body,
	contentType,
	errorLabel = "arquivo",
}: UploadPublicAssetParams): Promise<{ publicUrl: string; storagePath: string }> {
	const blob = body instanceof Blob ? body : new Blob([Uint8Array.from(body)], { type: contentType });

	const { data, error } = await supabaseClient.storage.from(SUPABASE_STORAGE_FILES_BUCKET).upload(storagePath, blob, {
		contentType,
		upsert: true,
	});

	if (error) {
		throw new Error(`Falha ao fazer upload da ${errorLabel}: ${error.message}`);
	}

	const {
		data: { publicUrl },
	} = supabaseClient.storage.from(SUPABASE_STORAGE_FILES_BUCKET).getPublicUrl(storagePath);

	return {
		publicUrl,
		storagePath: data.path,
	};
}
