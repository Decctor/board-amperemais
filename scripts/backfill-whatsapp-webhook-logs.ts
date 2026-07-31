import "dotenv/config";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { persistIncomingClientMessage, persistOutboundNonHubMessage, resolveIncomingChat } from "@/lib/chats/incoming-message";
import { resolveWhatsappClient } from "@/lib/whatsapp/contact-identity";
import { downloadAndStoreWhatsappMedia } from "@/lib/files-storage/chat-media";
import { parseWebhookIncomingMessage, parseWebhookMessageEcho } from "@/lib/whatsapp/parsing";
import { connection, db } from "@/services/drizzle";
import { chatMessages, chats } from "@/services/drizzle/schema";
import { eq, inArray, sql } from "drizzle-orm";

const WEBHOOK_LOG_PREFIX = "[INFO] [WHATSAPP_WEBHOOK] [POST] Incoming webhook message: ";
const DEFAULT_PROJECT = "recompracrm";
const DEFAULT_SCOPE = "syncroniza";
const DEFAULT_SINCE = "24h";
const LOG_CHUNK_MS = 6 * 60 * 60 * 1000;
const MIN_LOG_CHUNK_MS = 5 * 60 * 1000;
const LOG_LIMIT = 1000;

type TVercelLog = {
	id: string;
	timestamp: number;
	level: string;
	message: string;
	logs?: { level: string; message: string }[];
};

type TIncomingMessage = NonNullable<ReturnType<typeof parseWebhookIncomingMessage>>;
type TMessageEcho = NonNullable<ReturnType<typeof parseWebhookMessageEcho>>;
type TBackfillCandidate =
	| { kind: "incoming"; sourceLogId: string; message: TIncomingMessage }
	| { kind: "echo"; sourceLogId: string; message: TMessageEcho };

function readArgument(name: string, fallback: string): string {
	const index = process.argv.indexOf(name);
	return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function parseRelativeDuration(value: string): number {
	const match = /^(\d+)(m|h|d)$/.exec(value);
	if (!match) throw new Error(`Período inválido: ${value}. Use, por exemplo, 30m, 6h ou 1d.`);

	const amount = Number(match[1]);
	const unitMs = match[2] === "m" ? 60_000 : match[2] === "h" ? 3_600_000 : 86_400_000;
	return amount * unitMs;
}

function isTargetConflictFailure(log: TVercelLog): boolean {
	return (
		log.level === "error" &&
		log.message.includes("[WHATSAPP_WEBHOOK] Error processing webhook:") &&
		log.message.includes('insert into "ampmais_chats"') &&
		log.message.includes('on conflict ("organizacao_id","cliente_id","whatsapp_telefone_id") do nothing') &&
		(log.message.includes("42P10") || log.message.includes("infer_arbiter_indexes"))
	);
}

function resolveVercelCliPath(): string {
	const candidates = [
		process.env.VERCEL_CLI_PATH,
		join(process.cwd(), "node_modules", "vercel", "dist", "vc.js"),
		process.env.APPDATA ? join(process.env.APPDATA, "npm", "node_modules", "vercel", "dist", "vc.js") : null,
		join(dirname(process.execPath), "node_modules", "vercel", "dist", "vc.js"),
	].filter((candidate): candidate is string => !!candidate);
	const cliPath = candidates.find(existsSync);
	if (!cliPath) throw new Error("CLI da Vercel não encontrada. Instale-a globalmente ou informe VERCEL_CLI_PATH.");
	return cliPath;
}

function fetchVercelLogRange({ project, scope, start, end }: { project: string; scope: string; start: Date; end: Date }): TVercelLog[] {
	const stdout = execFileSync(
		process.execPath,
		[
			resolveVercelCliPath(),
			"logs",
			"--project",
			project,
			"--scope",
			scope,
			"--environment",
			"production",
			"--source",
			"serverless",
			"--no-branch",
			"--level",
			"error",
			"--query",
			"42P10",
			"--since",
			start.toISOString(),
			"--until",
			end.toISOString(),
			"--limit",
			String(LOG_LIMIT),
			"--json",
		],
		{
			encoding: "utf8",
			maxBuffer: 100 * 1024 * 1024,
			timeout: 3 * 60 * 1000,
			windowsHide: true,
		},
	);

	const logs = stdout
		.split(/\r?\n/)
		.filter((line) => line.trim().startsWith("{"))
		.map((line) => JSON.parse(line) as TVercelLog);

	if (logs.length < LOG_LIMIT || end.getTime() - start.getTime() <= MIN_LOG_CHUNK_MS) return logs;

	const midpoint = new Date(start.getTime() + Math.floor((end.getTime() - start.getTime()) / 2));
	return [...fetchVercelLogRange({ project, scope, start, end: midpoint }), ...fetchVercelLogRange({ project, scope, start: midpoint, end })];
}

function fetchVercelLogs({ project, scope, since }: { project: string; scope: string; since: string }): TVercelLog[] {
	const end = new Date();
	const start = new Date(end.getTime() - parseRelativeDuration(since));
	const logsById = new Map<string, TVercelLog>();

	for (let chunkStart = start.getTime(); chunkStart < end.getTime(); chunkStart += LOG_CHUNK_MS) {
		const rangeStart = new Date(chunkStart);
		const rangeEnd = new Date(Math.min(chunkStart + LOG_CHUNK_MS, end.getTime()));
		console.log(`Consultando logs de ${rangeStart.toISOString()} até ${rangeEnd.toISOString()}...`);

		for (const log of fetchVercelLogRange({ project, scope, start: rangeStart, end: rangeEnd })) {
			logsById.set(log.id, log);
		}
	}

	return [...logsById.values()];
}

function extractWebhookPayload(log: TVercelLog): unknown | null {
	const payloadLog = log.logs?.find((entry) => entry.message.startsWith(WEBHOOK_LOG_PREFIX));
	if (!payloadLog) return null;

	try {
		return JSON.parse(payloadLog.message.slice(WEBHOOK_LOG_PREFIX.length));
	} catch {
		return null;
	}
}

function splitWebhookPayload(payload: unknown): unknown[] {
	if (!payload || typeof payload !== "object" || Array.isArray(payload)) return [];

	const body = payload as Record<string, unknown>;
	const entries = Array.isArray(body.entry) ? body.entry : [];
	const results: unknown[] = [];

	for (const rawEntry of entries) {
		if (!rawEntry || typeof rawEntry !== "object" || Array.isArray(rawEntry)) continue;
		const entry = rawEntry as Record<string, unknown>;
		const changes = Array.isArray(entry.changes) ? entry.changes : [];

		for (const rawChange of changes) {
			if (!rawChange || typeof rawChange !== "object" || Array.isArray(rawChange)) continue;
			const change = rawChange as Record<string, unknown>;
			const value = change.value;
			if (!value || typeof value !== "object" || Array.isArray(value)) continue;
			const valueRecord = value as Record<string, unknown>;

			const collectionKey = change.field === "smb_message_echoes" ? "message_echoes" : change.field === "messages" ? "messages" : null;
			if (!collectionKey) continue;

			const messages = Array.isArray(valueRecord[collectionKey]) ? valueRecord[collectionKey] : [];
			for (const message of messages) {
				results.push({
					...body,
					entry: [
						{
							...entry,
							changes: [{ ...change, value: { ...valueRecord, [collectionKey]: [message] } }],
						},
					],
				});
			}
		}
	}

	return results;
}

function buildCandidates(logs: TVercelLog[]): { candidates: TBackfillCandidate[]; payloadsMissing: number; unsupported: number } {
	const candidatesByMessageId = new Map<string, TBackfillCandidate>();
	let payloadsMissing = 0;
	let unsupported = 0;

	for (const log of logs.filter(isTargetConflictFailure)) {
		const payload = extractWebhookPayload(log);
		if (!payload) {
			payloadsMissing += 1;
			continue;
		}

		for (const individualPayload of splitWebhookPayload(payload)) {
			const incoming = parseWebhookIncomingMessage(individualPayload);
			if (incoming) {
				candidatesByMessageId.set(incoming.whatsappMessageId, { kind: "incoming", sourceLogId: log.id, message: incoming });
				continue;
			}

			const echo = parseWebhookMessageEcho(individualPayload);
			if (echo) {
				candidatesByMessageId.set(echo.whatsappMessageId, { kind: "echo", sourceLogId: log.id, message: echo });
				continue;
			}

			unsupported += 1;
		}
	}

	return {
		candidates: [...candidatesByMessageId.values()].sort((left, right) => left.message.timestamp - right.message.timestamp),
		payloadsMissing,
		unsupported,
	};
}

function getMediaType(messageType: TIncomingMessage["messageType"] | TMessageEcho["messageType"]) {
	if (messageType === "image") return "IMAGEM" as const;
	if (messageType === "document") return "DOCUMENTO" as const;
	if (messageType === "video") return "VIDEO" as const;
	if (messageType === "audio") return "AUDIO" as const;
	return "TEXTO" as const;
}

async function messageAlreadyExists(whatsappMessageId: string): Promise<boolean> {
	const existing = await db.query.chatMessages.findFirst({
		where: (fields, { eq }) => eq(fields.whatsappMessageId, whatsappMessageId),
		columns: { id: true },
	});
	return !!existing;
}

async function persistOlderCandidate({
	candidate,
	organizacaoId,
	chatId,
	clientId,
	media,
	ultimaMensagemEntradaData,
	ultimaMensagemSaidaData,
	ultimaLeituraData,
}: {
	candidate: TBackfillCandidate;
	organizacaoId: string;
	chatId: string;
	clientId: string;
	media: {
		storageId: string;
		publicUrl: string;
		mimeType: string;
		fileSize: number;
		whatsappMediaId?: string | null;
	} | null;
	ultimaMensagemEntradaData: Date | null;
	ultimaMensagemSaidaData: Date | null;
	ultimaLeituraData: Date | null;
}) {
	const messageDate = new Date(candidate.message.timestamp);
	const isIncoming = candidate.kind === "incoming";

	await db.insert(chatMessages).values({
		organizacaoId,
		chatId,
		clienteId: clientId,
		autorTipo: isIncoming ? "CLIENTE" : "BUSINESS-APP",
		autorClienteId: isIncoming ? clientId : null,
		conteudoTexto: candidate.message.textContent || candidate.message.caption || null,
		conteudoMidiaTipo: getMediaType(candidate.message.messageType),
		conteudoMidiaUrl: media?.publicUrl ?? null,
		conteudoMidiaStorageId: media?.storageId ?? null,
		conteudoMidiaMimeType: media?.mimeType ?? null,
		conteudoMidiaArquivoTamanho: media?.fileSize ?? null,
		conteudoMidiaWhatsappId: media?.whatsappMediaId ?? null,
		whatsappMessageId: candidate.message.whatsappMessageId,
		whatsappEcho: candidate.kind === "echo",
		statusEntrega: isIncoming ? "ENTREGUE" : "ENVIADA",
		provedorStatusDataAtualizacao: messageDate,
		dataEnvio: messageDate,
	});

	if (isIncoming) {
		const isNewestIncoming = !ultimaMensagemEntradaData || messageDate > ultimaMensagemEntradaData;
		const shouldIncrementUnread = !ultimaLeituraData || messageDate > ultimaLeituraData;
		if (isNewestIncoming || shouldIncrementUnread) {
			await db
				.update(chats)
				.set({
					...(isNewestIncoming
						? {
								ultimaMensagemEntradaData: messageDate,
								whatsappJanelaDataExpiracao: new Date(messageDate.getTime() + 24 * 60 * 60 * 1000),
							}
						: {}),
					...(shouldIncrementUnread ? { mensagensNaoLidas: sql`${chats.mensagensNaoLidas} + 1` } : {}),
				})
				.where(eq(chats.id, chatId));
		}
		return;
	}

	if (!ultimaMensagemSaidaData || messageDate > ultimaMensagemSaidaData) {
		await db.update(chats).set({ ultimaMensagemSaidaData: messageDate }).where(eq(chats.id, chatId));
	}
}

async function applyCandidate(candidate: TBackfillCandidate): Promise<"created" | "already-exists" | "hub-disabled" | "no-identity"> {
	if (await messageAlreadyExists(candidate.message.whatsappMessageId)) return "already-exists";

	const connectionPhone = await db.query.whatsappConnectionPhones.findFirst({
		where: (fields, { eq }) => eq(fields.whatsappTelefoneId, candidate.message.whatsappPhoneNumberId),
		with: {
			conexao: {
				with: {
					organizacao: {
						columns: { configuracao: true },
					},
				},
			},
		},
	});
	if (!connectionPhone?.conexao) throw new Error(`Conexão não encontrada para o telefone ${candidate.message.whatsappPhoneNumberId}.`);

	const hasHubAccess = connectionPhone.conexao.organizacao?.configuracao?.recursos?.hubAtendimentos?.acesso ?? false;
	if (!hasHubAccess) return "hub-disabled";

	const organizacaoId = connectionPhone.conexao.organizacaoId;
	const resolvedClient = await resolveWhatsappClient({
		organizacaoId,
		telefone: candidate.kind === "incoming" ? candidate.message.fromPhoneNumber : candidate.message.toPhoneNumber,
		whatsappUserId: candidate.kind === "incoming" ? candidate.message.whatsappUserId : candidate.message.toUserId,
		profileName: candidate.kind === "incoming" ? candidate.message.profileName : null,
	});
	if (!resolvedClient) return "no-identity";
	const clientId = resolvedClient.clientId;

	const { chatId } = await resolveIncomingChat({
		organizacaoId,
		clienteId: clientId,
		whatsappTelefoneId: candidate.message.whatsappPhoneNumberId,
		whatsappConexaoId: connectionPhone.conexaoId,
		whatsappConexaoTelefoneId: connectionPhone.id,
		now: new Date(candidate.message.timestamp),
	});
	const chatBeforeBackfill = await db.query.chats.findFirst({
		where: (fields, { eq }) => eq(fields.id, chatId),
		columns: {
			ultimaMensagemId: true,
			ultimaMensagemData: true,
			ultimaMensagemEntradaData: true,
			ultimaMensagemSaidaData: true,
			ultimaLeituraData: true,
		},
	});
	if (!chatBeforeBackfill) throw new Error(`Chat ${chatId} não encontrado após resolução.`);

	let media: {
		storageId: string;
		publicUrl: string;
		mimeType: string;
		fileSize: number;
		whatsappMediaId?: string | null;
	} | null = null;

	if (candidate.message.mediaId && candidate.message.mimeType && connectionPhone.conexao.token) {
		try {
			const storedMedia = await downloadAndStoreWhatsappMedia({
				mediaId: candidate.message.mediaId,
				mimeType: candidate.message.mimeType,
				filename: candidate.message.filename,
				organizacaoId,
				chatId,
				whatsappToken: connectionPhone.conexao.token,
			});
			media = { ...storedMedia, whatsappMediaId: candidate.message.mediaId };
		} catch (error) {
			console.error(`Não foi possível recuperar a mídia de ${candidate.message.whatsappMessageId}; a mensagem será criada sem o arquivo.`, error);
		}
	}

	const commonInput = {
		organizacaoId,
		chatId,
		clienteId: clientId,
		whatsappMessageId: candidate.message.whatsappMessageId,
		conteudoTexto: candidate.message.textContent || candidate.message.caption || null,
		conteudoMidiaTipo: getMediaType(candidate.message.messageType),
		midia: media,
		now: new Date(candidate.message.timestamp),
	};

	const isOlderThanCurrentTimeline =
		!!chatBeforeBackfill.ultimaMensagemId && commonInput.now.getTime() < chatBeforeBackfill.ultimaMensagemData.getTime();
	if (isOlderThanCurrentTimeline) {
		await persistOlderCandidate({
			candidate,
			organizacaoId,
			chatId,
			clientId,
			media,
			ultimaMensagemEntradaData: chatBeforeBackfill.ultimaMensagemEntradaData,
			ultimaMensagemSaidaData: chatBeforeBackfill.ultimaMensagemSaidaData,
			ultimaLeituraData: chatBeforeBackfill.ultimaLeituraData,
		});
	} else if (candidate.kind === "incoming") {
		await persistIncomingClientMessage({ ...commonInput, tipoConexao: "META_CLOUD_API" });
	} else {
		await persistOutboundNonHubMessage({ ...commonInput, origem: "WHATSAPP_ECHO" });
	}

	return "created";
}

async function main() {
	const apply = process.argv.includes("--apply");
	const project = readArgument("--project", DEFAULT_PROJECT);
	const scope = readArgument("--scope", DEFAULT_SCOPE);
	const since = readArgument("--since", DEFAULT_SINCE);

	const logs = fetchVercelLogs({ project, scope, since });
	const targetLogs = logs.filter(isTargetConflictFailure);
	const { candidates, payloadsMissing, unsupported } = buildCandidates(logs);
	const messageIds = candidates.map((candidate) => candidate.message.whatsappMessageId);
	const existingRows =
		messageIds.length > 0
			? await db
					.select({ whatsappMessageId: chatMessages.whatsappMessageId })
					.from(chatMessages)
					.where(inArray(chatMessages.whatsappMessageId, messageIds))
			: [];
	const existingIds = new Set(existingRows.flatMap((row) => (row.whatsappMessageId ? [row.whatsappMessageId] : [])));
	const pending = candidates.filter((candidate) => !existingIds.has(candidate.message.whatsappMessageId));

	console.log("");
	console.log(`Logs com o erro 42P10 esperado: ${targetLogs.length}`);
	console.log(`Mensagens únicas encontradas: ${candidates.length}`);
	console.log(`Mensagens já existentes: ${candidates.length - pending.length}`);
	console.log(`Mensagens pendentes: ${pending.length}`);
	if (payloadsMissing) console.warn(`Logs sem payload recuperável: ${payloadsMissing}`);
	if (unsupported) console.warn(`Eventos com tipo não suportado: ${unsupported}`);

	for (const candidate of pending) {
		console.log(
			`[${candidate.kind === "incoming" ? "ENTRADA" : "ECHO"}] ${new Date(candidate.message.timestamp).toISOString()} ${candidate.message.whatsappMessageId}`,
		);
	}

	if (!apply) {
		console.log("");
		console.log("Dry-run concluído. Execute novamente com --apply para criar as mensagens pendentes.");
		return;
	}

	let created = 0;
	let skipped = 0;
	let failed = 0;
	for (const candidate of pending) {
		try {
			const result = await applyCandidate(candidate);
			if (result === "created") created += 1;
			else skipped += 1;
			console.log(`${candidate.message.whatsappMessageId}: ${result}.`);
		} catch (error) {
			failed += 1;
			console.error(`${candidate.message.whatsappMessageId}: falha no backfill.`, error);
		}
	}

	console.log(`Backfill concluído: ${created} criada(s), ${skipped} ignorada(s), ${failed} falha(s).`);
	if (failed > 0) process.exitCode = 1;
}

main()
	.catch((error) => {
		console.error("Falha no backfill dos logs do webhook do WhatsApp:", error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await connection.end();
	});
