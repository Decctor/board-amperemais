import z from "zod";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { ProductFiscalProfileSchema } from "@/schemas/fiscal";
import { db } from "@/services/drizzle";
import { productFiscalProfiles, products } from "@/services/drizzle/schema";
import { and, eq, isNull } from "drizzle-orm";
import createHttpError from "http-errors";
import { NextRequest, NextResponse } from "next/server";

const GetProductFiscalProfilesInputSchema = z.object({
	productId: z
		.string({
			invalid_type_error: "Tipo não válido para ID do produto.",
		})
		.optional()
		.nullable(),
	productFiscalProfileId: z
		.string({
			invalid_type_error: "Tipo não válido para ID do perfil fiscal.",
		})
		.optional()
		.nullable(),
});
export type TGetProductFiscalProfilesInput = z.infer<typeof GetProductFiscalProfilesInputSchema>;

async function getProductFiscalProfiles({ input, session }: { input: TGetProductFiscalProfilesInput; session: TAuthUserSession }) {
	const userMembership = session.membership;
	if (!userMembership) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");
	if (!userMembership.permissoes.fiscal.visualizar) throw new createHttpError.Forbidden("Você não possui permissão para visualizar perfis fiscais.");

	const userOrgId = userMembership.organizacao.id;

	if (input.productId) {
		const product = await db.query.products.findFirst({
			where: and(eq(products.id, input.productId), eq(products.organizacaoId, userOrgId)),
			columns: { id: true },
		});
		if (!product) throw new createHttpError.NotFound("Produto não encontrado.");

		const productFiscalProfilesResult = await db.query.productFiscalProfiles.findMany({
			where: (fields, { and, eq, isNull }) =>
				and(eq(fields.produtoId, input.productId!), eq(fields.organizacaoId, userOrgId), isNull(fields.produtoVarianteId), eq(fields.ativo, true)),
			orderBy: (fields, { desc }) => desc(fields.dataInsercao),
		});

		return {
			data: {
				byProductId: productFiscalProfilesResult,
				byId: undefined,
			},
			message: "Perfis fiscais do produto recuperados com sucesso.",
		};
	}

	if (input.productFiscalProfileId) {
		const productFiscalProfileResult = await db.query.productFiscalProfiles.findFirst({
			where: (fields, { and, eq, isNull }) =>
				and(eq(fields.id, input.productFiscalProfileId!), eq(fields.organizacaoId, userOrgId), isNull(fields.produtoVarianteId)),
		});
		if (!productFiscalProfileResult) throw new createHttpError.NotFound("Perfil fiscal não encontrado.");

		return {
			data: {
				byProductId: undefined,
				byId: productFiscalProfileResult,
			},
			message: "Perfil fiscal recuperado com sucesso.",
		};
	}

	throw new createHttpError.BadRequest("Informe o ID do produto ou o ID do perfil fiscal.");
}
export type TGetProductFiscalProfilesOutput = Awaited<ReturnType<typeof getProductFiscalProfiles>>;
export type TGetProductFiscalProfilesOutputByProductId = Exclude<TGetProductFiscalProfilesOutput["data"]["byProductId"], undefined>;
export type TGetProductFiscalProfilesOutputById = Exclude<TGetProductFiscalProfilesOutput["data"]["byId"], undefined>;

async function getProductFiscalProfilesRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para acessar esse recurso.");
	const input = GetProductFiscalProfilesInputSchema.parse({
		productId: request.nextUrl.searchParams.get("productId"),
		productFiscalProfileId: request.nextUrl.searchParams.get("productFiscalProfileId"),
	});
	const result = await getProductFiscalProfiles({ input, session });
	return NextResponse.json(result);
}

export const GET = appApiHandler({
	GET: getProductFiscalProfilesRoute,
});

const ProductFiscalProfileInputSchema = ProductFiscalProfileSchema.omit({
	organizacaoId: true,
	produtoId: true,
	produtoVarianteId: true,
}).extend({
	id: z
		.string({
			invalid_type_error: "Tipo não válido para ID do perfil fiscal.",
		})
		.optional(),
	deletar: z
		.boolean({
			invalid_type_error: "Tipo não válido para deletar perfil fiscal.",
		})
		.optional(),
});

export const CreateProductFiscalProfileInputSchema = z.object({
	productId: z.string({
		required_error: "ID do produto não informado.",
		invalid_type_error: "Tipo não válido para ID do produto.",
	}),
	fiscalProfile: ProductFiscalProfileInputSchema,
});
export type TCreateProductFiscalProfileInput = z.infer<typeof CreateProductFiscalProfileInputSchema>;

export const UpdateProductFiscalProfileInputSchema = z.object({
	productId: z.string({
		required_error: "ID do produto não informado.",
		invalid_type_error: "Tipo não válido para ID do produto.",
	}),
	productFiscalProfileId: z.string({
		required_error: "ID do perfil fiscal não informado.",
		invalid_type_error: "Tipo não válido para ID do perfil fiscal.",
	}),
	fiscalProfile: ProductFiscalProfileInputSchema,
});
export type TUpdateProductFiscalProfileInput = z.infer<typeof UpdateProductFiscalProfileInputSchema>;

export const DeleteProductFiscalProfileInputSchema = z.object({
	productId: z.string({
		required_error: "ID do produto não informado.",
		invalid_type_error: "Tipo não válido para ID do produto.",
	}),
	productFiscalProfileId: z.string({
		required_error: "ID do perfil fiscal não informado.",
		invalid_type_error: "Tipo não válido para ID do perfil fiscal.",
	}),
});
export type TDeleteProductFiscalProfileInput = z.infer<typeof DeleteProductFiscalProfileInputSchema>;

function assertFiscalConfigurePermission(session: TAuthUserSession) {
	if (!session.membership) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");
	if (!session.membership.permissoes.fiscal.configurar)
		throw new createHttpError.Forbidden("Você não possui permissão para configurar perfis fiscais.");

	return session.membership.organizacao.id;
}

async function assertProductExists({ productId, userOrgId }: { productId: string; userOrgId: string }) {
	const product = await db.query.products.findFirst({
		where: and(eq(products.id, productId), eq(products.organizacaoId, userOrgId)),
		columns: { id: true },
	});
	if (!product) throw new createHttpError.NotFound("Produto não encontrado.");
}

async function assertProductFiscalProfileExists({
	productId,
	productFiscalProfileId,
	userOrgId,
}: {
	productId: string;
	productFiscalProfileId: string;
	userOrgId: string;
}) {
	const profile = await db.query.productFiscalProfiles.findFirst({
		where: and(
			eq(productFiscalProfiles.id, productFiscalProfileId),
			eq(productFiscalProfiles.produtoId, productId),
			eq(productFiscalProfiles.organizacaoId, userOrgId),
			isNull(productFiscalProfiles.produtoVarianteId),
		),
		columns: { id: true },
	});
	if (!profile) throw new createHttpError.NotFound("Perfil fiscal não encontrado.");
}

async function createProductFiscalProfile({ input, session }: { input: TCreateProductFiscalProfileInput; session: TAuthUserSession }) {
	const userOrgId = assertFiscalConfigurePermission(session);
	await assertProductExists({ productId: input.productId, userOrgId });

	const [createdProfile] = await db
		.insert(productFiscalProfiles)
		.values({
			organizacaoId: userOrgId,
			produtoId: input.productId,
			produtoVarianteId: null,
			origemMercadoria: input.fiscalProfile.origemMercadoria,
			ncm: input.fiscalProfile.ncm,
			cest: input.fiscalProfile.cest,
			cfopPadrao: input.fiscalProfile.cfopPadrao,
			unidadeComercial: input.fiscalProfile.unidadeComercial,
			codigoBeneficioFiscal: input.fiscalProfile.codigoBeneficioFiscal,
			ativo: input.fiscalProfile.ativo,
		})
		.returning({ id: productFiscalProfiles.id });

	if (!createdProfile?.id) throw new createHttpError.InternalServerError("Erro ao criar perfil fiscal do produto.");

	return {
		data: {
			productId: input.productId,
			productFiscalProfileId: createdProfile.id,
		},
		message: "Perfil fiscal criado com sucesso.",
	};
}
export type TCreateProductFiscalProfileOutput = Awaited<ReturnType<typeof createProductFiscalProfile>>;

async function createProductFiscalProfileRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para acessar esse recurso.");
	const input = CreateProductFiscalProfileInputSchema.parse(await request.json());
	const result = await createProductFiscalProfile({ input, session });
	return NextResponse.json(result, { status: 201 });
}

export const POST = appApiHandler({
	POST: createProductFiscalProfileRoute,
});

async function updateProductFiscalProfile({ input, session }: { input: TUpdateProductFiscalProfileInput; session: TAuthUserSession }) {
	const userOrgId = assertFiscalConfigurePermission(session);
	await assertProductExists({ productId: input.productId, userOrgId });
	await assertProductFiscalProfileExists({
		productId: input.productId,
		productFiscalProfileId: input.productFiscalProfileId,
		userOrgId,
	});

	const [updatedProfile] = await db
		.update(productFiscalProfiles)
		.set({
			origemMercadoria: input.fiscalProfile.origemMercadoria,
			ncm: input.fiscalProfile.ncm,
			cest: input.fiscalProfile.cest,
			cfopPadrao: input.fiscalProfile.cfopPadrao,
			unidadeComercial: input.fiscalProfile.unidadeComercial,
			codigoBeneficioFiscal: input.fiscalProfile.codigoBeneficioFiscal,
			ativo: input.fiscalProfile.ativo,
		})
		.where(
			and(
				eq(productFiscalProfiles.id, input.productFiscalProfileId),
				eq(productFiscalProfiles.produtoId, input.productId),
				eq(productFiscalProfiles.organizacaoId, userOrgId),
				isNull(productFiscalProfiles.produtoVarianteId),
			),
		)
		.returning({ id: productFiscalProfiles.id });

	if (!updatedProfile?.id) throw new createHttpError.InternalServerError("Erro ao atualizar perfil fiscal do produto.");

	return {
		data: {
			updatedId: updatedProfile.id,
		},
		message: "Perfil fiscal atualizado com sucesso.",
	};
}
export type TUpdateProductFiscalProfileOutput = Awaited<ReturnType<typeof updateProductFiscalProfile>>;

async function updateProductFiscalProfileRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para acessar esse recurso.");
	const input = UpdateProductFiscalProfileInputSchema.parse(await request.json());
	const result = await updateProductFiscalProfile({ input, session });
	return NextResponse.json(result);
}

export const PUT = appApiHandler({
	PUT: updateProductFiscalProfileRoute,
});

async function deleteProductFiscalProfile({ input, session }: { input: TDeleteProductFiscalProfileInput; session: TAuthUserSession }) {
	const userOrgId = assertFiscalConfigurePermission(session);
	await assertProductExists({ productId: input.productId, userOrgId });
	await assertProductFiscalProfileExists({
		productId: input.productId,
		productFiscalProfileId: input.productFiscalProfileId,
		userOrgId,
	});

	const [deletedProfile] = await db
		.update(productFiscalProfiles)
		.set({ ativo: false })
		.where(
			and(
				eq(productFiscalProfiles.id, input.productFiscalProfileId),
				eq(productFiscalProfiles.produtoId, input.productId),
				eq(productFiscalProfiles.organizacaoId, userOrgId),
				isNull(productFiscalProfiles.produtoVarianteId),
			),
		)
		.returning({ id: productFiscalProfiles.id });

	if (!deletedProfile?.id) throw new createHttpError.InternalServerError("Erro ao excluir perfil fiscal do produto.");

	return {
		data: {
			deletedId: deletedProfile.id,
		},
		message: "Perfil fiscal excluído com sucesso.",
	};
}
export type TDeleteProductFiscalProfileOutput = Awaited<ReturnType<typeof deleteProductFiscalProfile>>;

async function deleteProductFiscalProfileRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para acessar esse recurso.");
	const input = DeleteProductFiscalProfileInputSchema.parse(await request.json());
	const result = await deleteProductFiscalProfile({ input, session });
	return NextResponse.json(result);
}

export const DELETE = appApiHandler({
	DELETE: deleteProductFiscalProfileRoute,
});
