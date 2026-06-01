import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { TAuthUserSession } from "@/lib/authentication/types";
import { normalizeShopSettingsConfiguration } from "@/lib/shop/config";
import { ShopModeEnum } from "@/schemas/enums";
import { DEFAULT_SHOP_SETTINGS_CONFIGURATION, ShopSettingsConfigurationSchema } from "@/schemas/shop";
import { db } from "@/services/drizzle";
import { products, shopSettings } from "@/services/drizzle/schema";
import { and, eq, inArray } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const UpdateShopSettingsInputSchema = z.object({
	ativo: z.boolean({
		required_error: "Status da loja digital não informado.",
		invalid_type_error: "Tipo não válido para status da loja digital.",
	}),
	modo: ShopModeEnum,
	configuracoes: ShopSettingsConfigurationSchema,
});
export type TUpdateShopSettingsInput = z.infer<typeof UpdateShopSettingsInputSchema>;

function getSessionWithOrg(session: Awaited<ReturnType<typeof getCurrentSessionUncached>>) {
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	if (!session.membership) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização.");
	return session;
}

async function validateShopProductIds({ orgId, productIds }: { orgId: string; productIds: string[] }) {
	const uniqueIds = [...new Set(productIds.filter(Boolean))];
	if (uniqueIds.length === 0) return;

	const matched = await db
		.select({ id: products.id })
		.from(products)
		.where(and(eq(products.organizacaoId, orgId), inArray(products.id, uniqueIds)));
	const matchedIds = new Set(matched.map((item) => item.id));
	const invalidIds = uniqueIds.filter((id) => !matchedIds.has(id));
	if (invalidIds.length > 0) {
		throw new createHttpError.BadRequest("Um ou mais produtos selecionados não pertencem à organização.");
	}
}

async function getShopSettingsService({ session }: { session: TAuthUserSession }) {
	const orgId = session.membership!.organizacao.id;
	if (!orgId) throw new createHttpError.Unauthorized("Você não está autenticado.");

	const settings = await db.query.shopSettings.findFirst({
		where: (fields, { eq }) => eq(fields.organizacaoId, orgId),
	});
	if (!settings) {
		return {
			data: null,
			message: "Configurações da loja digital não encontradas.",
		};
	}

	const configuracoes = normalizeShopSettingsConfiguration(settings.configuracoes);
	const productIds = configuracoes.produtos.produtoIds;

	const settingSelectedProducts =
		productIds.length > 0
			? await db.query.products.findMany({
					where: (fields, { and, eq, inArray }) => and(eq(fields.organizacaoId, orgId), inArray(fields.id, productIds)),
					columns: {
						id: true,
						descricao: true,
						imagemCapaUrl: true,
					},
				})
			: [];
	return {
		data: {
			...settings,
			produtos: settingSelectedProducts,
			configuracoes,
		},
		message: "Configurações da loja digital carregadas com sucesso.",
	};
}

async function getShopSettingsRoute() {
	const session = getSessionWithOrg(await getCurrentSessionUncached());
	const orgId = session.membership!.organizacao.id;

	if (!orgId) throw new createHttpError.Unauthorized("Você não está autenticado.");

	const result = await getShopSettingsService({ session });

	return NextResponse.json(result);
}
export type TGetShopSettingsOutput = Awaited<ReturnType<typeof getShopSettingsRoute>> extends NextResponse<infer T> ? T : never;

async function updateShopSettingsRoute(request: NextRequest) {
	const session = getSessionWithOrg(await getCurrentSessionUncached());
	const orgId = session.membership!.organizacao.id;
	const body = await request.json();
	const input = UpdateShopSettingsInputSchema.parse(body);
	const configuracoes = normalizeShopSettingsConfiguration({
		...DEFAULT_SHOP_SETTINGS_CONFIGURATION,
		...input.configuracoes,
	});

	await validateShopProductIds({
		orgId,
		productIds: [...configuracoes.produtos.produtoIds, ...configuracoes.produtos.destaqueIds],
	});

	const [settings] = await db
		.insert(shopSettings)
		.values({
			organizacaoId: orgId,
			ativo: input.ativo,
			modo: input.modo,
			configuracoes,
			dataAtualizacao: new Date(),
		})
		.onConflictDoUpdate({
			target: shopSettings.organizacaoId,
			set: {
				ativo: input.ativo,
				modo: input.modo,
				configuracoes,
				dataAtualizacao: new Date(),
			},
		})
		.returning();

	return NextResponse.json({
		data: {
			settings,
		},
		message: "Configurações da loja digital atualizadas com sucesso.",
	});
}
export type TUpdateShopSettingsOutput = Awaited<ReturnType<typeof updateShopSettingsRoute>> extends NextResponse<infer T> ? T : never;

export const GET = appApiHandler({ GET: getShopSettingsRoute });
export const PUT = appApiHandler({ PUT: updateShopSettingsRoute });
