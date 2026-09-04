import "@/utils/scripts/load-next-env";

import { connection, db } from "@/services/drizzle";
import { fiscalDocumentEvents, fiscalOutboundDocuments } from "@/services/drizzle/schema";
import { and, asc, eq } from "drizzle-orm";

const PROCESSING_STATUSES = new Set(["created", "enqueued", "received", "inContingent"]);
const SECONDARY_217_DESCRIPTION = "Resposta secundaria 217 registrada sem substituir a rejeicao fiscal acionavel.";

function arg(name: string) {
	const prefix = `--${name}=`;
	return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? null;
}

function parseProviderDetail(payload: string | null): { code: string | null; message: string | null; status: string | null } {
	if (!payload) return { code: null, message: null, status: null };
	try {
		const parsed = JSON.parse(payload) as {
			status?: unknown;
			processingDetail?: { code?: unknown; message?: unknown } | null;
		};
		return {
			code: typeof parsed.processingDetail?.code === "string" ? parsed.processingDetail.code : null,
			message: typeof parsed.processingDetail?.message === "string" ? parsed.processingDetail.message : null,
			status: typeof parsed.status === "string" ? parsed.status : null,
		};
	} catch {
		return { code: null, message: null, status: null };
	}
}

async function main() {
	const organizationId = arg("org");
	if (!organizationId) throw new Error("Informe --org=<organizacaoId>.");
	const apply = process.argv.includes("--apply");

	const rows = await db
		.select({
			event: fiscalDocumentEvents,
			documentCode: fiscalOutboundDocuments.codigoRejeicao,
			documentMessages: fiscalOutboundDocuments.mensagens,
		})
		.from(fiscalDocumentEvents)
		.innerJoin(fiscalOutboundDocuments, eq(fiscalDocumentEvents.documentoFiscalId, fiscalOutboundDocuments.id))
		.where(eq(fiscalOutboundDocuments.organizacaoId, organizationId))
		.orderBy(asc(fiscalDocumentEvents.dataInsercao));

	const processingEvents = rows.filter(({ event }) => {
		if (event.tipo !== "ERRO") return false;
		const detail = parseProviderDetail(event.payload);
		return PROCESSING_STATUSES.has(detail.status ?? "") || event.descricao?.includes("EM_PROCESSAMENTO") === true;
	});

	const actionableByDocument = new Map<string, { code: string; message: string | null }>();
	const secondary217Events: typeof rows = [];
	for (const row of rows) {
		const detail = parseProviderDetail(row.event.payload);
		if (detail.code && detail.code !== "217" && detail.message) {
			actionableByDocument.set(row.event.documentoFiscalId, { code: detail.code, message: detail.message });
		}
		if (detail.code === "217") secondary217Events.push(row);
	}

	const documentsToRestore = new Map<string, { code: string; message: string | null }>();
	for (const row of secondary217Events) {
		if (row.documentCode !== "217") continue;
		const actionable = actionableByDocument.get(row.event.documentoFiscalId);
		if (actionable) documentsToRestore.set(row.event.documentoFiscalId, actionable);
	}
	const secondary217EventsToRepair = secondary217Events.filter(
		({ event }) =>
			actionableByDocument.has(event.documentoFiscalId) &&
			(event.tipo !== "SINCRONIZADO" || event.descricao !== SECONDARY_217_DESCRIPTION),
	);

	console.log(`Organizacao: ${organizationId}`);
	console.log(`Eventos de processamento classificados como erro: ${processingEvents.length}`);
	console.log(`Documentos com esses eventos: ${new Set(processingEvents.map(({ event }) => event.documentoFiscalId)).size}`);
	console.log(`Eventos com resposta secundaria 217: ${secondary217Events.length}`);
	console.log(`Eventos 217 com rejeicao acionavel no mesmo historico: ${secondary217EventsToRepair.length}`);
	console.log(`Documentos com 217 reparavel: ${new Set(secondary217EventsToRepair.map(({ event }) => event.documentoFiscalId)).size}`);
	console.log(`Documentos 217 com rejeicao acionavel recuperavel: ${documentsToRestore.size}`);
	for (const [documentId, rejection] of documentsToRestore) {
		console.log(`- ${documentId}: restaurar ${rejection.code} (${rejection.message ?? "sem mensagem"})`);
	}

	if (!apply) {
		console.log("Dry-run concluido. Execute novamente com --apply para persistir os reparos acima.");
		return;
	}

	await db.transaction(async (tx) => {
		for (const { event } of processingEvents) {
			await tx
				.update(fiscalDocumentEvents)
				.set({
					tipo: "PROCESSAMENTO_INICIADO",
					descricao: "Documento aceito pelo provedor e aguardando processamento.",
					origem: event.origem ?? "HISTORICO",
				})
				.where(and(eq(fiscalDocumentEvents.id, event.id), eq(fiscalDocumentEvents.tipo, "ERRO")));
		}

		for (const { event } of secondary217EventsToRepair) {
			await tx
				.update(fiscalDocumentEvents)
				.set({
					tipo: "SINCRONIZADO",
					descricao: SECONDARY_217_DESCRIPTION,
					origem: event.origem ?? "RECONCILIACAO",
				})
				.where(eq(fiscalDocumentEvents.id, event.id));
		}

		for (const [documentId, rejection] of documentsToRestore) {
			await tx
				.update(fiscalOutboundDocuments)
				.set({ codigoRejeicao: rejection.code, mensagens: rejection.message ? [rejection.message] : [] })
				.where(and(eq(fiscalOutboundDocuments.id, documentId), eq(fiscalOutboundDocuments.organizacaoId, organizationId)));
		}
	});

	console.log("Reparo historico aplicado com sucesso.");
}

main()
	.catch((error) => {
		console.error("[FISCAL_HISTORY_REPAIR] Falha:", error instanceof Error ? error.message : error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await connection.end();
	});
