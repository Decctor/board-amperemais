import { requireDashboardCapability } from "@/lib/access/guards";
import { redirect } from "next/navigation";
import CampaignResultPage from "@/app/dashboard/growth/campaigns/_module/detail/campaign-detail-page";

export default async function CampaignResultServerPage({ params }: { params: Promise<{ campaignId: string }> }) {
	const { campaignId } = await params;
	const access = await requireDashboardCapability("campaigns");
	if (access.unauthorized) return access.unauthorized;
	const sessionUser = access.sessionUser;
	if (!sessionUser) redirect("/auth/signin");
	if (!sessionUser.membership) redirect("/onboarding");
	return <CampaignResultPage campaignId={campaignId} sessionUser={sessionUser.user} sessionUserOrg={sessionUser.membership.organizacao} />;
}
