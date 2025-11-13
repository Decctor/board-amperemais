import { getCurrentSession } from "@/lib/authentication/session";
import { redirect } from "next/navigation";
import SettingsPage from "./settings-page";

export default async function Settings() {
	const authSession = await getCurrentSession();
	if (!authSession) redirect("/auth/signin");
	return <SettingsPage user={authSession.user} />;
}
