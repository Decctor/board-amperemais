import type { AxiosInstance } from "axios";
import z from "zod";
import { IFOOD_CATALOG_BASE_URL } from "./catalog-types";
import { mapIfoodError } from "./errors";

const IfoodImageUploadResponseSchema = z
	.object({
		path: z.string().optional().nullable(),
		imagePath: z.string().optional().nullable(),
	})
	.passthrough();

/**
 * Upload de imagem de produto para o catálogo do iFood. Retorna o `path` a ser usado no campo
 * `image` do produto.
 */
export async function uploadIfoodImage(
	client: AxiosInstance,
	merchantId: string,
	{ file, fileName }: { file: Blob; fileName: string },
): Promise<{ path: string }> {
	try {
		const formData = new FormData();
		formData.append("file", file, fileName);
		const response = await client.post<unknown>(`${IFOOD_CATALOG_BASE_URL}/merchants/${merchantId}/image/upload`, formData, {
			headers: { "Content-Type": "multipart/form-data" },
		});
		const parsed = IfoodImageUploadResponseSchema.parse(response.data);
		const path = parsed.path ?? parsed.imagePath;
		if (!path) throw new Error("O iFood não retornou o caminho da imagem enviada.");
		return { path };
	} catch (error) {
		mapIfoodError("uploadIfoodImage", error);
	}
}
