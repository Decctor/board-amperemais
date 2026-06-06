import { getCurrentSession } from "@/lib/authentication/session";
import { redirect } from "next/navigation";
import PartnerOnboardingPage from "./partner-onboarding-page";

export default async function PartnerOnboarding() {
	const session = await getCurrentSession();
	if (!session) redirect(`/auth/signin?redirectTo=${encodeURIComponent("/partner-dashboard/onboarding")}`);
	return <PartnerOnboardingPage user={session.user} />;
}
