import { applyInboundSnapshot } from "@/lib/fiscal/inbound";
import { resolveInboundProvider } from "@/lib/fiscal/inbound/providers";
import { loadFiscalOrganization } from "@/lib/fiscal/settings";
import { db } from "@/services/drizzle";
import { sql } from "drizzle-orm";
import { mapSpedyInboundInvoice } from "./inbound";
import type { TSpedyInboundInvoice } from "./types";

// Envelope dos webhooks da Spedy: { id, event, data }. Para `inbound_invoice.event` o data
// embrulha { invoice, event }; para detected/completed o data e o proprio invoice (shape do GET).
export type TSpedyWebhookBody = {
	id?: string | null;
	event?: string | null;
	data?: Record<string, unknown> | null;
};

export function isSpedyInboundWebhookEvent(eventName: string) {
	return eventName.startsWith("inbound_invoice.");
}

export function extractSpedyWebhookInvoice(body: TSpedyWebhookBody): TSpedyInboundInvoice | null {
	if (!body.data) return null;
	const raw = body.event === "inbound_invoice.event" ? body.data.invoice : body.data;
	if (!raw || typeof raw !== "object") return null;
	const invoice = raw as TSpedyInboundInvoice;
	return invoice.accessKey ? invoice : null;
}

// Webhook e por conta (recebe eventos de todas as companies): a organizacao vem do CNPJ da
// empresa destinataria no payload. `allowDuplicateFederalTaxNumbers: false` na Spedy garante
// no maximo uma company por CNPJ; aqui pegamos a primeira organizacao Spedy com o CNPJ fiscal.
export async function resolveSpedyWebhookOrganizationId(body: TSpedyWebhookBody): Promise<string | null> {
	const invoice = extractSpedyWebhookInvoice(body);
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

// Processa um evento inbound da Spedy: normaliza o invoice para snapshot e delega ao unico
// write-path do core. Organizacao desconhecida nao lanca — reentregar eternamente nao resolve.
export async function processSpedyWebhookBody(body: TSpedyWebhookBody): Promise<void> {
	const eventName = body.event ?? "";
	if (!isSpedyInboundWebhookEvent(eventName)) return;

	const invoice = extractSpedyWebhookInvoice(body);
	if (!invoice) {
		console.warn(`[SPEDY_WEBHOOK] Evento ${eventName} sem invoice com chave de acesso no payload.`);
		return;
	}

	const organizationId = await resolveSpedyWebhookOrganizationId(body);
	if (!organizationId) {
		console.warn(`[SPEDY_WEBHOOK] Evento ${eventName} para CNPJ sem organizacao Spedy correspondente (${invoice.company?.federalTaxNumber ?? "?"}).`);
		return;
	}

	const organization = await loadFiscalOrganization(organizationId);
	if (!organization) return;

	const snapshot = mapSpedyInboundInvoice(invoice);
	if (!snapshot) return;

	const provider = resolveInboundProvider(organization);
	await applyInboundSnapshot({ organizationId, snapshot, provider, organization });
}
