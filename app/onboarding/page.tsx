import { getCurrentSession } from "@/lib/authentication/session";
import { redirect } from "next/navigation";

import { OnboardingPage } from "./onboarding-page";

export default async function Onboarding() {
	const authSession = await getCurrentSession();
	if (!authSession) redirect("/auth/signin");
	// if user has organization defined, redirect to dashboard
	return <OnboardingPage user={authSession.user} />;
}
