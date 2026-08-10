import { db } from "@/services/drizzle";
import { organizations } from "@/services/drizzle/schema";
import { eq, sql } from "drizzle-orm";
import type Stripe from "stripe";

/**
 * Escrita das datas de acesso da assinatura (assinaturaPeriodoPagoFim /
 * assinaturaAcessoProvisorioFim) — compartilhada entre o webhook Stripe e o cron de
 * reconciliação para que os dois apliquem exatamente as mesmas regras de idempotência.
 * A leitura (decisão de acesso) fica em resolveSubscriptionAccess, em @/config.
 */

/**
 * Fim do período coberto pelo invoice: o maior `period.end` entre as linhas. Vem do invoice,
 * nunca de um cálculo local de 30/365 dias — troca de plano e proração ficam corretas de graça.
 */
export function getInvoicePeriodEnd(invoice: Stripe.Invoice): Date | null {
	let maxPeriodEnd = 0;
	for (const line of invoice.lines?.data ?? []) {
		const periodEnd = line.period?.end;
		if (typeof periodEnd === "number" && periodEnd > maxPeriodEnd) maxPeriodEnd = periodEnd;
	}
	return maxPeriodEnd > 0 ? new Date(maxPeriodEnd * 1000) : null;
}

/**
 * Consolida o acesso pago de uma organização a partir de um invoice efetivamente pago.
 * Idempotente e imune a eventos fora de ordem: `assinaturaPeriodoPagoFim` só avança (GREATEST),
 * e a janela provisória só é limpa quando o período consolidado ainda está vigente — um
 * invoice.paid atrasado de um ciclo antigo nunca derruba a janela otimista de uma cobrança nova.
 */
export async function consolidatePaidAccess({ organizationId, invoice }: { organizationId: string; invoice: Stripe.Invoice }) {
	const periodEnd = getInvoicePeriodEnd(invoice);
	if (!periodEnd) {
		console.log("[SUBSCRIPTION_ACCESS] Invoice sem period.end nas linhas — consolidação ignorada.", {
			organizationId,
			invoiceId: invoice.id,
		});
		return;
	}

	await db
		.update(organizations)
		.set({
			assinaturaPeriodoPagoFim: sql`GREATEST(COALESCE(${organizations.assinaturaPeriodoPagoFim}, 'epoch'::timestamp), ${periodEnd})`,
			...(periodEnd > new Date() ? { assinaturaAcessoProvisorioFim: null } : {}),
		})
		.where(eq(organizations.id, organizationId));

	console.log("[SUBSCRIPTION_ACCESS] Acesso pago consolidado.", { organizationId, invoiceId: invoice.id, periodEnd });
}

/**
 * Concede/estende a janela de acesso otimista de uma cobrança pendente. GREATEST: redelivery ou
 * evento atrasado nunca encurta uma janela já concedida.
 */
export async function grantProvisionalAccess({ organizationId, until }: { organizationId: string; until: Date }) {
	await db
		.update(organizations)
		.set({
			assinaturaAcessoProvisorioFim: sql`GREATEST(COALESCE(${organizations.assinaturaAcessoProvisorioFim}, 'epoch'::timestamp), ${until})`,
		})
		.where(eq(organizations.id, organizationId));

	console.log("[SUBSCRIPTION_ACCESS] Acesso provisório concedido.", { organizationId, until });
}

/**
 * Encerra a janela provisória (reconciliação: cobrança confirmada como vencida/falha na Stripe).
 * O bloqueio em si já vale pela data ter passado — isto normaliza o registro.
 */
export async function clearProvisionalAccess({ organizationId }: { organizationId: string }) {
	await db.update(organizations).set({ assinaturaAcessoProvisorioFim: null }).where(eq(organizations.id, organizationId));
	console.log("[SUBSCRIPTION_ACCESS] Acesso provisório encerrado.", { organizationId });
}
