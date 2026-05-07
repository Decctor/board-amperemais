import type { Metadata } from "next";
import ShopPage from "./shop-page";

export const metadata: Metadata = {
	title: "Loja Digital",
	description: "Faca seu pedido online",
};

type ShopPageParams = {
	params: Promise<{ orgId: string }>;
};

export default async function Shop({ params }: ShopPageParams) {
	const { orgId } = await params;
	return <ShopPage orgId={orgId} />;
}
