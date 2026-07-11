import { AppSubscriptionPlans, CONSULTORIA_ADDON, PIX_MANDATE_MAX_AMOUNT_CENTS, type TAppSubscriptionPlanKey } from "@/config";
import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { db } from "@/services/drizzle";
import { organizations } from "@/services/drizzle/schema";
import { stripe } from "@/services/stripe";
import { eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import z from "zod";

const GenerateCheckoutInputSchema = z.object({
	subscription: z.enum(["ESSENCIAL-MONTHLY", "ESSENCIAL-YEARLY", "CRESCIMENTO-MONTHLY", "CRESCIMENTO-YEARLY", "ESCALA-MONTHLY", "ESCALA-YEARLY"]),
	// Quando true, adiciona a consultoria (Gestor de Crescimento) como 2ª line-item
	// e marca a organização como gerida por nós. Disponível só no ciclo mensal.
	consultoria: z.boolean().optional().default(false),
});

export type TGenerateCheckoutInput = z.infer<typeof GenerateCheckoutInputSchema>;

async function generateCheckoutRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");

	const userOrgId = session.membership?.organizacao.id;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização.");

	const payload = await request.json();
	const input = GenerateCheckoutInputSchema.parse(payload);

	// Get organization
	const organization = await db.query.organizations.findFirst({
		where: (fields, { eq }) => eq(fields.id, userOrgId),
	});
	if (!organization) throw new createHttpError.NotFound("Organização não encontrada.");

	console.log("[INFO] [GENERATE_CHECKOUT] Starting checkout generation for org:", userOrgId);

	// Convenção ctrl_* lida pelo Control (Syncroniza) para identificação determinística
	// da venda/assinatura — vincula organização, e-mail e telefone do comprador.
	// Vai na session, na subscription e no customer, para chegar em qualquer evento.
	const controlMetadata: Record<string, string> = {
		ctrl_organizacao_id: userOrgId,
		ctrl_organizacao_nome: organization.nome,
	};
	const buyerEmail = session.user.email || organization.email;
	if (buyerEmail) controlMetadata.ctrl_email = buyerEmail;
	const buyerPhone = session.user.telefone || organization.telefone;
	if (buyerPhone) controlMetadata.ctrl_phone = buyerPhone;

	// Parse subscription format: "ESSENCIAL-MONTHLY" -> plan: "ESSENCIAL", modality: "monthly"
	const [planName, modalityName] = input.subscription.split("-") as [TAppSubscriptionPlanKey, "MONTHLY" | "YEARLY"];
	const modality = modalityName.toLowerCase() as "monthly" | "yearly";

	const plan = AppSubscriptionPlans[planName];
	if (!plan) throw new createHttpError.BadRequest("Plano de assinatura inválido.");

	const stripePriceId = plan.pricing[modality].stripePriceId;
	if (!stripePriceId) throw new createHttpError.InternalServerError("Price ID do Stripe não configurado para este plano.");

	// Consultoria (add-on) só existe no ciclo mensal — Stripe não permite misturar
	// intervalos (mensal + anual) numa mesma assinatura.
	if (input.consultoria && modality !== "monthly") throw new createHttpError.BadRequest("A consultoria está disponível apenas no plano mensal.");

	const lineItems: { price: string; quantity: number }[] = [{ price: stripePriceId, quantity: 1 }];

	if (input.consultoria) {
		if (!CONSULTORIA_ADDON.stripePriceId) throw new createHttpError.InternalServerError("Price ID da consultoria não configurado.");
		lineItems.push({ price: CONSULTORIA_ADDON.stripePriceId, quantity: 1 });
	}

	// Check if org already has a Stripe customer or create one
	let stripeCustomerId = organization.stripeCustomerId;

	if (!stripeCustomerId) {
		const customerEmail = organization.email || session.user.email;
		if (!customerEmail) throw new createHttpError.BadRequest("Email é necessário para criar assinatura.");

		const stripeCustomer = await stripe.customers.create({
			email: customerEmail,
			name: organization.nome,
			metadata: {
				organizationId: userOrgId,
				...controlMetadata,
			},
		});
		stripeCustomerId = stripeCustomer.id;
		console.log("[INFO] [GENERATE_CHECKOUT] Stripe customer created:", stripeCustomerId);

		// Update organization with Stripe customer ID
		await db
			.update(organizations)
			.set({
				stripeCustomerId: stripeCustomerId,
			})
			.where(eq(organizations.id, userOrgId));
	} else {
		// Atualização oportunista: garante que customers criados antes da convenção
		// ctrl_* também fiquem identificáveis pelo Control. Falha não bloqueia o checkout.
		try {
			await stripe.customers.update(stripeCustomerId, {
				metadata: {
					organizationId: userOrgId,
					...controlMetadata,
				},
			});
		} catch (error) {
			console.error("[WARN] [GENERATE_CHECKOUT] Falha ao atualizar metadata do customer:", error);
		}
	}

	// Update organization with selected plan
	await db
		.update(organizations)
		.set({
			assinaturaPlano: planName,
			consultoriaAtiva: input.consultoria,
			// Fotografa o marco do baseline ao ativar a consultoria; preserva se já existir.
			baselineInicio: input.consultoria ? (organization.baselineInicio ?? new Date()) : organization.baselineInicio,
			configuracao: {
				recursos: plan.capabilities,
				preferencias: {
					rastreamentoEstoque: plan.capabilities.erp.acesso === true,
					limiteMensagensSemanaisViaCampanhas: null,
					sessoesVenda: {
						habilitado: false,
						obrigatorio: false,
						escopo: "OPERADOR",
						exigirFundoTroco: false,
						conferenciaCega: false,
						bloquearFechamentoComPendenciaFiscal: false,
					},
				},
				defaults: organization.configuracao.defaults,
			},
		})
		.where(eq(organizations.id, userOrgId));

	// PIX (via PIX Automático) só se aplica ao ciclo mensal — o mandato opera em
	// payment_schedule "monthly" e não suporta débito único anual.
	// Fica atrás de STRIPE_PIX_ENABLED: enquanto o PIX não estiver ativado na conta
	// Stripe, incluí-lo em payment_method_types faz o create da sessão falhar por
	// inteiro (derruba até o cartão). Com o flag off, mantemos o comportamento atual
	// (payment methods dinâmicos definidos no Dashboard) intacto.
	const pixEnabled = process.env.STRIPE_PIX_ENABLED === "true";
	const acceptsPix = pixEnabled && modality === "monthly";

	// Create checkout session
	const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
	const checkoutSession = await stripe.checkout.sessions.create({
		customer: stripeCustomerId,
		line_items: lineItems,
		mode: "subscription",
		// Só restringimos os métodos quando ativamos PIX explicitamente; caso contrário
		// omitimos para preservar os payment methods dinâmicos do Dashboard.
		...(acceptsPix && {
			payment_method_types: ["card", "pix"] as Stripe.Checkout.SessionCreateParams.PaymentMethodType[],
		}),
		allow_promotion_codes: true,
		success_url: `${baseUrl}/dashboard?checkout=success`,
		cancel_url: `${baseUrl}/dashboard?checkout=cancelled`,
		// Teto do mandato PIX no maior combo mensal possível (ESCALA + consultoria), para
		// que upgrade/downgrade ou adição da consultoria não exijam reautorização no banco.
		// O próprio mandato autoriza os débitos recorrentes — as renovações usam o método
		// salvo, sem precisar de payment_settings na sessão (parâmetro inexistente aqui).
		...(acceptsPix && {
			payment_method_options: {
				pix: {
					mandate_options: {
						amount: PIX_MANDATE_MAX_AMOUNT_CENTS,
						amount_type: "maximum",
						currency: "brl",
						payment_schedule: "monthly",
						reference: "RecompraCRM Assinatura",
					},
				},
			},
		}),
		metadata: controlMetadata,
		subscription_data: {
			metadata: {
				organizationId: userOrgId,
				...controlMetadata,
			},
		},
	});

	if (!checkoutSession.url) throw new createHttpError.InternalServerError("Erro ao criar sessão de checkout.");
	console.log("[INFO] [GENERATE_CHECKOUT] Checkout session created:", checkoutSession.url);

	return NextResponse.json({
		data: {
			checkoutUrl: checkoutSession.url,
		},
		message: "Sessão de checkout criada com sucesso.",
	});
}

export type TGenerateCheckoutOutput = {
	data: {
		checkoutUrl: string;
	};
	message: string;
};

export const POST = appApiHandler({
	POST: generateCheckoutRoute,
});
