import { getShopAvailability } from "@/lib/shop/availability";
import { getMostOrderedShopProductIds, getShopCatalogProducts, orderProductsByIds } from "@/lib/shop/catalog";
import { normalizeShopSettingsConfiguration } from "@/lib/shop/config";
import { db } from "@/services/drizzle";
import createHttpError from "http-errors";

export async function getShopCatalogData(orgId: string) {
	const organization = await db.query.organizations.findFirst({
		where: (fields, { eq }) => eq(fields.id, orgId),
		columns: {
			id: true,
			nome: true,
			logoUrl: true,
			telefone: true,
			localizacaoCep: true,
			localizacaoEstado: true,
			localizacaoCidade: true,
			localizacaoBairro: true,
			localizacaoLogradouro: true,
			localizacaoNumero: true,
			localizacaoComplemento: true,
			corPrimaria: true,
			corPrimariaForeground: true,
			corSecundaria: true,
			corSecundariaForeground: true,
		},
	});
	if (!organization) throw new createHttpError.NotFound("Organização não encontrada.");

	const settings = await db.query.shopSettings.findFirst({
		where: (fields, { eq }) => eq(fields.organizacaoId, orgId),
	});
	if (!settings || !settings.ativo) throw new createHttpError.NotFound("Loja digital indisponível.");

	const configuracoes = normalizeShopSettingsConfiguration(settings.configuracoes);
	const availability = getShopAvailability({ ativo: settings.ativo, configuracoes });
	const [cashbackProgram, catalogProducts, mostOrderedIds] = await Promise.all([
		db.query.cashbackPrograms.findFirst({
			where: (fields, { and, eq }) => and(eq(fields.organizacaoId, orgId), eq(fields.ativo, true)),
			columns: {
				id: true,
				terminologia: true,
				modalidadeDescontosPermitida: true,
				resgateLimiteTipo: true,
				resgateLimiteValor: true,
			},
		}),
		getShopCatalogProducts({ orgId, configuracoes }),
		getMostOrderedShopProductIds({ orgId }),
	]);

	const groups = [...new Set(catalogProducts.map((product) => product.grupo).filter((group) => group && group.trim().length > 0))].sort((a, b) =>
		a.localeCompare(b, "pt-BR"),
	);

	const featuredProducts = orderProductsByIds(catalogProducts, configuracoes.produtos.destaqueIds);
	const mostOrderedProducts = orderProductsByIds(catalogProducts, mostOrderedIds);

	const blocks = configuracoes.aparencia.blocos
		.filter((block) => block.ativo)
		.toSorted((a, b) => a.ordem - b.ordem)
		.map((block) => ({
			...block,
			produtos: block.tipo === "EM_DESTAQUE" ? featuredProducts : block.tipo === "MAIS_PEDIDOS" ? mostOrderedProducts : [],
			grupos: block.tipo === "GRUPOS_PRODUTOS" ? groups : [],
		}));

	return {
		organization,
		shopSettings: {
			id: settings.id,
			organizacaoId: settings.organizacaoId,
			ativo: settings.ativo,
			modo: settings.modo,
			configuracoes,
		},
		cashbackProgram,
		disponibilidade: {
			...availability,
			proximaAbertura: availability.proximaAbertura?.toISOString() ?? null,
		},
		groups,
		products: catalogProducts,
		blocks,
	};
}
export type TShopCatalogData = Awaited<ReturnType<typeof getShopCatalogData>>;

export async function getShopAvailabilityData(orgId: string) {
	const settings = await db.query.shopSettings.findFirst({
		where: (fields, { eq }) => eq(fields.organizacaoId, orgId),
		columns: { ativo: true, configuracoes: true },
	});
	if (!settings || !settings.ativo) throw new createHttpError.NotFound("Loja digital indisponível.");

	const configuracoes = normalizeShopSettingsConfiguration(settings.configuracoes);
	const availability = getShopAvailability({ ativo: settings.ativo, configuracoes });

	return {
		...availability,
		proximaAbertura: availability.proximaAbertura?.toISOString() ?? null,
	};
}
export type TShopAvailabilityData = Awaited<ReturnType<typeof getShopAvailabilityData>>;
