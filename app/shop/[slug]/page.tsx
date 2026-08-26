import { getOrganizationIdBySlug } from "@/lib/organizations/slug-server";
import { getShopCatalogData, type TShopCatalogData } from "@/lib/shop/catalog-data";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import ShopPage from "./shop-page";

type ShopPageParams = {
	params: Promise<{ slug: string }>;
};

// Resolução por slug: a rota pública é o endereço da loja, mas tudo abaixo (catálogo, APIs,
// pedidos) continua chaveado pelo id da organização.
const getCachedOrgId = cache(async (slug: string) => getOrganizationIdBySlug(slug));

// Slug inexistente => 404. Loja existente porém indisponível (inativa/fora do horário) devolve
// catálogo nulo: quem mostra a mensagem amigável é o client, como antes.
const getCachedShopCatalog = cache(async (orgId: string): Promise<TShopCatalogData | null> => {
	try {
		return await getShopCatalogData(orgId);
	} catch {
		return null;
	}
});

export async function generateMetadata({ params }: ShopPageParams): Promise<Metadata> {
	const { slug } = await params;
	const orgId = await getCachedOrgId(slug);
	const catalog = orgId ? await getCachedShopCatalog(orgId) : null;

	if (!catalog) {
		return {
			title: "Loja Digital",
			description: "Faça seu pedido online.",
		};
	}

	const { organization } = catalog;
	const title = `${organization.nome}`;
	const description = `Faça seu pedido online na ${organization.nome}.`;

	return {
		title,
		description,
		icons: organization.logoUrl ? { icon: organization.logoUrl, apple: organization.logoUrl } : undefined,
		alternates: { canonical: `/shop/${slug}` },
		openGraph: {
			title,
			description,
		},
	};
}

export default async function Shop({ params }: ShopPageParams) {
	const { slug } = await params;
	const orgId = await getCachedOrgId(slug);
	if (!orgId) notFound();

	const initialCatalog = await getCachedShopCatalog(orgId);
	return <ShopPage orgId={orgId} slug={slug} initialCatalog={initialCatalog} />;
}
