import { AppSubscriptionPlans } from "@/config";
import { getDealPlanKey } from "@/lib/deals";
import { getAppBaseUrl } from "@/lib/organizations/poi-qr-codes";
import { db } from "@/services/drizzle";
import { deals, type TDealEntity } from "@/services/drizzle/schema";
import { stripe } from "@/services/stripe";
import { eq } from "drizzle-orm";
import createHttpError from "http-errors";

// Módulo separado de lib/deals/index.ts de propósito: este arquivo importa o SDK do Stripe,
// e o index é consumido pelo webhook — manter o grafo de imports do webhook enxuto.

// Convenção ctrl_* lida pelo Control (Syncroniza) — mesma usada no checkout self-serve,
// acrescida do deal_id para identificação determinística do deal em qualquer evento.
export function buildDealControlMetadata(deal: Pick<TDealEntity, "id" | "nome" | "emailObtentor" | "telefoneObtentor">) {
	const metadata: Record<string, string> = {
		dealId: deal.id,
		ctrl_deal_id: deal.id,
		ctrl_deal_nome: deal.nome,
		ctrl_email: deal.emailObtentor,
	};
	if (deal.telefoneObtentor) metadata.ctrl_phone = deal.telefoneObtentor;
	return metadata;
}

// Garante a infraestrutura Stripe do deal (customer + price dedicados) e gera uma sessão
// de checkout. Idempotente por campo: só cria o que ainda não existe, então serve tanto
// para a criação do deal quanto para reemitir o link após expiração ou falha parcial.
export async function ensureDealStripeCheckout(deal: TDealEntity) {
	const planKey = getDealPlanKey(deal);
	const plan = AppSubscriptionPlans[planKey];
	if (!plan.stripeProdutoId) throw new createHttpError.InternalServerError("Produto do Stripe não configurado para o plano base do deal.");

	const controlMetadata = buildDealControlMetadata(deal);

	let stripeCustomerId = deal.stripeCustomerId;
	if (!stripeCustomerId) {
		const customer = await stripe.customers.create({
			email: deal.emailObtentor,
			name: deal.nomeObtentor,
			metadata: controlMetadata,
		});
		stripeCustomerId = customer.id;
		console.log("[INFO] [DEAL_CHECKOUT] Stripe customer created for deal:", deal.id, stripeCustomerId);
	}

	// Price dedicado sobre o produto do plano base: o valor negociado fica visível e
	// auditável no dashboard do Stripe, e a fatura sai como "N × plano" numa única assinatura.
	let stripePriceId = deal.stripePriceId;
	if (!stripePriceId) {
		const price = await stripe.prices.create({
			product: plan.stripeProdutoId,
			unit_amount: deal.valorUnitarioCentavos,
			currency: "brl",
			recurring: { interval: deal.intervalo === "ANUAL" ? "year" : "month" },
			nickname: `Deal: ${deal.nome}`,
			metadata: { dealId: deal.id },
		});
		stripePriceId = price.id;
		console.log("[INFO] [DEAL_CHECKOUT] Stripe price created for deal:", deal.id, stripePriceId);
	}

	const baseUrl = getAppBaseUrl();
	const checkoutSession = await stripe.checkout.sessions.create({
		customer: stripeCustomerId,
		line_items: [{ price: stripePriceId, quantity: deal.quantidadeLicencas }],
		mode: "subscription",
		success_url: `${baseUrl}/?deal-checkout=success`,
		cancel_url: `${baseUrl}/?deal-checkout=cancelled`,
		metadata: controlMetadata,
		subscription_data: {
			metadata: controlMetadata,
		},
	});
	if (!checkoutSession.url) throw new createHttpError.InternalServerError("Erro ao criar sessão de checkout do deal.");

	await db
		.update(deals)
		.set({
			stripeCustomerId,
			stripePriceId,
			stripeCheckoutSessionId: checkoutSession.id,
		})
		.where(eq(deals.id, deal.id));

	return { stripeCustomerId, stripePriceId, checkoutSessionId: checkoutSession.id, checkoutUrl: checkoutSession.url };
}

// Expira a sessão de checkout anterior (best-effort, para evitar dois links pagáveis) e
// gera uma nova. Usado pelo admin (REEMITIR_CHECKOUT) e pelo formulário público de onboarding.
export async function reissueDealCheckout(deal: TDealEntity) {
	if (deal.stripeCheckoutSessionId) {
		try {
			await stripe.checkout.sessions.expire(deal.stripeCheckoutSessionId);
		} catch (error) {
			console.warn("[WARN] [DEAL_CHECKOUT] Falha ao expirar checkout anterior do deal:", deal.id, error);
		}
	}
	return await ensureDealStripeCheckout(deal);
}
