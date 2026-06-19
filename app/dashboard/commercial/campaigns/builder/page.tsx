import { redirect } from "next/navigation";

type BuilderRedirectPageProps = {
	searchParams: Promise<{
		campaignId?: string;
	}>;
};

export default async function BuilderRedirectPage({ searchParams }: BuilderRedirectPageProps) {
	const { campaignId } = await searchParams;
	if (campaignId) {
		redirect(`/dashboard/commercial/campaigns/id/${campaignId}?view=config`);
	}
	redirect("/dashboard/commercial/campaigns/new");
}
