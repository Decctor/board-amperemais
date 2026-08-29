import createHttpError from "http-errors";
import sharp, { type Metadata } from "sharp";

const BUCKET = "files";
const PREFIX = "public/organizations";
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
// Teto menor no caminho inline: o base64 infla ~33% e o corpo ainda precisa caber no limite de
// requisição da função serverless. Imagem maior que isso usa a URL assinada.
export const MAX_INLINE_IMAGE_SIZE = 3 * 1024 * 1024;
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

/**
 * Upload em uma etapa: os bytes chegam em base64 pela própria chamada MCP e QUEM escreve no
 * Storage é o servidor.
 *
 * Existe porque o caminho da URL assinada exige que o cliente MCP alcance o host do Supabase, e
 * ambientes de conector (Claude.ai, ChatGPT) só falam com hosts de uma allowlist — o PUT direto
 * volta 403 do proxy do cliente, não do Storage. Aqui o cliente só conversa com /api/mcp, que
 * ele já alcança por definição.
 *
 * A validação é a mesma do fluxo de duas etapas: grava e delega a
 * `validateAgentTemplateMedia`, que baixa de volta e confere formato e dimensões com o sharp.
 * Nada de confiar no `mimeType` declarado.
 */
export async function uploadAgentTemplateMediaContent({
	organizationId,
	fileName,
	mimeType,
	conteudoBase64,
}: {
	organizationId: string;
	fileName: string;
	mimeType: string;
	conteudoBase64: string;
}) {
	if (!ALLOWED_IMAGE_TYPES.has(mimeType)) throw new createHttpError.BadRequest("Envie uma imagem JPEG ou PNG.");

	// Tolera data URL (`data:image/png;base64,...`), que é como vários clientes entregam a imagem.
	const normalizedBase64 = conteudoBase64.replace(/^data:[^;]+;base64,/, "").trim();
	let buffer: Buffer;
	try {
		buffer = Buffer.from(normalizedBase64, "base64");
	} catch {
		throw new createHttpError.BadRequest("Conteúdo da imagem não é base64 válido.");
	}
	if (buffer.length === 0) throw new createHttpError.BadRequest("Conteúdo da imagem vazio.");
	if (buffer.length > MAX_INLINE_IMAGE_SIZE) {
		throw new createHttpError.BadRequest(
			"A imagem enviada diretamente deve ter no máximo 3 MB. Para arquivos maiores, use create_message_template_media_upload.",
		);
	}

	const storagePath = `${getAgentTemplateMediaPrefix(organizationId)}${crypto.randomUUID()}/${sanitizeFileName(fileName)}`;
	const { error } = await (await getStorage()).upload(storagePath, buffer, { contentType: mimeType, upsert: false });
	if (error) throw new createHttpError.InternalServerError("Não foi possível enviar a mídia.");

	return validateAgentTemplateMedia({ organizationId, storagePath });
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
