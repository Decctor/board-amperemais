import { getCurrentSession } from "@/lib/authentication/session";
import { redirect } from "next/navigation";
import BrandAssetsAdminPage from "./brand-assets-page";

export default async function BrandAssetsAdmin() {
	const session = await getCurrentSession();
	if (!session) redirect("/auth/signin");
	if (!session.user.admin) redirect("/dashboard");

	return <BrandAssetsAdminPage />;
}
