import UnauthenticatedPage from "@/components/Utils/UnauthenticatedPage";
import { getCurrentSession } from "@/lib/authentication/session";
import { redirect } from "next/navigation";
import SegmentsPage from "./segments-page";

export default async function Segments() {
	const sessionUser = await getCurrentSession();
	if (!sessionUser) redirect("/auth/signin");
	return <SegmentsPage user={sessionUser.user} />;
}
