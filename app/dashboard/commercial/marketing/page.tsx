import { getCurrentSession } from "@/lib/authentication/session";
import { redirect } from "next/navigation";
import MarketingPage from "./marketing-page";

export default async function Marketing() {
	const sessionUser = await getCurrentSession();
	if (!sessionUser) redirect("/auth/signin");
	if (!sessionUser.membership) redirect("/onboarding");
	return <MarketingPage user={sessionUser.user} />;
}
