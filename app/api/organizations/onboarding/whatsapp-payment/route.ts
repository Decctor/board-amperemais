import { captureServerEvent } from "@/lib/analytics/posthog-server";
import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { getJourney, reconcileOnboardingCampaigns, updateJourneyProgress } from "@/lib/onboarding";
import { db } from "@/services/drizzle";
import { whatsappConnectionPhones, whatsappConnections } from "@/services/drizzle/schema";
import { and, eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

// Confirmação, pelo usuário, de que a conta Cloud API tem forma de pagamento. A Meta não expõe
// isso de forma confiável; o estado vira VERIFICADO na primeira entrega e PENDENTE se um
// webhook trouxer o erro 131042. Não sobrescreve VERIFICADO nem PENDENTE (fatos observados).
const ConfirmWhatsappPaymentInputSchema = z.object({
	telefoneId: z.string({ required_error: "Telefone não informado.", invalid_type_error: "Tipo não válido para o telefone." }),
	confirmado: z.boolean({ invalid_type_error: "Tipo não válido para confirmado." }),
});
export type TConfirmWhatsappPaymentInput = z.infer<typeof ConfirmWhatsappPaymentInputSchema>;

async function confirmWhatsappPayment({ input, session }: { input: TConfirmWhatsappPaymentInput; session: TAuthUserSession }) {
	const organizacaoId = session.membership?.organizacao.id;
	if (!organizacaoId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para confirmar o pagamento.");

	const [phone] = await db
		.select({ id: whatsappConnectionPhones.id, metadados: whatsappConnectionPhones.metadados, tipoConexao: whatsappConnections.tipoConexao })
		.from(whatsappConnectionPhones)
		.innerJoin(whatsappConnections, eq(whatsappConnections.id, whatsappConnectionPhones.conexaoId))
		.where(and(eq(whatsappConnectionPhones.id, input.telefoneId), eq(whatsappConnections.organizacaoId, organizacaoId)))
		.limit(1);
	if (!phone) throw new createHttpError.NotFound("Telefone não encontrado nesta organização.");
	if (phone.tipoConexao !== "META_CLOUD_API")
		throw new createHttpError.BadRequest("A confirmação de pagamento só se aplica à conexão oficial da Meta.");

	const currentStatus = phone.metadados?.pagamento?.status ?? "DESCONHECIDO";
	const observed = currentStatus === "VERIFICADO" || currentStatus === "PENDENTE";
	const nextStatus = observed ? currentStatus : input.confirmado ? "CONFIRMADO_PELO_USUARIO" : "DESCONHECIDO";

	if (!observed) {
		await db
			.update(whatsappConnectionPhones)
			.set({ metadados: { ...phone.metadados, pagamento: { status: nextStatus, atualizadoEm: new Date().toISOString() } } })
			.where(eq(whatsappConnectionPhones.id, phone.id));
	}

	const journey = await getJourney({ executor: db, organizationId: organizacaoId, produto: "CRM" });
	if (journey) {
		await updateJourneyProgress({
			executor: db,
			organizationId: organizacaoId,
			produto: "CRM",
			respostas: { whatsappPagamentoConfirmadoPeloUsuario: input.confirmado },
		});
	}

	const { readiness } = await reconcileOnboardingCampaigns({ executor: db, organizationId: organizacaoId });

	if (input.confirmado) {
		try {
			await captureServerEvent({ distinctId: session.user.id, event: "whatsapp_payment_confirmed", properties: { organization_id: organizacaoId } });
		} catch (error) {
			console.error("[WARN] [ONBOARDING_WHATSAPP_PAYMENT] Falha ao capturar evento:", error);
		}
	}

	return {
		data: { pagamento: nextStatus, whatsapp: readiness.whatsapp },
		message: observed
			? "O estado do pagamento já foi verificado pela Meta e não foi alterado."
			: input.confirmado
				? "Pagamento confirmado."
				: "Confirmação removida.",
	};
}
export type TConfirmWhatsappPaymentOutput = Awaited<ReturnType<typeof confirmWhatsappPayment>>;

async function confirmWhatsappPaymentRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	const input = ConfirmWhatsappPaymentInputSchema.parse(await request.json());
	const result = await confirmWhatsappPayment({ input, session });
	return NextResponse.json(result);
}

export const PUT = appApiHandler({ PUT: confirmWhatsappPaymentRoute });

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
