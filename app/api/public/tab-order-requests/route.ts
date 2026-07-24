import { createHash } from "node:crypto";
import { appApiHandler } from "@/lib/app-api";
import { hashPublicToken, resolveServiceSettings } from "@/lib/tabs";
import { enforcePublicRateLimit } from "@/lib/tabs/public-rate-limit";
import { TabOrderRequestPayloadSchema } from "@/schemas/tab-order-requests";
import { db } from "@/services/drizzle";
import { tabOrderRequests } from "@/services/drizzle/schema";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

// ============================================================================
// Solicitacao publica de pedido via QR. O cliente publico NAO envia precos —
// apenas referencias de produto + quantidade; a precificacao autoritativa
// acontece na aprovacao do operador. Idempotencia por (org, idempotencyKey),
// padrao shopOrderRequests.
// ============================================================================

const CreatePublicTabOrderRequestInputSchema = z.object({
	// Token bruto do QR (do ponto ou da tab). Resolvido por hash — nunca persistido.
	token: z.string({ required_error: "Token nao informado." }).min(16, { message: "Token invalido." }),
	contexto: z.enum(["PONTO", "TAB"], { required_error: "Contexto nao informado." }),
	idempotencyKey: z.string({ required_error: "Chave de idempotencia nao informada." }).uuid({ message: "Chave de idempotencia invalida." }),
	observacoes: z.string({ invalid_type_error: "Tipo nao valido para observacoes." }).max(500).optional().nullable(),
	itens: TabOrderRequestPayloadSchema.shape.itens,
});
export type TCreatePublicTabOrderRequestInput = z.infer<typeof CreatePublicTabOrderRequestInputSchema>;

async function createPublicTabOrderRequest({ input, clientIp }: { input: TCreatePublicTabOrderRequestInput; clientIp: string }) {
	const tokenHash = hashPublicToken(input.token);
	enforcePublicRateLimit({ key: `${clientIp}:${tokenHash.slice(0, 16)}` });

	// Resolve o contexto pelo hash do token.
	let orgId: string;
	let servicePointId: string | null = null;
	let tabId: string | null = null;

	if (input.contexto === "PONTO") {
		const point = await db.query.servicePoints.findFirst({
			where: (fields, { and, eq }) => and(eq(fields.tokenPublicoHash, tokenHash), eq(fields.ativo, true)),
			columns: { id: true, organizacaoId: true },
		});
		if (!point) throw new createHttpError.NotFound("QR Code invalido ou desativado.");
		orgId = point.organizacaoId;
		servicePointId = point.id;
	} else {
		const tab = await db.query.tabs.findFirst({
			where: (fields, { eq }) => eq(fields.tokenPublicoHash, tokenHash),
			columns: { id: true, organizacaoId: true, status: true, servicePointId: true },
		});
		if (!tab) throw new createHttpError.NotFound("QR Code invalido.");
		if (tab.status !== "ABERTA") throw new createHttpError.BadRequest("Esta conta ja foi fechada.");
		orgId = tab.organizacaoId;
		tabId = tab.id;
		servicePointId = tab.servicePointId;
	}

	// Politica da organizacao: pedidos de cliente precisam estar habilitados (v1: SOLICITACAO).
	const settings = await resolveServiceSettings({ orgId });
	if (settings.pedidosCliente === "DESABILITADO") {
		throw new createHttpError.Forbidden("Pedidos pelo QR Code nao estao habilitados. Chame um atendente.");
	}

	// Valida os produtos referenciados (existencia/atividade na organizacao — sem precos).
	const productIds = [...new Set(input.itens.map((item) => item.produtoId))];
	const produtos = await db.query.products.findMany({
		where: (fields, { and, eq, inArray }) => and(inArray(fields.id, productIds), eq(fields.organizacaoId, orgId), eq(fields.ativo, true)),
		columns: { id: true },
	});
	if (produtos.length !== productIds.length) {
		throw new createHttpError.BadRequest("Um ou mais itens nao estao disponiveis. Atualize a pagina.");
	}

	const payload = TabOrderRequestPayloadSchema.parse({
		itens: input.itens,
		observacoes: input.observacoes ?? null,
		contexto: input.contexto,
	});
	const payloadHash = createHash("sha256").update(JSON.stringify(payload)).digest("hex");

	// Idempotencia: mesma chave + mesmo payload retorna a solicitacao existente.
	const existing = await db.query.tabOrderRequests.findFirst({
		where: (fields, { and, eq }) => and(eq(fields.organizacaoId, orgId), eq(fields.idempotencyKey, input.idempotencyKey)),
		columns: { id: true, status: true, payloadHash: true },
	});
	if (existing) {
		if (existing.payloadHash !== payloadHash) throw new createHttpError.Conflict("A chave de idempotencia ja foi usada com outro pedido.");
		return {
			data: { requestId: existing.id, status: existing.status },
			message: "Solicitacao ja registrada. Aguarde a aprovacao do atendente.",
		};
	}

	const [created] = await db
		.insert(tabOrderRequests)
		.values({
			organizacaoId: orgId,
			servicePointId,
			tabId,
			idempotencyKey: input.idempotencyKey,
			payloadHash,
			payloadSolicitacao: payload,
			status: "PENDENTE",
		})
		.onConflictDoNothing()
		.returning({ id: tabOrderRequests.id, status: tabOrderRequests.status });

	if (!created) {
		// Corrida com outra requisicao identica: reconsulta a existente.
		const raced = await db.query.tabOrderRequests.findFirst({
			where: (fields, { and, eq }) => and(eq(fields.organizacaoId, orgId), eq(fields.idempotencyKey, input.idempotencyKey)),
			columns: { id: true, status: true },
		});
		if (!raced) throw new createHttpError.InternalServerError("Erro ao registrar a solicitacao.");
		return { data: { requestId: raced.id, status: raced.status }, message: "Solicitacao ja registrada. Aguarde a aprovacao do atendente." };
	}

	return {
		data: { requestId: created.id, status: created.status },
		message: "Pedido enviado! Aguarde a aprovacao do atendente.",
	};
}
export type TCreatePublicTabOrderRequestOutput = Awaited<ReturnType<typeof createPublicTabOrderRequest>>;

async function createPublicTabOrderRequestRoute(request: NextRequest) {
	const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
	const body = await request.json();
	const input = CreatePublicTabOrderRequestInputSchema.parse(body);
	const result = await createPublicTabOrderRequest({ input, clientIp });
	return NextResponse.json(result);
}

export const POST = appApiHandler({ POST: createPublicTabOrderRequestRoute });
