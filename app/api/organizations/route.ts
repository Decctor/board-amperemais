import { AppSubscriptionPlans, FREE_TRIAL_DURATION_DAYS } from "@/config";
import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { OrganizationSchema } from "@/schemas/organizations";
import { db } from "@/services/drizzle";
import { organizations, users } from "@/services/drizzle/schema";
import { stripe } from "@/services/stripe";
import { eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

export const CreateOrganizationInputSchema = z.object({
	organization: OrganizationSchema.omit({ dataInsercao: true }),
	subscription: z
		.enum(["ESSENCIAL-MONTHLY", "ESSENCIAL-YEARLY", "CRESCIMENTO-MONTHLY", "CRESCIMENTO-YEARLY", "ESCALA-MONTHLY", "ESCALA-YEARLY", "FREE-TRIAL"])
		.optional()
		.nullable(),
});

export type TCreateOrganizationInputSchema = z.infer<typeof CreateOrganizationInputSchema>;

// This route must be called at the end of the onboarding process
async function createOrganization({ input, session }: { input: TCreateOrganizationInputSchema; session: TAuthUserSession }) {
	const userHasOrgAlready = !!session.membership?.organizacao.id;
	if (userHasOrgAlready) throw new createHttpError.BadRequest("Você já está vinculado a uma organização.");

	const { organization, subscription } = input;
	const sessionUser = session.user;

	console.log("[INFO] [CREATE_ORGANIZATION] Starting the organization onboarding conclusion process:", JSON.stringify(input, null, 2));
	// 1. Insert organization first
	const insertedOrganizationResponse = await db
		.insert(organizations)
		.values({
			...organization,
		})
		.returning({ id: organizations.id });

	const insertedOrgId = insertedOrganizationResponse[0]?.id;
	if (!insertedOrgId) throw new createHttpError.InternalServerError("Oops, houve um erro desconhecido ao criar organização.");
	console.log("[INFO] [CREATE_ORGANIZATION] Organization created successfully with ID:", insertedOrgId);

	await db
		.update(users)
		.set({
			organizacaoId: insertedOrgId,
		})
		.where(eq(users.id, sessionUser.id));
	// 2. Process subscription
	if (!subscription || subscription === "FREE-TRIAL") {
		console.log("[INFO] [CREATE_ORGANIZATION] Free trial selected. Defining free trial period.");
		// FREE-TRIAL logic
		const periodoTesteInicio = new Date();
		const periodoTesteFim = new Date();
		periodoTesteFim.setDate(periodoTesteFim.getDate() + FREE_TRIAL_DURATION_DAYS);

		await db
			.update(organizations)
			.set({
				periodoTesteInicio,
				periodoTesteFim,
			})
			.where(eq(organizations.id, insertedOrgId));

		console.log("[INFO] [CREATE_ORGANIZATION] Free trial period defined successfully.");
		return {
			data: {
				insertedId: insertedOrgId,
				redirectTo: "/dashboard",
			},
			message: "Organização criada com sucesso! Período de teste iniciado.",
		};
	}

	console.log("[INFO] [CREATE_ORGANIZATION] Paid plan selected, starting Stripe checkout processing.", {
		organizationId: insertedOrgId,
		subscription,
	});
	// Paid plans logic
	// Parse subscription format: "ESSENCIAL-MONTHLY" -> plan: "ESSENCIAL", modality: "monthly"
	const [planName, modalityName] = subscription.split("-") as [keyof typeof AppSubscriptionPlans, "MONTHLY" | "YEARLY"];
	const modality = modalityName.toLowerCase() as "monthly" | "yearly";

	const plan = AppSubscriptionPlans[planName];
	if (!plan) throw new createHttpError.BadRequest("Plano de assinatura inválido.");

	const stripePriceId = plan.pricing[modality].stripePriceId;
	if (!stripePriceId) throw new createHttpError.InternalServerError("Price ID do Stripe não configurado para este plano.");

	// Create Stripe customer
	const customerEmail = organization.email || sessionUser.email;
	if (!customerEmail) throw new createHttpError.BadRequest("Email é necessário para criar assinatura.");

	const stripeCustomer = await stripe.customers.create({
		email: customerEmail,
		name: organization.nome,
		metadata: {
			organizationId: insertedOrgId,
		},
	});
	console.log("[INFO] [CREATE_ORGANIZATION] Stripe customer created successfully with ID:", stripeCustomer.id);
	// Update organization with Stripe customer ID
	await db
		.update(organizations)
		.set({
			stripeCustomerId: stripeCustomer.id,
			assinaturaPlano: planName,
		})
		.where(eq(organizations.id, insertedOrgId));

	// Create checkout session
	const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
	const checkoutSession = await stripe.checkout.sessions.create({
		customer: stripeCustomer.id,
		line_items: [
			{
				price: stripePriceId,
				quantity: 1,
			},
		],
		mode: "subscription",
		success_url: `${baseUrl}/onboarding/success?session_id={CHECKOUT_SESSION_ID}`,
		cancel_url: `${baseUrl}/onboarding`,
		subscription_data: {
			metadata: {
				organizationId: insertedOrgId,
			},
		},
	});
	if (!checkoutSession.url) throw new createHttpError.InternalServerError("Erro ao criar sessão de checkout.");
	console.log("[INFO] [CREATE_ORGANIZATION] Stripe checkout session created successfully with URL:", checkoutSession.url);

	return {
		data: {
			insertedId: insertedOrgId,
			redirectTo: checkoutSession.url,
		},
		message: "Organização criada com sucesso! Redirecionando para pagamento.",
	};
}

export type TCreateOrganizationOutput = Awaited<ReturnType<typeof createOrganization>>;

async function createOrganizationRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");

	const payload = await request.json();
	const input = CreateOrganizationInputSchema.parse(payload);

	const result = await createOrganization({ input, session: session });

	return NextResponse.json(result);
}

export const POST = appApiHandler({
	POST: createOrganizationRoute,
});
