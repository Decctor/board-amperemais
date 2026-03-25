import { getCurrentSession } from "@/lib/authentication/session";
import { redirect } from "next/navigation";
import PointOfInteractionPage from "./point-of-interaction-page";

export default async function PointOfInteraction() {
	const sessionUser = await getCurrentSession();
	if (!sessionUser) redirect("/auth/signin");

	const membership = sessionUser.membership;
	if (!membership) redirect("/onboarding");

	return <PointOfInteractionPage user={sessionUser.user} organization={membership.organizacao} />;
}
