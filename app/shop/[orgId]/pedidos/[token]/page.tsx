import type { Metadata } from "next";
import PublicOrderPage from "./public-order-page";

type PublicOrderRouteProps = {
	params: Promise<{ orgId: string; token: string }>;
};

export const metadata: Metadata = {
	title: "Acompanhar pedido",
	description: "Acompanhe o andamento e os detalhes do seu pedido.",
	robots: { index: false, follow: false },
	referrer: "no-referrer",
};

export default async function OrderPage({ params }: PublicOrderRouteProps) {
	const { orgId, token } = await params;
	return <PublicOrderPage orgId={orgId} token={token} />;
}