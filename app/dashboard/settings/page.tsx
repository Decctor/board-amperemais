import { getCurrentSession } from "@/lib/authentication/session";
import { redirect } from "next/navigation";
import SettingsPage from "./settings-page";

export default async function Settings() {
	const authSession = await getCurrentSession();
	if (!authSession) redirect("/auth/signin");
	if (!authSession.membership) redirect("/onboarding");
	return <SettingsPage user={authSession.user} membership={authSession.membership} />;
}
