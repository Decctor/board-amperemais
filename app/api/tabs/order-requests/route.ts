import { appApiHandler } from "@/lib/app-api";
import { requireERPSession } from "@/lib/authentication/erp-session";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { launchTabOrder, openTab, resolveServiceSettings } from "@/lib/tabs";
import type { TTabOrderItemInput } from "@/lib/tabs";
import { TabOrderRequestStatusEnum } from "@/schemas/enums";
import { db } from "@/services/drizzle";
import { tabOrderRequests } from "@/services/drizzle/schema";
import { and, eq, inArray } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

// ============================================================================
// Inbox de solicitacoes de pedido via QR (aprovacao do operador).
// Aprovar executa a MESMA validacao autoritativa de precos e o MESMO
// launchTabOrder do operador, com o id da solicitacao como id do tabOrder —
// retry de aprovacao nao duplica pedido.
// ============================================================================

const GetTabOrderRequestsInputSchema = z.object({
	status: z
		.string({ invalid_type_error: "Tipo nao valido para status." })
		.optional()
		.nullable()
		.transform((value) => (value ? TabOrderRequestStatusEnum.array().parse(value.split(",")) : ["PENDENTE" as const])),
});
export type TGetTabOrderRequestsInput = z.infer<typeof GetTabOrderRequestsInputSchema>;

const ApprovalDestinationSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("EXISTING"),
		tabId: z.string({ required_error: "ID da conta nao informado.", invalid_type_error: "Tipo nao valido para ID da conta." }),
	}),
	z.object({
		type: z.literal("NEW"),
		code: z
			.string({ required_error: "Codigo da comanda nao informado.", invalid_type_error: "Tipo nao valido para codigo da comanda." })
			.trim()
			.min(1)
			.max(100),
	}),
]);

const DecideTabOrderRequestInputSchema = z.discriminatedUnion("action", [
	z.object({
		requestId: z.string({ required_error: "ID da solicitacao nao informado." }),
		action: z.literal("APPROVE"),
		destination: ApprovalDestinationSchema.optional().nullable(),
	}),
	z.object({
		requestId: z.string({ required_error: "ID da solicitacao nao informado." }),
		action: z.literal("REJECT"),
		rejectionReason: z.string({ invalid_type_error: "Tipo nao valido para motivo." }).optional().nullable(),
	}),
]);
export type TDecideTabOrderRequestInput = z.infer<typeof DecideTabOrderRequestInputSchema>;

// ============================================================================
// SERVICES
// ============================================================================

async function getTabOrderRequests({ input, orgId }: { input: TGetTabOrderRequestsInput; orgId: string }) {
	const requests = await db.query.tabOrderRequests.findMany({
		where: and(eq(tabOrderRequests.organizacaoId, orgId), inArray(tabOrderRequests.status, input.status)),
		with: {
			servicePoint: { columns: { id: true, rotulo: true } },
			tab: { columns: { id: true, codigo: true, status: true } },
		},
		orderBy: (fields, { asc }) => asc(fields.dataInsercao),
	});

	return {
		data: { requests },
		message: "Solicitacoes carregadas com sucesso.",
	};
}
export type TGetTabOrderRequestsOutput = Awaited<ReturnType<typeof getTabOrderRequests>>;
export type TTabOrderRequestListItem = TGetTabOrderRequestsOutput["data"]["requests"][number];

async function decideTabOrderRequest({ input, session }: { input: TDecideTabOrderRequestInput; session: TAuthUserSession }) {
	const orgId = session.membership!.organizacao.id;

	const request = await db.query.tabOrderRequests.findFirst({
		where: and(eq(tabOrderRequests.id, input.requestId), eq(tabOrderRequests.organizacaoId, orgId)),
	});
	if (!request) throw new createHttpError.NotFound("Solicitacao nao encontrada.");

	if (input.action === "REJECT") {
		const rejected = await db
			.update(tabOrderRequests)
			.set({ status: "REJEITADA", motivoRejeicao: input.rejectionReason ?? null, operadorAprovadorId: session.user.id })
			.where(and(eq(tabOrderRequests.id, request.id), eq(tabOrderRequests.status, "PENDENTE")))
			.returning({ id: tabOrderRequests.id });
		if (rejected.length === 0) throw new createHttpError.Conflict("A solicitacao ja foi processada por outra operacao.");
		return { data: { requestId: request.id, status: "REJEITADA" as const, tabOrderId: null }, message: "Solicitacao rejeitada." };
	}

	// APROVAR — CAS -> PROCESSANDO serializa aprovacoes. PROCESSANDO tambem e reivindicavel:
	// se o processo cair no meio, a solicitacao nao fica presa — o retry e seguro porque o
	// launchTabOrder dedupa pelo id da solicitacao (o pedido nunca duplica).
	const claimed = await db
		.update(tabOrderRequests)
		.set({ status: "PROCESSANDO", operadorAprovadorId: session.user.id })
		.where(and(eq(tabOrderRequests.id, request.id), inArray(tabOrderRequests.status, ["PENDENTE", "ERRO", "PROCESSANDO"])))
		.returning({ id: tabOrderRequests.id });
	if (claimed.length === 0) throw new createHttpError.Conflict("A solicitacao ja foi processada por outra operacao.");

	try {
		// Conta escolhida pelo operador precisa pertencer ao PONTO da solicitacao — o pedido
		// da Mesa 12 nao pode ser aprovado por engano na comanda da Mesa 7.
		const selectedTabId = input.destination?.type === "EXISTING" ? input.destination.tabId : null;
		if (selectedTabId && !request.tabId) {
			const targetTab = await db.query.tabs.findFirst({
				where: (fields, { and, eq }) => and(eq(fields.id, selectedTabId), eq(fields.organizacaoId, orgId)),
				columns: { id: true, status: true, servicePointId: true },
			});
			if (!targetTab || targetTab.status !== "ABERTA") throw new createHttpError.BadRequest("A conta selecionada nao esta aberta.");
			if (request.servicePointId && targetTab.servicePointId !== request.servicePointId) {
				throw new createHttpError.BadRequest("A conta selecionada nao pertence ao ponto de atendimento da solicitacao.");
			}
		}

		// Resolve a conta: da solicitacao, do operador, ou implicita do ponto (Somente mesas).
		let tabId = request.tabId ?? selectedTabId;
		// Codigo extraido antes das closures: a narrowing do discriminated union nao
		// sobrevive dentro dos callbacks de `where`.
		const newTabCode = input.destination?.type === "NEW" ? input.destination.code : null;
		if (!tabId && newTabCode) {
			if (!request.servicePointId) throw new createHttpError.BadRequest("A solicitacao nao possui um ponto de atendimento para abrir a conta.");
			const settings = await resolveServiceSettings({ orgId });
			if (settings.aberturaPublica === "DESABILITADA") {
				throw new createHttpError.Forbidden("A abertura de contas a partir de solicitacoes publicas nao esta habilitada.");
			}
			if (settings.contas.identificacao !== "CODIGO_MANUAL") {
				throw new createHttpError.BadRequest("Esta operacao nao utiliza contas identificadas por codigo.");
			}

			const openTabWithCode = await db.query.tabs.findFirst({
				where: (fields, { and, eq }) => and(eq(fields.organizacaoId, orgId), eq(fields.codigo, newTabCode), eq(fields.status, "ABERTA")),
				columns: { id: true, servicePointId: true },
			});
			if (openTabWithCode) {
				if (openTabWithCode.servicePointId !== request.servicePointId) {
					throw new createHttpError.Conflict(`A comanda ${newTabCode} ja esta aberta em outro ponto de atendimento.`);
				}
				tabId = openTabWithCode.id;
			} else {
				const opened = await openTab({
					orgId,
					userId: session.user.id,
					input: { servicePointId: request.servicePointId, codigo: newTabCode },
				});
				tabId = opened.tab.id;
			}
		}
		if (!tabId && request.servicePointId) {
			const settings = await resolveServiceSettings({ orgId });
			if (settings.contas.identificacao === "AUTOMATICA" && settings.contas.maxAbertasPorPonto === 1) {
				const opened = await openTab({ orgId, userId: session.user.id, input: { servicePointId: request.servicePointId } });
				tabId = opened.tab.id;
			}
		}
		if (!tabId) {
			throw new createHttpError.BadRequest("Selecione a conta que recebera o pedido — o QR do ponto nao identifica a comanda sozinho.");
		}

		// Precificacao autoritativa NA APROVACAO: precos atuais do catalogo, nunca do cliente publico.
		const payload = request.payloadSolicitacao;
		const productIds = [...new Set(payload.itens.map((item) => item.produtoId))];
		const variantIds = payload.itens.map((item) => item.produtoVarianteId).filter((id): id is string => !!id);
		const [produtos, variantes] = await Promise.all([
			db.query.products.findMany({
				where: (fields, { and, eq, inArray }) => and(inArray(fields.id, productIds), eq(fields.organizacaoId, orgId), eq(fields.ativo, true)),
				columns: { id: true, nome: true, codigo: true, imagemCapaUrl: true, precoVenda: true },
			}),
			variantIds.length > 0
				? db.query.productVariants.findMany({
						where: (fields, { and, eq, inArray }) => and(inArray(fields.id, variantIds), eq(fields.organizacaoId, orgId), eq(fields.ativo, true)),
						columns: { id: true, produtoId: true, nome: true, codigo: true, precoVenda: true },
					})
				: [],
		]);
		const productMap = new Map(produtos.map((product) => [product.id, product]));
		const variantMap = new Map(variantes.map((variant) => [variant.id, variant]));

		const itens: TTabOrderItemInput[] = payload.itens.map((item) => {
			const product = productMap.get(item.produtoId);
			if (!product) throw new createHttpError.BadRequest(`O produto do item "${item.nome}" nao esta mais disponivel.`);
			const variant = item.produtoVarianteId ? variantMap.get(item.produtoVarianteId) : null;
			if (item.produtoVarianteId && (!variant || variant.produtoId !== product.id)) {
				throw new createHttpError.BadRequest(`A variante do item "${item.nome}" nao esta mais disponivel.`);
			}
			const unitPrice = variant ? variant.precoVenda : (product.precoVenda ?? 0);
			return {
				produtoId: product.id,
				produtoVarianteId: variant?.id ?? null,
				nome: variant ? `${product.nome} — ${variant.nome}` : product.nome,
				codigo: variant?.codigo ?? product.codigo,
				imagemUrl: product.imagemCapaUrl,
				quantidade: item.quantidade,
				valorUnitarioBase: unitPrice,
				valorModificadores: 0,
				valorUnitarioFinal: unitPrice,
				valorTotalBruto: unitPrice * item.quantidade,
				valorDesconto: 0,
				valorTotalLiquido: unitPrice * item.quantidade,
				modificadores: [],
			};
		});

		const launched = await launchTabOrder({
			orgId,
			userId: session.user.id,
			input: {
				tabId,
				// Id da solicitacao como id do pedido: retry de aprovacao nao duplica.
				tabOrderId: request.id,
				observacoes: payload.observacoes ?? null,
				itens,
			},
		});

		await db
			.update(tabOrderRequests)
			.set({ status: "CONCLUIDA", tabId, tabOrderId: launched.tabOrderId, erroProcessamento: null })
			.where(eq(tabOrderRequests.id, request.id));

		return {
			data: { requestId: request.id, status: "CONCLUIDA" as const, tabOrderId: launched.tabOrderId },
			message: `Pedido ${launched.tabOrderNumero} lancado a partir da solicitacao.`,
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : "Erro ao processar a solicitacao.";
		await db.update(tabOrderRequests).set({ status: "ERRO", erroProcessamento: message }).where(eq(tabOrderRequests.id, request.id));
		throw error;
	}
}
export type TDecideTabOrderRequestOutput = Awaited<ReturnType<typeof decideTabOrderRequest>>;

// ============================================================================
// HANDLERS
// ============================================================================

async function getTabOrderRequestsRoute(request: NextRequest) {
	const session = requireERPSession(await getCurrentSessionUncached());
	const { searchParams } = new URL(request.url);
	const input = GetTabOrderRequestsInputSchema.parse({ status: searchParams.get("status") });
	const result = await getTabOrderRequests({ input, orgId: session.membership!.organizacao.id });
	return NextResponse.json(result);
}

async function decideTabOrderRequestRoute(request: NextRequest) {
	const session = requireERPSession(await getCurrentSessionUncached());
	const body = await request.json();
	const input = DecideTabOrderRequestInputSchema.parse(body);
	const result = await decideTabOrderRequest({ input, session });
	return NextResponse.json(result);
}

export const GET = appApiHandler({ GET: getTabOrderRequestsRoute });
export const POST = appApiHandler({ POST: decideTabOrderRequestRoute });
