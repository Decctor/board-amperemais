import { getShopCatalogData, type TShopCatalogData } from "@/lib/shop/catalog-data";
import type { Metadata } from "next";
import { cache } from "react";
import ShopPage from "./shop-page";

type ShopPageParams = {
	params: Promise<{ orgId: string }>;
};

const getCachedShopCatalog = cache(async (orgId: string): Promise<TShopCatalogData | null> => {
	try {
		return await getShopCatalogData(orgId);
	} catch {
		return null;
	}
});

export async function generateMetadata({ params }: ShopPageParams): Promise<Metadata> {
	const { orgId } = await params;
	const catalog = await getCachedShopCatalog(orgId);

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
		openGraph: {
			title,
			description,
		},
	};
}

export default async function Shop({ params }: ShopPageParams) {
	const { orgId } = await params;
	const initialCatalog = await getCachedShopCatalog(orgId);
	return <ShopPage orgId={orgId} initialCatalog={initialCatalog} />;
}
