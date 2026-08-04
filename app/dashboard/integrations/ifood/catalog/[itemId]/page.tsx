import ErrorComponent from "@/components/Layouts/ErrorComponent";
import { getCurrentSession } from "@/lib/authentication/session";
import { redirect } from "next/navigation";
import IfoodCatalogItemPage from "./item-page";

export default async function IfoodCatalogItem({
	params,
	searchParams,
}: {
	params: Promise<{ itemId: string }>;
	searchParams: Promise<{ merchantId?: string }>;
}) {
	const { itemId } = await params;
	if (!itemId) return <ErrorComponent msg="ID do item inválido" />;

	// A loja vem na URL porque a integração é multi-loja: o mesmo item só existe dentro de um merchant.
	const { merchantId } = await searchParams;
	if (!merchantId) return <ErrorComponent msg="Loja do iFood não informada na URL." />;

	const sessionUser = await getCurrentSession();
	if (!sessionUser) redirect("/auth/signin");
	if (!sessionUser.membership) redirect("/onboarding");

	return <IfoodCatalogItemPage membership={sessionUser.membership} itemId={itemId} merchantId={merchantId} />;
}
