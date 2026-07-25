import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { TAuthUserSession } from "@/lib/authentication/types";
import { SupplierProductMappingSchema } from "@/schemas/suppliers";
import { db } from "@/services/drizzle";
import { products, supplierProductMappings } from "@/services/drizzle/schema";
import { and, eq, inArray } from "drizzle-orm";
import createHttpError from "http-errors";
import { NextResponse, type NextRequest } from "next/server";
import z from "zod";

const CreateSupplierProductMappingsInputSchema = z.object({
	fornecedorId: z.string({
		required_error: "ID do fornecedor não informado.",
		invalid_type_error: "Tipo não válido para o ID do fornecedor.",
	}),
	mappings: z
		.array(SupplierProductMappingSchema.omit({ organizacaoId: true, fornecedorId: true, dataInsercao: true }))
		.min(1, "Nenhum mapeamento informado."),
});
export type TCreateSupplierProductMappingsInput = z.infer<typeof CreateSupplierProductMappingsInputSchema>;

async function createSupplierProductMappings({ input, session }: { input: TCreateSupplierProductMappingsInput; session: TAuthUserSession }) {
	const userOrgId = session.membership?.organizacao.id;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	if (!session.membership?.permissoes.compras.criar && !session.membership?.permissoes.compras.editar)
		throw new createHttpError.Unauthorized("Você não possui permissão para acessar esse recurso.");

	const supplier = await db.query.suppliers.findFirst({
		where: (fields, { and, eq }) => and(eq(fields.id, input.fornecedorId), eq(fields.organizacaoId, userOrgId)),
		columns: { id: true },
	});
	if (!supplier) throw new createHttpError.NotFound("Fornecedor não encontrado.");

	// Only mappings that carry an external key are useful for future matching.
	const usefulMappings = input.mappings.filter((mapping) => mapping.codigoFornecedor?.trim() || mapping.ean?.trim());
	if (usefulMappings.length === 0) {
		return { data: { insertedCount: 0 }, message: "Nenhum mapeamento com código ou EAN para registrar." };
	}

	const productIds = [...new Set(usefulMappings.map((mapping) => mapping.produtoId))];
	const orgProducts = await db
		.select({ id: products.id })
		.from(products)
		.where(and(inArray(products.id, productIds), eq(products.organizacaoId, userOrgId)));
	const orgProductIds = new Set(orgProducts.map((product) => product.id));
	if (usefulMappings.some((mapping) => !orgProductIds.has(mapping.produtoId)))
		throw new createHttpError.BadRequest("Um ou mais produtos informados não pertencem à sua organização.");

	// Upsert, não "pular se já existe": um de-para errado precisa ser corrigível pela própria
	// revisão. Se um código já apontasse para o produto errado, ignorar o novo vínculo faria o
	// Estágio A do matching devolver o produto errado com confiança 1.0 indefinidamente.
	const existingMappings = await db.query.supplierProductMappings.findMany({
		where: (fields, { and, eq }) => and(eq(fields.fornecedorId, input.fornecedorId), eq(fields.organizacaoId, userOrgId)),
		columns: { id: true, codigoFornecedor: true, ean: true, produtoId: true, produtoVarianteId: true },
	});
	const existingByCodigo = new Map(
		existingMappings.filter((mapping) => mapping.codigoFornecedor).map((mapping) => [mapping.codigoFornecedor as string, mapping]),
	);
	const existingByEan = new Map(existingMappings.filter((mapping) => mapping.ean).map((mapping) => [mapping.ean as string, mapping]));

	let insertedCount = 0;
	let updatedCount = 0;
	let unchangedCount = 0;

	await db.transaction(async (trx) => {
		for (const mapping of usefulMappings) {
			const codigoFornecedor = mapping.codigoFornecedor?.trim() || null;
			const ean = mapping.ean?.trim() || null;
			const existing = (codigoFornecedor && existingByCodigo.get(codigoFornecedor)) || (ean && existingByEan.get(ean)) || null;

			if (!existing) {
				await trx.insert(supplierProductMappings).values({
					organizacaoId: userOrgId,
					fornecedorId: input.fornecedorId,
					codigoFornecedor,
					ean,
					produtoId: mapping.produtoId,
					produtoVarianteId: mapping.produtoVarianteId ?? null,
					unidadeExterna: mapping.unidadeExterna ?? null,
					fatorConversao: mapping.fatorConversao ?? null,
				});
				insertedCount++;
				continue;
			}

			const pointsElsewhere = existing.produtoId !== mapping.produtoId || (existing.produtoVarianteId ?? null) !== (mapping.produtoVarianteId ?? null);
			await trx
				.update(supplierProductMappings)
				.set({
					codigoFornecedor,
					ean,
					produtoId: mapping.produtoId,
					produtoVarianteId: mapping.produtoVarianteId ?? null,
					unidadeExterna: mapping.unidadeExterna ?? null,
					fatorConversao: mapping.fatorConversao ?? null,
					dataAtualizacao: new Date(),
				})
				.where(and(eq(supplierProductMappings.id, existing.id), eq(supplierProductMappings.organizacaoId, userOrgId)));

			if (pointsElsewhere) updatedCount++;
			else unchangedCount++;
		}
	});

	const touchedCount = insertedCount + updatedCount;
	return {
		data: { insertedCount, updatedCount, unchangedCount },
		message:
			touchedCount > 0
				? `${touchedCount} ${touchedCount === 1 ? "vínculo de produto registrado" : "vínculos de produto registrados"} para este fornecedor.`
				: "Os vínculos já estavam registrados para este fornecedor.",
	};
}
export type TCreateSupplierProductMappingsOutput = Awaited<ReturnType<typeof createSupplierProductMappings>>;

async function createSupplierProductMappingsRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	const body = await request.json();
	const input = CreateSupplierProductMappingsInputSchema.parse(body);
	const result = await createSupplierProductMappings({ input, session });
	return NextResponse.json(result, { status: 201 });
}
export const POST = appApiHandler({
	POST: createSupplierProductMappingsRoute,
});
