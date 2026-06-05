import { AppSubscriptionPlans, CONSULTORIA_ADDON, type TAppSubscriptionPlanKey } from "@/config";
import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { db } from "@/services/drizzle";
import { organizations } from "@/services/drizzle/schema";
import { stripe } from "@/services/stripe";
import { eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const GenerateCheckoutInputSchema = z.object({
  subscription: z.enum([
    "ESSENCIAL-MONTHLY",
    "ESSENCIAL-YEARLY",
    "CRESCIMENTO-MONTHLY",
    "CRESCIMENTO-YEARLY",
    "ESCALA-MONTHLY",
    "ESCALA-YEARLY",
  ]),
  // Quando true, adiciona a consultoria (Gestor de Crescimento) como 2ª line-item
  // e marca a organização como gerida por nós. Disponível só no ciclo mensal.
  consultoria: z.boolean().optional().default(false),
});

export type TGenerateCheckoutInput = z.infer<typeof GenerateCheckoutInputSchema>;

async function generateCheckoutRoute(request: NextRequest) {
  const session = await getCurrentSessionUncached();
  if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");

  const userOrgId = session.membership?.organizacao.id;
  if (!userOrgId)
    throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização.");

  const payload = await request.json();
  const input = GenerateCheckoutInputSchema.parse(payload);

  // Get organization
  const organization = await db.query.organizations.findFirst({
    where: (fields, { eq }) => eq(fields.id, userOrgId),
  });
  if (!organization) throw new createHttpError.NotFound("Organização não encontrada.");

  console.log("[INFO] [GENERATE_CHECKOUT] Starting checkout generation for org:", userOrgId);

  // Parse subscription format: "ESSENCIAL-MONTHLY" -> plan: "ESSENCIAL", modality: "monthly"
  const [planName, modalityName] = input.subscription.split("-") as [
    TAppSubscriptionPlanKey,
    "MONTHLY" | "YEARLY",
  ];
  const modality = modalityName.toLowerCase() as "monthly" | "yearly";

  const plan = AppSubscriptionPlans[planName];
  if (!plan) throw new createHttpError.BadRequest("Plano de assinatura inválido.");

  const stripePriceId = plan.pricing[modality].stripePriceId;
  if (!stripePriceId)
    throw new createHttpError.InternalServerError(
      "Price ID do Stripe não configurado para este plano.",
    );

  // Consultoria (add-on) só existe no ciclo mensal — Stripe não permite misturar
  // intervalos (mensal + anual) numa mesma assinatura.
  if (input.consultoria && modality !== "monthly")
    throw new createHttpError.BadRequest("A consultoria está disponível apenas no plano mensal.");

  const lineItems: { price: string; quantity: number }[] = [{ price: stripePriceId, quantity: 1 }];

  if (input.consultoria) {
    if (!CONSULTORIA_ADDON.stripePriceId)
      throw new createHttpError.InternalServerError("Price ID da consultoria não configurado.");
    lineItems.push({ price: CONSULTORIA_ADDON.stripePriceId, quantity: 1 });
  }

  // Check if org already has a Stripe customer or create one
  let stripeCustomerId = organization.stripeCustomerId;

  if (!stripeCustomerId) {
    const customerEmail = organization.email || session.user.email;
    if (!customerEmail)
      throw new createHttpError.BadRequest("Email é necessário para criar assinatura.");

    const stripeCustomer = await stripe.customers.create({
      email: customerEmail,
      name: organization.nome,
      metadata: {
        organizationId: userOrgId,
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
        },
        defaults: organization.configuracao.defaults,
      },
    })
    .where(eq(organizations.id, userOrgId));

  // Create checkout session
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const checkoutSession = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    line_items: lineItems,
    mode: "subscription",
    allow_promotion_codes: true,
    success_url: `${baseUrl}/dashboard?checkout=success`,
    cancel_url: `${baseUrl}/dashboard?checkout=cancelled`,
    subscription_data: {
      metadata: {
        organizationId: userOrgId,
      },
    },
  });

  if (!checkoutSession.url)
    throw new createHttpError.InternalServerError("Erro ao criar sessão de checkout.");
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
