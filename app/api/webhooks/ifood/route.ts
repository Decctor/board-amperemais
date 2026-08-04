import { runDataCollectingV2 } from "@/lib/data-collecting-v2";
import { getActiveDataSourceIntegrations } from "@/lib/integrations/data-sources";
import { db } from "@/services/drizzle";
import { waitUntil } from "@vercel/functions";
import { createHmac, timingSafeEqual } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

/**
 * Webhook de eventos do iFood (Events API). Uma única URL por aplicativo recebe TODOS os
 * eventos de TODOS os merchants autorizados, incluindo os heartbeats de presença (KEEPALIVE).
 *
 * Contrato do iFood (docs/dev-planning/ifood-orders-fulfillment-plan.md, seção 4.4):
 * - validar `X-IFood-Signature` (HMAC-SHA256 hex do body CRU com o client_secret) ANTES do parse;
 *   assinatura inválida responde 401 (a homologação testa isso);
 * - responder 202 em até 5 segundos — processamento pesado vai para `waitUntil`;
 * - entrega at-least-once e sem ordem: o processamento delega ao pipeline canônico de ingestão,
 *   que é idempotente (upsert por idExterno); o cron de 5 min segue como fallback;
 * - KEEPALIVE: 202 marca presença. No modo "por merchant" o request traz `merchantIds` e a
 *   resposta deve listar os merchants online — respondemos os que estão conectados à plataforma.
 */

const IfoodWebhookEventSchema = z
	.object({
		id: z.string().optional().nullable(),
		code: z.string().optional().nullable(),
		fullCode: z.string().optional().nullable(),
		orderId: z.string().optional().nullable(),
		merchantId: z.string().optional().nullable(),
		merchantIds: z.array(z.string()).optional().nullable(),
	})
	.passthrough();

function validateIfoodSignature(rawBody: string, signature: string | null): boolean {
	const clientSecret = process.env.IFOOD_CLIENT_SECRET;
	if (!clientSecret) {
		console.error("[ERROR] [IFOOD_WEBHOOK] IFOOD_CLIENT_SECRET não configurado.");
		return false;
	}
	if (!signature) return false;

	const expected = createHmac("sha256", clientSecret).update(rawBody, "utf8").digest("hex");
	const expectedBuffer = Buffer.from(expected);
	const receivedBuffer = Buffer.from(signature);
	if (expectedBuffer.length !== receivedBuffer.length) return false;
	return timingSafeEqual(expectedBuffer, receivedBuffer);
}

async function loadConnectedIfoodIntegrations() {
	const rows = await getActiveDataSourceIntegrations({ executor: db, types: ["IFOOD"] });
	return rows.map((integration) => ({
		id: integration.id,
		organizacaoId: integration.organizacaoId,
		merchantIds: integration.configuracao.tipo === "IFOOD" ? integration.configuracao.merchantIds : [],
	}));
}

async function resolveIntegrationByMerchantId(merchantId: string): Promise<{ integrationId: string; organizacaoId: string } | null> {
	const connected = await loadConnectedIfoodIntegrations();
	const matches = connected.filter((integration) => integration.merchantIds.includes(merchantId));
	if (matches.length === 0) return null;
	// Merchant deveria pertencer a exatamente uma conexão (guard D5 dentro da org; entre orgs a
	// premissa é operacional). Ambiguidade indica estado inválido — logar antes do desempate
	// determinístico (ordem estável de getActiveDataSourceIntegrations).
	if (matches.length > 1) {
		console.warn("[WARN] [IFOOD_WEBHOOK] Merchant presente em mais de uma conexão ativa — usando a mais antiga.", {
			merchantId,
			integrationIds: matches.map((match) => match.id),
			organizationIds: matches.map((match) => match.organizacaoId),
		});
	}
	return { integrationId: matches[0].id, organizacaoId: matches[0].organizacaoId };
}

async function handleKeepAlive(requestedMerchantIds: string[] | null | undefined) {
	// Modo "por aplicativo": basta o 202. Modo "por merchant": responder com os merchants online —
	// consideramos online todo merchant conectado a uma organização da plataforma.
	if (!requestedMerchantIds?.length) return NextResponse.json({}, { status: 202 });

	const connected = await loadConnectedIfoodIntegrations();
	const connectedMerchantIds = new Set(connected.flatMap((integration) => integration.merchantIds));
	const onlineMerchantIds = requestedMerchantIds.filter((merchantId) => connectedMerchantIds.has(merchantId));
	return NextResponse.json({ merchantIds: onlineMerchantIds }, { status: 202 });
}

export async function POST(request: NextRequest) {
	const rawBody = await request.text();
	const signature = request.headers.get("x-ifood-signature");

	if (!validateIfoodSignature(rawBody, signature)) {
		return NextResponse.json({ message: "Assinatura inválida." }, { status: 401 });
	}

	let event: z.infer<typeof IfoodWebhookEventSchema>;
	try {
		event = IfoodWebhookEventSchema.parse(JSON.parse(rawBody));
	} catch {
		return NextResponse.json({ message: "Payload inválido." }, { status: 400 });
	}

	const eventCode = event.fullCode ?? event.code ?? "";

	if (eventCode === "KEEPALIVE") {
		return handleKeepAlive(event.merchantIds);
	}

	// Evento de pedido: o webhook é um "sino". Respondemos 202 imediatamente e disparamos a
	// ingestão APENAS da conexão dona do merchant em background — o pipeline faz o polling
	// (recolhendo também eventos atrasados), grava os pedidos e envia os ACKs. Restringir à
	// conexão evita polling/refresh das demais fontes da organização a cada evento.
	const merchantId = event.merchantId;
	if (merchantId) {
		waitUntil(
			(async () => {
				const resolved = await resolveIntegrationByMerchantId(merchantId);
				if (!resolved) {
					console.warn("[WARN] [IFOOD_WEBHOOK] Evento para merchant sem organização conectada", {
						merchantId,
						eventCode,
						eventId: event.id,
					});
					return;
				}
				const result = await runDataCollectingV2({
					organizationIds: [resolved.organizacaoId],
					integrationIds: [resolved.integrationId],
				});
				if (result.errors.length) {
					console.error("[ERROR] [IFOOD_WEBHOOK] Erros na ingestão disparada pelo webhook", {
						merchantId,
						organizationId: resolved.organizacaoId,
						integrationId: resolved.integrationId,
						errors: result.errors,
					});
				}
			})().catch((error) => {
				console.error("[ERROR] [IFOOD_WEBHOOK] Falha ao processar evento", { merchantId, eventCode, error });
			}),
		);
	}

	return NextResponse.json({}, { status: 202 });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
