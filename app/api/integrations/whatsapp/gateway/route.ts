import { appApiHandler } from "@/lib/app-api";
import { archiveExternalEvent, runArchivedEventProcessing } from "@/lib/external-events/archive";
import {
	classifyGatewayWebhookBody,
	processGatewayWebhookBody,
	resolveGatewayWebhookOrganizationId,
	type TGatewayWebhookBody,
} from "@/lib/whatsapp/gateway-webhook-processing";
import { waitUntil } from "@vercel/functions";
import { NextRequest, NextResponse } from "next/server";

const API_SECRET = process.env.INTERNAL_WHATSAPP_GATEWAY_API_SECRET;

async function postWhatsappGatewayRoute(req: NextRequest) {
	// Fail-closed: sem o secret configurado, `undefined === undefined` autorizaria qualquer
	// request. Erro de configuração rejeita tudo, nunca abre.
	if (!API_SECRET) {
		console.error("[INTERNAL_WHATSAPP_WEBHOOK] INTERNAL_WHATSAPP_GATEWAY_API_SECRET ausente — rejeitando request (fail-closed).");
		return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
	}

	const queryApiSecret = req.nextUrl.searchParams.get("apiSecret") ?? undefined;
	const authorizationHeader = req.headers.get("authorization");
	const bearerApiSecret = authorizationHeader?.startsWith("Bearer ") ? authorizationHeader.slice("Bearer ".length).trim() : undefined;
	const isAuthorized = queryApiSecret === API_SECRET || bearerApiSecret === API_SECRET;
	if (!isAuthorized) {
		console.warn("[INTERNAL_WHATSAPP_WEBHOOK] Unauthorized request");
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const body = (await req.json()) as TGatewayWebhookBody;

	console.log("[INTERNAL_WHATSAPP_WEBHOOK] Received event:", JSON.stringify(body, null, 2));

	// Inbox durável: payload arquivado APÓS a autenticação e ANTES do processamento. Falha
	// no arquivamento propaga (500 via appApiHandler) e o gateway reentrega — melhor retry
	// do que payload perdido com 200 devolvido.
	const archived = await archiveExternalEvent({
		origem: "WHATSAPP-GATEWAY",
		tipo: classifyGatewayWebhookBody(body),
		payload: body,
	});

	// Todo o trabalho sai da request; desfecho (status/erro/organização) fica na linha do
	// inbox. Reentregas são inócuas: chave de idempotência aqui, wamid no persist.
	waitUntil(
		runArchivedEventProcessing({
			eventId: archived.id,
			run: () => processGatewayWebhookBody(body),
			resolveOrganizationId: () => resolveGatewayWebhookOrganizationId(body),
		}),
	);

	return NextResponse.json({ success: true }, { status: 200 });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = appApiHandler({
	POST: postWhatsappGatewayRoute,
});
