import { getCurrentSession } from "@/lib/authentication/session";
import { redirect } from "next/navigation";
import BuilderShell from "@/app/dashboard/growth/campaigns/_module/builder/components/builder-shell";

export default async function CampaignBuilderPage() {
	const sessionUser = await getCurrentSession();
	if (!sessionUser) redirect("/auth/signin");
	if (!sessionUser.membership) redirect("/onboarding");

	return <BuilderShell membership={sessionUser.membership} />;
}
