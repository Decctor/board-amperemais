import { getCurrentSession } from "@/lib/authentication/session";
import { redirect } from "next/navigation";
import IntegrationsPage from "./integrations-page";

export default async function Integrations() {
	const sessionUser = await getCurrentSession();
	if (!sessionUser) redirect("/auth/signin");
	if (!sessionUser.membership) redirect("/onboarding");
	return <IntegrationsPage sessionUser={sessionUser.user} membership={sessionUser.membership} />;
}
