import { runDataCollectingV2 } from "@/lib/data-collecting-v2";
import { db } from "@/services/drizzle";
import { organizations } from "@/services/drizzle/schema";
import { waitUntil } from "@vercel/functions";
import { createHmac, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
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

async function loadConnectedIfoodOrganizations() {
	const result = await db.query.organizations.findMany({
		where: eq(organizations.integracaoTipo, "IFOOD"),
		columns: { id: true, integracaoConfiguracao: true },
	});

	return result
		.map((organization) => {
			const config = organization.integracaoConfiguracao;
			if (!config || config.tipo !== "IFOOD") return null;
			const merchantIds = Array.isArray((config as { merchantIds?: unknown }).merchantIds)
				? ((config as { merchantIds: unknown[] }).merchantIds.filter((id): id is string => typeof id === "string") ?? [])
				: [];
			return { id: organization.id, merchantIds };
		})
		.filter((organization): organization is { id: string; merchantIds: string[] } => !!organization);
}

async function resolveOrganizationIdByMerchantId(merchantId: string): Promise<string | null> {
	const connected = await loadConnectedIfoodOrganizations();
	return connected.find((organization) => organization.merchantIds.includes(merchantId))?.id ?? null;
}

async function handleKeepAlive(requestedMerchantIds: string[] | null | undefined) {
	// Modo "por aplicativo": basta o 202. Modo "por merchant": responder com os merchants online —
	// consideramos online todo merchant conectado a uma organização da plataforma.
	if (!requestedMerchantIds?.length) return NextResponse.json({}, { status: 202 });

	const connected = await loadConnectedIfoodOrganizations();
	const connectedMerchantIds = new Set(connected.flatMap((organization) => organization.merchantIds));
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

	// Evento de pedido: o webhook é um "sino". Respondemos 202 imediatamente e disparamos o
	// pipeline de ingestão da organização dona do merchant em background — o pipeline faz o
	// polling (recolhendo também eventos atrasados), grava os pedidos e envia os ACKs.
	const merchantId = event.merchantId;
	if (merchantId) {
		waitUntil(
			(async () => {
				const organizationId = await resolveOrganizationIdByMerchantId(merchantId);
				if (!organizationId) {
					console.warn("[WARN] [IFOOD_WEBHOOK] Evento para merchant sem organização conectada", {
						merchantId,
						eventCode,
						eventId: event.id,
					});
					return;
				}
				const result = await runDataCollectingV2({ organizationIds: [organizationId] });
				if (result.errors.length) {
					console.error("[ERROR] [IFOOD_WEBHOOK] Erros na ingestão disparada pelo webhook", {
						merchantId,
						organizationId,
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
