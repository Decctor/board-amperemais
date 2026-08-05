import { uploadPublicAsset } from "@/lib/files-storage/public-assets";
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
	return uploadPublicAsset({
		storagePath: `/public/reports/${organizacaoId}/${frequency}/${storageKey}.png`,
		body: pngBuffer,
		contentType: "image/png",
		errorLabel: "imagem do relatório",
	});
}
