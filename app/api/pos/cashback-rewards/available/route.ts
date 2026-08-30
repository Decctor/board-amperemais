import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { listAvailableCashbackRewards } from "@/lib/cashback/prizes";
import { db } from "@/services/drizzle";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const GetAvailableRewardsInputSchema = z.object({
	clienteId: z.string({
		required_error: "ID do cliente não informado.",
		invalid_type_error: "Tipo não válido para o ID do cliente.",
	}),
});
export type TGetAvailablePosRewardsInput = z.infer<typeof GetAvailableRewardsInputSchema>;

async function getAvailablePosRewards({ input, session }: { input: TGetAvailablePosRewardsInput; session: TAuthUserSession }) {
	const organizationId = session.membership?.organizacao.id;
	if (!organizationId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	// PDV vende a preço base do cadastro (sem canal materializado), então sem channelState.
	const { program, saldoValorDisponivel, rewards } = await listAvailableCashbackRewards({
		tx: db,
		organizacaoId: organizationId,
		clienteId: input.clienteId,
	});

	return {
		data: { program, saldoValorDisponivel, rewards },
		message: "Recompensas disponíveis encontradas com sucesso.",
	};
}
export type TGetAvailablePosRewardsOutput = Awaited<ReturnType<typeof getAvailablePosRewards>>;

async function getAvailablePosRewardsRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	if (!session.membership) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização.");

	const { searchParams } = new URL(request.url);
	const input = GetAvailableRewardsInputSchema.parse({
		clienteId: searchParams.get("clienteId"),
	});
	const result = await getAvailablePosRewards({ input, session });
	return NextResponse.json(result, { status: 200 });
}

export const GET = appApiHandler({ GET: getAvailablePosRewardsRoute });
