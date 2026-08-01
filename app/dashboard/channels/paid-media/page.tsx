import { requireDashboardCapability } from "@/lib/access/guards";
import { redirect } from "next/navigation";
import MarketingPage from "./marketing-page";

export default async function Marketing() {
	const { sessionUser, unauthorized } = await requireDashboardCapability("paidMedia");
	if (unauthorized) return unauthorized;
	if (!sessionUser) redirect("/auth/signin");
	if (!sessionUser.membership) redirect("/onboarding");
	return <MarketingPage user={sessionUser.user} />;
}
