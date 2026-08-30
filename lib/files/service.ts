import { createHash } from "node:crypto";
import type { TFileMetadata } from "@/schemas/files";
import type { TFileVisibilityEnum } from "@/schemas/enums";
import { db } from "@/services/drizzle";
import { files, type TFileEntity } from "@/services/drizzle/schema";
import { and, eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { getStorageDriver } from "./drivers";

export function sha256Hex(buffer: Buffer) {
	return createHash("sha256").update(buffer).digest("hex");
}

const EXTENSION_BY_MIME: Record<string, string> = {
	"image/png": ".png",
	"image/jpeg": ".jpg",
};

/** Nome seguro para compor caminho de storage; a extensão vem do mime REAL (sniffado), não do nome. */
export function sanitizeFileName(fileName: string, mimeType: string) {
	const base =
		fileName
			.normalize("NFD")
			.replace(/[\u0300-\u036f]/g, "")
			.toLowerCase()
			.replace(/\.[^.]+$/, "")
			.replace(/[^a-z0-9_-]+/g, "-")
			.replace(/^-+|-+$/g, "")
			.slice(0, 80) || "arquivo";
	return `${base}${EXTENSION_BY_MIME[mimeType] ?? ""}`;
}

/**
 * Grava bytes no provedor e materializa a linha do catálogo — o único caminho de escrita de
 * arquivo. Os bytes vão para o storage ANTES da linha existir: uma falha entre os dois deixa um
 * objeto órfão no bucket (inofensivo, varrível), nunca uma linha apontando para bytes que não
 * existem.
 */
export async function storeFile({
	organizacaoId,
	bucket,
	caminho,
	visibilidade,
	buffer,
	mimeType,
	nomeOriginal,
	metadados,
}: {
	organizacaoId: string;
	bucket: string;
	caminho: string;
	visibilidade: TFileVisibilityEnum;
	buffer: Buffer;
	mimeType: string;
	nomeOriginal?: string | null;
	metadados?: TFileMetadata | null;
}): Promise<TFileEntity> {
	const driver = getStorageDriver("SUPABASE");
	await driver.put({ bucket, caminho, buffer, mimeType });
	const [file] = await db
		.insert(files)
		.values({
			organizacaoId,
			provedor: "SUPABASE",
			bucket,
			caminho,
			visibilidade,
			nomeOriginal: nomeOriginal ?? null,
			mimeType,
			tamanhoBytes: buffer.length,
			sha256: sha256Hex(buffer),
			metadados: metadados ?? null,
		})
		.returning();
	return file;
}

export async function getOrganizationFileById({ arquivoId, organizacaoId }: { arquivoId: string; organizacaoId: string }) {
	const file = await db.query.files.findFirst({ where: and(eq(files.id, arquivoId), eq(files.organizacaoId, organizacaoId)) });
	if (!file) throw new createHttpError.NotFound("Arquivo não encontrado.");
	return file;
}

export async function getFileById({ arquivoId }: { arquivoId: string }) {
	const file = await db.query.files.findFirst({ where: eq(files.id, arquivoId) });
	if (!file) throw new createHttpError.NotFound("Arquivo não encontrado.");
	return file;
}

/**
 * Resolve a URL de um arquivo NO MOMENTO DA LEITURA, pelo driver do provedor da linha. Nunca
 * grave o resultado em banco: é isso que permite trocar de provedor atualizando só a linha de
 * `files`. Para URLs que saem do nosso controle (mensagens enviadas, e-mails), prefira a rota
 * estável /api/files/[id], que redireciona para a URL resolvida.
 */
export async function resolveFileUrl(file: TFileEntity, { expiraEmSegundos = 60 * 60 }: { expiraEmSegundos?: number } = {}) {
	const driver = getStorageDriver(file.provedor);
	if (file.visibilidade === "PUBLICO") return driver.publicUrl({ bucket: file.bucket, caminho: file.caminho });
	return driver.signedUrl({ bucket: file.bucket, caminho: file.caminho, expiraEmSegundos });
}
