import { applyFiscalProviderWebhookSnapshot } from "@/lib/fiscal/documents";
import { applyInboundSnapshot } from "@/lib/fiscal/inbound";
import { resolveInboundProvider } from "@/lib/fiscal/inbound/providers";
import { loadFiscalOrganization } from "@/lib/fiscal/settings";
import { db } from "@/services/drizzle";
import type { TFiscalDocument } from "@/services/drizzle/schema";
import { sql } from "drizzle-orm";
import { mapSpedyInboundInvoice } from "./inbound";
import { buildSpedyIntegrationId } from "./mappers/utils";
import { mapSpedyInvoiceResponse } from "./status";
import type { TSpedyInboundInvoice, TSpedyInvoiceResponse, TSpedyInvoiceStatus } from "./types";

// Envelope dos webhooks da Spedy: { id, event, data }. Para `inbound_invoice.event` o data
// embrulha { invoice, event }; nos demais eventos o data e o proprio invoice (shape do GET).
export type TSpedyWebhookBody = {
	id?: string | null;
	event?: string | null;
	data?: Record<string, unknown> | null;
};

export function isSpedyInboundWebhookEvent(eventName: string) {
	return eventName.startsWith("inbound_invoice.");
}

export function isSpedyOutboundWebhookEvent(eventName: string) {
	return eventName === "invoice.status_changed";
}

function extractRawSpedyWebhookInvoice(body: TSpedyWebhookBody): Record<string, unknown> | null {
	if (!body.data) return null;
	const raw = body.event === "inbound_invoice.event" ? body.data.invoice : body.data;
	return raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
}

export function extractSpedyWebhookInvoice(body: TSpedyWebhookBody): TSpedyInboundInvoice | null {
	const raw = extractRawSpedyWebhookInvoice(body);
	if (!raw) return null;
	const invoice = raw as TSpedyInboundInvoice;
	return invoice.accessKey ? invoice : null;
}

const SPEDY_INVOICE_STATUSES = new Set<TSpedyInvoiceStatus>([
	"created",
	"enqueued",
	"received",
	"authorized",
	"inContingent",
	"rejected",
	"canceled",
	"denied",
	"removed",
	"disabled",
]);

export function extractSpedyOutboundInvoice(body: TSpedyWebhookBody): TSpedyInvoiceResponse | null {
	if (!isSpedyOutboundWebhookEvent(body.event ?? "")) return null;
	if (typeof body.id !== "string" || !body.id.trim()) return null;
	const raw = extractRawSpedyWebhookInvoice(body);
	if (!raw || typeof raw.id !== "string" || typeof raw.status !== "string") return null;
	if (!SPEDY_INVOICE_STATUSES.has(raw.status as TSpedyInvoiceStatus)) return null;
	return raw as TSpedyInvoiceResponse;
}

type TSpedyDocumentIdentity = Pick<TFiscalDocument, "referencia" | "numero" | "tentativasEnvio" | "provedorPayload">;

function getStoredSpedyIntegrationId(document: TSpedyDocumentIdentity): string | null {
	if (!document.provedorPayload) return null;
	try {
		const payload = JSON.parse(document.provedorPayload) as { integrationId?: unknown };
		return typeof payload.integrationId === "string" ? payload.integrationId : null;
	} catch {
		return null;
	}
}

export function matchesSpedyIntegrationId(document: TSpedyDocumentIdentity, integrationId: string): boolean {
	const storedIntegrationId = getStoredSpedyIntegrationId(document);
	if (storedIntegrationId) return storedIntegrationId === integrationId;
	const expectedIntegrationId = buildSpedyIntegrationId(
		`${document.referencia}:n:${document.numero ?? "0"}:a:${document.tentativasEnvio ?? 0}`,
	);
	return expectedIntegrationId === integrationId;
}

async function findSpedyOutboundDocument({
	organizationId,
	invoice,
}: {
	organizationId: string;
	invoice: TSpedyInvoiceResponse;
}) {
	const byProviderId = await db.query.fiscalOutboundDocuments.findFirst({
		where: (fields, operators) =>
			operators.and(operators.eq(fields.organizacaoId, organizationId), operators.eq(fields.provedorDocumentoId, invoice.id)),
	});
	if (byProviderId) return byProviderId;
	if (!invoice.integrationId) return null;

	// O webhook pode chegar antes de a resposta do POST persistir o ID da Spedy. Nesse intervalo,
	// a tentativa e a numeracao ja estao reservadas e permitem recompor o integrationId enviado.
	const candidates = await db.query.fiscalOutboundDocuments.findMany({
		where: (fields, operators) =>
			operators.and(
				operators.eq(fields.organizacaoId, organizationId),
				operators.eq(fields.provedor, "SPEDY"),
				operators.inArray(fields.statusInterno, ["RASCUNHO", "PRONTO_PARA_ENVIO", "EM_PROCESSAMENTO", "REJEITADO", "ERRO"]),
			),
		orderBy: (fields, operators) => operators.desc(fields.dataInsercao),
		limit: 100,
	});
	return candidates.find((document) => matchesSpedyIntegrationId(document, invoice.integrationId as string)) ?? null;
}

// Webhook e por conta (recebe eventos de todas as companies): a organizacao vem do CNPJ da
// empresa no payload. `allowDuplicateFederalTaxNumbers: false` na Spedy garante no maximo uma
// company por CNPJ; aqui pegamos a primeira organizacao Spedy com o CNPJ fiscal.
export async function resolveSpedyWebhookOrganizationId(body: TSpedyWebhookBody): Promise<string | null> {
	const invoice = extractRawSpedyWebhookInvoice(body) as
		| { company?: { federalTaxNumber?: string | null } | null }
		| null;
	const digits = (invoice?.company?.federalTaxNumber ?? "").replace(/\D/g, "");
	if (!digits) return null;
	const organization = await db.query.organizations.findFirst({
		where: (fields, operators) =>
			operators.and(
				operators.eq(fields.fiscalProvedor, "SPEDY"),
				sql`regexp_replace(coalesce(${fields.fiscalConfiguracao}->>'cpfCnpj', ''), '\D', '', 'g') = ${digits}`,
			),
		columns: { id: true },
	});
	return organization?.id ?? null;
}

async function processSpedyInboundWebhook(body: TSpedyWebhookBody, organizationId: string) {
	const eventName = body.event ?? "";
	const invoice = extractSpedyWebhookInvoice(body);
	if (!invoice) {
		console.warn(`[SPEDY_WEBHOOK] Evento ${eventName} sem invoice com chave de acesso no payload.`);
		return;
	}

	const organization = await loadFiscalOrganization(organizationId);
	if (!organization) return;
	const snapshot = mapSpedyInboundInvoice(invoice);
	if (!snapshot) return;

	const provider = resolveInboundProvider(organization);
	await applyInboundSnapshot({ organizationId, snapshot, provider, organization });
}

async function processSpedyOutboundWebhook(body: TSpedyWebhookBody, organizationId: string) {
	const eventName = body.event ?? "";
	const invoice = extractSpedyOutboundInvoice(body);
	if (!invoice) {
		console.warn(`[SPEDY_WEBHOOK] Evento ${eventName} sem nota emitida valida no payload.`);
		return;
	}

	const document = await findSpedyOutboundDocument({ organizationId, invoice });
	if (!document) {
		console.warn(`[SPEDY_WEBHOOK] Evento ${eventName} para nota ${invoice.id} sem documento fiscal local correspondente.`);
		return;
	}

	await applyFiscalProviderWebhookSnapshot({
		organizationId,
		documentId: document.id,
		details: mapSpedyInvoiceResponse(invoice),
		providerEventId: body.id,
	});
}

// Organizacao ou documento desconhecido nao lanca: a conta Spedy pode conter notas que nao foram
// criadas pelo RecompraCRM, e reentregar eternamente nao cria a associacao que falta.
export async function processSpedyWebhookBody(body: TSpedyWebhookBody): Promise<void> {
	const eventName = body.event ?? "";
	if (!isSpedyInboundWebhookEvent(eventName) && !isSpedyOutboundWebhookEvent(eventName)) return;

	const organizationId = await resolveSpedyWebhookOrganizationId(body);
	if (!organizationId) {
		console.warn(`[SPEDY_WEBHOOK] Evento ${eventName} para CNPJ sem organizacao Spedy correspondente.`);
		return;
	}

	if (isSpedyInboundWebhookEvent(eventName)) {
		await processSpedyInboundWebhook(body, organizationId);
		return;
	}
	await processSpedyOutboundWebhook(body, organizationId);
}
