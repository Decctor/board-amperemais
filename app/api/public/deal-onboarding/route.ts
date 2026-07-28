import { appApiHandler } from "@/lib/app-api";
import { reissueDealCheckout } from "@/lib/deals/checkout";
import {
	normalizeAndValidateOnboardingAnswers,
	parseOnboardingStructure,
	resolveDealOnboardingFormByToken,
	resolveDealOnboardingSituation,
} from "@/lib/deals/onboarding";
import { hashPublicToken } from "@/lib/tabs";
import { enforcePublicRateLimit } from "@/lib/tabs/public-rate-limit";
import { DealOnboardingFormAnswersSchema } from "@/schemas/deal-onboarding";
import { db } from "@/services/drizzle";
import { dealOnboardingForms } from "@/services/drizzle/schema";
import { and, eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

// ============================================================================
// Formulário público de onboarding do deal. O token bruto viaja no body e é
// resolvido por hash — nunca persistido. O estado é sempre revalidado no
// servidor: rascunhos só em EMITIDO, checkout só após PREENCHIDO. Nenhum dado
// do deal além do checkoutUrl sai por esta rota.
// ============================================================================

const TokenSchema = z.string({ required_error: "Token não informado." }).min(16, { message: "Token inválido." });

const SubmitDealOnboardingInputSchema = z.discriminatedUnion("acao", [
	z.object({
		acao: z.literal("SALVAR_RASCUNHO"),
		token: TokenSchema,
		respostas: DealOnboardingFormAnswersSchema,
	}),
	z.object({
		acao: z.literal("ENVIAR"),
		token: TokenSchema,
		respostas: DealOnboardingFormAnswersSchema,
	}),
	z.object({
		acao: z.literal("OBTER_CHECKOUT"),
		token: TokenSchema,
	}),
]);
export type TSubmitDealOnboardingInput = z.infer<typeof SubmitDealOnboardingInputSchema>;

async function submitDealOnboarding({ input, clientIp }: { input: TSubmitDealOnboardingInput; clientIp: string }) {
	const tokenHash = hashPublicToken(input.token);
	enforcePublicRateLimit({ key: `${clientIp}:${tokenHash.slice(0, 16)}` });

	const resolved = await resolveDealOnboardingFormByToken({ token: input.token });
	if (!resolved) throw new createHttpError.NotFound("Link inválido ou não está mais disponível.");
	const { form, deal } = resolved;

	const situacao = resolveDealOnboardingSituation({ form, deal });
	if (situacao === "CONCLUIDO") throw new createHttpError.BadRequest("Este processo já foi concluído. O pagamento foi confirmado.");
	if (situacao === "CANCELADO") throw new createHttpError.BadRequest("Este link não está mais disponível.");

	if (input.acao === "SALVAR_RASCUNHO") {
		if (situacao !== "EMITIDO")
			throw new createHttpError.BadRequest(
				situacao === "EXPIRADO" ? "Este link expirou. Entre em contato com quem o enviou." : "O formulário já foi enviado e não aceita mais alterações.",
			);

		const estrutura = parseOnboardingStructure(form.estrutura);
		const { respostas } = normalizeAndValidateOnboardingAnswers({
			estrutura,
			respostas: input.respostas,
			quantidadeLicencas: deal.quantidadeLicencas,
			final: false,
		});

		// Guarda de status no WHERE: uma corrida com o envio final não regride o formulário.
		await db
			.update(dealOnboardingForms)
			.set({ respostas, dataUltimoRascunho: new Date() })
			.where(and(eq(dealOnboardingForms.id, form.id), eq(dealOnboardingForms.status, "EMITIDO")));

		return {
			data: { situacao: "EMITIDO" as const, checkoutUrl: null },
			message: "Progresso salvo. Você pode voltar a este link quando quiser.",
		};
	}

	if (input.acao === "ENVIAR") {
		if (situacao !== "EMITIDO")
			throw new createHttpError.BadRequest(
				situacao === "EXPIRADO" ? "Este link expirou. Entre em contato com quem o enviou." : "O formulário já foi enviado.",
			);

		const estrutura = parseOnboardingStructure(form.estrutura);
		const { respostas, erros } = normalizeAndValidateOnboardingAnswers({
			estrutura,
			respostas: input.respostas,
			quantidadeLicencas: deal.quantidadeLicencas,
			final: true,
		});
		if (erros.length > 0) {
			throw new createHttpError.BadRequest(erros.slice(0, 3).map((erro) => erro.mensagem).join(" "));
		}

		// Trava condicional: 0 linhas afetadas = outra requisição enviou primeiro.
		const [locked] = await db
			.update(dealOnboardingForms)
			.set({ respostas, status: "PREENCHIDO", dataPreenchimento: new Date() })
			.where(and(eq(dealOnboardingForms.id, form.id), eq(dealOnboardingForms.status, "EMITIDO")))
			.returning({ id: dealOnboardingForms.id });
		if (!locked) throw new createHttpError.Conflict("O formulário já foi enviado.");

		// Stripe fora de transação: se falhar aqui, o formulário fica PREENCHIDO e o cliente
		// reobtém o checkout na revisita (OBTER_CHECKOUT) — mesma filosofia do createDeal.
		const stripeResult = await reissueDealCheckout(deal);

		return {
			data: { situacao: "PREENCHIDO" as const, checkoutUrl: stripeResult.checkoutUrl },
			message: "Dados enviados! Você será direcionado para o pagamento.",
		};
	}

	// OBTER_CHECKOUT — permitido também em EXPIRADO desde que preenchido: o cliente já fez a
	// parte dele; bloquear o pagamento seria contraproducente.
	if (form.status !== "PREENCHIDO") throw new createHttpError.BadRequest("Envie o formulário antes de ir para o pagamento.");

	const stripeResult = await reissueDealCheckout(deal);
	return {
		data: { situacao: "PREENCHIDO" as const, checkoutUrl: stripeResult.checkoutUrl },
		message: "Redirecionando para o pagamento.",
	};
}
export type TSubmitDealOnboardingOutput = Awaited<ReturnType<typeof submitDealOnboarding>>;

async function submitDealOnboardingRoute(request: NextRequest) {
	const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
	const body = await request.json();
	const input = SubmitDealOnboardingInputSchema.parse(body);
	const result = await submitDealOnboarding({ input, clientIp });
	return NextResponse.json(result);
}

export const POST = appApiHandler({ POST: submitDealOnboardingRoute });
