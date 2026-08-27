import { getCurrentSession } from "@/lib/authentication/session";
import { redirect } from "next/navigation";
import MediaAdminPage from "./media-page";

export default async function MediaAdmin() {
	const session = await getCurrentSession();
	if (!session) redirect("/auth/signin");
	if (!session.user.admin) redirect("/dashboard");

	return <MediaAdminPage />;
}
