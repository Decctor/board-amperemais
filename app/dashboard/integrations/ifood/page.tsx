import { getCurrentSession } from "@/lib/authentication/session";
import { redirect } from "next/navigation";
import IntegrationsIFoodPage from "./ifood-page";

export default async function IntegrationsIFood() {
	const sessionUser = await getCurrentSession();
	if (!sessionUser) redirect("/auth/signin");
	if (!sessionUser.membership) redirect("/onboarding");
	return <IntegrationsIFoodPage sessionUser={sessionUser.user} membership={sessionUser.membership} />;
}
