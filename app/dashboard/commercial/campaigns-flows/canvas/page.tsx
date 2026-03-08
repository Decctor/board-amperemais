import { getCurrentSession } from "@/lib/authentication/session";
import { redirect } from "next/navigation";
import CampaignFlowCanvasPage from "./campaign-flow-canvas-page";

type CampaignFlowCanvasRouteProps = {
	searchParams: Promise<{ id: string | undefined }>;
};
export default async function CampaignFlowCanvasRoute({ searchParams }: CampaignFlowCanvasRouteProps) {
	const { id } = await searchParams;
	const sessionUser = await getCurrentSession();
	if (!sessionUser) redirect("/auth/signin");
	if (!sessionUser.membership) redirect("/onboarding");
	return <CampaignFlowCanvasPage flowId={id || null} user={sessionUser.user} membership={sessionUser.membership} />;
}
