import type { AxiosInstance } from "axios";
import createHttpError from "http-errors";
import z from "zod";
import { IFOOD_CATALOG_BASE_URL, IFOOD_IMAGE_ALLOWED_TYPES } from "./catalog-types";
import { mapIfoodError } from "./errors";

const IfoodImageUploadResponseSchema = z
	.object({
		path: z.string().optional().nullable(),
		imagePath: z.string().optional().nullable(),
	})
	.passthrough();

/** O iFood identifica o formato pelo prefixo do data URL, não pelo nome do arquivo. */
function resolveImageMimeType({ file, fileName }: { file: Blob; fileName: string }) {
	if (IFOOD_IMAGE_ALLOWED_TYPES.includes(file.type)) return file.type;
	const extension = fileName.split(".").pop()?.toLowerCase();
	if (extension === "png") return "image/png";
	if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
	throw new createHttpError.BadRequest("Formato de imagem inválido. Envie um arquivo PNG ou JPG.");
}

/**
 * Upload de imagem de produto para o catálogo do iFood. Retorna o `path` a ser usado no campo
 * `image` do produto.
 *
 * O endpoint NÃO aceita multipart: o corpo é JSON com a imagem em base64 no formato data URL
 * (`{ "image": "data:image/png;base64,..." }`). Enviar multipart devolve 500 genérico
 * ("Something went wrong, please try again later"), sem pista do motivo.
 */
export async function uploadIfoodImage(
	client: AxiosInstance,
	merchantId: string,
	{ file, fileName }: { file: Blob; fileName: string },
): Promise<{ path: string }> {
	try {
		const mimeType = resolveImageMimeType({ file, fileName });
		const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
		const response = await client.post<unknown>(`${IFOOD_CATALOG_BASE_URL}/merchants/${merchantId}/image/upload`, {
			image: `data:${mimeType};base64,${base64}`,
		});
		const parsed = IfoodImageUploadResponseSchema.parse(response.data);
		const path = parsed.path ?? parsed.imagePath;
		if (!path) throw new Error("O iFood não retornou o caminho da imagem enviada.");
		return { path };
	} catch (error) {
		mapIfoodError("uploadIfoodImage", error);
	}
}
