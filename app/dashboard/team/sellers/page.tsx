import UnauthenticatedPage from "@/components/Utils/UnauthenticatedPage";
import { getUserSession } from "@/lib/auth/app-session";
import SellersPage from "./sellers-page";

export default async function TeamSellers() {
	const user = await getUserSession();
	if (!user) return <UnauthenticatedPage />;
	return <SellersPage user={user} />;
}
