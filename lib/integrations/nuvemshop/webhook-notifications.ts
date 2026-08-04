import { resend } from "@/services/resend";
import { db } from "@/services/drizzle";
import { integrations, organizations } from "@/services/drizzle/schema";
import { createHmac, timingSafeEqual } from "crypto";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

const NUVEMSHOP_LGPD_NOTIFICATION_EMAIL = "lucas@syncroniza.com.br";

type TNuvemshopLgpdWebhookType = "store/redact" | "customers/redact" | "customers/data_request";

type TNuvemshopWebhookOrganization = {
	id: string;
	nome: string;
	email: string | null;
	integracaoTipo: string | null;
	integracaoConfiguracao: unknown;
};

function verifyNuvemshopWebhookSignature(rawBody: string, hmacHeader: string | null) {
	const appSecret = process.env.NUVEMSHOP_CLIENT_SECRET;
	if (!appSecret || !hmacHeader) return false;

	const digest = createHmac("sha256", appSecret).update(rawBody).digest("hex");
	const digestBuffer = Buffer.from(digest, "hex");
	const headerBuffer = Buffer.from(hmacHeader, "hex");

	if (digestBuffer.length !== headerBuffer.length) return false;
	return timingSafeEqual(digestBuffer, headerBuffer);
}

function getStoreIdFromPayload(payload: unknown) {
	if (!payload || typeof payload !== "object" || !("store_id" in payload)) return null;
	const storeId = (payload as { store_id?: unknown }).store_id;
	if (storeId === null || storeId === undefined || storeId === "") return null;
	return Number(storeId);
}

async function findOrganizationByNuvemshopStoreId(storeId: number | null): Promise<TNuvemshopWebhookOrganization | null> {
	if (!storeId) return null;

	// Lookup indexado por refExterno (= String(storeId)) na tabela de integrações. Webhook LGPD
	// vale para lojas já desconectadas também — por isso NÃO filtra por `ativo`. O unique é por
	// organização: a mesma loja em DUAS organizações é estado inválido operacional — logar antes
	// do desempate determinístico.
	const rows = await db
		.select({ organizacaoId: integrations.organizacaoId, configuracao: integrations.configuracao })
		.from(integrations)
		.where(and(eq(integrations.tipo, "NUVEM-SHOP"), eq(integrations.refExterno, String(storeId))))
		.orderBy(integrations.dataInsercao);
	if (rows.length > 1) {
		console.warn("[NUVEMSHOP_LGPD_WEBHOOK] storeId presente em mais de uma organização — usando a conexão mais antiga.", {
			storeId,
			organizationIds: rows.map((row) => row.organizacaoId),
		});
	}
	const [integration] = rows;
	if (!integration) return null;

	const organization = await db.query.organizations.findFirst({
		where: eq(organizations.id, integration.organizacaoId),
		columns: { id: true, nome: true, email: true },
	});
	if (!organization) return null;

	return {
		id: organization.id,
		nome: organization.nome,
		email: organization.email,
		integracaoTipo: "NUVEM-SHOP",
		integracaoConfiguracao: integration.configuracao,
	};
}

function buildEmailHtml({
	webhookType,
	payload,
	organization,
	verified,
}: {
	webhookType: TNuvemshopLgpdWebhookType;
	payload: unknown;
	organization: TNuvemshopWebhookOrganization | null;
	verified: boolean;
}) {
	const storeId = getStoreIdFromPayload(payload) ?? "Não informado";
	const prettyPayload = JSON.stringify(payload, null, 2);

	return `
		<div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
			<h1 style="font-size: 20px;">Webhook LGPD Nuvem Shop recebido</h1>
			<p><strong>Tipo:</strong> ${webhookType}</p>
			<p><strong>Assinatura validada:</strong> ${verified ? "Sim" : "Não"}</p>
			<p><strong>Store ID:</strong> ${storeId}</p>
			<p><strong>Organização:</strong> ${organization ? `${organization.nome} (${organization.id})` : "Não encontrada"}</p>
			<p><strong>Email da organização:</strong> ${organization?.email ?? "Não informado"}</p>
			<h2 style="font-size: 16px; margin-top: 24px;">Payload</h2>
			<pre style="background: #f3f4f6; padding: 16px; border-radius: 8px; overflow-x: auto;">${prettyPayload}</pre>
		</div>
	`;
}

async function sendNuvemshopLgpdNotification({
	webhookType,
	payload,
	organization,
	verified,
}: {
	webhookType: TNuvemshopLgpdWebhookType;
	payload: unknown;
	organization: TNuvemshopWebhookOrganization | null;
	verified: boolean;
}) {
	const storeId = getStoreIdFromPayload(payload) ?? "sem-store-id";

	await resend.emails.send({
		from: "RecompraCRM <noreply@recompracrm.com.br>",
		to: [NUVEMSHOP_LGPD_NOTIFICATION_EMAIL],
		subject: `[Nuvem Shop LGPD] ${webhookType} - loja ${storeId}`,
		html: buildEmailHtml({ webhookType, payload, organization, verified }),
	});
}

export async function handleNuvemshopLgpdWebhook(request: NextRequest, webhookType: TNuvemshopLgpdWebhookType) {
	const rawBody = await request.text();
	const hmacHeader = request.headers.get("x-linkedstore-hmac-sha256");
	const verified = verifyNuvemshopWebhookSignature(rawBody, hmacHeader);

	if (!verified) {
		console.warn("[NUVEMSHOP_LGPD_WEBHOOK] Assinatura inválida.", {
			webhookType,
			hasHmacHeader: !!hmacHeader,
		});
		return NextResponse.json({ error: "Assinatura inválida." }, { status: 401 });
	}

	let payload: unknown;
	try {
		payload = rawBody ? JSON.parse(rawBody) : {};
	} catch {
		return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
	}

	const organization = await findOrganizationByNuvemshopStoreId(getStoreIdFromPayload(payload));
	await sendNuvemshopLgpdNotification({ webhookType, payload, organization, verified });

	return NextResponse.json({
		data: {
			received: true,
		},
		message: "Webhook LGPD da Nuvem Shop recebido com sucesso.",
	});
}
