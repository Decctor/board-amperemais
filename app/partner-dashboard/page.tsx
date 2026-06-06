import { getCurrentSession } from "@/lib/authentication/session";
import PartnerDashboardPage from "./partner-dashboard-page";
import { redirect } from "next/navigation";
import { db } from "@/services/drizzle";

export default async function PartnerDashboard() {
	const session = await getCurrentSession();
	if (!session) redirect("/auth/signin");
	const userId = session.user.id;
	const partner = await db.query.platformPartners.findFirst({
		where: (fields, { eq }) => eq(fields.usuarioId, userId),
	});
	if (!partner) redirect("/partner-dashboard/onboarding");
	return <PartnerDashboardPage />;
}
