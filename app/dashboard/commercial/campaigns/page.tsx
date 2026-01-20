import { getCurrentSession } from "@/lib/authentication/session";
import { redirect } from "next/navigation";
import CampaignsPage from "./campaigns-page";

export default async function CommercialCampaignsPage() {
	const sessionUser = await getCurrentSession();
	if (!sessionUser) redirect("/auth/signin");
	if (!sessionUser.membership) redirect("/onboarding");
	return <CampaignsPage user={sessionUser.user} membership={sessionUser.membership} />;
}
