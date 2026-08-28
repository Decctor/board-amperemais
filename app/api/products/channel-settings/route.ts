import { appApiHandler } from "@/lib/app-api";
import { requireERPSession } from "@/lib/authentication/erp-session";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { ensureSalesChannels } from "@/lib/products/sales-channels-store";
import { db } from "@/services/drizzle";
import { productChannelSettings, products, salesChannels } from "@/services/drizzle/schema";
import { and, eq, inArray, isNull, or, sql } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const GetProductChannelSettingsInputSchema = z.object({
	produtoId: z
		.string({
			required_error: "ID do produto não informado.",
			invalid_type_error: "Tipo não válido para ID do produto.",
		})
		.min(1, { message: "ID do produto não informado." }),
});
export type TGetProductChannelSettingsInput = z.infer<typeof GetProductChannelSettingsInputSchema>;

const SettingInputSchema = z.object({
	canalVendaId: z
		.string({
			required_error: "ID do canal de venda não informado.",
			invalid_type_error: "Tipo não válido para ID do canal de venda.",
		})
		.min(1, { message: "ID do canal de venda não informado." }),
	produtoVarianteId: z
		.string({
			invalid_type_error: "Tipo não válido para ID da variante.",
		})
		.optional()
		.nullable(),
	// Os dois campos nulos = voltar a herdar (a linha esparsa é removida).
	disponivel: z
		.boolean({
			invalid_type_error: "Tipo não válido para disponibilidade no canal.",
		})
		.optional()
		.nullable(),
	precoVenda: z
		.number({
			invalid_type_error: "Tipo não válido para preço de venda no canal.",
		})
		.nonnegative({ message: "O preço de venda no canal não pode ser negativo." })
		.optional()
		.nullable(),
});
const UpdateProductChannelSettingsInputSchema = z.object({
	produtoId: z
		.string({
			required_error: "ID do produto não informado.",
			invalid_type_error: "Tipo não válido para ID do produto.",
		})
		.min(1, { message: "ID do produto não informado." }),
	settings: z.array(SettingInputSchema),
});
export type TUpdateProductChannelSettingsInput = z.infer<typeof UpdateProductChannelSettingsInputSchema>;

function settingNodeKey(setting: { canalVendaId: string; produtoVarianteId?: string | null }) {
	return `${setting.canalVendaId}:${setting.produtoVarianteId ?? ""}`;
}

async function findProductInOrg({ orgId, produtoId }: { orgId: string; produtoId: string }) {
	return db.query.products.findFirst({
		where: and(eq(products.id, produtoId), eq(products.organizacaoId, orgId)),
		columns: { id: true },
		with: { variantes: { columns: { id: true } } },
	});
}

async function getProductChannelSettings({ orgId, produtoId }: { orgId: string; produtoId: string }) {
	// As três consultas são independentes: a de escopo só decide se a resposta é 404.
	const [product, channels, settings] = await Promise.all([
		db.query.products.findFirst({
			where: and(eq(products.id, produtoId), eq(products.organizacaoId, orgId)),
			columns: { id: true },
		}),
		ensureSalesChannels({ orgId }),
		db.query.productChannelSettings.findMany({
			where: and(eq(productChannelSettings.organizacaoId, orgId), eq(productChannelSettings.produtoId, produtoId)),
		}),
	]);
	if (!product) throw new createHttpError.NotFound("Produto não encontrado.");

	return { data: { channels, settings }, message: "Configurações dos canais carregadas com sucesso." };
}
export type TGetProductChannelSettingsOutput = Awaited<ReturnType<typeof getProductChannelSettings>>;

async function updateProductChannelSettings({ orgId, input }: { orgId: string; input: TUpdateProductChannelSettingsInput }) {
	// Um nó (canal + variante) só pode aparecer uma vez: duas linhas para o mesmo nó violariam
	// unq_product_channel_settings_node no insert e virariam 500 no lugar de um erro de payload.
	if (input.settings.length !== new Set(input.settings.map(settingNodeKey)).size) {
		throw new createHttpError.BadRequest("Há configurações repetidas para o mesmo canal e variante.");
	}

	const channelIds = [...new Set(input.settings.map((setting) => setting.canalVendaId))];
	const [product, ownedChannels] = await Promise.all([
		findProductInOrg({ orgId, produtoId: input.produtoId }),
		channelIds.length
			? db
					.select({ id: salesChannels.id })
					.from(salesChannels)
					.where(and(eq(salesChannels.organizacaoId, orgId), inArray(salesChannels.id, channelIds)))
			: Promise.resolve([] as { id: string }[]),
	]);
	if (!product) throw new createHttpError.NotFound("Produto não encontrado.");
	if (ownedChannels.length !== channelIds.length) throw new createHttpError.BadRequest("Um canal de venda não pertence à organização.");

	const variantIds = new Set(product.variantes.map((variant) => variant.id));
	if (input.settings.some((setting) => setting.produtoVarianteId && !variantIds.has(setting.produtoVarianteId))) {
		throw new createHttpError.BadRequest("Uma variante não pertence ao produto.");
	}
	if (product.variantes.length && input.settings.some((setting) => !setting.produtoVarianteId && setting.precoVenda != null)) {
		throw new createHttpError.BadRequest("Defina o preço por canal em cada variante deste produto.");
	}

	// Patch esparso: só os nós enviados mudam. Nó com os dois campos nulos volta a herdar (linha
	// removida); nós ausentes do payload ficam intactos, para que uma tela por canal não apague
	// os overrides dos outros canais do mesmo produto.
	const upserts = input.settings.filter((setting) => setting.disponivel != null || setting.precoVenda != null);
	const clears = input.settings.filter((setting) => setting.disponivel == null && setting.precoVenda == null);

	await db.transaction(async (tx) => {
		if (clears.length) {
			await tx
				.delete(productChannelSettings)
				.where(
					and(
						eq(productChannelSettings.organizacaoId, orgId),
						eq(productChannelSettings.produtoId, input.produtoId),
						or(
							...clears.map((setting) =>
								and(
									eq(productChannelSettings.canalVendaId, setting.canalVendaId),
									setting.produtoVarianteId
										? eq(productChannelSettings.produtoVarianteId, setting.produtoVarianteId)
										: isNull(productChannelSettings.produtoVarianteId),
								),
							),
						),
					),
				);
		}
		if (upserts.length) {
			await tx
				.insert(productChannelSettings)
				.values(
					upserts.map((setting) => ({
						organizacaoId: orgId,
						produtoId: input.produtoId,
						canalVendaId: setting.canalVendaId,
						produtoVarianteId: setting.produtoVarianteId ?? null,
						disponivel: setting.disponivel ?? null,
						precoVenda: setting.precoVenda ?? null,
					})),
				)
				.onConflictDoUpdate({
					target: [productChannelSettings.canalVendaId, productChannelSettings.produtoId, productChannelSettings.produtoVarianteId],
					set: {
						disponivel: sql`excluded.disponivel`,
						precoVenda: sql`excluded.preco_venda`,
						dataAtualizacao: new Date(),
					},
				});
		}
	});

	return { data: { updated: true }, message: "Configurações dos canais atualizadas com sucesso." };
}
export type TUpdateProductChannelSettingsOutput = Awaited<ReturnType<typeof updateProductChannelSettings>>;

async function getProductChannelSettingsRoute(request: NextRequest) {
	const session = requireERPSession(await getCurrentSessionUncached());
	const orgId = session.membership!.organizacao.id;

	const input = GetProductChannelSettingsInputSchema.parse({ produtoId: request.nextUrl.searchParams.get("produtoId") });
	const result = await getProductChannelSettings({ orgId, produtoId: input.produtoId });
	return NextResponse.json(result);
}

async function updateProductChannelSettingsRoute(request: NextRequest) {
	const session = requireERPSession(await getCurrentSessionUncached());
	const orgId = session.membership!.organizacao.id;

	const input = UpdateProductChannelSettingsInputSchema.parse(await request.json());
	const result = await updateProductChannelSettings({ orgId, input });
	return NextResponse.json(result);
}

export const GET = appApiHandler({ GET: getProductChannelSettingsRoute });
export const PUT = appApiHandler({ PUT: updateProductChannelSettingsRoute });
