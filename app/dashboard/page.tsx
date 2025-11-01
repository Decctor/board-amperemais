import SalesStatsMain from "@/components/SalesStats/SalesStatsMain";
import UnauthenticatedPage from "@/components/Utils/UnauthenticatedPage";
import { getUserSession } from "@/lib/auth/app-session";

export default async function Main() {
	const user = await getUserSession();
	if (!user) return <UnauthenticatedPage />;
	return <SalesStatsMain user={user} />;
}
