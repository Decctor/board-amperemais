import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { TAuthUserSession } from "@/lib/authentication/types";
import { handlePurchaseItemStockProcessing, type TPurchaseItemStockOperation } from "@/lib/purchase-processing/process-purchase-item-stock";
import { createSimplifiedSearchCondition } from "@/lib/search";
import { PurchaseStatusEnum, TPurchaseStatusEnum } from "@/schemas/enums";
import { PurchaseItemSchema, PurchaseSchema, refinePurchaseStatusAndDeliveryDate } from "@/schemas/purchases";
import { db, type DBTransaction } from "@/services/drizzle";
import { productStockLots, purchases } from "@/services/drizzle/schema";
import { and, count, eq, inArray, or } from "drizzle-orm";
import createHttpError from "http-errors";
import { NextResponse, type NextRequest } from "next/server";
import z from "zod";

const GetPurchasesInputSchema = z.object({
	id: z
		.string({
			required_error: "ID da compra não informado.",
			invalid_type_error: "Tipo não válido para ID da compra.",
		})
		.optional()
		.nullable(),
	page: z
		.string({
			required_error: "Página não informada.",
			invalid_type_error: "Tipo não válido para página.",
		})
		.optional()
		.nullable()
		.default("1")
		.transform((val) => Number(val))
		.refine((val) => val > 0, {
			message: "Página deve ser maior que 0.",
			path: ["page"],
		}),
	search: z
		.string({
			required_error: "Busca não informada.",
			invalid_type_error: "Tipo não válido para busca.",
		})
		.optional()
		.nullable(),
	status: z
		.string({
			invalid_type_error: "Tipo não válido para status da compra.",
		})
		.optional()
		.nullable()
		.transform((val) => (val ? val.split(",") : []))
		.refine((val) => (val.length > 0 ? val.every((v) => PurchaseStatusEnum.safeParse(v).success) : true), {
			message: "Status inválido.",
			path: ["status"],
		}),
});
export type TGetPurchasesInput = z.infer<typeof GetPurchasesInputSchema>;

export type TGetPurchasesByIdInput = Pick<TGetPurchasesInput, "id">;
export type TGetPurchasesDefaultInput = Omit<TGetPurchasesInput, "id">;

async function getPurchases({ input, session }: { input: TGetPurchasesInput; session: TAuthUserSession }) {
	const userOrgId = session.membership?.organizacao.id;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	// Checking user permissions
	if (!session.membership?.permissoes.compras.visualizar)
		throw new createHttpError.Unauthorized("Você não possui permissão para acessar esse recurso.");

	if ("id" in input && input.id) {
		const purchaseId = input.id;
		if (typeof purchaseId !== "string") throw new createHttpError.BadRequest("ID da compra inválido.");

		const purchase = await db.query.purchases.findFirst({
			where: (fields, { and, eq }) => and(eq(fields.id, purchaseId), eq(fields.organizacaoId, userOrgId)),
			with: {
				itens: {
					with: {
						produto: {
							columns: {
								id: true,
								nome: true,
								codigo: true,
								imagemCapaUrl: true,
								unidade: true,
							},
						},
						lotes: {
							columns: {
								id: true,
								codigoLote: true,
								quantidadeInicial: true,
								quantidadeAtual: true,
								dataValidade: true,
								status: true,
							},
						},
					},
				},
				autor: {
					columns: {
						id: true,
						nome: true,
						avatarUrl: true,
					},
				},
			},
		});
		if (!purchase) throw new createHttpError.NotFound("Compra não encontrada.");

		return {
			data: {
				default: null,
				byId: purchase,
			},
		};
	}

	const { page, search, status } = input;

	const conditions = [];

	conditions.push(eq(purchases.organizacaoId, userOrgId));
	if (search && search.trim().length > 0) {
		conditions.push(
			or(
				createSimplifiedSearchCondition(purchases.titulo, search),
				createSimplifiedSearchCondition(purchases.idExterno, search),
				createSimplifiedSearchCondition(purchases.pedidoFornecedorNome, search),
				createSimplifiedSearchCondition(purchases.transporteTransportadoraNome, search),
			),
		);
	}

	if (status && status.length > 0) {
		conditions.push(inArray(purchases.status, status as TPurchaseStatusEnum[]));
	}
	const PAGE_SIZE = 25;
	const skip = PAGE_SIZE * (page - 1);
	const limit = PAGE_SIZE;

	const purchasesMatchedResult = await db
		.select({ count: count() })
		.from(purchases)
		.where(and(...conditions));
	const purchasesMatched = purchasesMatchedResult[0]?.count ?? 0;

	const purchasesResult = await db.query.purchases.findMany({
		where: and(...conditions),
		with: {
			itens: {
				columns: {
					id: true,
					snapshotProdutoDescricao: true,
					quantidade: true,
				},
			},
			autor: {
				columns: {
					id: true,
					nome: true,
					avatarUrl: true,
				},
			},
		},
		orderBy: (fields, { desc }) => desc(fields.dataInsercao),
		limit,
		offset: skip,
	});

	const totalPages = Math.ceil(purchasesMatched / PAGE_SIZE);

	return {
		data: {
			default: {
				purchases: purchasesResult,
				purchasesMatched,
				totalPages,
			},
			byId: null,
		},
	};
}

export type TGetPurchasesOutput = Awaited<ReturnType<typeof getPurchases>>;
export type TGetPurchasesOutputDefault = Exclude<TGetPurchasesOutput["data"]["default"], null>;
export type TGetPurchasesOutputById = Exclude<TGetPurchasesOutput["data"]["byId"], null>;

async function getPurchasesRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	const searchParams = request.nextUrl.searchParams;

	const input = GetPurchasesInputSchema.parse({
		id: searchParams.get("id") ?? undefined,
		page: searchParams.get("page") ?? undefined,
		search: searchParams.get("search") ?? undefined,
		status: searchParams.get("status") ?? undefined,
	});
	const result = await getPurchases({ input, session });
	return NextResponse.json(result);
}

export const GET = appApiHandler({
	GET: getPurchasesRoute,
});

const PurchaseHeaderInputSchema = PurchaseSchema.omit({
	organizacaoId: true,
	autorId: true,
	dataInsercao: true,
	dataEfetivacao: true,
	dataUltimaAtualizacao: true,
}).superRefine(refinePurchaseStatusAndDeliveryDate);

const CreatePurchaseInputSchema = z.object({
	purchase: PurchaseHeaderInputSchema,
	purchaseItems: z.array(PurchaseItemSchema.omit({ organizacaoId: true, compraId: true, dataInsercao: true })),
});
export type TCreatePurchaseInput = z.infer<typeof CreatePurchaseInputSchema>;

function isPurchaseConsideredReceived(purchase: { status: TPurchaseStatusEnum; entregaDataRecebimentoEfetivacao?: Date | null }) {
	return purchase.status === "RECEBIDA" && !!purchase.entregaDataRecebimentoEfetivacao;
}

async function createPurchase({ input, session }: { input: TCreatePurchaseInput; session: TAuthUserSession }) {
	const userOrgId = session.membership?.organizacao.id;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	if (!session.membership?.permissoes.compras.criar) throw new createHttpError.Unauthorized("Você não possui permissão para acessar esse recurso.");

	const { purchase: payloadPurchase, purchaseItems: payloadPurchaseItems } = input;

	return await db.transaction(async (tx) => {
		const insertedPurchase = await tx
			.insert(purchases)
			.values({
				...payloadPurchase,
				organizacaoId: userOrgId,
				autorId: session.user.id,
			})
			.returning({ id: purchases.id });

		const insertedPurchaseId = insertedPurchase[0]?.id;
		if (!insertedPurchaseId) throw new createHttpError.InternalServerError("Erro ao criar compra.");

		const operation: TPurchaseItemStockOperation = isPurchaseConsideredReceived(payloadPurchase) ? "RECEIVING" : "UPDATING_UNRECEIVED";

		for (const item of payloadPurchaseItems) {
			await handlePurchaseItemStockProcessing({
				trx: tx,
				organizationId: userOrgId,
				userId: session.user.id,
				purchaseId: insertedPurchaseId,
				operation,
				item,
			});
		}

		return {
			data: { insertedPurchaseId },
			message: "Compra criada com sucesso.",
		};
	});
}
export type TCreatePurchaseOutput = Awaited<ReturnType<typeof createPurchase>>;

async function createPurchaseRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	const body = await request.json();
	const input = CreatePurchaseInputSchema.parse(body);
	const result = await createPurchase({ input, session });
	return NextResponse.json(result, { status: 201 });
}
export const POST = appApiHandler({
	POST: createPurchaseRoute,
});

const UpdatePurchaseInputSchema = z.object({
	purchaseId: z.string({
		required_error: "ID da compra não informado.",
		invalid_type_error: "Tipo não válido para ID da compra.",
	}),
	purchase: PurchaseHeaderInputSchema,
	purchaseItems: z.array(
		PurchaseItemSchema.omit({ organizacaoId: true, compraId: true, dataInsercao: true }).extend({
			id: z
				.string({
					invalid_type_error: "Tipo não válido para ID do item da compra.",
				})
				.optional(),
			deletar: z
				.boolean({
					invalid_type_error: "Tipo não válido para deletar item da compra.",
				})
				.optional(),
		}),
	),
});
export type TUpdatePurchaseInput = z.infer<typeof UpdatePurchaseInputSchema>;

function resolvePurchaseTransition(
	previous: { status: TPurchaseStatusEnum; entregaDataRecebimentoEfetivacao: Date | null },
	next: { status: TPurchaseStatusEnum; entregaDataRecebimentoEfetivacao: Date | null },
): TPurchaseItemStockOperation {
	const wasReceived = isPurchaseConsideredReceived(previous);
	const willBeReceived = isPurchaseConsideredReceived(next);
	if (!wasReceived && willBeReceived) return "RECEIVING";
	if (wasReceived && !willBeReceived) return "UNRECEIVING";
	if (wasReceived && willBeReceived) return "UPDATING_RECEIVED";
	return "UPDATING_UNRECEIVED";
}

type PreviousPurchaseItem = { id: string; produtoId: string; produtoVarianteId: string | null; quantidade: number; valorUnitarioBruto: number };
type PayloadPurchaseItem = TUpdatePurchaseInput["purchaseItems"][number];

// A received purchase freezes its items: once lots were spawned we don't allow silent add/remove/edit,
// which would desync the lot sub-ledger. Corrections go through cancellation or the stock-lot flows.
function assertReceivedPurchaseItemsUnchanged({
	previousItems,
	payloadItems,
}: {
	previousItems: PreviousPurchaseItem[];
	payloadItems: PayloadPurchaseItem[];
}) {
	const previousById = new Map(previousItems.map((item) => [item.id, item]));
	for (const item of payloadItems) {
		if (!item.id) throw new createHttpError.BadRequest("Não é possível adicionar itens a uma compra já recebida.");
		if (item.deletar) throw new createHttpError.BadRequest("Não é possível remover itens de uma compra já recebida.");
		const previous = previousById.get(item.id);
		if (!previous) throw new createHttpError.BadRequest("Item informado não pertence a esta compra.");
		const changed =
			previous.produtoId !== item.produtoId ||
			(previous.produtoVarianteId ?? null) !== (item.produtoVarianteId ?? null) ||
			previous.quantidade !== item.quantidade;
		if (changed) throw new createHttpError.BadRequest("Não é possível alterar itens de uma compra já recebida. Cancele a compra para corrigir.");
	}
	const activePayloadCount = payloadItems.filter((item) => !item.deletar).length;
	if (activePayloadCount !== previousItems.length)
		throw new createHttpError.BadRequest("Não é possível alterar a composição de itens de uma compra já recebida.");
}

// Stock effects of a received purchase are only reversible while every lot it spawned is still pristine
// (untouched quantity and ATIVO). Once a lot is consumed/discarded/expired, un-receiving or cancelling
// would break the FEFO sub-ledger, so we block it and point the user to the stock-lot flows.
async function assertPurchaseLotsArePristine({ tx, organizationId, purchaseId }: { tx: DBTransaction; organizationId: string; purchaseId: string }) {
	const lots = await tx.query.productStockLots.findMany({
		where: and(eq(productStockLots.compraId, purchaseId), eq(productStockLots.organizacaoId, organizationId)),
		columns: { quantidadeInicial: true, quantidadeAtual: true, status: true },
	});
	const anyTouched = lots.some((lot) => lot.status !== "ATIVO" || lot.quantidadeAtual < lot.quantidadeInicial);
	if (anyTouched)
		throw new createHttpError.Conflict(
			"Há lotes desta compra já consumidos ou descartados. Ajuste o estoque pelos lotes antes de reabrir ou cancelar a compra.",
		);
}

async function updatePurchase({ input, session }: { input: TUpdatePurchaseInput; session: TAuthUserSession }) {
	const userOrgId = session.membership?.organizacao.id;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	if (!session.membership?.permissoes.compras.editar) throw new createHttpError.Unauthorized("Você não possui permissão para editar essa compra.");

	const { purchaseId, purchase: payloadPurchase, purchaseItems: payloadPurchaseItems } = input;

	return await db.transaction(async (tx) => {
		const lockedRows = await tx
			.select({ id: purchases.id })
			.from(purchases)
			.where(and(eq(purchases.id, purchaseId), eq(purchases.organizacaoId, userOrgId)))
			.for("update");
		if (lockedRows.length === 0) throw new createHttpError.NotFound("Compra não encontrada.");

		const previousPurchase = await tx.query.purchases.findFirst({
			where: (fields, { and, eq }) => and(eq(fields.id, purchaseId), eq(fields.organizacaoId, userOrgId)),
			with: {
				itens: true,
			},
		});
		if (!previousPurchase) throw new createHttpError.NotFound("Compra não encontrada.");

		if (previousPurchase.status === "CANCELADA" && payloadPurchase.status !== "CANCELADA")
			throw new createHttpError.BadRequest("Não é possível reabrir uma compra cancelada.");

		const isCancelTransition = payloadPurchase.status === "CANCELADA" && previousPurchase.status !== "CANCELADA";

		if (isCancelTransition) {
			const wasReceived = isPurchaseConsideredReceived(previousPurchase);
			if (wasReceived) {
				await assertPurchaseLotsArePristine({ tx, organizationId: userOrgId, purchaseId });
				for (const previousItem of previousPurchase.itens) {
					await handlePurchaseItemStockProcessing({
						trx: tx,
						organizationId: userOrgId,
						userId: session.user.id,
						purchaseId,
						operation: "UNRECEIVING",
						item: {
							id: previousItem.id,
							deletar: false,
							produtoId: previousItem.produtoId,
							produtoVarianteId: previousItem.produtoVarianteId,
							snapshotProdutoDescricao: previousItem.snapshotProdutoDescricao,
							snapshotProdutoCodigo: previousItem.snapshotProdutoCodigo,
							quantidade: previousItem.quantidade,
							valorUnitarioBruto: previousItem.valorUnitarioBruto,
							valorUnitarioLiquido: previousItem.valorUnitarioLiquido,
							valorTotalBruto: previousItem.valorTotalBruto,
							valorTotalLiquido: previousItem.valorTotalLiquido,
							descontosTotal: previousItem.descontosTotal,
							acrescimosTotal: previousItem.acrescimosTotal,
							externoQtde: previousItem.externoQtde,
							externoValor: previousItem.externoValor,
							externoUnidade: previousItem.externoUnidade,
							externoFatorConversao: previousItem.externoFatorConversao,
							anotacoes: previousItem.anotacoes,
						},
						reasonOverride: { exit: "Rollback - compra cancelada" },
					});
				}
			}

			await tx
				.update(purchases)
				.set({
					...payloadPurchase,
					entregaDataRecebimentoEfetivacao: null,
					dataUltimaAtualizacao: new Date(),
				})
				.where(and(eq(purchases.id, purchaseId), eq(purchases.organizacaoId, userOrgId)));

			return {
				data: { updatedPurchaseId: purchaseId },
				message: "Compra cancelada com sucesso.",
			};
		}

		const operation = resolvePurchaseTransition(previousPurchase, payloadPurchase);

		// Received purchase staying received: items are frozen. Reprocessing them here would roll back and
		// re-apply stock on every save (and desync spawned lots), so we only update the header.
		if (operation === "UPDATING_RECEIVED") {
			assertReceivedPurchaseItemsUnchanged({ previousItems: previousPurchase.itens, payloadItems: payloadPurchaseItems });
			await tx
				.update(purchases)
				.set({ ...payloadPurchase, dataUltimaAtualizacao: new Date() })
				.where(and(eq(purchases.id, purchaseId), eq(purchases.organizacaoId, userOrgId)));
			return {
				data: { updatedPurchaseId: purchaseId },
				message: "Compra atualizada com sucesso.",
			};
		}

		// Un-receiving (RECEBIDA → anterior) rolls back stock and zeroes the spawned lots; only allowed
		// while those lots are pristine.
		if (operation === "UNRECEIVING") {
			await assertPurchaseLotsArePristine({ tx, organizationId: userOrgId, purchaseId });
		}

		await tx
			.update(purchases)
			.set({
				...payloadPurchase,
				dataUltimaAtualizacao: new Date(),
			})
			.where(and(eq(purchases.id, purchaseId), eq(purchases.organizacaoId, userOrgId)));

		for (const item of payloadPurchaseItems) {
			await handlePurchaseItemStockProcessing({
				trx: tx,
				organizationId: userOrgId,
				userId: session.user.id,
				purchaseId,
				operation,
				item,
			});
		}

		return {
			data: { updatedPurchaseId: purchaseId },
			message: "Compra atualizada com sucesso.",
		};
	});
}
export type TUpdatePurchaseOutput = Awaited<ReturnType<typeof updatePurchase>>;

async function updatePurchaseRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	const body = await request.json();
	const input = UpdatePurchaseInputSchema.parse(body);
	const result = await updatePurchase({ input, session });
	return NextResponse.json(result);
}
export const PUT = appApiHandler({
	PUT: updatePurchaseRoute,
});
