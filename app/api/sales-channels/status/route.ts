import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { getSalesChannelsStatus } from "@/lib/sales-channels/status";
import createHttpError from "http-errors";
import { NextResponse } from "next/server";

/**
 * Status operacional dos canais de venda da organização, consumido pelo trilho do header.
 *
 * Devolve um array em vez de campos nomeados de propósito: acrescentar um canal novo (Nuvemshop,
 * Cardápio Web) passa a ser trabalho de serviço, sem tocar no componente que renderiza os pills.
 */
async function getSalesChannelsStatusService({
	organizacaoId,
	permissoes,
}: Parameters<typeof getSalesChannelsStatus>[0]) {
	const canais = await getSalesChannelsStatus({ organizacaoId, permissoes });
	return { data: { canais }, message: "Status dos canais de venda buscado com sucesso." };
}
export type TGetSalesChannelsStatusOutput = Awaited<ReturnType<typeof getSalesChannelsStatusService>>;

async function getSalesChannelsStatusRoute() {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para acessar o status dos canais de venda.");
	const organizacaoId = session.membership?.organizacao.id;
	if (!organizacaoId) throw new createHttpError.BadRequest("Você precisa estar vinculado a uma organização.");

	const result = await getSalesChannelsStatusService({ organizacaoId, permissoes: session.membership?.permissoes });
	return NextResponse.json(result);
}

export const GET = appApiHandler({ GET: getSalesChannelsStatusRoute });

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
