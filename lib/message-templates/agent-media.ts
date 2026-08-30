import { getStorageDriver } from "@/lib/files/drivers";
import { inspectImageFile } from "@/lib/files/inspect";
import { resolveFileUrl, sanitizeFileName, storeFile } from "@/lib/files/service";
import { fetchPublicUrl } from "@/lib/http/fetch-public-url";
import type { TFileEntity } from "@/services/drizzle/schema";
import createHttpError from "http-errors";

const BUCKET = "files";
const PREFIX = "public/organizations";
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
// Teto menor no caminho inline: o base64 infla ~33% e o corpo ainda precisa caber no limite de
// requisição da função serverless. Imagem maior que isso usa o fluxo de upload em duas etapas.
export const MAX_INLINE_IMAGE_SIZE = 3 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png"]);
const FETCH_TIMEOUT_MS = 15_000;

export function getAgentTemplateMediaPrefix({ organizacaoId }: { organizacaoId: string }) {
	return `${PREFIX}/${organizacaoId}/agent-message-template-media/`;
}

export function assertAgentTemplateMediaPath(organizationId: string, storagePath: string) {
	const expectedPrefix = getAgentTemplateMediaPrefix({ organizacaoId: organizationId });
	if (!storagePath.startsWith(expectedPrefix) || storagePath.includes("..") || storagePath.includes("\\")) {
		throw new createHttpError.Forbidden("O caminho da mídia não pertence à organização selecionada.");
	}
}

/** Envelope padrão de mídia de template a partir de uma linha do catálogo de arquivos. */
export async function buildTemplateMediaEnvelope(arquivo: TFileEntity) {
	const url = await resolveFileUrl(arquivo);
	const dimensions = arquivo.metadados?.tipo === "IMAGEM" ? { largura: arquivo.metadados.largura, altura: arquivo.metadados.altura } : null;
	return {
		arquivoId: arquivo.id,
		conteudoMidiaCaminho: arquivo.caminho,
		conteudoMidiaUrl: url,
		mimeType: arquivo.mimeType,
		tamanhoBytes: arquivo.tamanhoBytes,
		largura: dimensions?.largura ?? null,
		altura: dimensions?.altura ?? null,
	};
}

/** Inspeciona (decodificação completa) e grava pelo catálogo de arquivos (lib/files). */
async function storeAgentTemplateMedia({ organizationId, fileName, buffer }: { organizationId: string; fileName: string; buffer: Buffer }) {
	if (buffer.length > MAX_IMAGE_SIZE) throw new createHttpError.BadRequest("A imagem deve ter no máximo 5 MB.");
	const inspected = await inspectImageFile(buffer, { allowedMimeTypes: ALLOWED_IMAGE_TYPES });
	const named = sanitizeFileName(fileName, inspected.mimeType);
	const caminho = `${getAgentTemplateMediaPrefix({ organizacaoId: organizationId })}${crypto.randomUUID()}/${named}`;
	const arquivo = await storeFile({
		organizacaoId: organizationId,
		bucket: BUCKET,
		caminho,
		visibilidade: "PUBLICO",
		buffer,
		mimeType: inspected.mimeType,
		nomeOriginal: fileName,
		metadados: inspected.metadados,
	});
	return buildTemplateMediaEnvelope(arquivo);
}

/**
 * Upload em uma etapa: os bytes chegam em base64 pela própria chamada MCP e QUEM escreve no
 * Storage é o servidor.
 *
 * Serve para arquivos pequenos que só existem no cliente. Para imagem já hospedada, o caminho é
 * `uploadAgentTemplateMediaFromUrl`; para arquivo local maior, o fluxo de duas etapas
 * (create/complete): base64 dentro dos argumentos de uma ferramenta é texto que o modelo precisa
 * GERAR token a token — alguns KB são instantâneos, mas centenas de KB viram minutos de geração
 * e estouram o timeout do cliente antes de a requisição sequer chegar aqui.
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

	return storeAgentTemplateMedia({ organizationId, fileName, buffer });
}

/**
 * Upload por URL: o agente informa onde a imagem está e o download acontece AQUI, servidor a
 * servidor. É o caminho preferido quando a imagem já está hospedada — a chamada MCP carrega só a
 * URL (dezenas de tokens, contra centenas de milhares do base64) e o cliente não precisa
 * alcançar host nenhum além do próprio /api/mcp.
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
	const nameFromUrl = decodeURIComponent(new URL(finalUrl).pathname.split("/").pop() ?? "");
	const resolvedName = fileName?.trim() || nameFromUrl || "imagem";
	return storeAgentTemplateMedia({ organizationId, fileName: resolvedName, buffer });
}

/**
 * Valida um caminho de mídia referenciado por um rascunho de template. Os rascunhos ainda
 * guardam `conteudoMidiaCaminho` (string), não `arquivoId` — ver a seção de migração no
 * lib/files/README.md — então a validação confere o prefixo da organização e re-inspeciona os
 * bytes no storage.
 */
export async function validateAgentTemplateMedia({ organizationId, storagePath }: { organizationId: string; storagePath: string }) {
	assertAgentTemplateMediaPath(organizationId, storagePath);
	const driver = getStorageDriver("SUPABASE");
	const buffer = await driver.get({ bucket: BUCKET, caminho: storagePath });
	if (buffer.length > MAX_IMAGE_SIZE) throw new createHttpError.BadRequest("A imagem deve ter no máximo 5 MB.");
	const inspected = await inspectImageFile(buffer, { allowedMimeTypes: ALLOWED_IMAGE_TYPES });
	const url = await driver.publicUrl({ bucket: BUCKET, caminho: storagePath });
	return {
		conteudoMidiaCaminho: storagePath,
		conteudoMidiaUrl: url,
		mimeType: inspected.mimeType,
		tamanhoBytes: buffer.length,
		largura: inspected.metadados.tipo === "IMAGEM" ? inspected.metadados.largura : null,
		altura: inspected.metadados.tipo === "IMAGEM" ? inspected.metadados.altura : null,
	};
}
