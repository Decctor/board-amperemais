import UnauthenticatedPage from "@/components/Utils/UnauthenticatedPage";
import { getCurrentSession } from "@/lib/authentication/session";
import { redirect } from "next/navigation";
import GoalsPage from "./goals-page";

export default async function Goals() {
	const sessionUser = await getCurrentSession();
	if (!sessionUser) redirect("/auth/signin");
	return <GoalsPage user={sessionUser.user} />;
}
