import { requireDashboardCapability } from "@/lib/access/guards";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import CheckoutPage from "./checkout-page";

export const metadata: Metadata = {
	title: "Checkout - POS",
	description: "Finalização de venda",
};

export default async function Checkout({ params }: { params: Promise<{ saleId: string }> }) {
	const access = await requireDashboardCapability("sales");
	if (access.unauthorized) return access.unauthorized;
	const sessionUser = access.sessionUser;
	if (!sessionUser) redirect("/auth/signin");
	if (!sessionUser.membership) redirect("/onboarding");

	const { saleId } = await params;

	return <CheckoutPage user={sessionUser.user} membership={sessionUser.membership} saleId={saleId} />;
}
