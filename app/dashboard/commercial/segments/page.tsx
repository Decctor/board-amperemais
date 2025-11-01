import UnauthenticatedPage from "@/components/Utils/UnauthenticatedPage";
import { getUserSession } from "@/lib/auth/app-session";
import SegmentsPage from "./segments-page";

export default async function Segments() {
	const user = await getUserSession();
	if (!user) return <UnauthenticatedPage />;
	return <SegmentsPage user={user} />;
}
