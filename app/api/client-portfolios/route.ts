import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { buildRoutineQueue, getDayFollowUps } from "@/lib/routine/queue";
import { resolveRoutineSeller } from "@/lib/routine/resolve-seller";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const GetRoutineInputSchema = z.object({
	vendedorId: z
		.string({ invalid_type_error: "Tipo inválido para o ID do vendedor." })
		.optional()
		.nullable()
		.transform((v) => v || null),
});
export type TGetRoutineInput = z.infer<typeof GetRoutineInputSchema>;

async function getRoutine({ input, session }: { input: TGetRoutineInput; session: TAuthUserSession }) {
	const { organizacaoId, seller } = await resolveRoutineSeller({ session, explicitSellerId: input.vendedorId });

	const [queueResult, followUps] = await Promise.all([
		buildRoutineQueue({ organizacaoId, vendedorId: seller.id }),
		getDayFollowUps({ organizacaoId, vendedorId: seller.id }),
	]);

	return {
		data: {
			vendedor: seller,
			fila: queueResult.queue,
			followUps,
			totalEmDebito: queueResult.totalEmDebito,
			carteiraTotal: queueResult.carteiraTotal,
		},
		message: "Rotina carregada com sucesso.",
	};
}
export type TGetRoutineOutput = Awaited<ReturnType<typeof getRoutine>>;

async function getRoutineRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	if (!session.membership) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização.");

	const { searchParams } = new URL(request.url);
	const input = GetRoutineInputSchema.parse({ vendedorId: searchParams.get("vendedorId") });
	const result = await getRoutine({ input, session });
	return NextResponse.json(result, { status: 200 });
}

export const GET = appApiHandler({ GET: getRoutineRoute });
