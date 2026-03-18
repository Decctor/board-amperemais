import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { TAuthUserSession } from "@/lib/authentication/types";
import { createSimplifiedSearchCondition } from "@/lib/search";
import { PurchaseStatusEnum, TPurchaseStatusEnum } from "@/schemas/enums";
import { PurchaseItemSchema, PurchaseSchema } from "@/schemas/purchases";
import { db } from "@/services/drizzle";
import { purchaseItems, purchases } from "@/services/drizzle/schema";
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
	const searchParams = await request.nextUrl.searchParams;

	console.log(searchParams);
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

const CreatePurchaseInputSchema = z.object({
	purchase: PurchaseSchema.omit({ organizacaoId: true, autorId: true, dataInsercao: true, dataEfetivacao: true, dataUltimaAtualizacao: true }),
	purchaseItems: z.array(PurchaseItemSchema.omit({ organizacaoId: true, compraId: true })),
});
export type TCreatePurchaseInput = z.infer<typeof CreatePurchaseInputSchema>;

async function createPurchase({ input, session }: { input: TCreatePurchaseInput; session: TAuthUserSession }) {
	const userOrgId = session.membership?.organizacao.id;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	// Checking user permissions
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

		const insertedPurchaseItems = await tx
			.insert(purchaseItems)
			.values(
				payloadPurchaseItems.map((item) => ({
					...item,
					compraId: insertedPurchaseId,
					organizacaoId: userOrgId,
				})),
			)
			.returning({ id: purchaseItems.id });

		return {
			data: {
				insertedPurchaseId: insertedPurchaseId,
				insertedPurchaseItemsIds: insertedPurchaseItems.map((item) => item.id),
			},
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
