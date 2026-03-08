import { getCurrentSession } from "@/lib/authentication/session";
import { redirect } from "next/navigation";
import CampaignFlowCanvasPage from "./campaign-flow-canvas-page";

export default async function CampaignFlowCanvasRoute() {
	const sessionUser = await getCurrentSession();
	if (!sessionUser) redirect("/auth/signin");
	if (!sessionUser.membership) redirect("/onboarding");
	return <CampaignFlowCanvasPage user={sessionUser.user} membership={sessionUser.membership} />;
}
