import { getCurrentSession } from "@/lib/authentication/session";
import { redirect } from "next/navigation";
import AudiencesPage from "./audiences-page";

export default async function Audiences() {
	const sessionUser = await getCurrentSession();
	if (!sessionUser) redirect("/auth/signin");
	if (!sessionUser.membership) redirect("/onboarding");
	return <AudiencesPage user={sessionUser.user} />;
}
