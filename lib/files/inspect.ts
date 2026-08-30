import type { TFileMetadata } from "@/schemas/files";
import createHttpError from "http-errors";
import sharp from "sharp";

export type TInspectedFile = { mimeType: string; metadados: TFileMetadata };

const IMAGE_MIME_BY_FORMAT: Record<string, string> = {
	png: "image/png",
	jpeg: "image/jpeg",
};

/**
 * Valida uma imagem pelos BYTES — nunca pelo mime declarado ou pelo Content-Type de resposta —
 * e decodifica o conteúdo POR COMPLETO. A decodificação completa (`stats()`) é deliberada:
 * `metadata()` lê só o cabeçalho, e um JPEG/PNG truncado mantém cabeçalho válido com corpo de
 * lixo (foi exatamente assim que uma imagem cinza chegou a um template). `stats()` percorre
 * todos os pixels e falha em dados truncados.
 */
export async function inspectImageFile(buffer: Buffer, { allowedMimeTypes }: { allowedMimeTypes: ReadonlySet<string> }): Promise<TInspectedFile> {
	if (buffer.length === 0) throw new createHttpError.BadRequest("Conteúdo da imagem vazio.");
	try {
		const image = sharp(buffer, { failOn: "error" });
		const metadata = await image.metadata();
		const mimeType = metadata.format ? (IMAGE_MIME_BY_FORMAT[metadata.format] ?? null) : null;
		if (!mimeType || !allowedMimeTypes.has(mimeType)) throw new createHttpError.BadRequest("Envie uma imagem JPEG ou PNG.");
		if (!metadata.width || !metadata.height) throw new createHttpError.BadRequest("Não foi possível determinar as dimensões da imagem.");
		await image.stats();
		return { mimeType, metadados: { tipo: "IMAGEM", largura: metadata.width, altura: metadata.height } };
	} catch (error) {
		if (createHttpError.isHttpError(error)) throw error;
		throw new createHttpError.BadRequest("O arquivo enviado não é uma imagem válida ou está corrompido.");
	}
}
