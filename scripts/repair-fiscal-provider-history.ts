import "@/utils/scripts/load-next-env";

import { describeFiscalEmissionResult } from "@/lib/fiscal/document-event-classification";
import { getSpedyCompanyClient } from "@/lib/fiscal/providers/spedy/client";
import { fetchSpedyInvoice } from "@/lib/fiscal/providers/spedy/documents";
import { mapSpedyInvoiceResponse } from "@/lib/fiscal/providers/spedy/status";
import type { TSpedyInvoiceResponse } from "@/lib/fiscal/providers/spedy/types";
import type { TSpedyWebhookBody } from "@/lib/fiscal/providers/spedy/webhook";
import { loadFiscalOrganization } from "@/lib/fiscal/settings";
import { connection, db } from "@/services/drizzle";
import { externalEvents, fiscalDocumentEvents, fiscalOutboundDocuments } from "@/services/drizzle/schema";
import { and, asc, eq, inArray, isNotNull } from "drizzle-orm";

const TERMINAL_EVENT_TYPES = ["REJEITADO", "ERRO"] as const;
// A Spedy limita cada chave a 5 req/s e 100 req/min. O intervalo respeita as duas janelas.
const REQUEST_INTERVAL_MS = 650;

function arg(name: string) {
	const prefix = `--${name}=`;
	return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? null;
}

function hasFlag(name: string) {
	return process.argv.includes(`--${name}`);
}

function parseDocumentIds() {
	return (arg("document-ids") ?? "")
		.split(",")
		.map((value) => value.trim())
		.filter(Boolean);
}

function parseProviderDetail(payload: string | null): { code: string | null; message: string | null } {
	if (!payload) return { code: null, message: null };
	try {
		const parsed = JSON.parse(payload) as { processingDetail?: { code?: unknown; message?: unknown } | null };
		return {
			code: typeof parsed.processingDetail?.code === "string" ? parsed.processingDetail.code : null,
			message: typeof parsed.processingDetail?.message === "string" ? parsed.processingDetail.message : null,
		};
	} catch {
		return { code: null, message: null };
	}
}

function stringifyJson(value: unknown) {
	return JSON.stringify(value, null, 2);
}

function sleep(milliseconds: number) {
	return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function printHelp() {
	console.log(`
Consulta a Spedy e repara as mensagens de documentos fiscais rejeitados/com erro.

Uso:
  npm run repair:fiscal-provider-history -- --org=<organizacaoId>
  npm run repair:fiscal-provider-history -- --all-organizations
  npm run repair:fiscal-provider-history -- --org=<organizacaoId> --document-ids=<id1,id2> --apply

Opcoes:
  --org                Limita a auditoria a uma organizacao.
  --all-organizations  Audita todas as organizacoes com documentos locais rejeitados/com erro.
  --document-ids       Limita a IDs locais separados por virgula.
  --limit              Maximo de documentos (padrao: 500; maximo: 1000).
  --apply              Persiste o retorno vivo da Spedy no documento e no evento terminal mais recente.
  --manual-code        Codigo confirmado fora do GET da API (exige um unico --document-ids).
  --manual-message     Mensagem confirmada fora do GET da API (exige um unico --document-ids).

O modo padrao e dry-run. Por seguranca, --apply exige --org e --document-ids. Respostas 217 nao
substituem uma rejeicao acionavel: nesse caso o script usa a rejeicao anterior do historico local,
quando disponivel, ou deixa o documento para revisao.
Quando o backoffice da Spedy divergir do GET, informe codigo e mensagem manualmente. O retorno bruto
da API continua preservado em provedorRetorno e a confirmacao vira um evento fiscal auditavel.
`);
}

type TDocument = typeof fiscalOutboundDocuments.$inferSelect;
type TEvent = typeof fiscalDocumentEvents.$inferSelect;

type TRepairCandidate = {
	document: TDocument;
	live: TSpedyInvoiceResponse;
	event: TEvent | null;
	repairCode: string | null;
	repairMessage: string;
	repairStatus: "REJEITADO" | "ERRO";
	repairSource: "SPEDY_LIVE" | "ARQUIVO_WEBHOOK" | "HISTORICO_LOCAL_ANTES_DO_217" | "CONFIRMACAO_MANUAL";
	repairPayload: TSpedyInvoiceResponse;
};

function resolveRepairDetail({
	live,
	events,
	archivedInvoices,
	manualDetail,
}: {
	live: TSpedyInvoiceResponse;
	events: TEvent[];
	archivedInvoices: TSpedyInvoiceResponse[];
	manualDetail: { code: string; message: string } | null;
}): Pick<TRepairCandidate, "repairCode" | "repairMessage" | "repairStatus" | "repairSource" | "repairPayload"> | null {
	const details = mapSpedyInvoiceResponse(live);
	const liveCode = details.codigoStatus;
	const liveMessage = typeof details.mensagens?.[0] === "string" ? details.mensagens[0] : null;
	const isLiveFailure = details.statusInterno === "REJEITADO" || details.statusInterno === "ERRO" || live.processingDetail?.status === "failed";
	if (!isLiveFailure) return null;
	if (manualDetail) {
		return {
			repairCode: manualDetail.code,
			repairMessage: manualDetail.message,
			repairStatus: "REJEITADO",
			repairSource: "CONFIRMACAO_MANUAL",
			repairPayload: {
				...live,
				processingDetail: {
					...live.processingDetail,
					code: manualDetail.code,
					message: manualDetail.message,
				},
			},
		};
	}

	if (liveCode === "217") {
		const archived = [...archivedInvoices]
			.reverse()
			.find((invoice) => invoice.processingDetail?.code && invoice.processingDetail.code !== "217" && invoice.processingDetail.message);
		if (archived?.processingDetail?.message) {
			return {
				repairCode: archived.processingDetail.code ?? null,
				repairMessage: archived.processingDetail.message,
				repairStatus: archived.status === "rejected" || archived.status === "denied" ? "REJEITADO" : "ERRO",
				repairSource: "ARQUIVO_WEBHOOK",
				repairPayload: archived,
			};
		}
		const historicalEvent = [...events].reverse().find((event) => {
			const detail = parseProviderDetail(event.payload);
			return detail.code && detail.code !== "217" && detail.message;
		});
		const historical = parseProviderDetail(historicalEvent?.payload ?? null);
		if (!historical?.message) return null;
		let repairPayload: TSpedyInvoiceResponse;
		try {
			repairPayload = JSON.parse(historicalEvent?.payload ?? "") as TSpedyInvoiceResponse;
		} catch {
			repairPayload = {
				...live,
				status: "rejected",
				processingDetail: { ...live.processingDetail, code: historical.code, message: historical.message },
			};
		}
		return {
			repairCode: historical.code,
			repairMessage: historical.message,
			repairStatus: "REJEITADO",
			repairSource: "HISTORICO_LOCAL_ANTES_DO_217",
			repairPayload,
		};
	}

	if (!liveMessage) return null;
	return {
		repairCode: liveCode ?? null,
		repairMessage: liveMessage,
		repairStatus: details.statusInterno === "REJEITADO" ? "REJEITADO" : "ERRO",
		repairSource: "SPEDY_LIVE",
		repairPayload: live,
	};
}

async function main() {
	if (hasFlag("help") || process.argv.includes("-h")) {
		printHelp();
		return;
	}

	const organizationId = arg("org");
	const allOrganizations = hasFlag("all-organizations");
	const apply = hasFlag("apply");
	const documentIds = parseDocumentIds();
	const manualCode = arg("manual-code");
	const manualMessage = arg("manual-message")?.trim() ?? null;
	const hasManualOverride = manualCode !== null || manualMessage !== null;
	if (Boolean(organizationId) === allOrganizations) {
		throw new Error("Informe exatamente um escopo: --org=<organizacaoId> ou --all-organizations.");
	}
	if (apply && (!organizationId || documentIds.length === 0)) {
		throw new Error("--apply exige --org=<organizacaoId> e --document-ids=<id1,id2>. Rode primeiro o dry-run.");
	}
	if (hasManualOverride && (!manualCode || !manualMessage || !organizationId || documentIds.length !== 1)) {
		throw new Error("O reparo manual exige --org, exatamente um --document-ids, --manual-code e --manual-message.");
	}
	const manualDetail = manualCode && manualMessage ? { code: manualCode, message: manualMessage } : null;
	const requestedLimit = Number(arg("limit") ?? "500");
	if (!Number.isInteger(requestedLimit) || requestedLimit < 1) throw new Error("--limit deve ser um inteiro positivo.");
	const limit = Math.min(requestedLimit, 1000);

	const documents = await db.query.fiscalOutboundDocuments.findMany({
		where: and(
			eq(fiscalOutboundDocuments.provedor, "SPEDY"),
			inArray(fiscalOutboundDocuments.statusInterno, ["REJEITADO", "ERRO"]),
			isNotNull(fiscalOutboundDocuments.provedorDocumentoId),
			...(organizationId ? [eq(fiscalOutboundDocuments.organizacaoId, organizationId)] : []),
			...(documentIds.length > 0 ? [inArray(fiscalOutboundDocuments.id, documentIds)] : []),
		),
		orderBy: [asc(fiscalOutboundDocuments.dataInsercao)],
		limit,
	});

	if (apply) {
		const foundIds = new Set(documents.map((document) => document.id));
		const missingIds = documentIds.filter((id) => !foundIds.has(id));
		if (missingIds.length > 0) throw new Error(`Documentos nao encontrados ou inelegiveis: ${missingIds.join(", ")}`);
	}

	const events =
		documents.length === 0
			? []
			: await db.query.fiscalDocumentEvents.findMany({
					where: inArray(
						fiscalDocumentEvents.documentoFiscalId,
						documents.map((document) => document.id),
					),
					orderBy: [asc(fiscalDocumentEvents.dataInsercao)],
				});
	const eventsByDocument = new Map<string, TEvent[]>();
	for (const event of events) {
		const current = eventsByDocument.get(event.documentoFiscalId) ?? [];
		current.push(event);
		eventsByDocument.set(event.documentoFiscalId, current);
	}
	const providerIds = new Set(documents.map((document) => document.provedorDocumentoId).filter((id): id is string => !!id));
	const archivedRows =
		providerIds.size === 0
			? []
			: await db.query.externalEvents.findMany({
					where: and(eq(externalEvents.origem, "SPEDY"), eq(externalEvents.tipo, "invoice.status_changed")),
					orderBy: [asc(externalEvents.dataInsercao)],
					limit: 5000,
				});
	const archivedInvoicesByProviderId = new Map<string, TSpedyInvoiceResponse[]>();
	for (const row of archivedRows) {
		const body = row.payload as TSpedyWebhookBody;
		const invoice = body.data as TSpedyInvoiceResponse | null | undefined;
		if (!invoice?.id || !providerIds.has(invoice.id)) continue;
		const current = archivedInvoicesByProviderId.get(invoice.id) ?? [];
		current.push(invoice);
		archivedInvoicesByProviderId.set(invoice.id, current);
	}

	const organizations = new Map<string, NonNullable<Awaited<ReturnType<typeof loadFiscalOrganization>>>>();
	const candidates: TRepairCandidate[] = [];
	const divergences: Array<{ document: TDocument; live: TSpedyInvoiceResponse }> = [];
	const unavailable: Array<{ document: TDocument; reason: string }> = [];
	let alreadyCorrect = 0;

	for (const [index, document] of documents.entries()) {
		let organization = organizations.get(document.organizacaoId);
		if (!organization) {
			const loaded = await loadFiscalOrganization(document.organizacaoId);
			if (!loaded) {
				unavailable.push({ document, reason: "Organizacao nao encontrada." });
				continue;
			}
			organization = loaded;
			organizations.set(document.organizacaoId, organization);
		}

		try {
			if (index > 0) await sleep(REQUEST_INTERVAL_MS);
			const live = await fetchSpedyInvoice(getSpedyCompanyClient(organization), document);
			const documentEvents = eventsByDocument.get(document.id) ?? [];
			const repair = resolveRepairDetail({
				live,
				events: documentEvents,
				archivedInvoices: archivedInvoicesByProviderId.get(document.provedorDocumentoId as string) ?? [],
				manualDetail,
			});
			if (!repair) {
				const details = mapSpedyInvoiceResponse(live);
				if (!["REJEITADO", "ERRO"].includes(details.statusInterno)) divergences.push({ document, live });
				else {
					unavailable.push({
						document,
						reason: `A Spedy nao devolveu uma mensagem acionavel para reparo (status=${live.status ?? "-"}, processamento=${live.processingDetail?.status ?? "-"}, codigo=${live.processingDetail?.code ?? "-"}, mensagem=${live.processingDetail?.message ?? "-"}).`,
					});
				}
				continue;
			}
			const terminalEvents = [...documentEvents]
				.reverse()
				.filter((candidate) => TERMINAL_EVENT_TYPES.includes(candidate.tipo as (typeof TERMINAL_EVENT_TYPES)[number]));
			const event =
				repair.repairSource === "SPEDY_LIVE"
					? (terminalEvents[0] ?? null)
					: (terminalEvents.find((candidate) => {
							const detail = parseProviderDetail(candidate.payload);
							return detail.code === repair.repairCode && detail.message === repair.repairMessage;
						}) ?? null);
			const expectedDescription = describeFiscalEmissionResult({ status: repair.repairStatus, messages: [repair.repairMessage] });
			const eventDetail = parseProviderDetail(event?.payload ?? null);
			const documentIsCorrect =
				document.codigoRejeicao === repair.repairCode && document.mensagens?.length === 1 && document.mensagens[0] === repair.repairMessage;
			const eventIsCorrect =
				event?.tipo === repair.repairStatus &&
				event.descricao === expectedDescription &&
				eventDetail.code === repair.repairCode &&
				eventDetail.message === repair.repairMessage;
			if (documentIsCorrect && eventIsCorrect) {
				alreadyCorrect++;
				continue;
			}
			candidates.push({ document, live, event, ...repair });
		} catch (error) {
			unavailable.push({ document, reason: error instanceof Error ? error.message : String(error) });
		}
	}

	console.log(`=== ${apply ? "APLICACAO" : "DRY-RUN"}: HISTORICO FISCAL VIA SPEDY ===`);
	console.log(`Documentos locais consultados: ${documents.length}`);
	console.log(`Falhas vivas com mensagem reparavel: ${candidates.length}`);
	console.log(`Documentos e eventos ja corretos: ${alreadyCorrect}`);
	console.log(`Divergencias de status (local falhou, Spedy nao): ${divergences.length}`);
	console.log(`Sem retorno reparavel: ${unavailable.length}`);
	for (const candidate of candidates) {
		console.log(
			`[REPAIR] org=${candidate.document.organizacaoId} documento=${candidate.document.id} tipo=${candidate.document.tipo} spedy=${candidate.live.id} status=${candidate.live.status ?? "-"} codigo=${candidate.repairCode ?? "-"}`,
		);
		console.log(`  mensagem=${candidate.repairMessage}`);
		console.log(`  atual=codigo:${candidate.document.codigoRejeicao ?? "-"} mensagem:${candidate.document.mensagens?.join("; ") || "-"}`);
		console.log(`  evento=${candidate.event?.id ?? "NOVO"} fonte=${candidate.repairSource}`);
		if (candidate.event) console.log(`  eventoAtual=${candidate.event.tipo}: ${candidate.event.descricao ?? "-"}`);
	}
	for (const { document, live } of divergences) {
		console.log(
			`[DIVERGENCE] org=${document.organizacaoId} documento=${document.id} local=${document.statusInterno} spedy=${live.status ?? "-"} codigo=${live.processingDetail?.code ?? "-"}`,
		);
	}
	for (const { document, reason } of unavailable) {
		console.log(`[SKIP] org=${document.organizacaoId} documento=${document.id} spedy=${document.provedorDocumentoId} motivo=${reason}`);
	}

	if (!apply) {
		console.log("Nada foi alterado. Revise os IDs acima e execute novamente com --org, --document-ids e --apply.");
		return;
	}
	if (candidates.length + alreadyCorrect !== documents.length) {
		throw new Error("Aplicacao recusada: todos os IDs informados precisam ter uma falha viva e uma mensagem reparavel na Spedy.");
	}

	await db.transaction(async (tx) => {
		for (const candidate of candidates) {
			const details = mapSpedyInvoiceResponse(candidate.live);
			await tx
				.update(fiscalOutboundDocuments)
				.set({
					status: details.status,
					statusInterno: candidate.repairStatus,
					provedorStatus: candidate.live.status ?? null,
					codigoRejeicao: candidate.repairCode,
					mensagens: [candidate.repairMessage],
					provedorRetorno: stringifyJson(candidate.live),
					provedorProcessadoEm: details.provedorProcessadoEm ?? undefined,
					dataUltimaSincronizacao: new Date(),
				})
				.where(
					and(
						eq(fiscalOutboundDocuments.id, candidate.document.id),
						eq(fiscalOutboundDocuments.organizacaoId, candidate.document.organizacaoId),
						inArray(fiscalOutboundDocuments.statusInterno, ["REJEITADO", "ERRO"]),
					),
				);

			const description = describeFiscalEmissionResult({ status: candidate.repairStatus, messages: [candidate.repairMessage] });
			if (candidate.event) {
				await tx
					.update(fiscalDocumentEvents)
					.set({
						tipo: candidate.repairStatus,
						descricao: description,
						payload: stringifyJson(candidate.repairPayload),
						origem: candidate.event.origem ?? "RECONCILIACAO",
					})
					.where(and(eq(fiscalDocumentEvents.id, candidate.event.id), eq(fiscalDocumentEvents.documentoFiscalId, candidate.document.id)));
			} else {
				await tx.insert(fiscalDocumentEvents).values({
					documentoFiscalId: candidate.document.id,
					tipo: candidate.repairStatus,
					descricao: description,
					payload: stringifyJson(candidate.repairPayload),
					origem: "RECONCILIACAO",
				});
			}
		}
	});

	console.log(`Reparo aplicado com sucesso em ${candidates.length} documento(s).`);
}

main()
	.catch((error) => {
		console.error("[FISCAL_HISTORY_REPAIR] Falha:", error instanceof Error ? error.message : error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await connection.end();
	});
