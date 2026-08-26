import { getOrganizationIdBySlug } from "@/lib/organizations/slug-server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PublicOrderPage from "./public-order-page";

type PublicOrderRouteProps = {
	params: Promise<{ slug: string; token: string }>;
};

export const metadata: Metadata = {
	title: "Acompanhar pedido",
	description: "Acompanhe o andamento e os detalhes do seu pedido.",
	robots: { index: false, follow: false },
	referrer: "no-referrer",
};

export default async function OrderPage({ params }: PublicOrderRouteProps) {
	const { slug, token } = await params;
	// A consulta do pedido continua chaveada pelo id; o slug fica só para os links de volta à loja.
	const orgId = await getOrganizationIdBySlug(slug);
	if (!orgId) notFound();
	return <PublicOrderPage orgId={orgId} slug={slug} token={token} />;
}
