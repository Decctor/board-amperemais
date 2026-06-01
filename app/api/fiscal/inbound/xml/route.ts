import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { getInboundDocumentXml } from "@/lib/fiscal/inbound";
import createHttpError from "http-errors";
import { NextRequest, NextResponse } from "next/server";

async function getInboundXmlRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	const orgId = session.membership?.organizacao.id;
	if (!orgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização.");
	if (!session.membership?.permissoes.fiscal.visualizar) throw new createHttpError.Forbidden("Acesso restrito.");

	const inboundId = request.nextUrl.searchParams.get("inboundId");
	if (!inboundId) throw new createHttpError.BadRequest("ID da nota recebida não informado.");
	const { buffer, contentType } = await getInboundDocumentXml({ organizationId: orgId, inboundId });
	return new NextResponse(buffer as ArrayBuffer, { status: 200, headers: { "Content-Type": contentType } });
}

export const GET = appApiHandler({ GET: getInboundXmlRoute });
