import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { StockMovementTypeEnum } from "@/schemas/enums";
import { db } from "@/services/drizzle";
import { products, productStockTransactions } from "@/services/drizzle/schema";
import { and, count, eq, gte, inArray, lte, or, sql } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const PAGE_SIZE = 50;

const GetProductStockTransactionsInputSchema = z.object({
	page: z
		.string({ invalid_type_error: "Tipo inválido para página." })
		.optional()
		.nullable()
		.transform((value) => (value ? Number(value) : 1)),
	search: z.string({ invalid_type_error: "Tipo inválido para busca." }).optional().nullable(),
	tipo: z
		.string({ invalid_type_error: "Tipo inválido para tipo de movimentação." })
		.optional()
		.nullable()
		.transform((value) => (value ? value.split(",") : []))
		.pipe(z.array(StockMovementTypeEnum)),
	produtoId: z.string({ invalid_type_error: "Tipo inválido para ID do produto." }).optional().nullable(),
	produtoVarianteId: z.string({ invalid_type_error: "Tipo inválido para ID da variante." }).optional().nullable(),
	periodAfter: z
		.string({ invalid_type_error: "Tipo inválido para período inicial." })
		.optional()
		.nullable()
		.transform((value) => (value ? new Date(value) : null)),
	periodBefore: z
		.string({ invalid_type_error: "Tipo inválido para período final." })
		.optional()
		.nullable()
		.transform((value) => (value ? new Date(value) : null)),
});
export type TGetProductStockTransactionsInput = z.infer<typeof GetProductStockTransactionsInputSchema>;
export type TGetProductStockTransactionsDefaultInput = TGetProductStockTransactionsInput;

function getSessionWithOrg(session: TAuthUserSession | null) {
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	if (!session.membership) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização.");
	return session;
}

// A movimentação registra `quantidade` sempre positiva; a direção (entrada/saída) é
// derivada do saldo. Reflete corretamente inclusive AJUSTE, que pode ir para qualquer lado.
function resolveTransactionDirection<
	TTransaction extends { saldoAnterior: number | null; saldoPosterior: number | null; quantidade: number },
>(transaction: TTransaction): "ENTRADA" | "SAIDA" | "NEUTRO" {
	const delta = (transaction.saldoPosterior ?? 0) - (transaction.saldoAnterior ?? 0);
	if (delta > 0) return "ENTRADA";
	if (delta < 0) return "SAIDA";
	return "NEUTRO";
}

function enrichStockTransaction<
	TTransaction extends { saldoAnterior: number | null; saldoPosterior: number | null; quantidade: number },
>(transaction: TTransaction) {
	return {
		...transaction,
		direcao: resolveTransactionDirection(transaction),
	};
}

async function getProductStockTransactions({ input, session }: { input: TGetProductStockTransactionsInput; session: TAuthUserSession }) {
	const organizationId = session.membership?.organizacao.id;
	if (!organizationId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização.");

	const conditions = [eq(productStockTransactions.organizacaoId, organizationId)];
	if (input.produtoId) conditions.push(eq(productStockTransactions.produtoId, input.produtoId));
	if (input.produtoVarianteId) conditions.push(eq(productStockTransactions.produtoVarianteId, input.produtoVarianteId));
	if (input.tipo.length > 0) conditions.push(inArray(productStockTransactions.tipo, input.tipo));
	if (input.periodAfter) conditions.push(gte(productStockTransactions.dataInsercao, input.periodAfter));
	if (input.periodBefore) conditions.push(lte(productStockTransactions.dataInsercao, input.periodBefore));
	if (input.search) {
		const term = `%${input.search}%`;
		conditions.push(
			or(
				sql`${productStockTransactions.motivo} ILIKE ${term}`,
				sql`${productStockTransactions.produtoId} IN (SELECT ${products.id} FROM ${products} WHERE ${products.nome} ILIKE ${term} OR ${products.codigo} ILIKE ${term})`,
			)!,
		);
	}

	const [totalResult, resumoResult, transactionsResult] = await Promise.all([
		db
			.select({ total: count(productStockTransactions.id) })
			.from(productStockTransactions)
			.where(and(...conditions)),
		db
			.select({
				totalEntradas: sql<number>`COALESCE(SUM(CASE WHEN COALESCE(${productStockTransactions.saldoPosterior}, 0) > COALESCE(${productStockTransactions.saldoAnterior}, 0) THEN ${productStockTransactions.quantidade} ELSE 0 END), 0)`,
				totalSaidas: sql<number>`COALESCE(SUM(CASE WHEN COALESCE(${productStockTransactions.saldoPosterior}, 0) < COALESCE(${productStockTransactions.saldoAnterior}, 0) THEN ${productStockTransactions.quantidade} ELSE 0 END), 0)`,
			})
			.from(productStockTransactions)
			.where(and(...conditions)),
		db.query.productStockTransactions.findMany({
			where: and(...conditions),
			with: {
				produto: { columns: { id: true, nome: true, codigo: true, unidade: true, imagemCapaUrl: true } },
				produtoVariante: { columns: { id: true, nome: true, codigo: true, imagemCapaUrl: true } },
				venda: { columns: { id: true, idExterno: true, dataVenda: true } },
				compra: { columns: { id: true, titulo: true } },
				producao: { columns: { id: true, titulo: true } },
				lote: { columns: { id: true, codigoLote: true } },
				operador: { columns: { id: true, nome: true, avatarUrl: true } },
			},
			orderBy: (fields, { desc }) => desc(fields.dataInsercao),
			limit: PAGE_SIZE,
			offset: (input.page - 1) * PAGE_SIZE,
		}),
	]);

	const transactionsMatched = Number(totalResult[0]?.total ?? 0);

	return {
		data: {
			default: {
				transactions: transactionsResult.map(enrichStockTransaction),
				transactionsMatched,
				totalPages: Math.max(1, Math.ceil(transactionsMatched / PAGE_SIZE)),
				resumo: {
					totalEntradas: Number(resumoResult[0]?.totalEntradas ?? 0),
					totalSaidas: Number(resumoResult[0]?.totalSaidas ?? 0),
					totalMovimentacoes: transactionsMatched,
				},
			},
		},
		message: "Movimentações de estoque encontradas com sucesso.",
	};
}
export type TGetProductStockTransactionsOutput = Awaited<ReturnType<typeof getProductStockTransactions>>;
export type TGetProductStockTransactionsOutputDefault = TGetProductStockTransactionsOutput["data"]["default"];

async function getProductStockTransactionsRoute(request: NextRequest) {
	const session = getSessionWithOrg(await getCurrentSessionUncached());
	const searchParams = request.nextUrl.searchParams;
	const input = GetProductStockTransactionsInputSchema.parse({
		page: searchParams.get("page"),
		search: searchParams.get("search"),
		tipo: searchParams.get("tipo"),
		produtoId: searchParams.get("produtoId"),
		produtoVarianteId: searchParams.get("produtoVarianteId"),
		periodAfter: searchParams.get("periodAfter"),
		periodBefore: searchParams.get("periodBefore"),
	});
	const result = await getProductStockTransactions({ input, session });
	return NextResponse.json(result);
}

export const GET = appApiHandler({ GET: getProductStockTransactionsRoute });
