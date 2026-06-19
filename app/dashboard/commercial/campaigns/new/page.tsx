import { getCurrentSession } from "@/lib/authentication/session";
import { redirect } from "next/navigation";
import BuilderShell from "./_components/builder-shell";

type CampaignBuilderPageProps = {
	searchParams: Promise<{
		campaignId?: string;
	}>;
};

export default async function CampaignBuilderPage({ searchParams }: CampaignBuilderPageProps) {
	const sessionUser = await getCurrentSession();
	if (!sessionUser) redirect("/auth/signin");
	if (!sessionUser.membership) redirect("/onboarding");

	const { campaignId } = await searchParams;

	return (
		<BuilderShell
			initialCampaignId={campaignId ?? null}
			membership={sessionUser.membership}
		/>
	);
}
