import { appApiHandler } from "@/lib/app-api";
import { listAvailableCashbackRewards } from "@/lib/cashback/prizes";
import { loadChannelState } from "@/lib/products/sales-channels-store";
import { db } from "@/services/drizzle";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const GetAvailableShopRewardsInputSchema = z.object({
	clienteId: z.string({ required_error: "ID do cliente não informado.", invalid_type_error: "Tipo não válido para o ID do cliente." }),
});
export type TGetAvailableShopRewardsInput = z.infer<typeof GetAvailableShopRewardsInputSchema>;

function extractOrgId(pathname: string) {
	return pathname.split("/")[3];
}

async function getAvailableShopRewards({ orgId, input }: { orgId: string; input: TGetAvailableShopRewardsInput }) {
	const client = await db.query.clients.findFirst({
		where: (fields, { and, eq }) => and(eq(fields.id, input.clienteId), eq(fields.organizacaoId, orgId)),
		columns: { id: true },
	});
	if (!client) throw new createHttpError.NotFound("Cliente não encontrado.");

	// Preço/disponibilidade do canal SHOP: o valor comercial exibido precisa ser o mesmo que a
	// admissão do resgate vai carimbar no item da venda.
	const channelState = await loadChannelState({ orgId, canal: "SHOP" });
	const { program, saldoValorDisponivel, rewards } = await listAvailableCashbackRewards({
		tx: db,
		organizacaoId: orgId,
		clienteId: input.clienteId,
		surface: "LOJA_DIGITAL",
		channelState,
	});

	return {
		data: { program, saldoValorDisponivel, rewards },
		message: "Recompensas disponíveis encontradas com sucesso.",
	};
}
export type TGetAvailableShopRewardsOutput = Awaited<ReturnType<typeof getAvailableShopRewards>>;

async function getAvailableShopRewardsRoute(request: NextRequest) {
	const orgId = extractOrgId(request.nextUrl.pathname);
	const input = GetAvailableShopRewardsInputSchema.parse({ clienteId: request.nextUrl.searchParams.get("clienteId") });
	return NextResponse.json(await getAvailableShopRewards({ orgId, input }), { status: 200 });
}

export const GET = appApiHandler({ GET: getAvailableShopRewardsRoute });
