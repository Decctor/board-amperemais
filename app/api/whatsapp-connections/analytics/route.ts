import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { db } from "@/services/drizzle";
import { whatsappConnectionPhones } from "@/services/drizzle/schema/whatsapp-connections";
import { eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const GetPhoneSpendInputSchema = z.object({
	phoneId: z.string({
		required_error: "ID do telefone não informado.",
		invalid_type_error: "Tipo inválido para ID do telefone.",
	}),
});
export type TGetPhoneSpendInput = z.infer<typeof GetPhoneSpendInputSchema>;

type ConversationTypeSummary = {
	cost: number;
	conversations: number;
};

async function getWhatsappPhoneSpend({ input, session }: { input: TGetPhoneSpendInput; session: TAuthUserSession }) {
	const userOrgId = session.membership?.organizacao.id;
	if (!userOrgId) throw new createHttpError.BadRequest("Você precisa estar vinculado a uma organização.");

	const phone = await db.query.whatsappConnectionPhones.findFirst({
		where: eq(whatsappConnectionPhones.id, input.phoneId),
		with: { conexao: true },
	});

	if (!phone || phone.conexao.organizacaoId !== userOrgId) {
		throw new createHttpError.NotFound("Telefone não encontrado.");
	}

	if (phone.conexao.tipoConexao !== "META_CLOUD_API") {
		throw new createHttpError.BadRequest("Analytics disponível apenas para conexões Meta Cloud API.");
	}

	if (!phone.whatsappBusinessAccountId || !phone.conexao.token) {
		throw new createHttpError.BadRequest("Dados de conexão incompletos para buscar analytics.");
	}

	const wabaId = phone.whatsappBusinessAccountId;
	const token = phone.conexao.token;

	const now = Math.floor(Date.now() / 1000);
	const thirtyDaysAgo = now - 30 * 24 * 60 * 60;

	const numero = phone.numero.startsWith("+") ? phone.numero : `+${phone.numero}`;

	const params = new URLSearchParams({
		start: thirtyDaysAgo.toString(),
		end: now.toString(),
		granularity: "MONTHLY",
		dimensions: JSON.stringify(["CONVERSATION_TYPE"]),
		metric: JSON.stringify(["COST", "CONVERSATION"]),
		phone_numbers: JSON.stringify([numero]),
		access_token: token,
	});

	const response = await fetch(`https://graph.facebook.com/v20.0/${wabaId}/conversation_analytics?${params.toString()}`);

	if (!response.ok) {
		const errorBody = await response.json().catch(() => ({}));
		throw new createHttpError.BadGateway(errorBody?.error?.message ?? "Erro ao buscar analytics da Meta.");
	}

	const analyticsData = await response.json();
	const dataPoints: Array<{
		start: number;
		end: number;
		conversation: number;
		cost: number;
		conversation_type?: string;
	}> = analyticsData?.conversation_analytics?.data?.[0]?.data_points ?? [];

	const byType: Record<string, ConversationTypeSummary> = {};
	let totalCost = 0;
	let totalConversations = 0;

	for (const point of dataPoints) {
		const type = point.conversation_type ?? "UNKNOWN";
		totalCost += point.cost ?? 0;
		totalConversations += point.conversation ?? 0;
		if (!byType[type]) byType[type] = { cost: 0, conversations: 0 };
		byType[type].cost += point.cost ?? 0;
		byType[type].conversations += point.conversation ?? 0;
	}

	return {
		data: {
			totalCost,
			totalConversations,
			byType,
			periodDays: 30,
		},
		message: "Dados de analytics obtidos com sucesso.",
	};
}

export type TGetWhatsappPhoneSpendOutput = Awaited<ReturnType<typeof getWhatsappPhoneSpend>>;

async function getWhatsappPhoneSpendRoute(req: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para acessar esse recurso.");

	const input = GetPhoneSpendInputSchema.parse({
		phoneId: req.nextUrl.searchParams.get("phoneId"),
	});

	const result = await getWhatsappPhoneSpend({ input, session });
	return NextResponse.json(result, { status: 200 });
}

export const GET = appApiHandler({ GET: getWhatsappPhoneSpendRoute });
