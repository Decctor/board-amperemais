import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { getAgentTemplateMediaPrefix } from "@/lib/message-templates/agent-media";
import type { TFileVisibilityEnum, TUploadPurposeEnum } from "@/schemas/enums";
import type { TUploadConsumption, TUploadContext } from "@/schemas/files";
import { db } from "@/services/drizzle";
import { uploads, type TFileEntity, type TUploadEntity } from "@/services/drizzle/schema";
import { and, eq, lt } from "drizzle-orm";
import createHttpError from "http-errors";
import { inspectImageFile, type TInspectedFile } from "./inspect";
import { getFileById, sanitizeFileName, sha256Hex, storeFile } from "./service";

const PUBLIC_FILES_BUCKET = "files";
const ALLOWED_TEMPLATE_IMAGE_TYPES = new Set(["image/jpeg", "image/png"]);

export type TUploadPurposeDefinition = {
	/** Teto do arquivo. O corpo de requisição na Vercel é limitado a ~4.5 MB — fique abaixo. */
	maxBytes: number;
	/** Janela entre criar a intenção e receber os bytes; depois disso a varredura marca EXPIRADO. */
	ttlMinutes: number;
	bucket: string;
	visibilidade: TFileVisibilityEnum;
	storagePrefix: (input: { organizacaoId: string }) => string;
	/** Valida os bytes por sniffing e decodificação COMPLETA — nunca confie em mime declarado. */
	inspect: (buffer: Buffer) => Promise<TInspectedFile>;
};

/**
 * Registro de propósitos de upload — a fonte da verdade sobre o que cada tipo de arquivo aceita
 * e onde ele é gravado. Novo propósito = nova entrada aqui + novo membro em `UploadPurposeEnum`
 * (schemas/enums.ts); o banco não muda (`proposito` é varchar). Ver README.md.
 */
export const UPLOAD_PURPOSES: Record<TUploadPurposeEnum, TUploadPurposeDefinition> = {
	MIDIA_TEMPLATE_MENSAGEM: {
		maxBytes: 4 * 1024 * 1024,
		ttlMinutes: 60,
		bucket: PUBLIC_FILES_BUCKET,
		visibilidade: "PUBLICO",
		storagePrefix: getAgentTemplateMediaPrefix,
		inspect: (buffer) => inspectImageFile(buffer, { allowedMimeTypes: ALLOWED_TEMPLATE_IMAGE_TYPES }),
	},
};

function hashUploadToken(token: string) {
	return createHash("sha256").update(token).digest("hex");
}

function getAppBaseUrl() {
	const base = process.env.NEXT_PUBLIC_APP_URL;
	if (!base) throw new createHttpError.InternalServerError("URL base da aplicação não configurada.");
	return new URL(base).origin;
}

function getPurposeDefinition(proposito: string): TUploadPurposeDefinition {
	const definition = UPLOAD_PURPOSES[proposito as TUploadPurposeEnum];
	if (!definition) throw new createHttpError.BadRequest("Propósito de upload desconhecido.");
	return definition;
}

export async function createUploadIntake({
	organizacaoId,
	proposito,
	nomeArquivo,
	tamanhoEsperadoBytes,
	sha256Esperado,
	criadoPorId,
	contexto,
}: {
	organizacaoId: string;
	proposito: TUploadPurposeEnum;
	nomeArquivo?: string | null;
	tamanhoEsperadoBytes: number;
	sha256Esperado?: string | null;
	criadoPorId?: string | null;
	contexto?: TUploadContext | null;
}) {
	const definition = getPurposeDefinition(proposito);
	if (!Number.isInteger(tamanhoEsperadoBytes) || tamanhoEsperadoBytes <= 0 || tamanhoEsperadoBytes > definition.maxBytes) {
		throw new createHttpError.BadRequest(`O arquivo deve ter mais de 0 e no máximo ${Math.floor(definition.maxBytes / (1024 * 1024))} MB.`);
	}
	const normalizedSha256 = sha256Esperado?.trim().toLowerCase() || null;
	if (normalizedSha256 && !/^[0-9a-f]{64}$/.test(normalizedSha256)) {
		throw new createHttpError.BadRequest("O SHA-256 declarado é inválido (esperado: 64 caracteres hexadecimais).");
	}

	const token = randomBytes(32).toString("base64url");
	const dataExpiracao = new Date(Date.now() + definition.ttlMinutes * 60 * 1000);
	const [upload] = await db
		.insert(uploads)
		.values({
			organizacaoId,
			proposito,
			tokenHash: hashUploadToken(token),
			nomeArquivo: nomeArquivo?.trim() || null,
			tamanhoEsperadoBytes,
			sha256Esperado: normalizedSha256,
			criadoPorId: criadoPorId ?? null,
			contexto: contexto ?? null,
			dataExpiracao,
		})
		.returning();

	return {
		uploadId: upload.id,
		uploadUrl: `${getAppBaseUrl()}/api/uploads/${upload.id}`,
		token,
		expiraEm: dataExpiracao,
		tamanhoMaximoBytes: definition.maxBytes,
	};
}

/**
 * Recebe os bytes do PUT: confere token, janela e o contrato de integridade (tamanho e, se
 * declarado, SHA-256) ANTES de inspecionar e gravar. Bytes truncados no caminho — a causa da
 * imagem cinza que motivou este contrato — falham aqui com um erro que diz exatamente o que
 * chegou versus o que foi declarado, em vez de virarem um arquivo corrompido no ar.
 */
export async function receiveUploadBytes({
	uploadId,
	token,
	buffer,
}: {
	uploadId: string;
	token: string;
	buffer: Buffer;
}): Promise<{ upload: TUploadEntity; arquivo: TFileEntity }> {
	const upload = await db.query.uploads.findFirst({ where: eq(uploads.id, uploadId) });
	if (!upload) throw new createHttpError.NotFound("Upload não encontrado.");

	const presentedHash = Buffer.from(hashUploadToken(token));
	const storedHash = Buffer.from(upload.tokenHash);
	if (presentedHash.length !== storedHash.length || !timingSafeEqual(presentedHash, storedHash)) {
		throw new createHttpError.Unauthorized("Token de upload inválido.");
	}
	if (upload.status !== "AGUARDANDO") throw new createHttpError.Conflict("Este upload já foi recebido, consumido ou expirou.");
	if (upload.dataExpiracao <= new Date()) throw new createHttpError.BadRequest("Este upload expirou. Crie um novo antes de enviar os bytes.");

	const definition = getPurposeDefinition(upload.proposito);
	if (buffer.length !== upload.tamanhoEsperadoBytes) {
		throw new createHttpError.BadRequest(
			`Foram recebidos ${buffer.length} bytes, mas o upload declarou ${upload.tamanhoEsperadoBytes}. O arquivo chegou incompleto ou alterado — envie novamente.`,
		);
	}
	const digest = sha256Hex(buffer);
	if (upload.sha256Esperado && digest !== upload.sha256Esperado) {
		throw new createHttpError.BadRequest("O SHA-256 dos bytes recebidos não bate com o declarado. O arquivo chegou corrompido — envie novamente.");
	}

	const inspected = await definition.inspect(buffer);
	const fileName = sanitizeFileName(upload.nomeArquivo || "arquivo", inspected.mimeType);
	const caminho = `${definition.storagePrefix({ organizacaoId: upload.organizacaoId })}${crypto.randomUUID()}/${fileName}`;
	const arquivo = await storeFile({
		organizacaoId: upload.organizacaoId,
		bucket: definition.bucket,
		caminho,
		visibilidade: definition.visibilidade,
		buffer,
		mimeType: inspected.mimeType,
		nomeOriginal: upload.nomeArquivo,
		metadados: inspected.metadados,
	});

	// Update condicionado ao status: um PUT concorrente que chegou primeiro vence, e este vira
	// conflito em vez de sobrescrever o resultado.
	const [updated] = await db
		.update(uploads)
		.set({ status: "RECEBIDO", arquivoId: arquivo.id, dataRecebimento: new Date() })
		.where(and(eq(uploads.id, upload.id), eq(uploads.status, "AGUARDANDO")))
		.returning();
	if (!updated) throw new createHttpError.Conflict("Este upload foi recebido por outra requisição.");
	return { upload: updated, arquivo };
}

/** Consome um upload RECEBIDO em nome de uma feature, registrando o que o consumiu. */
export async function consumeUpload({
	uploadId,
	organizacaoId,
	proposito,
	consumo,
}: {
	uploadId: string;
	organizacaoId: string;
	proposito: TUploadPurposeEnum;
	consumo?: TUploadConsumption | null;
}): Promise<{ upload: TUploadEntity; arquivo: TFileEntity }> {
	const upload = await db.query.uploads.findFirst({ where: and(eq(uploads.id, uploadId), eq(uploads.organizacaoId, organizacaoId)) });
	if (!upload) throw new createHttpError.NotFound("Upload não encontrado.");
	if (upload.proposito !== proposito) throw new createHttpError.BadRequest("O upload não pertence a este propósito.");
	if (upload.status === "CONSUMIDO") throw new createHttpError.Conflict("Este upload já foi consumido.");
	if (upload.status !== "RECEBIDO" || !upload.arquivoId) {
		throw new createHttpError.BadRequest("Os bytes deste upload ainda não foram recebidos. Faça o PUT na uploadUrl antes de concluir.");
	}

	const [updated] = await db
		.update(uploads)
		.set({ status: "CONSUMIDO", dataConsumo: new Date(), consumo: consumo ?? null })
		.where(and(eq(uploads.id, upload.id), eq(uploads.status, "RECEBIDO")))
		.returning();
	if (!updated) throw new createHttpError.Conflict("Este upload foi consumido por outra requisição.");
	const arquivo = await getFileById({ arquivoId: updated.arquivoId! });
	return { upload: updated, arquivo };
}

/** Marca como EXPIRADO os uploads cuja janela de recebimento passou. Idempotente, para cron. */
export async function sweepExpiredUploads() {
	const expired = await db
		.update(uploads)
		.set({ status: "EXPIRADO" })
		.where(and(eq(uploads.status, "AGUARDANDO"), lt(uploads.dataExpiracao, new Date())))
		.returning({ id: uploads.id });
	return { expirados: expired.length };
}
