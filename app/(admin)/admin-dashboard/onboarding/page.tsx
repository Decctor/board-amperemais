import { getCurrentSession } from "@/lib/authentication/session";
import { getActivationMetrics } from "@/lib/onboarding/activation-metrics";
import { redirect } from "next/navigation";
import OnboardingMetricsPage from "./onboarding-page";
export default async function Page() {
 const session = await getCurrentSession();
 if (!session) redirect("/auth/signin");
 if (!session.user.admin) redirect("/dashboard");
 return <OnboardingMetricsPage metrics={await getActivationMetrics()} />;
}
