import createHttpError from "http-errors";
import sharp, { type Metadata } from "sharp";
import { fetchPublicUrl } from "@/lib/http/fetch-public-url";

const BUCKET = "files";
const PREFIX = "public/organizations";
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
// Teto menor no caminho inline: o base64 infla ~33% e o corpo ainda precisa caber no limite de
// requisição da função serverless. Imagem maior que isso usa a URL assinada.
export const MAX_INLINE_IMAGE_SIZE = 3 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png"]);
const FETCH_TIMEOUT_MS = 15_000;

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

/**
 * Confere formato e dimensões pelos bytes, nunca pelo mime declarado ou pelo Content-Type de uma
 * resposta externa. É a mesma régua para os três caminhos de entrada (base64, URL e URL assinada).
 */
async function inspectImageBuffer(buffer: Buffer) {
	if (buffer.length === 0) throw new createHttpError.BadRequest("Conteúdo da imagem vazio.");
	if (buffer.length > MAX_IMAGE_SIZE) throw new createHttpError.BadRequest("A imagem deve ter no máximo 5 MB.");
	let metadata: Metadata;
	try {
		metadata = await sharp(buffer, { failOn: "error" }).metadata();
	} catch {
		throw new createHttpError.BadRequest("O arquivo enviado não é uma imagem válida.");
	}
	const mimeType = metadata.format === "png" ? "image/png" : metadata.format === "jpeg" ? "image/jpeg" : null;
	if (!mimeType || !ALLOWED_IMAGE_TYPES.has(mimeType)) throw new createHttpError.BadRequest("Envie uma imagem JPEG ou PNG.");
	if (!metadata.width || !metadata.height) throw new createHttpError.BadRequest("Não foi possível determinar as dimensões da imagem.");
	return { mimeType, largura: metadata.width, altura: metadata.height };
}

/** Grava bytes já inspecionados e devolve o envelope padrão das ferramentas de mídia. */
async function storeInspectedAgentTemplateMedia({
	organizationId,
	fileName,
	buffer,
	mimeType,
	largura,
	altura,
}: {
	organizationId: string;
	fileName: string;
	buffer: Buffer;
	mimeType: string;
	largura: number;
	altura: number;
}) {
	const sanitized = sanitizeFileName(fileName);
	const named = /\.(png|jpg)$/.test(sanitized) ? sanitized : `${sanitized}${mimeType === "image/png" ? ".png" : ".jpg"}`;
	const storagePath = `${getAgentTemplateMediaPrefix(organizationId)}${crypto.randomUUID()}/${named}`;
	const storage = await getStorage();
	const { error } = await storage.upload(storagePath, buffer, { contentType: mimeType, upsert: false });
	if (error) throw new createHttpError.InternalServerError("Não foi possível enviar a mídia.");
	const { data: publicData } = storage.getPublicUrl(storagePath);
	return {
		conteudoMidiaCaminho: storagePath,
		conteudoMidiaUrl: publicData.publicUrl,
		mimeType,
		tamanhoBytes: buffer.length,
		largura,
		altura,
	};
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
 * Serve para arquivos pequenos que só existem no cliente. Para imagem já hospedada, o caminho é
 * `uploadAgentTemplateMediaFromUrl`: base64 dentro dos argumentos de uma ferramenta é texto que o
 * modelo precisa GERAR token a token — alguns KB são instantâneos, mas centenas de KB viram
 * minutos de geração e estouram o timeout do cliente antes de a requisição sequer chegar aqui.
 */
export async function uploadAgentTemplateMediaContent({
	organizationId,
	fileName,
	mimeType,
	conteudoBase64,
}: {
	organizationId: string;
	fileName: string;
	mimeType?: string | null;
	conteudoBase64: string;
}) {
	if (mimeType && !ALLOWED_IMAGE_TYPES.has(mimeType)) throw new createHttpError.BadRequest("Envie uma imagem JPEG ou PNG.");

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
			"A imagem enviada diretamente deve ter no máximo 3 MB. Para arquivos maiores, informe `conteudoUrl` ou use create_message_template_media_upload.",
		);
	}

	const inspected = await inspectImageBuffer(buffer);
	return storeInspectedAgentTemplateMedia({ organizationId, fileName, buffer, ...inspected });
}

/**
 * Upload por URL: o agente informa onde a imagem está e o download acontece AQUI, servidor a
 * servidor. É o caminho preferido para agente de IA — a chamada MCP carrega só a URL (dezenas de
 * tokens, contra centenas de milhares do base64) e o cliente não precisa alcançar host nenhum
 * além do próprio /api/mcp.
 *
 * A URL vem de fora, então o download passa pelas barreiras anti-SSRF de `fetchPublicUrl`; os
 * bytes baixados passam pela mesma inspeção dos outros caminhos.
 */
export async function uploadAgentTemplateMediaFromUrl({
	organizationId,
	fileName,
	url,
}: {
	organizationId: string;
	fileName?: string | null;
	url: string;
}) {
	const { buffer, finalUrl } = await fetchPublicUrl(url, { maxBytes: MAX_IMAGE_SIZE, timeoutMs: FETCH_TIMEOUT_MS });
	const inspected = await inspectImageBuffer(buffer);
	const nameFromUrl = decodeURIComponent(new URL(finalUrl).pathname.split("/").pop() ?? "");
	const resolvedName = fileName?.trim() || nameFromUrl || "imagem";
	return storeInspectedAgentTemplateMedia({ organizationId, fileName: resolvedName, buffer, ...inspected });
}

/** Valida bytes que o cliente escreveu por URL assinada (fluxo de duas etapas). */
export async function validateAgentTemplateMedia({ organizationId, storagePath }: { organizationId: string; storagePath: string }) {
	assertAgentTemplateMediaPath(organizationId, storagePath);
	const storage = await getStorage();
	const { data, error } = await storage.download(storagePath);
	if (error || !data) throw new createHttpError.NotFound("Mídia enviada não encontrada.");
	const buffer = Buffer.from(await data.arrayBuffer());
	const { mimeType, largura, altura } = await inspectImageBuffer(buffer);
	const { data: publicData } = storage.getPublicUrl(storagePath);
	return {
		conteudoMidiaCaminho: storagePath,
		conteudoMidiaUrl: publicData.publicUrl,
		mimeType,
		tamanhoBytes: buffer.length,
		largura,
		altura,
	};
}
