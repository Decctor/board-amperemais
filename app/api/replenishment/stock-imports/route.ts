import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { StockPositionImportSchema, type TStockPositionImport } from "@/schemas/replenishment";
import { db } from "@/services/drizzle";
import { products, replenishmentSettings, stockPositionImportItems, stockPositionImports } from "@/services/drizzle/schema";
import { and, desc, eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

const GetStockPositionImportsInputSchema = z.object({
	limit: z
		.string({ invalid_type_error: "Tipo não válido para limite." })
		.optional()
		.nullable()
		.transform((value) => (value ? Math.min(Math.max(Number(value), 1), 50) : 10)),
});
export type TGetStockPositionImportsInput = z.infer<typeof GetStockPositionImportsInputSchema>;

async function getStockPositionImports({ input, session }: { input: TGetStockPositionImportsInput; session: TAuthUserSession }) {
	const organizationId = session.membership?.organizacao.id;
	if (!organizationId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");
	if (!session.membership?.permissoes.compras.visualizar)
		throw new createHttpError.Unauthorized("Você não possui permissão para acessar esse recurso.");

	const importacoes = await db
		.select({
			id: stockPositionImports.id,
			origem: stockPositionImports.origem,
			status: stockPositionImports.status,
			arquivoNome: stockPositionImports.arquivoNome,
			dataPosicao: stockPositionImports.dataPosicao,
			linhasLidas: stockPositionImports.linhasLidas,
			linhasConciliadas: stockPositionImports.linhasConciliadas,
			linhasNaoConciliadas: stockPositionImports.linhasNaoConciliadas,
			dataInsercao: stockPositionImports.dataInsercao,
		})
		.from(stockPositionImports)
		.where(eq(stockPositionImports.organizacaoId, organizationId))
		.orderBy(desc(stockPositionImports.dataInsercao))
		.limit(input.limit);

	return { data: { importacoes }, message: "Importações de posição de estoque obtidas com sucesso." };
}
export type TGetStockPositionImportsOutput = Awaited<ReturnType<typeof getStockPositionImports>>;

async function getStockPositionImportsRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");

	const input = GetStockPositionImportsInputSchema.parse({ limit: request.nextUrl.searchParams.get("limit") });
	return NextResponse.json(await getStockPositionImports({ input, session }));
}

async function createStockPositionImport({ input, session }: { input: TStockPositionImport; session: TAuthUserSession }) {
	const organizationId = session.membership?.organizacao.id;
	if (!organizationId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");
	if (!session.membership?.permissoes.compras.editar)
		throw new createHttpError.Unauthorized("Você não possui permissão para importar posições de estoque.");

	// Conciliação por código, que é a chave que o ERP externo e o catálogo interno têm em comum.
	// Linhas sem correspondência são gravadas mesmo assim: elas viram o relatório de "produtos que o
	// ERP tem e o RecompraCRM não", que é justamente o que a loja precisa ver para corrigir o
	// cadastro — e some se descartássemos em silêncio.
	const catalog = await db.select({ id: products.id, codigo: products.codigo }).from(products).where(eq(products.organizacaoId, organizationId));
	const productIdByCode = new Map(catalog.map((product) => [product.codigo.trim().toUpperCase(), product.id]));

	const rows = input.itens.map((item) => ({
		...item,
		produtoId: productIdByCode.get(item.codigo.trim().toUpperCase()) ?? null,
	}));
	const conciliadas = rows.filter((row) => row.produtoId != null).length;

	const importId = await db.transaction(async (tx) => {
		const [created] = await tx
			.insert(stockPositionImports)
			.values({
				organizacaoId: organizationId,
				origem: input.origem,
				status: "CONCLUIDA",
				arquivoNome: input.arquivoNome ?? null,
				dataPosicao: input.dataPosicao,
				linhasLidas: rows.length,
				linhasConciliadas: conciliadas,
				linhasNaoConciliadas: rows.length - conciliadas,
				mapeamentoColunas: input.mapeamentoColunas ?? null,
				autorId: session.user.id,
			})
			.returning({ id: stockPositionImports.id });

		const BATCH_SIZE = 500;
		for (let index = 0; index < rows.length; index += BATCH_SIZE) {
			await tx.insert(stockPositionImportItems).values(
				rows.slice(index, index + BATCH_SIZE).map((row) => ({
					organizacaoId: organizationId,
					importacaoId: created.id,
					codigo: row.codigo,
					descricao: row.descricao ?? null,
					produtoId: row.produtoId,
					quantidade: row.quantidade,
					custoUnitario: row.custoUnitario ?? null,
					precoVenda: row.precoVenda ?? null,
					quantidadeEmTransito: row.quantidadeEmTransito ?? null,
					fornecedorNome: row.fornecedorNome ?? null,
				})),
			);
		}

		// Importar a posição é a declaração de que o saldo verdadeiro está no ERP externo, então a
		// política passa a ler dali. Fica visível e reversível no formulário de política de compra —
		// sem isso a loja subiria o arquivo e continuaria vendo a cobertura calculada sobre o saldo
		// interno, sem nenhuma pista de por quê.
		await tx
			.insert(replenishmentSettings)
			.values({ organizacaoId: organizationId, origemEstoquePadrao: "IMPORTACAO", autorId: session.user.id, dataAtualizacao: new Date() })
			.onConflictDoUpdate({
				target: replenishmentSettings.organizacaoId,
				set: { origemEstoquePadrao: "IMPORTACAO", dataAtualizacao: new Date() },
			});

		return created.id;
	});

	const naoConciliados = rows
		.filter((row) => row.produtoId == null)
		.slice(0, 50)
		.map((row) => ({ codigo: row.codigo, descricao: row.descricao ?? null }));

	return {
		data: {
			importacaoId: importId,
			linhasLidas: rows.length,
			linhasConciliadas: conciliadas,
			linhasNaoConciliadas: rows.length - conciliadas,
			naoConciliados,
		},
		message:
			conciliadas === rows.length
				? `Posição de estoque importada: ${conciliadas} produtos atualizados.`
				: `Posição importada: ${conciliadas} de ${rows.length} linhas conciliadas com o catálogo.`,
	};
}
export type TCreateStockPositionImportOutput = Awaited<ReturnType<typeof createStockPositionImport>>;

async function createStockPositionImportRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");

	const input = StockPositionImportSchema.parse(await request.json());
	return NextResponse.json(await createStockPositionImport({ input, session }));
}

async function deleteStockPositionImportRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");

	const organizationId = session.membership?.organizacao.id;
	if (!organizationId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");
	if (!session.membership?.permissoes.compras.editar)
		throw new createHttpError.Unauthorized("Você não possui permissão para remover posições de estoque.");

	const importId = request.nextUrl.searchParams.get("id");
	if (!importId) throw new createHttpError.BadRequest("ID da importação não informado.");

	const deleted = await db
		.delete(stockPositionImports)
		.where(and(eq(stockPositionImports.id, importId), eq(stockPositionImports.organizacaoId, organizationId)))
		.returning({ id: stockPositionImports.id });
	if (deleted.length === 0) throw new createHttpError.NotFound("Importação não encontrada.");

	return NextResponse.json({ data: { importacaoId: importId }, message: "Importação removida com sucesso." });
}

export const GET = appApiHandler({ GET: getStockPositionImportsRoute });
export const POST = appApiHandler({ POST: createStockPositionImportRoute });
export const DELETE = appApiHandler({ DELETE: deleteStockPositionImportRoute });
