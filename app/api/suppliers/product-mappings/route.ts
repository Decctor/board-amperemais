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

	const existingMappings = await db.query.supplierProductMappings.findMany({
		where: (fields, { and, eq }) => and(eq(fields.fornecedorId, input.fornecedorId), eq(fields.organizacaoId, userOrgId)),
		columns: { codigoFornecedor: true, ean: true },
	});
	const existingCodigos = new Set(existingMappings.map((mapping) => mapping.codigoFornecedor).filter(Boolean));
	const existingEans = new Set(existingMappings.map((mapping) => mapping.ean).filter(Boolean));

	const mappingsToInsert = usefulMappings.filter((mapping) => {
		const codigo = mapping.codigoFornecedor?.trim();
		const ean = mapping.ean?.trim();
		if (codigo && existingCodigos.has(codigo)) return false;
		if (ean && existingEans.has(ean)) return false;
		return true;
	});

	if (mappingsToInsert.length > 0) {
		await db.insert(supplierProductMappings).values(
			mappingsToInsert.map((mapping) => ({
				organizacaoId: userOrgId,
				fornecedorId: input.fornecedorId,
				codigoFornecedor: mapping.codigoFornecedor?.trim() || null,
				ean: mapping.ean?.trim() || null,
				produtoId: mapping.produtoId,
				produtoVarianteId: mapping.produtoVarianteId ?? null,
			})),
		);
	}

	return {
		data: { insertedCount: mappingsToInsert.length },
		message:
			mappingsToInsert.length > 0
				? "Mapeamentos de produto do fornecedor registrados com sucesso."
				: "Mapeamentos já existiam para este fornecedor.",
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
