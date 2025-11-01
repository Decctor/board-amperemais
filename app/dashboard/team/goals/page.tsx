import UnauthenticatedPage from "@/components/Utils/UnauthenticatedPage";
import { getUserSession } from "@/lib/auth/app-session";
import GoalsPage from "./goals-page";

export default async function Goals() {
	const user = await getUserSession();
	if (!user) return <UnauthenticatedPage />;
	return <GoalsPage user={user} />;
}
