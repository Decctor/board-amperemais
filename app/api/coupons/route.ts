import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { handleSimpleChildRowsProcessing } from "@/lib/db-utils";
import { createSimplifiedSearchCondition } from "@/lib/search";
import { CouponAudienceSchema, CouponSchema, CouponTargetSchema } from "@/schemas/coupons";
import { db } from "@/services/drizzle";
import { couponAudiences, couponRedemptions, couponTargets, coupons } from "@/services/drizzle/schema";
import { type SQL, and, count, eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const CouponTargetInputSchema = CouponTargetSchema;
const CouponAudienceInputSchema = CouponAudienceSchema;

/**
 * Valida a coerência entre benefício, modo de validação, alvos e audiências.
 * Regras que o Zod por campo não consegue expressar.
 */
function assertCouponCoherence({
	coupon,
	targets,
	audiences,
}: {
	coupon: Pick<
		z.infer<typeof CouponSchema>,
		| "escopo"
		| "validacaoModo"
		| "condicoesTexto"
		| "beneficioTipo"
		| "beneficioValor"
		| "beneficioAplicacao"
		| "beneficioCompreQuantidade"
		| "beneficioLeveQuantidade"
	>;
	targets: Array<z.infer<typeof CouponTargetSchema> & { deletar?: boolean | null }>;
	audiences: Array<z.infer<typeof CouponAudienceSchema> & { deletar?: boolean | null }>;
}) {
	const activeTargets = targets.filter((target) => !target.deletar);
	const activeAudiences = audiences.filter((audience) => !audience.deletar);

	if (coupon.beneficioTipo === "BRINDE") throw new createHttpError.BadRequest("Cupons de brinde ainda não são suportados.");

	if (coupon.validacaoModo === "MANUAL" && !coupon.condicoesTexto?.trim()) {
		throw new createHttpError.BadRequest("Cupons de validação manual exigem o texto de condições para orientar cliente e operador.");
	}

	if (["DESCONTO_FIXO", "DESCONTO_PERCENTUAL", "PRECO_FIXO"].includes(coupon.beneficioTipo)) {
		if (!coupon.beneficioValor || coupon.beneficioValor <= 0) {
			throw new createHttpError.BadRequest("O valor do benefício do cupom deve ser maior que zero.");
		}
		if (coupon.beneficioTipo === "DESCONTO_PERCENTUAL" && coupon.beneficioValor > 100) {
			throw new createHttpError.BadRequest("O desconto percentual do cupom não pode ser maior que 100%.");
		}
	}

	if (coupon.beneficioTipo === "COMPRE_X_LEVE_Y") {
		const buyQuantity = coupon.beneficioCompreQuantidade ?? 0;
		const takeQuantity = coupon.beneficioLeveQuantidade ?? 0;
		if (buyQuantity < 1 || takeQuantity <= buyQuantity) {
			throw new createHttpError.BadRequest("Na promoção leve X pague Y, a quantidade levada deve ser maior que a quantidade paga.");
		}
	}

	if (coupon.beneficioTipo === "PRECO_FIXO" && coupon.beneficioAplicacao !== "ITENS_ELEGIVEIS") {
		throw new createHttpError.BadRequest("Cupons de preço fixo devem ser aplicados aos itens elegíveis.");
	}

	if (coupon.beneficioAplicacao === "ITENS_ELEGIVEIS" && coupon.validacaoModo === "AUTOMATICA" && activeTargets.length === 0) {
		throw new createHttpError.BadRequest("Cupons aplicados a itens elegíveis exigem pelo menos um alvo de produto.");
	}

	if (coupon.escopo !== "GLOBAL" && activeAudiences.length > 0) {
		throw new createHttpError.BadRequest("Audiências por tag/segmentação são exclusivas de cupons globais.");
	}
}

const GetCouponsInputSchema = z.object({
	id: z
		.string({ invalid_type_error: "Tipo inválido para o ID do cupom." })
		.optional()
		.nullable(),
	page: z
		.string({ invalid_type_error: "Tipo inválido para página." })
		.optional()
		.nullable()
		.transform((value) => (value ? Number(value) : 1)),
	search: z
		.string({ invalid_type_error: "Tipo inválido para busca." })
		.optional()
		.nullable(),
	activeOnly: z
		.string({ invalid_type_error: "Tipo inválido para ativo." })
		.optional()
		.nullable()
		.transform((value) => value === "true"),
});
export type TGetCouponsInput = z.infer<typeof GetCouponsInputSchema>;

async function getCoupons({ input, session }: { input: TGetCouponsInput; session: TAuthUserSession }) {
	const organizationId = session.membership?.organizacao.id;
	if (!organizationId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	if (input.id) {
		const coupon = await db.query.coupons.findFirst({
			where: and(eq(coupons.id, input.id), eq(coupons.organizacaoId, organizationId)),
			with: {
				alvos: {
					with: {
						produto: { columns: { id: true, nome: true, codigo: true } },
						produtoVariante: { columns: { id: true, nome: true } },
					},
				},
				audiencias: {
					with: {
						clienteTag: { columns: { id: true, titulo: true, cor: true, corForeground: true, icone: true } },
					},
				},
				autor: { columns: { id: true, nome: true, avatarUrl: true } },
			},
		});
		if (!coupon) throw new createHttpError.NotFound("Cupom não encontrado.");

		const redemptionCountsResult = await db
			.select({ total: count() })
			.from(couponRedemptions)
			.where(and(eq(couponRedemptions.cupomId, coupon.id), eq(couponRedemptions.status, "UTILIZADO")));

		return {
			data: { byId: { ...coupon, resgatesUtilizados: redemptionCountsResult[0]?.total ?? 0 }, default: null },
			message: "Cupom encontrado com sucesso.",
		};
	}

	const PAGE_SIZE = 25;
	const page = input.page || 1;
	const conditions: SQL[] = [eq(coupons.organizacaoId, organizationId)];
	if (input.search?.trim()) conditions.push(createSimplifiedSearchCondition(coupons.titulo, input.search));
	if (input.activeOnly) conditions.push(eq(coupons.ativo, true));

	const couponsMatchedResult = await db
		.select({ count: count() })
		.from(coupons)
		.where(and(...conditions));
	const couponsMatchedCount = couponsMatchedResult[0]?.count ?? 0;

	const couponsResult = await db.query.coupons.findMany({
		where: and(...conditions),
		with: {
			alvos: true,
			audiencias: {
				with: {
					clienteTag: { columns: { id: true, titulo: true, cor: true, corForeground: true, icone: true } },
				},
			},
		},
		orderBy: (fields, { desc }) => desc(fields.dataInsercao),
		offset: PAGE_SIZE * (page - 1),
		limit: PAGE_SIZE,
	});

	return {
		data: {
			byId: null,
			default: {
				coupons: couponsResult,
				couponsMatched: couponsMatchedCount,
				totalPages: Math.ceil(couponsMatchedCount / PAGE_SIZE),
			},
		},
		message: "Cupons encontrados com sucesso.",
	};
}
export type TGetCouponsOutput = Awaited<ReturnType<typeof getCoupons>>;
export type TGetCouponsOutputById = Exclude<TGetCouponsOutput["data"]["byId"], null>;
export type TGetCouponsOutputDefault = Exclude<TGetCouponsOutput["data"]["default"], null>;

async function getCouponsRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	const input = GetCouponsInputSchema.parse({
		id: request.nextUrl.searchParams.get("id") ?? undefined,
		page: request.nextUrl.searchParams.get("page") ?? undefined,
		search: request.nextUrl.searchParams.get("search") ?? undefined,
		activeOnly: request.nextUrl.searchParams.get("activeOnly") ?? undefined,
	});
	const result = await getCoupons({ input, session });
	return NextResponse.json(result, { status: 200 });
}

const CreateCouponInputSchema = z.object({
	coupon: CouponSchema.omit({ dataInsercao: true, dataAtualizacao: true, autorId: true }),
	couponTargets: z.array(CouponTargetInputSchema),
	couponAudiences: z.array(CouponAudienceInputSchema),
});
export type TCreateCouponInput = z.infer<typeof CreateCouponInputSchema>;

async function createCoupon({ input, session }: { input: TCreateCouponInput; session: TAuthUserSession }) {
	const organizationId = session.membership?.organizacao.id;
	if (!organizationId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	assertCouponCoherence({ coupon: input.coupon, targets: input.couponTargets, audiences: input.couponAudiences });

	const existingCouponWithCode = await db.query.coupons.findFirst({
		where: and(eq(coupons.organizacaoId, organizationId), eq(coupons.codigo, input.coupon.codigo)),
		columns: { id: true },
	});
	if (existingCouponWithCode) throw new createHttpError.BadRequest("Já existe um cupom com esse código na organização.");

	const insertedCouponId = await db.transaction(async (tx) => {
		const insertedCoupons = await tx
			.insert(coupons)
			.values({ ...input.coupon, organizacaoId: organizationId, autorId: session.user.id })
			.returning({ id: coupons.id });
		const couponId = insertedCoupons[0]?.id;
		if (!couponId) throw new createHttpError.InternalServerError("Oops, houve um erro desconhecido ao criar o cupom.");

		if (input.couponTargets.length > 0) {
			await tx.insert(couponTargets).values(input.couponTargets.map((target) => ({ ...target, cupomId: couponId, organizacaoId: organizationId })));
		}
		if (input.couponAudiences.length > 0) {
			await tx
				.insert(couponAudiences)
				.values(input.couponAudiences.map((audience) => ({ ...audience, cupomId: couponId, organizacaoId: organizationId })));
		}
		return couponId;
	});

	return {
		data: { insertedId: insertedCouponId },
		message: "Cupom criado com sucesso.",
	};
}
export type TCreateCouponOutput = Awaited<ReturnType<typeof createCoupon>>;

async function createCouponRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	const payload = await request.json();
	const input = CreateCouponInputSchema.parse(payload);
	const result = await createCoupon({ input, session });
	return NextResponse.json(result, { status: 201 });
}

const ChildRowControlSchema = {
	id: z
		.string({ invalid_type_error: "Tipo não válido para o ID." })
		.optional()
		.nullable(),
	deletar: z
		.boolean({ invalid_type_error: "Tipo não válido para deletar." })
		.optional()
		.nullable(),
};

const UpdateCouponInputSchema = z.object({
	couponId: z.string({
		required_error: "ID do cupom não informado.",
		invalid_type_error: "Tipo não válido para o ID do cupom.",
	}),
	coupon: CouponSchema.omit({ dataInsercao: true, dataAtualizacao: true, autorId: true }),
	couponTargets: z.array(CouponTargetInputSchema.innerType().extend(ChildRowControlSchema).superRefine((target, ctx) => {
		if (target.deletar) return;
		if ([target.produtoId, target.produtoVarianteId, target.grupo].filter(Boolean).length !== 1) {
			ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Cada alvo do cupom deve referenciar exatamente um produto, variante ou grupo de produtos." });
		}
	})),
	couponAudiences: z.array(CouponAudienceInputSchema.innerType().extend(ChildRowControlSchema).superRefine((audience, ctx) => {
		if (audience.deletar) return;
		if ([audience.clienteTagId, audience.segmentacaoRFM].filter(Boolean).length !== 1) {
			ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Cada audiência do cupom deve referenciar exatamente uma tag de cliente ou segmentação RFM." });
		}
	})),
});
export type TUpdateCouponInput = z.infer<typeof UpdateCouponInputSchema>;

async function updateCoupon({ input, session }: { input: TUpdateCouponInput; session: TAuthUserSession }) {
	const organizationId = session.membership?.organizacao.id;
	if (!organizationId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	assertCouponCoherence({ coupon: input.coupon, targets: input.couponTargets, audiences: input.couponAudiences });

	const existingCouponWithCode = await db.query.coupons.findFirst({
		where: and(eq(coupons.organizacaoId, organizationId), eq(coupons.codigo, input.coupon.codigo)),
		columns: { id: true },
	});
	if (existingCouponWithCode && existingCouponWithCode.id !== input.couponId) {
		throw new createHttpError.BadRequest("Já existe um cupom com esse código na organização.");
	}

	const updatedCouponId = await db.transaction(async (tx) => {
		const updatedCoupons = await tx
			.update(coupons)
			.set({ ...input.coupon, organizacaoId: organizationId, dataAtualizacao: new Date() })
			.where(and(eq(coupons.id, input.couponId), eq(coupons.organizacaoId, organizationId)))
			.returning({ id: coupons.id });
		const couponId = updatedCoupons[0]?.id;
		if (!couponId) throw new createHttpError.NotFound("Cupom não encontrado.");

		await handleSimpleChildRowsProcessing({
			trx: tx,
			table: couponTargets,
			entities: input.couponTargets,
			fatherEntityKey: "cupomId",
			fatherEntityId: couponId,
			organizacaoId: organizationId,
		});
		await handleSimpleChildRowsProcessing({
			trx: tx,
			table: couponAudiences,
			entities: input.couponAudiences,
			fatherEntityKey: "cupomId",
			fatherEntityId: couponId,
			organizacaoId: organizationId,
		});
		return couponId;
	});

	return {
		data: { updatedId: updatedCouponId },
		message: "Cupom atualizado com sucesso.",
	};
}
export type TUpdateCouponOutput = Awaited<ReturnType<typeof updateCoupon>>;

async function updateCouponRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	const payload = await request.json();
	const input = UpdateCouponInputSchema.parse(payload);
	const result = await updateCoupon({ input, session });
	return NextResponse.json(result, { status: 200 });
}

const DeleteCouponInputSchema = z.object({
	id: z.string({
		required_error: "ID do cupom não informado.",
		invalid_type_error: "Tipo não válido para o ID do cupom.",
	}),
});
export type TDeleteCouponInput = z.infer<typeof DeleteCouponInputSchema>;

async function deleteCoupon({ input, session }: { input: TDeleteCouponInput; session: TAuthUserSession }) {
	const organizationId = session.membership?.organizacao.id;
	if (!organizationId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	const redemptionCountResult = await db
		.select({ total: count() })
		.from(couponRedemptions)
		.where(eq(couponRedemptions.cupomId, input.id));
	if ((redemptionCountResult[0]?.total ?? 0) > 0) {
		throw new createHttpError.BadRequest("Esse cupom já possui resgates registrados e não pode ser excluído. Desative-o para impedir novos usos.");
	}

	const deletedCoupons = await db
		.delete(coupons)
		.where(and(eq(coupons.id, input.id), eq(coupons.organizacaoId, organizationId)))
		.returning({ id: coupons.id });
	if (!deletedCoupons[0]?.id) throw new createHttpError.NotFound("Cupom não encontrado.");

	return {
		data: { deletedId: deletedCoupons[0].id },
		message: "Cupom excluído com sucesso.",
	};
}
export type TDeleteCouponOutput = Awaited<ReturnType<typeof deleteCoupon>>;

async function deleteCouponRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	const input = DeleteCouponInputSchema.parse({ id: request.nextUrl.searchParams.get("id") ?? undefined });
	const result = await deleteCoupon({ input, session });
	return NextResponse.json(result, { status: 200 });
}

export const GET = appApiHandler({ GET: getCouponsRoute });
export const POST = appApiHandler({ POST: createCouponRoute });
export const PUT = appApiHandler({ PUT: updateCouponRoute });
export const DELETE = appApiHandler({ DELETE: deleteCouponRoute });
