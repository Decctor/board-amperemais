import { supabaseClient } from "@/services/supabase";
import { FISCAL_STORAGE_PREFIX } from "./constants";

export type TFiscalAssetType = "xml" | "pdf";

export function buildFiscalAssetPath({ documentoId, tipo, asset }: { documentoId: string; tipo: string; asset: TFiscalAssetType }) {
	const extension = asset === "xml" ? "xml" : "pdf";
	return `${FISCAL_STORAGE_PREFIX}/${documentoId}-${tipo.toLowerCase()}.${extension}`;
}

export function getFiscalAssetContentType(asset: TFiscalAssetType) {
	return asset === "xml" ? "application/xml" : "application/pdf";
}

export async function storeFiscalAsset({
	documentoId,
	tipo,
	asset,
	buffer,
}: {
	documentoId: string;
	tipo: string;
	asset: TFiscalAssetType;
	buffer: ArrayBuffer;
}) {
	const path = buildFiscalAssetPath({ documentoId, tipo, asset });
	const contentType = getFiscalAssetContentType(asset);
	const { error } = await supabaseClient.storage.from("files").upload(path, buffer, {
		contentType,
		upsert: true,
	});
	if (error) throw error;
	return path;
}

export async function downloadStoredFiscalAsset(path: string) {
	const { data, error } = await supabaseClient.storage.from("files").download(path);
	if (error) throw error;
	return data.arrayBuffer();
}
