import { appApiHandler } from "@/lib/app-api";
import { getMostOrderedShopProductIds, getShopCatalogProducts, orderProductsByIds } from "@/lib/shop/catalog";
import { getShopAvailability } from "@/lib/shop/availability";
import { normalizeShopSettingsConfiguration } from "@/lib/shop/config";
import { db } from "@/services/drizzle";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";

function extractOrgId(pathname: string) {
	return pathname.split("/")[3];
}

async function getShopCatalog(request: NextRequest) {
	const orgId = extractOrgId(request.nextUrl.pathname);

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

	return NextResponse.json({
		data: {
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
		},
		message: "Catálogo carregado com sucesso.",
	});
}
export type TGetShopCatalogOutput = Awaited<ReturnType<typeof getShopCatalog>> extends NextResponse<infer T> ? T : never;

export const GET = appApiHandler({ GET: getShopCatalog });
