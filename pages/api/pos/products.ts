import { apiHandler } from "@/lib/api";
import { getCurrentSessionUncached } from "@/lib/authentication/pages-session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { db } from "@/services/drizzle";
import { productAddOnOptions, productAddOnReferences, productAddOns, productVariants, products } from "@/services/drizzle/schema";
import { and, eq, inArray, sql } from "drizzle-orm";
import { count } from "drizzle-orm";
import createHttpError from "http-errors";
import type { NextApiHandler } from "next";
import z from "zod";

const GetPOSProductsInputSchema = z.object({
	search: z
		.string({
			invalid_type_error: "Tipo inválido para busca.",
		})
		.optional()
		.nullable(),
	group: z
		.string({
			invalid_type_error: "Tipo inválido para grupo.",
		})
		.optional()
		.nullable(),
	page: z
		.string({
			required_error: "Página não informada.",
			invalid_type_error: "Tipo inválido para página.",
		})
		.transform((val) => Number(val))
		.default("1"),
});
export type TGetPOSProductsInput = z.infer<typeof GetPOSProductsInputSchema>;

async function getPOSProducts({ input, user }: { input: TGetPOSProductsInput; user: TAuthUserSession["user"] }) {
	const userOrgId = user.organizacaoId;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	const PAGE_SIZE = 24; // Grid-friendly number (4x6 or 3x8)

	const skip = PAGE_SIZE * (input.page - 1);
	const limit = PAGE_SIZE;

	const conditions = [eq(products.organizacaoId, userOrgId)];

	// Search filter
	if (input.search && input.search.length > 0) {
		conditions.push(sql`(${products.descricao} ILIKE '%' || ${input.search} || '%' OR ${products.codigo} ILIKE '%' || ${input.search} || '%')`);
	}

	// Group filter
	if (input.group && input.group.length > 0) {
		conditions.push(eq(products.grupo, input.group));
	}

	// Count total matching products
	const productsMatched = await db
		.select({ count: count(products.id) })
		.from(products)
		.where(and(...conditions));

	const productsMatchedCount = productsMatched[0]?.count || 0;
	const totalPages = Math.ceil(productsMatchedCount / PAGE_SIZE);

	// Fetch products with their variants and add-ons
	const productsResult = await db.query.products.findMany({
		where: and(...conditions),
		with: {
			variantes: {
				where: (fields, { eq }) => eq(fields.ativo, true),
				orderBy: (fields, { asc }) => asc(fields.precoVenda),
			},
			addOnsReferencias: {
				with: {
					grupo: {
						with: {
							opcoes: {
								where: (fields, { eq }) => eq(fields.ativo, true),
								orderBy: (fields, { asc }) => asc(fields.nome),
							},
						},
					},
				},
				orderBy: (fields, { asc }) => asc(fields.ordem),
			},
		},
		offset: skip,
		limit: limit,
		orderBy: (fields, { asc }) => asc(fields.descricao),
	});

	return {
		data: {
			products: productsResult,
			productsMatched: productsMatchedCount,
			totalPages: totalPages,
			currentPage: input.page,
		},
	};
}

export type TGetPOSProductsOutput = Awaited<ReturnType<typeof getPOSProducts>>;

const getPOSProductsHandler: NextApiHandler<TGetPOSProductsOutput> = async (req, res) => {
	const sessionUser = await getCurrentSessionUncached(req.cookies);
	if (!sessionUser) throw new createHttpError.Unauthorized("Você não está autenticado.");

	const userOrgId = sessionUser.user.organizacaoId;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	const input = GetPOSProductsInputSchema.parse(req.query);
	const data = await getPOSProducts({ input, user: sessionUser.user });
	return res.status(200).json(data);
};

export default apiHandler({
	GET: getPOSProductsHandler,
});
