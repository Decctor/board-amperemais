import { supabaseClient } from "@/services/supabase";
import type { TReportFrequency } from "./types";

type UploadReportImageParams = {
	organizacaoId: string;
	frequency: TReportFrequency;
	storageKey: string;
	pngBuffer: Buffer;
};

export async function uploadReportImage({
	organizacaoId,
	frequency,
	storageKey,
	pngBuffer,
}: UploadReportImageParams): Promise<{ publicUrl: string; storagePath: string }> {
	const storagePath = `/public/reports/${organizacaoId}/${frequency}/${storageKey}.png`;
	const pngBytes = Uint8Array.from(pngBuffer);
	const pngBlob = new Blob([pngBytes], { type: "image/png" });

	const { data, error } = await supabaseClient.storage.from("files").upload(storagePath, pngBlob, {
		contentType: "image/png",
		upsert: true,
	});

	if (error) {
		throw new Error(`Falha ao fazer upload da imagem do relatório: ${error.message}`);
	}

	const {
		data: { publicUrl },
	} = supabaseClient.storage.from("files").getPublicUrl(storagePath);

	return {
		publicUrl,
		storagePath: data.path,
	};
}
