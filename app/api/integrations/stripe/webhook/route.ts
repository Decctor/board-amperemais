import { CONSULTORIA_ADDON } from "@/config";
import { findDealByStripeCustomerId, syncDealSubscriptionState } from "@/lib/deals";
import {
	PLATFORM_PARTNER_COMMISSION_RULE_VERSION,
	PLATFORM_PARTNER_MONTHLY_FIRST_INVOICE_BPS,
	PLATFORM_PARTNER_MONTHLY_SUBSEQUENT_INVOICE_BPS,
	PLATFORM_PARTNER_MONTHLY_THIRD_INVOICE_BPS,
	PLATFORM_PARTNER_RULE_SNAPSHOT,
	PLATFORM_PARTNER_YEARLY_INVOICE_BPS,
} from "@/lib/platform-partnerships/constants";
import { db } from "@/services/drizzle";
import { organizations, platformPartnerCommissions, platformPartnerReferrals } from "@/services/drizzle/schema";
import { stripe } from "@/services/stripe";
import { waitUntil } from "@vercel/functions";
import { and, count, eq, isNotNull, isNull } from "drizzle-orm";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";

const allowedStripeEvents: Stripe.Event.Type[] = [
	"customer.subscription.created",
	"customer.subscription.updated",
	"customer.subscription.deleted",
	"invoice.paid",
	"invoice.payment_succeeded",
	// PIX Automático: o débito de renovação é assíncrono e pode falhar após a
	// pré-notificação de 3 dias. A mudança de status da assinatura chega via
	// customer.subscription.updated (past_due), mas rastreamos a falha no nível do
	// invoice para observabilidade.
	"invoice.payment_failed",
];

export async function POST(req: NextRequest) {
	const body = await req.text();

	const signature = (await headers()).get("Stripe-Signature");

	if (!signature) return NextResponse.json({}, { status: 400 });

	async function doEventProcessing() {
		if (typeof signature !== "string") {
			throw new Error("[STRIPE HOOK] Header isn't a string???");
		}

		const event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SIGNATURE_SECRET as string);
		waitUntil(processEvent(event));
	}
	try {
		await doEventProcessing();
	} catch (error) {
		console.log("[STRIPE HOOK] Error processing event", error);
	}
	return NextResponse.json({ received: true });
}

async function processEvent(event: Stripe.Event) {
	// Skip processing if the event isn't one I'm tracking (list of all events below)
	if (!allowedStripeEvents.includes(event.type)) return;

	if (event.type === "invoice.paid" || event.type === "invoice.payment_succeeded") {
		return await handleInvoicePaid(event.data.object as Stripe.Invoice);
	}

	if (event.type === "invoice.payment_failed") {
		const invoice = event.data.object as Stripe.Invoice;
		// Não altera o status da org aqui — isso é feito por customer.subscription.updated
		// (past_due), que dispara o grace period. Aqui apenas registramos para diagnóstico
		// de falhas de débito PIX (e de cartão).
		console.log("[STRIPE HOOK] [INVOICE_PAYMENT_FAILED]", {
			invoiceId: invoice.id,
			customerId: getInvoiceCustomerId(invoice),
			subscriptionId: getInvoiceSubscriptionId(invoice),
			status: invoice.status,
		});
		return;
	}

	// All the events I track have a customerId
	const { customer: customerId } = event.data.object as {
		customer: string; // Sadly TypeScript does not know this
	};
	if (typeof customerId !== "string") {
		throw new Error(`[STRIPE HOOK] Customer ID is not a string??? \n Event type: ${event.type}`);
	}

	// Deals (multi-licença): o customer pertence ao deal, não a uma organização. O status
	// é gravado no deal e replicado (fan-out) para todas as organizações vinculadas —
	// as orgs de deal não têm stripeCustomerId próprio, então o fluxo abaixo não as acharia.
	const deal = await findDealByStripeCustomerId(customerId);
	if (deal) {
		const { id, status } = event.data.object as Stripe.Subscription;
		const stripeStatus = event.type === "customer.subscription.deleted" ? "canceled" : status;
		console.log("[STRIPE HOOK] [HANDLE_DEAL_SUBSCRIPTION_EVENT]", {
			dealId: deal.id,
			customerId,
			eventType: event.type,
			stripeStatus,
		});
		return await syncDealSubscriptionState({
			dealId: deal.id,
			stripeStatus,
			stripeSubscriptionId: id,
		});
	}

	if (event.type === "customer.subscription.deleted") {
		console.log("[STRIPE HOOK] [HANDLE_SUBSCRIPTION_DELETED]", {
			customerId,
			event,
		});
		return await db
			.update(organizations)
			.set({ stripeSubscriptionStatus: "canceled", stripeSubscriptionStatusUltimaAlteracao: new Date() })
			.where(eq(organizations.stripeCustomerId, customerId));
	}
	if (event.type === "customer.subscription.created" || event.type === "customer.discount.updated") {
		const { id, status } = event.data.object as Stripe.Subscription;

		console.log("[STRIPE HOOK] [HANDLE_SUBSCRIPTION_CREATED_DISCOUNT_UPDATED]", {
			customerId,
			event,
			eventObject: event.data.object,
		});
		return await db
			.update(organizations)
			.set({
				stripeSubscriptionStatus: status,
				stripeSubscriptionId: id,
				stripeSubscriptionStatusUltimaAlteracao: new Date(),
			})
			.where(eq(organizations.stripeCustomerId, customerId));
	}

	if (event.type === "customer.subscription.updated") {
		console.log("[STRIPE HOOK] [HANDLE_SUBSCRIPTION_UPDATED]", {
			customerId,
			event,
			eventObject: event.data.object,
		});
		const { id, status } = event.data.object as Stripe.Subscription;
		return await db
			.update(organizations)
			.set({
				stripeSubscriptionStatus: status,
				stripeSubscriptionId: id,
				stripeSubscriptionStatusUltimaAlteracao: new Date(),
			})
			.where(eq(organizations.stripeCustomerId, customerId));
	}
	return;
}

function getInvoiceCustomerId(invoice: Stripe.Invoice) {
	const customer = invoice.customer;
	if (typeof customer === "string") return customer;
	return customer?.id ?? null;
}

function getInvoiceSubscriptionId(invoice: Stripe.Invoice) {
	const invoiceRecord = invoice as unknown as Record<string, unknown>;
	const subscription = invoiceRecord.subscription;
	if (typeof subscription === "string") return subscription;
	if (subscription && typeof subscription === "object" && "id" in subscription) {
		const id = (subscription as { id?: unknown }).id;
		return typeof id === "string" ? id : null;
	}
	const parent = invoiceRecord.parent as { subscription_details?: { subscription?: string | { id?: string } } } | undefined;
	const parentSubscription = parent?.subscription_details?.subscription;
	if (typeof parentSubscription === "string") return parentSubscription;
	return parentSubscription?.id ?? null;
}

function getInvoiceLineAmount(line: Stripe.InvoiceLineItem) {
	const lineRecord = line as unknown as Record<string, unknown>;
	const amount = lineRecord.amount;
	return typeof amount === "number" ? amount : 0;
}

function getInvoiceLinePriceId(line: Stripe.InvoiceLineItem) {
	const lineRecord = line as unknown as { price?: { id?: string | null; recurring?: { interval?: string | null } | null } | null };
	return lineRecord.price?.id ?? null;
}

function getInvoiceLineRecurringInterval(line: Stripe.InvoiceLineItem) {
	const lineRecord = line as unknown as { price?: { recurring?: { interval?: string | null } | null } | null };
	return lineRecord.price?.recurring?.interval ?? null;
}

function buildInvoiceSnapshot(invoice: Stripe.Invoice) {
	return {
		id: invoice.id,
		customer: getInvoiceCustomerId(invoice),
		subscription: getInvoiceSubscriptionId(invoice),
		status: invoice.status,
		currency: invoice.currency,
		amountPaid: invoice.amount_paid,
		amountDue: invoice.amount_due,
		total: invoice.total,
		subtotal: invoice.subtotal,
		created: invoice.created,
		lines: invoice.lines.data.map((line) => ({
			id: line.id,
			amount: getInvoiceLineAmount(line),
			priceId: getInvoiceLinePriceId(line),
			interval: getInvoiceLineRecurringInterval(line),
			description: line.description,
			period: line.period,
		})),
		metadata: invoice.metadata,
	};
}

function addDays(date: Date, days: number) {
	const next = new Date(date);
	next.setDate(next.getDate() + days);
	return next;
}

// Gera a comissão do parceiro a partir de um invoice efetivamente pago. Com PIX
// Automático o pagamento é assíncrono, então este handler só dispara APÓS a confirmação
// (invoice.paid / invoice.payment_succeeded) — nunca durante o estado pendente do PIX.
// É idempotente por invoice.id (ver guarda existingCommission abaixo), então recebê-lo
// mais de uma vez não duplica a comissão.
async function handleInvoicePaid(invoice: Stripe.Invoice) {
	if (!invoice.id) return;

	const customerId = getInvoiceCustomerId(invoice);
	if (!customerId) return;

	// Faturas de deal (multi-licença) ficam fora do fluxo de comissões de parceiros: são
	// vendas fechadas diretamente pelo admin, sem indicação. O lookup por organização
	// abaixo já não as encontraria (orgs de deal não têm stripeCustomerId), mas o skip
	// explícito documenta a decisão e evita processamento desnecessário.
	const deal = await findDealByStripeCustomerId(customerId);
	if (deal) {
		console.log("[STRIPE HOOK] [INVOICE_PAID] Fatura pertence a um deal — sem comissão de parceiro.", {
			dealId: deal.id,
			invoiceId: invoice.id,
		});
		return;
	}

	const existingCommission = await db.query.platformPartnerCommissions.findFirst({
		where: eq(platformPartnerCommissions.stripeInvoiceId, invoice.id),
	});
	if (existingCommission) return;

	const organization = await db.query.organizations.findFirst({
		where: eq(organizations.stripeCustomerId, customerId),
	});
	if (!organization) return;

	const referral = await db.query.platformPartnerReferrals.findFirst({
		where: eq(platformPartnerReferrals.organizacaoId, organization.id),
		with: {
			partner: true,
		},
	});
	if (!referral || referral.partner.status !== "ATIVO") return;

	const consultoriaPriceId = CONSULTORIA_ADDON.stripePriceId;
	let valorConsultoriaCentavos = 0;
	let valorBaseComissionavelCentavos = 0;
	let hasYearlyLine = false;

	for (const line of invoice.lines.data) {
		const amount = getInvoiceLineAmount(line);
		const priceId = getInvoiceLinePriceId(line);
		if (consultoriaPriceId && priceId === consultoriaPriceId) {
			valorConsultoriaCentavos += amount;
			continue;
		}

		valorBaseComissionavelCentavos += amount;
		if (getInvoiceLineRecurringInterval(line) === "year") hasYearlyLine = true;
	}

	if (valorBaseComissionavelCentavos <= 0) return;

	const previousCommissionsResult = await db
		.select({ count: count(platformPartnerCommissions.id) })
		.from(platformPartnerCommissions)
		.where(
			and(
				eq(platformPartnerCommissions.referralId, referral.id),
				isNotNull(platformPartnerCommissions.stripeInvoiceId),
				isNull(platformPartnerCommissions.ajusteOrigemCommissionId),
			),
		);
	const numeroInvoiceAssinatura = (previousCommissionsResult[0]?.count ?? 0) + 1;
	const percentualComissaoBps = hasYearlyLine
		? PLATFORM_PARTNER_YEARLY_INVOICE_BPS
		: numeroInvoiceAssinatura === 1
			? PLATFORM_PARTNER_MONTHLY_FIRST_INVOICE_BPS
			: numeroInvoiceAssinatura === 3
				? PLATFORM_PARTNER_MONTHLY_THIRD_INVOICE_BPS
				: PLATFORM_PARTNER_MONTHLY_SUBSEQUENT_INVOICE_BPS;
	const valorComissaoCentavos = Math.round((valorBaseComissionavelCentavos * percentualComissaoBps) / 10000);
	const now = new Date();

	await db.transaction(async (tx) => {
		await tx.insert(platformPartnerCommissions).values({
			partnerId: referral.partnerId,
			referralId: referral.id,
			organizacaoId: organization.id,
			stripeInvoiceId: invoice.id,
			stripeSubscriptionId: getInvoiceSubscriptionId(invoice),
			stripeCustomerId: customerId,
			numeroInvoiceAssinatura,
			valorInvoiceBrutoCentavos: invoice.amount_paid ?? invoice.total ?? valorBaseComissionavelCentavos + valorConsultoriaCentavos,
			valorConsultoriaCentavos,
			valorBaseComissionavelCentavos,
			percentualComissaoBps,
			valorComissaoCentavos,
			regraVersao: PLATFORM_PARTNER_COMMISSION_RULE_VERSION,
			regraSnapshot: PLATFORM_PARTNER_RULE_SNAPSHOT,
			invoiceSnapshot: buildInvoiceSnapshot(invoice),
			status: "PENDENTE",
			dataElegibilidade: addDays(now, 30),
		});

		await tx
			.update(platformPartnerReferrals)
			.set({
				status: "PAGAMENTO_CONFIRMADO",
				dataPrimeiroPagamento: referral.dataPrimeiroPagamento ?? now,
			})
			.where(eq(platformPartnerReferrals.id, referral.id));
	});
}
