import createHttpError from "http-errors";
import sharp, { type Metadata } from "sharp";

const BUCKET = "files";
const PREFIX = "public/organizations";
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png"]);

async function getStorage() {
	const { getSupabaseAdminClient } = await import("@/services/supabase/admin");
	return getSupabaseAdminClient().storage.from(BUCKET);
}

function sanitizeFileName(fileName: string) {
	const extension = fileName.toLowerCase().endsWith(".png") ? ".png" : fileName.toLowerCase().match(/\.jpe?g$/) ? ".jpg" : "";
	const base =
		fileName
			.normalize("NFD")
			.replace(/[\u0300-\u036f]/g, "")
			.toLowerCase()
			.replace(/\.[^.]+$/, "")
			.replace(/[^a-z0-9_-]+/g, "-")
			.replace(/^-+|-+$/g, "")
			.slice(0, 80) || "imagem";
	return `${base}${extension}`;
}

export function getAgentTemplateMediaPrefix(organizationId: string) {
	return `${PREFIX}/${organizationId}/agent-message-template-media/`;
}

export function assertAgentTemplateMediaPath(organizationId: string, storagePath: string) {
	const expectedPrefix = getAgentTemplateMediaPrefix(organizationId);
	if (!storagePath.startsWith(expectedPrefix) || storagePath.includes("..") || storagePath.includes("\\")) {
		throw new createHttpError.Forbidden("O caminho da mídia não pertence à organização selecionada.");
	}
}

export async function createAgentTemplateMediaUpload({
	organizationId,
	fileName,
	mimeType,
	fileSize,
}: {
	organizationId: string;
	fileName: string;
	mimeType: string;
	fileSize: number;
}) {
	if (!ALLOWED_IMAGE_TYPES.has(mimeType)) throw new createHttpError.BadRequest("Envie uma imagem JPEG ou PNG.");
	if (fileSize <= 0 || fileSize > MAX_IMAGE_SIZE) throw new createHttpError.BadRequest("A imagem deve ter no máximo 5 MB.");
	const storagePath = `${getAgentTemplateMediaPrefix(organizationId)}${crypto.randomUUID()}/${sanitizeFileName(fileName)}`;
	const { data, error } = await (await getStorage()).createSignedUploadUrl(storagePath, { upsert: false });
	if (error) throw new createHttpError.InternalServerError("Não foi possível preparar o upload da mídia.");
	return {
		conteudoMidiaCaminho: data.path,
		uploadUrl: data.signedUrl,
		expiraEm: new Date(Date.now() + 2 * 60 * 60 * 1000),
		mimeTypeEsperado: mimeType,
		tamanhoMaximoBytes: MAX_IMAGE_SIZE,
	};
}

export async function validateAgentTemplateMedia({ organizationId, storagePath }: { organizationId: string; storagePath: string }) {
	assertAgentTemplateMediaPath(organizationId, storagePath);
	const storage = await getStorage();
	const { data, error } = await storage.download(storagePath);
	if (error || !data) throw new createHttpError.NotFound("Mídia enviada não encontrada.");
	if (data.size <= 0 || data.size > MAX_IMAGE_SIZE) throw new createHttpError.BadRequest("A imagem deve ter no máximo 5 MB.");
	const buffer = Buffer.from(await data.arrayBuffer());
	let metadata: Metadata;
	try {
		metadata = await sharp(buffer, { failOn: "error" }).metadata();
	} catch {
		throw new createHttpError.BadRequest("O arquivo enviado não é uma imagem válida.");
	}
	const mimeType = metadata.format === "png" ? "image/png" : metadata.format === "jpeg" ? "image/jpeg" : null;
	if (!mimeType || !ALLOWED_IMAGE_TYPES.has(mimeType)) throw new createHttpError.BadRequest("Envie uma imagem JPEG ou PNG.");
	if (!metadata.width || !metadata.height) throw new createHttpError.BadRequest("Não foi possível determinar as dimensões da imagem.");
	const { data: publicData } = storage.getPublicUrl(storagePath);
	return {
		conteudoMidiaCaminho: storagePath,
		conteudoMidiaUrl: publicData.publicUrl,
		mimeType,
		tamanhoBytes: data.size,
		largura: metadata.width,
		altura: metadata.height,
	};
}
