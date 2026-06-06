import { getCurrentSession } from "@/lib/authentication/session";
import { redirect } from "next/navigation";
import PlatformPartnershipsAdminPage from "./partnerships-page";

export default async function PlatformPartnershipsAdmin() {
	const session = await getCurrentSession();
	if (!session) redirect("/auth/signin");
	if (!session.user.admin) redirect("/dashboard");

	return <PlatformPartnershipsAdminPage />;
}
