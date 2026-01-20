import UnauthorizedPage from "@/components/Utils/UnauthorizedPage";
import { getCurrentSession } from "@/lib/authentication/session";
import { redirect } from "next/navigation";
import { DashboardPage } from "./dashboard-page";

export default async function Main() {
	const authSession = await getCurrentSession();
	console.log("AUTH SESSION DASHBOARD PAGE", authSession);
	if (!authSession) redirect("/auth/signin");
	if (!authSession.membership?.organizacao) redirect("/onboarding");
	return <DashboardPage user={authSession.user} userOrg={authSession.membership.organizacao} membership={authSession.membership} />;
}
