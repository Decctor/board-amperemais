import { appApiHandler } from "@/lib/app-api";
import { archiveExternalEvent, runArchivedEventProcessing } from "@/lib/external-events/archive";
import { processSpedyWebhookBody, resolveSpedyWebhookOrganizationId, type TSpedyWebhookBody } from "@/lib/fiscal/providers/spedy/webhook";
import { waitUntil } from "@vercel/functions";
import createHttpError from "http-errors";
import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

/**
 * Webhook de eventos da Spedy (inbound_invoice.detected / completed / event).
 *
 * A Spedy nao assina o payload (sem HMAC documentado), entao a autenticacao e um segredo na
 * query string (`?secret=SPEDY_WEBHOOK_SECRET`), comparado em tempo constante. O webhook e
 * configurado por conta, nao por empresa: um unico endpoint recebe eventos de todas as
 * organizacoes, e a organizacao dona e resolvida pelo CNPJ em `data.company.federalTaxNumber`.
 * Registro dos webhooks: scripts/register-spedy-webhooks.ts (one-shot, owner key).
 */

function isAuthorizedSpedyWebhook(request: NextRequest) {
	const secret = process.env.SPEDY_WEBHOOK_SECRET;
	if (!secret) return false;
	const provided = request.nextUrl.searchParams.get("secret") ?? "";
	const secretBuffer = Buffer.from(secret);
	const providedBuffer = Buffer.from(provided);
	if (secretBuffer.length !== providedBuffer.length) return false;
	return timingSafeEqual(secretBuffer, providedBuffer);
}

async function postSpedyWebhookRoute(request: NextRequest) {
	if (!isAuthorizedSpedyWebhook(request)) throw new createHttpError.Unauthorized("Webhook nao autorizado.");

	const body = (await request.json()) as TSpedyWebhookBody;
	const eventName = typeof body?.event === "string" && body.event ? body.event : "DESCONHECIDO";

	// Inbox durável: payload arquivado APÓS a autenticação e ANTES do processamento. Falha no
	// arquivamento propaga (500 via appApiHandler) e a Spedy reentrega — melhor retry do
	// provider do que payload perdido com 200 devolvido.
	const archived = await archiveExternalEvent({ origem: "SPEDY", tipo: eventName, payload: body });

	// Resposta rápida; o processamento (aplicar snapshot, baixar XML) sai da request. Reentregas
	// são inócuas: o inbox colapsa bodies idênticos e o apply é idempotente por chave de acesso.
	waitUntil(
		runArchivedEventProcessing({
			eventId: archived.id,
			run: () => processSpedyWebhookBody(body),
			resolveOrganizationId: () => resolveSpedyWebhookOrganizationId(body),
		}),
	);
	return NextResponse.json({ success: true }, { status: 200 });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = appApiHandler({
	POST: postSpedyWebhookRoute,
});
