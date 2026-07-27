import { getCurrentSession } from "@/lib/authentication/session";
import { redirect } from "next/navigation";
import DesktopAgentVersionsPage from "./desktop-agent-page";

export default async function DesktopAgentAdmin() {
	const session = await getCurrentSession();
	if (!session) redirect("/auth/signin");
	if (!session.user.admin) redirect("/dashboard");

	return <DesktopAgentVersionsPage />;
}
