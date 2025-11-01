import UnauthenticatedPage from "@/components/Utils/UnauthenticatedPage";
import { getUserSession } from "@/lib/auth/app-session";
import { DashboardPage } from "./dashboard-page";

export default async function Main() {
	const user = await getUserSession();
	if (!user) return <UnauthenticatedPage />;
	return <DashboardPage user={user} />;
}
