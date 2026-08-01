import { requireDashboardCapability } from "@/lib/access/guards";
import { redirect } from "next/navigation";
import AudiencesPage from "./audiences-page";

export default async function Audiences() {
	const access = await requireDashboardCapability("audiences");
	if (access.unauthorized) return access.unauthorized;
	const sessionUser = access.sessionUser;
	if (!sessionUser) redirect("/auth/signin");
	if (!sessionUser.membership) redirect("/onboarding");
	return <AudiencesPage user={sessionUser.user} />;
}
