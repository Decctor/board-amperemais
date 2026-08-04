import { getCurrentSession } from "@/lib/authentication/session";
import { redirect } from "next/navigation";
import IfoodCatalogPage from "./catalog-page";

export default async function IfoodCatalog({ searchParams }: { searchParams: Promise<{ merchantId?: string }> }) {
	const { merchantId } = await searchParams;

	const sessionUser = await getCurrentSession();
	if (!sessionUser) redirect("/auth/signin");
	if (!sessionUser.membership) redirect("/onboarding");

	return <IfoodCatalogPage membership={sessionUser.membership} initialMerchantId={merchantId ?? null} />;
}
