import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { listInboundDocuments } from "@/lib/fiscal/inbound";
import createHttpError from "http-errors";
import { NextRequest, NextResponse } from "next/server";
import z from "zod";

const GetInboundDocumentsInputSchema = z.object({
	page: z.coerce.number().min(1).default(1),
});

async function getInboundDocuments({ orgId, page }: { orgId: string; page: number }) {
	const result = await listInboundDocuments({ organizationId: orgId, page });
	return { data: { default: result }, message: "Notas recebidas encontradas com sucesso." };
}
export type TGetInboundDocumentsOutput = Awaited<ReturnType<typeof getInboundDocuments>>;
export type TGetInboundDocumentsOutputDefault = NonNullable<TGetInboundDocumentsOutput["data"]["default"]>;

async function getInboundDocumentsRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	const orgId = session.membership?.organizacao.id;
	if (!orgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização.");
	if (!session.membership?.permissoes.fiscal.visualizar) throw new createHttpError.Forbidden("Oops, você não possui permissão para visualizar o módulo fiscal.");

	const input = GetInboundDocumentsInputSchema.parse({ page: request.nextUrl.searchParams.get("page") ?? 1 });
	const result = await getInboundDocuments({ orgId, page: input.page });
	return NextResponse.json(result);
}

export const GET = appApiHandler({ GET: getInboundDocumentsRoute });
